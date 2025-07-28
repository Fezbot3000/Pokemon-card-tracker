#!/bin/bash

# Production deployment script with CPU configuration fix
echo "🚀 Starting production deployment..."

# Set error handling
set -e

# Function to handle deployment with fallback strategies
deploy_with_fallback() {
    echo "📦 Attempting deployment..."
    
    # Try full deployment first
    if firebase deploy --project mycardtracker-c8479 --non-interactive --force; then
        echo "✅ Full deployment successful!"
        return 0
    fi
    
    echo "⚠️  Full deployment failed, trying individual services..."
    
    # Try deploying individual services (excluding functions)
    if firebase deploy --project mycardtracker-c8479 --non-interactive --only hosting,firestore,storage; then
        echo "✅ Core services deployed successfully!"
        
        # Try functions separately with explicit gen1 configuration
        echo "🔄 Attempting functions deployment..."
        if firebase deploy --project mycardtracker-c8479 --non-interactive --only functions; then
            echo "✅ Functions deployed successfully!"
            return 0
        else
            echo "⚠️  Functions deployment failed, but core services are deployed"
            echo "🔧 You may need to manually fix the CPU configuration issue"
            return 1
        fi
    fi
    
    echo "❌ All deployment strategies failed"
    return 1
}

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: firebase.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Error: Not logged into Firebase. Please run: firebase login"
    exit 1
fi

# Build the React app
echo "🔨 Building React app..."
npm run build:prod

# Deploy with fallback strategies
if deploy_with_fallback; then
    echo "🎉 Deployment completed successfully!"
else
    echo "💥 Deployment failed. Please check the error messages above."
    echo "🔧 Common solutions:"
    echo "   1. Check Firebase project settings for CPU configuration"
    echo "   2. Ensure functions are configured for 1st generation"
    echo "   3. Try deploying functions manually: firebase deploy --only functions"
    exit 1
fi 