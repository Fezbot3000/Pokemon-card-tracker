# Stripe Environment Variables Setup Guide

## Issue: "Failed to start checkout process"

The checkout process is failing because the required Stripe environment variables are not set in your development environment.

## Required Environment Variables

You need to set these environment variables in your system:

### 1. Stripe Publishable Key
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 2. Stripe Premium Plan Price ID
```
REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID=price_your_price_id_here
```

## How to Set Environment Variables

### Option 1: Create a `.env` file (Recommended)
1. Create a `.env` file in your project root (same directory as `package.json`)
2. Add the following lines:

```env
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID=price_your_price_id_here

# Firebase Configuration (if not already set)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Option 2: Set System Environment Variables (Windows)
1. Open PowerShell as Administrator
2. Run these commands:

```powershell
[System.Environment]::SetEnvironmentVariable('REACT_APP_STRIPE_PUBLISHABLE_KEY', 'pk_test_your_key_here', 'User')
[System.Environment]::SetEnvironmentVariable('REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID', 'price_your_price_id', 'User')
```

3. Restart your development server

## Getting Your Stripe Keys

### 1. Stripe Publishable Key
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** > **API Keys**
3. Copy the **Publishable key** (starts with `pk_test_` for test mode)

### 2. Stripe Price ID
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** > **Pricing**
3. Find your Premium Plan product
4. Copy the **Price ID** (starts with `price_`)

## Firebase Functions Configuration

The Firebase Functions also need Stripe configuration. Run these commands:

```bash
# Set Stripe secret key in Firebase Functions
firebase functions:config:set stripe.secret_key="sk_test_your_secret_key_here"

# Set Stripe price ID in Firebase Functions
firebase functions:config:set stripe.premium_plan_price_id="price_your_price_id_here"

# Set webhook secret (if using webhooks)
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret"

# Deploy the functions with new config
firebase deploy --only functions
```

## Testing the Setup

1. After setting the environment variables, restart your development server:
   ```bash
   npm start
   ```

2. Open the browser console and try the upgrade process
3. Check the detailed logs that have been added to see exactly where the process fails

## Debug Component

Use the `SubscriptionDebug` component to test your configuration:

1. Navigate to your app
2. Open browser console
3. Look for the debug component (should be visible in development)
4. Click "Check Environment" to verify all variables are set
5. Click "Test Stripe" to verify Stripe connection
6. Click "Test Firebase Function" to verify server-side configuration

## Common Issues

### Issue: Environment variables not loading
- **Solution**: Restart your development server after setting variables
- **Solution**: Make sure `.env` file is in the project root
- **Solution**: Check that variable names start with `REACT_APP_`

### Issue: Firebase Functions configuration missing
- **Solution**: Run the `firebase functions:config:set` commands above
- **Solution**: Deploy functions after setting config

### Issue: Stripe keys are invalid
- **Solution**: Verify keys are copied correctly from Stripe Dashboard
- **Solution**: Make sure you're using test keys for development

## Next Steps

1. Set the environment variables using one of the methods above
2. Restart your development server
3. Test the upgrade process again
4. Check the browser console for the detailed logs
5. If still failing, check the Firebase Functions logs: `firebase functions:log` 