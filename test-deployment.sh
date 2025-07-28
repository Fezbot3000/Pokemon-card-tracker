#!/bin/bash

# Test deployment script to identify CPU configuration issues
echo "🧪 Testing Firebase deployment to identify CPU configuration issue..."

# Set error handling
set -e

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Current Firebase configuration:"
cat firebase.json

echo ""
echo "🔍 Checking functions configuration..."

# Check functions package.json
echo "📦 Functions package.json:"
cat functions/package.json

echo ""
echo "🔄 Testing functions deployment..."

# Try to deploy functions with verbose output
echo "📤 Attempting functions deployment with verbose output..."
if firebase deploy --project mycardtracker-c8479 --non-interactive --only functions --debug; then
    echo "✅ Functions deployment successful!"
else
    echo "❌ Functions deployment failed"
    echo ""
    echo "🔧 The error suggests a CPU configuration issue with 1st generation functions."
    echo "   This typically happens when:"
    echo "   1. CPU configuration is set in Firebase project settings"
    echo "   2. Functions are configured for 2nd generation but deployed as 1st generation"
    echo "   3. There's a mismatch between local and remote configuration"
    echo ""
    echo "💡 Solutions to try:"
    echo "   1. Check Firebase Console > Functions for CPU settings"
    echo "   2. Remove any CPU configuration from functions"
    echo "   3. Upgrade functions to 2nd generation if needed"
    echo "   4. Use the fix-firebase-deployment.sh script"
    exit 1
fi

echo ""
echo "🎉 Test completed successfully!" 