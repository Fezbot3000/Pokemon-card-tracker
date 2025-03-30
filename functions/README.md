# Firebase Cloud Functions for Subscription Management

This directory contains Firebase Cloud Functions for handling Stripe subscriptions in the Pokemon Card Tracker app.

## Available Functions

### `checkSubscriptionStatus`

Verifies a user's Stripe subscription status.

**Parameters:**
- `userId` (string): The Firebase user ID to check (if not provided, will use the authenticated user's ID)

**Returns:**
- Object with subscription status information:
  - `status`: One of 'active', 'free', or 'inactive'
  - `customer`: Stripe customer ID (if available)
  - `subscriptionId`: Stripe subscription ID (if available)
  - `plan`: Plan name (if available)

**Example usage:**
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Get Firebase Functions instance
const functions = getFunctions();

// Create a callable reference
const checkSubscription = httpsCallable(functions, 'checkSubscriptionStatus');

// Call the function
try {
  const result = await checkSubscription({ userId: 'user-id-here' });
  console.log('Subscription status:', result.data);
  
  // Check if user has premium access
  if (result.data.status === 'active') {
    // User has active paid subscription
  } else if (result.data.status === 'free') {
    // User has free plan
  } else {
    // User has no subscription
  }
} catch (error) {
  console.error('Error checking subscription:', error);
}
```

### `stripeWebhook`

Handles Stripe webhook events for subscription lifecycle management.

**Webhook events handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Deploying Functions

Use the provided deployment script:

```bash
./deploy-functions.sh YOUR_STRIPE_SECRET_KEY [WEBHOOK_SECRET]
```

Or manually configure and deploy:

```bash
# Set Stripe configuration
firebase functions:config:set stripe.secret_key="sk_live_your_key_here"
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"

# Install dependencies
cd functions
npm install

# Deploy
firebase deploy --only functions
```

## Setting Up Stripe Webhooks

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
4. Select events to subscribe to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret and set it in your Firebase config:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"
   ```

## Local Development

To run functions locally for testing:

```bash
# Install dependencies
npm install

# Get the Firebase config values for local use
firebase functions:config:get > .runtimeconfig.json

# Start the local emulator
firebase emulators:start --only functions
``` 