/**
 * Firebase Storage Bucket Update Script
 * 
 * This script updates the Firebase Storage bucket name in your application
 * by modifying the appropriate configuration files.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const OLD_BUCKET = 'mycardtracker-c8479.appspot.com';
const NEW_BUCKET = 'mycardtracker-c8479.firebasestorage.app';

// Update .env file if it exists
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Updating .env file...');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      `REACT_APP_FIREBASE_STORAGE_BUCKET=${OLD_BUCKET}`,
      `REACT_APP_FIREBASE_STORAGE_BUCKET=${NEW_BUCKET}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully');
  }
} catch (error) {
  console.error('Error updating .env file:', error);
}

// Check if there's a hardcoded fallback in any config files
const configFiles = [
  'src/config/secrets.js',
  'src/config/firebase.js',
  'src/firebase.js',
  'src/services/firebase.js'
];

configFiles.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`Checking ${filePath}...`);
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for hardcoded storage bucket
      if (content.includes(OLD_BUCKET)) {
        content = content.replace(
          new RegExp(OLD_BUCKET, 'g'),
          NEW_BUCKET
        );
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated storage bucket in ${filePath}`);
      }
    } catch (error) {
      console.error(`Error updating ${filePath}:`, error);
    }
  }
});

console.log('\nStorage bucket update complete!');
console.log('\nNext steps:');
console.log('1. Rebuild your application: npm run build');
console.log('2. Deploy to production using your deployment script');
console.log('   ./deploy-production.sh');
