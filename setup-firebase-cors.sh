#!/bin/bash

# Firebase Storage CORS Configuration Script
# This script applies CORS settings to Firebase Storage to allow uploads from production domain

echo "🔧 Setting up Firebase Storage CORS configuration..."

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed. Please install Google Cloud SDK first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if firebase-storage-cors.json exists
if [ ! -f "firebase-storage-cors.json" ]; then
    echo "❌ Error: firebase-storage-cors.json not found in current directory"
    exit 1
fi

# Get the Firebase project ID from environment or use default
PROJECT_ID=${REACT_APP_FIREBASE_PROJECT_ID:-"mycardtracker-c8479"}
STORAGE_BUCKET="${PROJECT_ID}.firebasestorage.app"

echo "📋 Applying CORS configuration to bucket: $STORAGE_BUCKET"

# Apply CORS configuration to Firebase Storage
gsutil cors set firebase-storage-cors.json gs://$STORAGE_BUCKET

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo "🔍 Verifying CORS configuration..."
    gsutil cors get gs://$STORAGE_BUCKET
else
    echo "❌ Failed to apply CORS configuration"
    echo "Make sure you're authenticated with Google Cloud:"
    echo "  gcloud auth login"
    echo "  gcloud config set project $PROJECT_ID"
    exit 1
fi

echo ""
echo "🎉 Firebase Storage CORS setup complete!"
echo "Your production domain should now be able to upload files to Firebase Storage."
