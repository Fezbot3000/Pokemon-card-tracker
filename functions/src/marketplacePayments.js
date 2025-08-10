const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { HttpsError } = functions.https;

/**
 * Marketplace payment processing with Stripe Connect
 * Handles Buy Now payments with platform fees and seller payouts
 */

// Get Stripe configuration (Connect-specific with safe fallbacks)
const getStripeConfig = () => {
  let stripeConfig = {};
  try {
    const config = functions?.config?.();
    // Prefer connect-specific namespace if available
    const connectCfg = config?.stripe_connect || {};
    const baseCfg = config?.stripe || {};
    stripeConfig = {
      connect_secret_key: connectCfg.secret_key || null,
      connect_client_id: connectCfg.client_id || baseCfg.connect_client_id || null,
      connect_webhook_secret: connectCfg.webhook_secret || baseCfg.connect_webhook_secret || null,
      base_secret_key: baseCfg.secret_key || null
    };
  } catch (e) {
    console.warn('Using environment variables for Stripe config:', e.message);
  }
  
  return {
    // For marketplace we prefer the Connect-specific secret; fall back to base
    secretKey: stripeConfig.connect_secret_key || stripeConfig.base_secret_key || process.env.STRIPE_CONNECT_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
    connectClientId: stripeConfig.connect_client_id || process.env.STRIPE_CONNECT_CLIENT_ID,
    webhookSecret: stripeConfig.connect_webhook_secret || process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  };
};

// Initialize Stripe
const initializeStripe = () => {
  const config = getStripeConfig();
  if (!config.secretKey) {
    throw new HttpsError('internal', 'Stripe secret key not configured');
  }
  return require('stripe')(config.secretKey);
};

/**
 * Calculate platform fee based on seller status
 */
const calculatePlatformFee = async (sellerId, amount) => {
  try {
    // Get seller's marketplace profile to determine fee tier
    const sellerProfileRef = admin.firestore().doc(`marketplaceProfiles/${sellerId}`);
    const sellerProfile = await sellerProfileRef.get();
    
    if (!sellerProfile.exists) {
      // New seller - 8% fee
      return {
        percentage: 8,
        amount: Math.round(amount * 0.08)
      };
    }
    
    const profile = sellerProfile.data();
    const accountAge = Date.now() - (profile.createdAt?.toMillis() || Date.now());
    const daysSinceJoined = accountAge / (1000 * 60 * 60 * 24);
    const totalSales = profile.totalSales || 0;
    
    // Established seller criteria: 30+ days AND 5+ sales
    const isEstablished = daysSinceJoined >= 30 && totalSales >= 5;
    
    const percentage = isEstablished ? 3.5 : 8;
    return {
      percentage,
      amount: Math.round(amount * (percentage / 100))
    };
    
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    // Default to new seller fee on error
    return {
      percentage: 8,
      amount: Math.round(amount * 0.08)
    };
  }
};

/**
 * Create complete Stripe Connect account with user information
 */
exports.createSellerAccountWithInfo = functions.https.onCall(async (data, context) => {
  console.log('🏪 Creating seller account with complete information');
  
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const stripe = initializeStripe();
    const userId = context.auth.uid;
    const { formData } = data;
    
    // Create Stripe Express account with complete information
    const accountData = {
      type: 'express',
      country: 'AU',
      email: formData.email,
      business_type: formData.businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: userId,
        userName: `${formData.firstName} ${formData.lastName}`,
      }
    };

    // Add individual information
    if (formData.businessType === 'individual') {
      accountData.individual = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone ? `+61${formData.phone.replace(/^0/, '').replace(/\s/g, '')}` : undefined,
        dob: {
          day: new Date(formData.dateOfBirth).getDate(),
          month: new Date(formData.dateOfBirth).getMonth() + 1,
          year: new Date(formData.dateOfBirth).getFullYear(),
        },
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: 'AU',
        },
      };
    } else {
      // Company information
      accountData.company = {
        name: formData.businessName,
        phone: formData.phone ? `+61${formData.phone.replace(/^0/, '').replace(/\s/g, '')}` : undefined,
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postalCode,
          country: 'AU',
        },
      };
      
      accountData.business_profile = {
        url: formData.businessWebsite,
        name: formData.businessName,
      };

      if (formData.taxId) {
        accountData.company.tax_id = formData.taxId;
      }
    }

    const account = await stripe.accounts.create(accountData);
    console.log(`✅ Stripe Express account created: ${account.id}`);

    // Add external account (bank account)
    const externalAccount = await stripe.accounts.createExternalAccount(account.id, {
      external_account: {
        object: 'bank_account',
        country: 'AU',
        currency: 'aud',
        account_holder_name: formData.accountHolderName,
        account_holder_type: formData.businessType,
        routing_number: formData.routingNumber, // BSB
        account_number: formData.accountNumber,
      },
    });
    
    console.log(`✅ Bank account added: ${externalAccount.id}`);

    // Save to user's marketplace profile
    const userProfileRef = admin.firestore().doc(`marketplaceProfiles/${userId}`);
    await userProfileRef.set({
      stripeConnectedAccountId: account.id,
      stripeAccountStatus: 'pending_verification',
      paymentSetupComplete: true,
      businessType: formData.businessType,
      businessName: formData.businessType === 'company' ? formData.businessName : null,
      setupCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ User profile updated for ${userId}`);

    return { 
      success: true, 
      accountId: account.id,
      message: 'Seller account created successfully' 
    };

  } catch (error) {
    console.error('💥 Error creating seller account:', error);
    throw new HttpsError('internal', `Failed to create seller account: ${error.message}`);
  }
});

/**
 * Create Stripe Connect onboarding link for sellers (fallback method)
 */
exports.createSellerOnboardingLink = functions.https.onCall(async (data, context) => {
  console.log('🏪 Creating seller onboarding link');
  
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const stripe = initializeStripe();
    const config = getStripeConfig();
    
    if (!config.connectClientId) {
      throw new HttpsError('internal', 'Stripe Connect not configured. Client ID missing.');
    }
    
    const userId = context.auth.uid;
    const { refreshUrl, returnUrl } = data || {};

    // Ensure HTTPS URLs for live mode; fallback to production domain
    const fallbackBase = 'https://www.mycardtracker.com.au';
    const ensureHttps = (url, fallbackPath = '') => {
      if (!url || typeof url !== 'string') return `${fallbackBase}${fallbackPath}`;
      if (url.startsWith('http://')) return url.replace('http://', 'https://');
      return url;
    };
    const resolvedReturnUrl = ensureHttps(returnUrl, '/dashboard/marketplace');
    const resolvedRefreshUrl = ensureHttps(refreshUrl, '/dashboard/marketplace?refresh=true');
    
    // Check if user already has a connected account
    const userRef = admin.firestore().doc(`marketplaceProfiles/${userId}`);
    const userDoc = await userRef.get();
    
    let accountId = null;
    if (userDoc.exists && userDoc.data().stripeConnectedAccountId) {
      accountId = userDoc.data().stripeConnectedAccountId;
    } else {
      // Create new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU', // Australia
        email: context.auth.token.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });
      accountId = account.id;
      
      // Save account ID to user profile
      await userRef.set({
        stripeConnectedAccountId: accountId,
        onboardingComplete: false,
        payoutsEnabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: resolvedRefreshUrl,
      return_url: resolvedReturnUrl,
      type: 'account_onboarding'
    });
    
    console.log('✅ Seller onboarding link created:', accountId);
    
    return {
      success: true,
      onboardingUrl: accountLink.url,
      accountId: accountId
    };
    
  } catch (error) {
    console.error('💥 Error creating seller onboarding link:', error);
    throw new HttpsError('internal', `Failed to create onboarding link: ${error.message}`);
  }
});

/**
 * Process marketplace purchase with Stripe Connect
 */
exports.processMarketplacePurchase = functions.https.onCall(async (data, context) => {
  console.log('💳 Processing marketplace purchase');
  
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const stripe = initializeStripe();
    const { listingId, shippingAddress } = data;
    const buyerId = context.auth.uid;
    
    // Get the listing details
    const listingRef = admin.firestore().collection('marketplaceItems')
      .doc(listingId);
    const listingDoc = await listingRef.get();
    
    if (!listingDoc.exists) {
      throw new HttpsError('not-found', 'Listing not found');
    }
    
    const listing = listingDoc.data();
    const sellerId = listing.userId;
    
    // Validate listing is available
    if (listing.status !== 'available') {
      throw new HttpsError('failed-precondition', 'Listing is no longer available');
    }
    
    // Prevent self-purchase
    if (buyerId === sellerId) {
      throw new HttpsError('failed-precondition', 'Cannot purchase your own listing');
    }
    
    // Get seller's connected account
    const sellerProfileRef = admin.firestore().doc(`marketplaceProfiles/${sellerId}`);
    const sellerProfile = await sellerProfileRef.get();
    
    if (!sellerProfile.exists || !sellerProfile.data().stripeConnectedAccountId) {
      throw new HttpsError('failed-precondition', 'Seller has not completed payment setup');
    }
    
    const connectedAccountId = sellerProfile.data().stripeConnectedAccountId;
    
      // Check if connected account can accept payments
  const account = await stripe.accounts.retrieve(connectedAccountId);
  console.log('Account status:', { 
    id: account.id, 
    charges_enabled: account.charges_enabled, 
    payouts_enabled: account.payouts_enabled,
    requirements: account.requirements 
  });
  
  if (!account.charges_enabled) {
    throw new HttpsError('failed-precondition', `Seller account not ready for payments. Missing: ${account.requirements.currently_due.join(', ')}`);
  }
    
    // Calculate fees
    const amount = Math.round((listing.listingPrice || listing.price) * 100); // Convert to cents
    const platformFee = await calculatePlatformFee(sellerId, amount);
    const sellerPayout = amount - platformFee.amount;
    
    // Get buyer and seller details
    const buyerRef = admin.firestore().doc(`users/${buyerId}`);
    const buyerDoc = await buyerRef.get();
    const buyerData = buyerDoc.exists ? buyerDoc.data() : {};
    
    // Create order record first
    const orderRef = admin.firestore().collection('marketplaceOrders').doc();
    const orderId = orderRef.id;
    
    const orderData = {
      id: orderId,
      listingId: listingId,
      buyerId: buyerId,
      sellerId: sellerId,
      amount: amount / 100, // Store in dollars
      currency: listing.currency || 'AUD',
      platformFee: platformFee.amount / 100,
      platformFeePercentage: platformFee.percentage,
      sellerPayout: sellerPayout / 100,
      stripeConnectedAccountId: connectedAccountId,
      status: 'pending_payment',
      cardDetails: {
        name: listing.card?.name || listing.cardName,
        set: listing.card?.set || listing.setName,
        year: listing.card?.year || listing.year,
        grade: listing.card?.grade || listing.grade,
        gradingCompany: listing.card?.gradingCompany || listing.gradingCompany,
        certificationNumber: listing.card?.certificationNumber || listing.certificationNumber,
        imageUrl: listing.card?.imageUrl || listing.imageUrl,
        category: listing.card?.category || listing.category
      },
      shippingAddress: shippingAddress,
      shippingDeadline: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)), // 2 days from now
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      buyerName: buyerData.displayName || buyerData.email || 'Unknown',
      buyerEmail: context.auth.token.email,
      sellerName: listing.sellerName || 'Unknown',
      sellerEmail: sellerProfile.data().email || 'Unknown'
    };
    
    // Create Stripe Checkout Session with Connect
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: listing.currency?.toLowerCase() || 'aud',
          product_data: {
            name: `${listing.card?.name || listing.cardName} - ${listing.card?.set || listing.setName}`,
            description: `${listing.card?.grade || listing.grade} ${listing.card?.gradingCompany || listing.gradingCompany}`,
            images: listing.card?.imageUrl ? [listing.card.imageUrl] : []
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${data.successUrl || 'https://www.mycardtracker.com.au/dashboard/marketplace'}?order=${orderId}&success=true`,
      cancel_url: `${data.cancelUrl || 'https://www.mycardtracker.com.au/dashboard/marketplace'}?order=${orderId}&cancelled=true`,
      metadata: {
        orderId: orderId,
        listingId: listingId,
        buyerId: buyerId,
        sellerId: sellerId
      },
      payment_intent_data: {
        application_fee_amount: platformFee.amount,
        transfer_data: {
          destination: connectedAccountId
        }
      }
    });
    
    // Update order with Stripe session info
    orderData.stripeSessionId = session.id;
    await orderRef.create(orderData);
    
    console.log('✅ Marketplace purchase session created:', {
      orderId,
      sessionId: session.id,
      amount: amount / 100,
      platformFee: platformFee.amount / 100,
      sellerPayout: sellerPayout / 100
    });
    
    return {
      success: true,
      checkoutUrl: session.url,
      orderId: orderId,
      sessionId: session.id
    };
    
  } catch (error) {
    console.error('💥 Error processing marketplace purchase:', error);
    throw new HttpsError('internal', `Failed to process purchase: ${error.message}`);
  }
});

/**
 * Webhook handler for Stripe Connect events
 */
exports.stripeConnectWebhook = functions.https.onRequest(async (req, res) => {
  console.log('🔔 Stripe Connect webhook received');
  
  try {
    const stripe = initializeStripe();
    const config = getStripeConfig();
    
    if (!config.webhookSecret) {
      console.error('❌ Connect webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }
    
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      event = stripe.webhooks.constructEvent(rawBody, sig, config.webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    console.log(`📨 Processing event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      default:
        console.log(`📋 Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('💥 Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

/**
 * Handle successful checkout session
 */
const handleCheckoutSessionCompleted = async (session) => {
  try {
    const orderId = session.metadata.orderId;
    
    if (!orderId) {
      console.error('❌ No order ID in session metadata');
      return;
    }
    
    const orderRef = admin.firestore().doc(`marketplaceOrders/${orderId}`);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      console.error('❌ Order not found:', orderId);
      return;
    }
    
    // Update order status
    await orderRef.update({
      status: 'paid',
      stripePaymentIntentId: session.payment_intent,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Mark listing as sold
    const orderData = orderDoc.data();
    const listingRef = admin.firestore().collectionGroup('marketplace-listings')
      .where('id', '==', orderData.listingId);
    const listingSnapshot = await listingRef.get();
    
    if (!listingSnapshot.empty) {
      const listingDoc = listingSnapshot.docs[0];
      await listingDoc.ref.update({
        status: 'sold',
        soldAt: admin.firestore.FieldValue.serverTimestamp(),
        soldTo: orderData.buyerId
      });
    }
    
    console.log('✅ Order marked as paid:', orderId);
    
  } catch (error) {
    console.error('💥 Error handling checkout completion:', error);
  }
};

/**
 * Handle account updates (onboarding completion)
 */
const handleAccountUpdated = async (account) => {
  try {
    // Find user with this connected account ID
    const profilesRef = admin.firestore().collection('marketplaceProfiles');
    const snapshot = await profilesRef.where('stripeConnectedAccountId', '==', account.id).get();
    
    if (snapshot.empty) {
      console.log('📋 No user found for account:', account.id);
      return;
    }
    
    const userDoc = snapshot.docs[0];
    
    // Update onboarding status
    await userDoc.ref.update({
      onboardingComplete: account.details_submitted && account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Account status updated:', account.id);
    
  } catch (error) {
    console.error('💥 Error handling account update:', error);
  }
};

/**
 * Handle successful payment intent
 */
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  try {
    // Update order with payment details if needed
    console.log('✅ Payment succeeded:', paymentIntent.id);
    
  } catch (error) {
    console.error('💥 Error handling payment success:', error);
  }
};
