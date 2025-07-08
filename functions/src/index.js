const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { HttpsError } = functions.https;
const psaDatabase = require('./psaDatabase');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });
const { psaLookupHttp } = require('./psaLookupHttp');
const emailFunctions = require('./emailFunctions');
const testEmail = require('./testEmail');
const exchangeRates = require('./exchangeRates');
const stripePortal = require('./stripePortal');

// Initialize Firebase Admin SDK (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export email functions
exports.sendWelcomeEmail = emailFunctions.sendWelcomeEmail;
exports.sendMarketplaceMessageNotification = emailFunctions.sendMarketplaceMessageNotification;
exports.sendListingSoldNotificationTrigger = emailFunctions.sendListingSoldNotificationTrigger;
exports.sendCustomEmail = emailFunctions.sendCustomEmail;

// Export test email function
exports.testEmail = testEmail.testEmail;

// Export PSA database functions
exports.cleanupPSADatabase = psaDatabase.cleanupPSADatabase;
exports.getPSADatabaseStats = psaDatabase.getPSADatabaseStats;

// Export Stripe portal function
exports.createPortalSession = stripePortal.createPortalSession;

// Export the HTTP PSA lookup function
exports.psaLookupHttp = psaLookupHttp;

// Export exchange rates function
// exports.getExchangeRates = exchangeRates.getExchangeRates;

// PSA Lookup Function - implements 3-layer cache system
exports.psaLookup = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { certNumber, forceRefresh } = data;
  
  if (!certNumber) {
    throw new HttpsError(
      'invalid-argument',
      'Certification number is required'
    );
  }
  
  try {
    const db = admin.firestore();
    const PSA_COLLECTION = 'psa_cards';
    
    // Layer 2: Check Firebase cache (if not forcing refresh)
    if (!forceRefresh) {
      const docRef = db.collection(PSA_COLLECTION).doc(certNumber);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const cachedData = docSnap.data();
        
        // Check if data is fresh (less than 30 days old)
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (cachedData.timestamp && (Date.now() - cachedData.timestamp) < thirtyDaysInMs) {
    
          
          // Update access tracking
          await docRef.update({
            accessCount: admin.firestore.FieldValue.increment(1),
            lastAccessed: Date.now()
          });
          
          return {
            success: true,
            fromCache: true,
            data: cachedData.cardData
          };
        } else {
          console.log(`PSA cache expired for cert #${certNumber}, fetching fresh data`);
        }
      }
    }
    
    // Layer 3: Fetch from PSA API
    console.log(`Fetching fresh PSA data for cert #${certNumber}`);
    
    // Get PSA API token from environment variables with optional Firebase config fallback
    let psaToken = process.env.PSA_API_TOKEN;
    
    // Try to get token from Firebase functions config as fallback (if available)
    try {
      const config = functions?.config?.();
      if (config?.psa?.api_token) {
        psaToken = config.psa.api_token;
      }
    } catch (e) {
      console.warn('Skipping functions.config() fallback, using process.env instead:', e.message);
    }
    
    if (!psaToken) {
      console.warn('PSA_API_TOKEN not configured in Firebase config or environment variables');
      return {
        success: false,
        error: 'PSA_API_NOT_CONFIGURED',
        message: 'PSA API is not currently configured. Please contact support for assistance.'
      };
    }
    
    // Try multiple PSA API endpoints for reliability
    const endpoints = [
      `https://www.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      `https://api.psacard.com/publicapi/cert/${certNumber}`,
      `https://www.psacard.com/cert/${certNumber}/json`
    ];
    
    let psaData = null;
    let errors = [];
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying PSA endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${psaToken}`,
            'User-Agent': 'Pokemon-Card-Tracker/1.0'
          },
          timeout: 10000 // 10 second timeout
        });
        
        if (!response.ok) {
          const errorMsg = `PSA API returned error: ${response.status} ${response.statusText}`;
          console.warn(errorMsg);
          errors.push(`${endpoint}: ${errorMsg}`);
          continue; // Try next endpoint
        }
        
        const responseText = await response.text();
        console.log(`PSA API response from ${endpoint}:`, responseText.substring(0, 200) + '...');
        
        // Try to parse JSON response
        try {
          psaData = JSON.parse(responseText);
          console.log(`Successfully parsed PSA data from ${endpoint}`);
          break; // Success! Exit the loop
        } catch (parseError) {
          console.warn(`Failed to parse JSON from ${endpoint}:`, parseError.message);
          errors.push(`${endpoint}: Invalid JSON response`);
          continue; // Try next endpoint
        }
        
      } catch (fetchError) {
        const errorMsg = `Network error: ${fetchError.message}`;
        console.warn(`Failed to fetch from ${endpoint}:`, errorMsg);
        errors.push(`${endpoint}: ${errorMsg}`);
        continue; // Try next endpoint
      }
    }
    
    // Check if we got valid PSA data
    if (!psaData) {
      console.error('All PSA API endpoints failed:', errors);
      return {
        success: false,
        error: 'API_ERROR',
        message: 'Unable to fetch PSA data from any endpoint. Please try again later.',
        details: errors
      };
    }
    
    // Validate PSA data structure
    if (!psaData || typeof psaData !== 'object') {
      console.error('Invalid PSA data structure:', psaData);
      return {
        success: false,
        error: 'INVALID_DATA',
        message: 'PSA API returned invalid data format.'
      };
    }
    
    // Save successful result to Firebase cache
    try {
      const docRef = db.collection(PSA_COLLECTION).doc(certNumber);
      await docRef.set({
        certificationNumber: certNumber,
        cardData: psaData,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        cacheExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      });
      
      console.log(`Cached PSA data for cert #${certNumber}`);
    } catch (cacheError) {
      console.warn('Failed to cache PSA data:', cacheError);
      // Don't fail the request if caching fails
    }
    
    return {
      success: true,
      fromCache: false,
      data: psaData
    };
    
  } catch (error) {
    console.error('Error in psaLookup function:', error);
    
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: `Internal server error: ${error.message}`
    };
  }
});

// Cloud Function to store card images in Firebase Storage
exports.storeCardImage = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { userId, cardId, imageBase64, isReplacement = false } = data;
  
  if (!userId || !cardId || !imageBase64) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required parameters: userId, cardId, or imageBase64'
    );
  }
  
  // Verify that the authenticated user matches the requested userId
  if (context.auth.uid !== userId) {
    throw new HttpsError(
      'permission-denied',
      'You can only upload images for your own user ID'
    );
  }
  
  try {
    // Get a reference to the Firebase Storage bucket
    const bucket = admin.storage().bucket();
    
    // Define the path where the image will be stored
    const imagePath = `images/${userId}/${cardId}.jpeg`;
    
    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Create a file in the bucket
    const file = bucket.file(imagePath);
    
    // Check if the file exists and if we should replace it
    if (!isReplacement) {
      try {
        const [exists] = await file.exists();
        if (exists) {
          console.log(`File ${imagePath} already exists and isReplacement is false`);
          
          // Get the download URL for the existing file
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Far future expiration
          });
          
          return {
            success: true,
            downloadUrl: url,
            message: 'File already exists, returning existing URL'
          };
        }
      } catch (existsError) {
        console.error('Error checking if file exists:', existsError);
        // Continue with upload if we can't check existence
      }
    }
    
    // Upload the file
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          userId: userId,
          cardId: cardId,
          uploadTimestamp: Date.now().toString(),
          isReplacement: isReplacement.toString()
        }
      }
    });
    
    console.log(`Successfully uploaded image to ${imagePath}`);
    
    // Get a download URL for the file
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future expiration
    });
    
    return {
      success: true,
      downloadUrl: url,
      path: imagePath
    };
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw new HttpsError('internal', error.message);
  }
});

// Add a function to handle PSA lookups with caching
// Using onCall with CORS support
exports.psaLookupWithCache = functions.https.onCall(async (data, context) => {
  // Call the same logic as the callable function
  const result = await exports.psaLookup(data, context);
  return result;
});

// Note: psaLookupHttp is exported from the dedicated psaLookupHttp.js file
// The duplicate export has been removed to prevent conflicts


// Create Checkout Session for Premium Subscription
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  console.log('🔥 FUNCTION DEBUG: createCheckoutSession called');
  console.log('🔥 FUNCTION DEBUG: Input data:', JSON.stringify(data, null, 2));
  console.log('🔥 FUNCTION DEBUG: Context:', JSON.stringify({
    auth: context.auth ? 'Present' : 'Missing',
    origin: context.rawRequest?.headers?.origin
  }, null, 2));
  
  try {
    // Check Stripe configuration
    const config = functions?.config?.();
    console.log('🔥 FUNCTION DEBUG: Functions config available:', !!config);
    console.log('🔥 FUNCTION DEBUG: Stripe config keys:', Object.keys(config?.stripe || {}));
    
    const stripeSecretKey = config?.stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
    console.log('🔥 FUNCTION DEBUG: Stripe secret key available:', !!stripeSecretKey);
    console.log('🔥 FUNCTION DEBUG: Stripe secret key prefix:', stripeSecretKey?.substring(0, 12));

  // Ensure user is authenticated
  if (!context.auth) {
    console.error('❌ Authentication failed - no context.auth');
    throw new HttpsError('unauthenticated', 'User must be authenticated to create checkout session');
  }

  try {
    console.log('🔍 Checking Stripe configuration...');
    
    // Get Stripe configuration with safe fallback
    let stripeConfig = {};
    try {
      const config = functions?.config?.();
      if (config?.stripe) {
        stripeConfig = config.stripe;
        console.log('✅ Config retrieved from Firebase functions config');
      }
    } catch (e) {
      console.warn('Skipping functions.config() for Stripe, using process.env instead:', e.message);
    }
    
    // Use environment variables as fallback
    const secretKey = stripeConfig.secret_key || process.env.STRIPE_SECRET_KEY;
    const premiumPlanPriceId = stripeConfig.premium_plan_price_id || process.env.STRIPE_PREMIUM_PLAN_PRICE_ID;
    
    console.log('Stripe config keys:', stripeConfig ? Object.keys(stripeConfig) : 'Using environment variables');
    
    if (!secretKey) {
      console.error('❌ Stripe secret key not found in Firebase config or environment variables');
      throw new HttpsError('internal', 'Stripe secret key configuration missing');
    }
    
    if (!premiumPlanPriceId) {
      console.error('❌ Stripe premium plan price ID not found in Firebase config or environment variables');
      throw new HttpsError('internal', 'Stripe price configuration missing');
    }

    // Initialize Stripe with secret key
    console.log('📦 Initializing Stripe...');
    console.log('🔑 Using secret key type:', secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST');
    
    let stripe;
    try {
      stripe = require('stripe')(secretKey);
      console.log('✅ Stripe initialized successfully');
    } catch (stripeInitError) {
      console.error('❌ Stripe initialization failed:', stripeInitError.message);
      throw new HttpsError('internal', `Stripe initialization error: ${stripeInitError.message}`);
    }
    
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;
    const priceId = premiumPlanPriceId;
    
    console.log('✅ Creating Stripe checkout session for user:', {
      userId,
      userEmail,
      priceId,
      keyType: secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST'
    });

    // Validate the price exists first
    console.log('🏷️ Validating price ID...');
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log('✅ Price validation successful:', {
        id: price.id,
        active: price.active,
        currency: price.currency,
        amount: price.unit_amount,
        interval: price.recurring?.interval
      });
    } catch (priceError) {
      console.error('❌ Price validation failed:', priceError.message);
      throw new HttpsError('invalid-argument', `Invalid price ID: ${priceError.message}`);
    }

    // Create checkout session
    console.log('💳 Calling Stripe checkout session create...');
    
    // Determine base URL from request headers for localhost support
    const baseUrl = context.rawRequest?.headers?.origin || 
                   context.rawRequest?.headers?.referer?.split('/').slice(0, 3).join('/') || 
                   'https://www.mycardtracker.com.au';
    
    console.log('🌐 Using base URL for redirects:', baseUrl);
    
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planType: 'premium'
      },
      success_url: `${baseUrl}/dashboard?upgraded=true`,
      cancel_url: `${baseUrl}/upgrade?cancelled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };

    console.log('📝 Session configuration:', JSON.stringify(sessionConfig, null, 2));

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionConfig);
    } catch (stripeError) {
      console.error('🔥 Stripe session creation failed:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        detail: stripeError.detail,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
        raw: stripeError
      });
      throw new HttpsError('internal', `Stripe error: ${stripeError.message}`);
    }

    console.log('✅ Stripe checkout session created successfully:', {
      sessionId: session.id,
      url: session.url,
      mode: session.mode,
      status: session.status
    });
    
    return {
      success: true,
      url: session.url,
      sessionId: session.id
    };
  } catch (error) {
    console.error('🔥 FUNCTION DEBUG: Error in createCheckoutSession:', error);
    console.error('🔥 FUNCTION DEBUG: Error stack:', error.stack);
    throw error;
  }
  
  } catch (error) {
    console.error('💥 Error creating Stripe checkout session:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      stack: error.stack,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
    
    // More specific error handling
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('price')) {
        throw new HttpsError('invalid-argument', `Price configuration error: ${error.message}`);
      }
      throw new HttpsError('invalid-argument', `Stripe configuration error: ${error.message}`);
    } else if (error.type === 'StripeAuthenticationError') {
      throw new HttpsError('internal', 'Stripe authentication failed - check secret key');
    } else if (error.type === 'StripeConnectionError') {
      throw new HttpsError('unavailable', 'Unable to connect to Stripe');
    } else if (error.type === 'StripePermissionError') {
      throw new HttpsError('permission-denied', 'Stripe permission error - check account settings');
    }
    
    throw new HttpsError('internal', `Failed to create checkout session: ${error.message}`);
  }
});

// Stripe Webhook Handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  // Get Stripe configuration with safe fallback
  let stripeConfig = {};
  try {
    const config = functions?.config?.();
    if (config?.stripe) {
      stripeConfig = config.stripe;
    }
  } catch (e) {
    console.warn('Skipping functions.config() for Stripe webhook, using process.env instead:', e.message);
  }
  
  const secretKey = stripeConfig.secret_key || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = stripeConfig.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
  
  const stripe = require('stripe')(secretKey);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    // Get raw body for signature verification
    // Firebase Functions automatically parses JSON, but Stripe needs raw body
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log(`Stripe webhook event received: ${event.type}`);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.metadata.userId;
        
        console.log(`Processing successful checkout for user: ${userId}`);
        
        if (userId) {
          // Update user subscription to premium - FIXED: Use correct Firestore path
          await admin.firestore().doc(`users/${userId}`).update({
            subscriptionStatus: 'premium',
            planType: 'premium',
            customerId: session.customer,
            subscriptionId: session.subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Successfully updated user ${userId} to premium subscription`);
        }
        break;
        
      case 'customer.subscription.created':
        const createdSubscription = event.data.object;
        const createdCustomerId = createdSubscription.customer;
        
        console.log(`Processing subscription creation for customer: ${createdCustomerId}`);
        
        // Find user by customer ID and update subscription status
        const createdUsersRef = admin.firestore().collectionGroup('data');
        const createdUserQuery = await createdUsersRef.where('customerId', '==', createdCustomerId).limit(1).get();
        
        if (!createdUserQuery.empty) {
          const userDoc = createdUserQuery.docs[0];
          const updateData = {
            subscriptionStatus: 'premium',
            planType: 'premium',
            subscriptionId: createdSubscription.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          await userDoc.ref.update(updateData);
          console.log(`Updated user ${userDoc.id} to premium subscription after creation`);
        }
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        console.log(`Processing subscription update for customer: ${customerId}`);
        
        // Find user by customer ID and update subscription status
        const usersRef = admin.firestore().collectionGroup('data');
        const userQuery = await usersRef.where('customerId', '==', customerId).limit(1).get();
        
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const updateData = {
            subscriptionStatus: subscription.status === 'active' ? 'premium' : subscription.status,
            subscriptionId: subscription.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          await userDoc.ref.update(updateData);
          console.log(`Updated subscription status for user: ${userDoc.id}`);
        }
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        const deletedCustomerId = deletedSubscription.customer;
        
        console.log(`Processing subscription cancellation for customer: ${deletedCustomerId}`);
        
        // Find user by customer ID and update to free status
        const deletedUsersRef = admin.firestore().collectionGroup('data');
        const deletedUserQuery = await deletedUsersRef.where('customerId', '==', deletedCustomerId).limit(1).get();
        
        if (!deletedUserQuery.empty) {
          const userDoc = deletedUserQuery.docs[0];
          await userDoc.ref.update({
            subscriptionStatus: 'free',
            planType: 'free',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Updated user ${userDoc.id} to free plan after subscription cancellation`);
        }
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        const failedCustomerId = failedInvoice.customer;
        
        console.log(`Processing payment failure for customer: ${failedCustomerId}`);
        
        // Find user and potentially update status or send notification
        const failedUsersRef = admin.firestore().collectionGroup('data');
        const failedUserQuery = await failedUsersRef.where('customerId', '==', failedCustomerId).limit(1).get();
        
        if (!failedUserQuery.empty) {
          const userDoc = failedUserQuery.docs[0];
          console.log(`Payment failed for user: ${userDoc.id}`);
          // Could send email notification or update status here
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Diagnostic function to test environment differences
exports.testStripeConfig = functions.https.onCall(async (data, context) => {
  console.log('🧪 TEST: Diagnostic function called');
  
  try {
    // Check authentication
    console.log('🧪 Auth present:', !!context.auth);
    console.log('🧪 User ID:', context.auth?.uid);
    
    // Check functions config
    const config = functions?.config?.();
    console.log('🧪 Functions config available:', !!config);
    console.log('🧪 Stripe config available:', !!config?.stripe);
    console.log('🧪 Stripe config keys:', config?.stripe ? Object.keys(config.stripe) : 'No stripe config');
    console.log('🧪 Secret key available:', !!config?.stripe?.secret_key);
    console.log('🧪 Premium price ID available:', !!config?.stripe?.premium_plan_price_id);
    console.log('🧪 Webhook secret available:', !!config?.stripe?.webhook_secret);
    
    // Check environment variables
    console.log('🧪 Process env STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY);
    console.log('🧪 Process env STRIPE_PREMIUM_PLAN_PRICE_ID:', !!process.env.STRIPE_PREMIUM_PLAN_PRICE_ID);
    
    // Test Stripe initialization
    let stripeInitTest = false;
    let stripeError = null;
    try {
      const secretKey = config?.stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
      if (secretKey) {
        const stripe = require('stripe')(secretKey);
        stripeInitTest = true;
        console.log('🧪 Stripe initialization: SUCCESS');
      } else {
        console.log('🧪 Stripe initialization: FAILED - No secret key');
      }
    } catch (error) {
      stripeError = error.message;
      console.log('🧪 Stripe initialization: ERROR -', error.message);
    }
    
    // Check request origin
    const origin = context.rawRequest?.headers?.origin;
    console.log('🧪 Request origin:', origin);
    
    return {
      success: true,
      environment: {
        hasAuth: !!context.auth,
        userId: context.auth?.uid,
        hasConfig: !!config,
        hasStripeConfig: !!config?.stripe,
        stripeConfigKeys: config?.stripe ? Object.keys(config.stripe) : [],
        hasSecretKey: !!config?.stripe?.secret_key,
        hasPremiumPriceId: !!config?.stripe?.premium_plan_price_id,
        hasWebhookSecret: !!config?.stripe?.webhook_secret,
        hasEnvSecretKey: !!process.env.STRIPE_SECRET_KEY,
        hasEnvPriceId: !!process.env.STRIPE_PREMIUM_PLAN_PRICE_ID,
        stripeInitTest: stripeInitTest,
        stripeError: stripeError,
        origin: origin,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('🧪 TEST ERROR:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});
