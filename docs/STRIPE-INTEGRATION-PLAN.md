# Stripe Integration - Final Step Implementation

> **⚠️ REQUIRES UPDATES**: This document needs to be updated with current Stripe implementation status. The actual implementation may differ from this plan.

## Current Status: 95% COMPLETE ✅

**Everything is already set up except one thing: the "Upgrade Now" button doesn't actually work.**

### What's Already Working ✅
- ✅ **Stripe Backend**: Live keys configured in Firebase Functions
- ✅ **Stripe Frontend**: Publishable key and price IDs in environment variables  
- ✅ **Subscription System**: Complete feature gating, trial management, status tracking
- ✅ **Database Integration**: Firestore subscription data management
- ✅ **UI Components**: Upgrade modals, trial banners, feature gates all built
- ✅ **Debug System**: Comprehensive subscription testing capabilities
- ✅ **Webhook Endpoint**: Configured in Stripe (needs URL update)

### What's Broken ❌
1. **"Upgrade Now" button** shows TODO message instead of redirecting to Stripe
2. **Missing Firebase Functions**: `createCheckoutSession` and `stripeWebhook` were deleted
3. **Webhook URL**: Points to wrong endpoint

## Final Implementation Steps

### Step 1: Recreate Missing Firebase Functions (30 minutes)

**Add to `functions/index.js`:**

```javascript
// Stripe Integration
const stripe = require('stripe')(functions.config().stripe.secret_key);

// Create Checkout Session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: 'price_YOUR_PREMIUM_PLAN_PRICE_ID', // Get from Stripe dashboard
        quantity: 1,
      }],
      customer_email: context.auth.token.email,
      metadata: { userId: context.auth.uid },
      success_url: 'https://www.mycardtracker.com.au/dashboard?upgraded=true',
      cancel_url: 'https://www.mycardtracker.com.au/upgrade?cancelled=true',
    });

    return { url: session.url };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

// Stripe Webhook
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, functions.config().stripe.webhook_secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    
    // Update user subscription to premium
    await admin.firestore().doc(`users/${userId}`).update({
      subscriptionStatus: 'premium',
      planType: 'premium',
      customerId: session.customer,
      subscriptionId: session.subscription,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  res.json({received: true});
});
```

### Step 2: Connect "Upgrade Now" Button (15 minutes)

**Update `src/components/UpgradeModal.js` and `src/components/UpgradePage.js`:**

Replace the TODO handleUpgrade function:
```javascript
const handleUpgrade = async () => {
  if (!user) {
    toast.error('Please log in to upgrade');
    return;
  }

  setLoading(true);
  
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../firebase');
    
    const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
    const result = await createCheckoutSession();
    
    // Redirect to Stripe Checkout
    window.location.href = result.data.url;
  } catch (error) {
    console.error('Upgrade error:', error);
    toast.error('Failed to start checkout process');
    setLoading(false);
  }
};
```

### Step 3: Update Stripe Webhook URL (5 minutes)

**In Stripe Dashboard:**
- Change webhook URL from: `https://www.mycardtracker.com.au/api/stripe-webhook`
- To: `https://us-central1-mycardtracker-c8479.cloudfunctions.net/stripeWebhook`

## Implementation Timeline

**TOTAL TIME: 50 MINUTES**

### ✅ Step 1: Add Stripe Functions (30 minutes)
- [ ] Add `createCheckoutSession` function to `functions/index.js`
- [ ] Add `stripeWebhook` function to `functions/index.js`  
- [ ] Install Stripe npm package: `npm install stripe`
- [ ] Deploy functions: `firebase deploy --only functions`

### ✅ Step 2: Connect Frontend (15 minutes)
- [ ] Update `handleUpgrade` function in `UpgradeModal.js`
- [ ] Update `handleUpgrade` function in `UpgradePage.js`
- [ ] Test "Upgrade Now" button redirects to Stripe

### ✅ Step 3: Fix Webhook URL (5 minutes)
- [ ] Update webhook URL in Stripe dashboard
- [ ] Test webhook receives events correctly

**That's it. The "Upgrade Now" button will work.**

## Notes

- **Price ID**: You'll need to get the actual Stripe Price ID from your dashboard for the Premium Plan
- **Testing**: Use the SubscriptionDebug component to test the full flow
- **Success**: When payment completes, user subscription status will automatically update to 'premium'
- **Existing System**: All feature gates, trial management, and UI components will immediately work with premium status

---

## Summary

**Current State**: 95% complete subscription system with non-functional "Upgrade Now" button  
**Final Step**: 50 minutes of work to connect Stripe payment processing  
**Result**: Fully functional upgrade flow from trial/free to premium subscription 