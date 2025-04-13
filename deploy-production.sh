#!/bin/bash

# Production deployment script for Pokemon Card Tracker

echo "🚀 Starting production deployment..."

# Build the frontend with production environment
echo "📦 Building frontend with production environment..."
npm run build

# Install dependencies for the server
echo "📦 Installing server dependencies..."
cd server
npm install --production
cd ..

# Create a distribution package
echo "📋 Creating distribution package..."
mkdir -p dist
cp -r build/* dist/
mkdir -p dist/api
cp -r server/*.js server/package.json dist/api/

# Create production .env file for the API
echo "⚙️ Setting up environment files..."
cat > dist/api/.env << EOL
# Firebase Configuration
FIREBASE_PROJECT_ID=mycardtracker-c8479
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json

# Client URL (for production)
CLIENT_URL=https://www.mycardtracker.com.au

# Server Configuration
PORT=8080
NODE_ENV=production
EOL

echo "✅ Deployment package prepared successfully!"
echo ""
echo "To deploy to production server:"
echo "1. Upload the 'dist' directory to your production server"
echo "2. Set up NGINX or another web server to:"
echo "   - Serve static files from the dist directory"
echo "   - Proxy requests to /api/* to http://localhost:8080/*"
echo "3. On the server, run: cd dist/api && npm install && node server.js"
echo ""
echo "You can also deploy to a service like Vercel, Netlify, or Firebase Hosting for the frontend"
echo "and deploy the server to a service like Heroku, Railway, or Firebase Functions." 