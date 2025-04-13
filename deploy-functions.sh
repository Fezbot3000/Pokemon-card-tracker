#!/bin/bash

# Script to deploy Firebase Cloud Functions for Pokemon Card Tracker

# Check if the Stripe secret key is provided
if [ -z "$1" ]; then
  echo "Error: Stripe secret key is required"
  echo "Usage: $0 <stripe_secret_key> [webhook_secret]"
  exit 1
fi

STRIPE_SECRET_KEY=$1
WEBHOOK_SECRET=${2:-""}

echo "⚙️ Setting up Stripe configuration..."
firebase functions:config:set stripe.secret_key="$STRIPE_SECRET_KEY"

# Set webhook secret if provided
if [ ! -z "$WEBHOOK_SECRET" ]; then
  firebase functions:config:set stripe.webhook_secret="$WEBHOOK_SECRET"
  echo "✅ Stripe webhook secret has been configured."
fi

echo "🛠️ Installing dependencies..."
cd functions
npm install

echo "🚀 Deploying functions..."
firebase deploy --only functions

echo ""
echo "✅ Functions deployed successfully!"
echo ""
echo "Your cloud functions are now live. To test the subscription status check function, you can use the Firebase Console or call it from your app."
echo "Remember to call the function using Firebase Functions SDK:"
echo ""
echo "  import { getFunctions, httpsCallable } from 'firebase/functions';"
echo "  const functions = getFunctions();"
echo "  const checkSubscription = httpsCallable(functions, 'checkSubscriptionStatus');"
echo "  const result = await checkSubscription({ userId: 'user-id-here' });"
echo "" 