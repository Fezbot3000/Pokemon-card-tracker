const functions = require('firebase-functions');
const { HttpsError } = functions.https;
const admin = require('firebase-admin');

// Create Stripe Customer Portal Session
exports.createPortalSession = functions.region('us-central1').https.onCall(async (data, context) => {
  console.log('🔗 createPortalSession called - v1.0');
  
  // Ensure user is authenticated
  if (!context.auth) {
    console.error('❌ Authentication failed - no context.auth');
    throw new HttpsError('unauthenticated', 'User must be authenticated to access billing portal');
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
    const secretKey = stripeConfig.secret_key || stripeConfig.secret || process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ Stripe secret key not found in Firebase config or environment variables');
      throw new HttpsError('internal', 'Stripe secret key configuration missing');
    }

    // Initialize Stripe
    console.log('📦 Initializing Stripe...');
    const stripe = require('stripe')(secretKey);
    
    const userId = context.auth.uid;
    
    console.log('✅ Looking up user subscription data for:', userId);
    
    // Get user's customer ID from Firestore
    const userRef = admin.firestore().doc(`users/${userId}`);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error('❌ User document not found');
      throw new HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    const customerId = userData.customerId;
    
    if (!customerId) {
      console.error('❌ No customer ID found for user');
      throw new HttpsError('failed-precondition', 'No billing information found. Please contact support.');
    }

    // Determine base URL from request headers
    const baseUrl = context.rawRequest?.headers?.origin || 
                   context.rawRequest?.headers?.referer?.split('/').slice(0, 3).join('/') || 
                   'https://www.mycardtracker.com.au';
    
    console.log('🌐 Using base URL for return:', baseUrl);
    
    // Create portal session
    console.log('🏛️ Creating Stripe customer portal session...');
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/settings?tab=account`,
    });

    console.log('✅ Portal session created successfully:', {
      sessionId: portalSession.id,
      url: portalSession.url,
      customerId: customerId
    });
    
    return {
      success: true,
      url: portalSession.url
    };
  } catch (error) {
    console.error('💥 Error creating portal session:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    
    // More specific error handling
    if (error.type === 'StripeInvalidRequestError') {
      throw new HttpsError('invalid-argument', `Stripe configuration error: ${error.message}`);
    } else if (error.type === 'StripeAuthenticationError') {
      throw new HttpsError('internal', 'Stripe authentication failed - check secret key');
    } else if (error.type === 'StripeConnectionError') {
      throw new HttpsError('unavailable', 'Unable to connect to Stripe');
    }
    
    throw new HttpsError('internal', `Failed to create portal session: ${error.message}`);
  }
}); 