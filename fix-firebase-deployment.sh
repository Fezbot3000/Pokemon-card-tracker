#!/bin/bash

echo "🔧 Fixing Firebase deployment issues..."

# Delete the orphaned Firebase function that's causing deployment to fail
echo "🗑️  Deleting orphaned Firebase function..."
npx firebase functions:delete pokemonTcgLookup --region us-central1 --force

# Update firebase-functions to latest version
echo "📦 Updating firebase-functions..."
cd functions
npm install firebase-functions@latest --save
cd ..

echo "✅ Firebase deployment fixes complete!"
echo ""
echo "🚀 You can now run: npm run deploy:prod" 