#!/bin/bash

# Production deployment script for Pokemon Card Tracker

echo "🚀 Starting production deployment..."

# Build the frontend with production environment
echo "📦 Building frontend with production environment..."
npm run build

# Create a distribution package
echo "📋 Creating distribution package..."
mkdir -p dist
cp -r build/* dist/

echo "✅ Frontend build completed successfully!"
echo ""
echo "To deploy to production:"
echo "1. Upload the 'dist' directory to your web server"
echo "2. Configure your web server to serve the static files"
echo "3. Set up proper HTTPS and caching headers"
echo ""
echo "For Firebase Hosting deployment, use:"
echo "npm run deploy:hosting" 