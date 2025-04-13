#!/bin/bash

# Clear terminal
clear

echo "🧹 Cleaning up..."
# Kill any running development servers
pkill -f "react-scripts start" || true

# Clear browser caches related to localhost
echo "ℹ️ Consider clearing your browser cache for localhost"

# Clear React cache
echo "🗑️ Clearing cache..."
rm -rf node_modules/.cache

# Clear IndexedDB in Chrome (only works if Chrome is closed)
echo "ℹ️ Consider clearing IndexedDB from your browser's developer tools"

# Check environment variables
echo "🔍 Checking environment variables..."
grep -v "^#" .env.local | grep -v "^$"

# Restart the development server
echo "🚀 Starting development server..."
export PORT=5834  # Use a different port to avoid conflicts
npm run start 