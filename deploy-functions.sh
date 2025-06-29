#!/bin/bash

# Deploy Firebase Cloud Functions
echo "🚀 Deploying Firebase Cloud Functions..."

# Deploy functions
firebase deploy --only functions

echo "✅ Firebase Cloud Functions deployed successfully!"
echo ""
echo "Your cloud functions are now live and ready to use." 