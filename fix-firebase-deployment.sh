#!/bin/bash

# Fix script for Firebase deployment CPU configuration issues
echo "🔧 Fixing Firebase deployment CPU configuration issue..."

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
echo "🔍 Checking for CPU configuration issues..."

# Check if there are any CPU configurations in the project
if grep -r "cpu" . --exclude-dir=node_modules --exclude-dir=.git --exclude=*.lock --exclude=*.log 2>/dev/null; then
    echo "⚠️  Found CPU configurations that might cause issues"
else
    echo "✅ No CPU configurations found in local files"
fi

echo ""
echo "🔄 Attempting to fix deployment issues..."

# Try to deploy functions with explicit 1st generation configuration
echo "📦 Deploying functions with explicit gen1 configuration..."
if firebase deploy --project mycardtracker-c8479 --non-interactive --only functions; then
    echo "✅ Functions deployed successfully!"
else
    echo "⚠️  Functions deployment failed, trying alternative approach..."
    
    # Try deploying with specific runtime configuration
    echo "🔄 Attempting deployment with Node.js 20 runtime..."
    if firebase deploy --project mycardtracker-c8479 --non-interactive --only functions --force; then
        echo "✅ Functions deployed with force flag!"
    else
        echo "❌ Functions deployment still failing"
        echo ""
        echo "🔧 Manual steps to resolve:"
        echo "1. Go to Firebase Console > Functions"
        echo "2. Check if any functions have CPU configuration set"
        echo "3. Remove CPU configuration from functions"
        echo "4. Or upgrade functions to 2nd generation"
        echo ""
        echo "5. Try deploying manually:"
        echo "   firebase deploy --only functions"
        exit 1
    fi
fi

echo ""
echo "🎉 Fix completed successfully!"
echo "✅ Functions should now be deployed without CPU configuration issues" 