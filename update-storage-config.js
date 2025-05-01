/**
 * Firebase Storage Configuration Update Script
 * 
 * This script updates the Firebase Storage bucket configuration in your
 * environment files and deployment settings.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const OLD_BUCKET = 'mycardtracker-c8479.appspot.com';
const NEW_BUCKET = 'mycardtracker-c8479.firebasestorage.app';
const PROJECT_ID = 'mycardtracker-c8479';

console.log('🔧 Firebase Storage Configuration Update');
console.log('=======================================');
console.log(`Updating storage bucket from: ${OLD_BUCKET}`);
console.log(`                          to: ${NEW_BUCKET}`);
console.log();

// Update .env file if it exists
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('📝 Updating .env file...');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes(OLD_BUCKET)) {
      envContent = envContent.replace(
        `REACT_APP_FIREBASE_STORAGE_BUCKET=${OLD_BUCKET}`,
        `REACT_APP_FIREBASE_STORAGE_BUCKET=${NEW_BUCKET}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file updated successfully');
    } else {
      console.log('ℹ️ .env file already using correct storage bucket or format not found');
    }
  } else {
    console.log('ℹ️ No .env file found');
  }
} catch (error) {
  console.error('❌ Error updating .env file:', error);
}

// Check for production environment files
const prodEnvPath = path.resolve(process.cwd(), '.env.production');
if (fs.existsSync(prodEnvPath)) {
  try {
    console.log('📝 Updating .env.production file...');
    let envContent = fs.readFileSync(prodEnvPath, 'utf8');
    
    if (envContent.includes(OLD_BUCKET)) {
      envContent = envContent.replace(
        `REACT_APP_FIREBASE_STORAGE_BUCKET=${OLD_BUCKET}`,
        `REACT_APP_FIREBASE_STORAGE_BUCKET=${NEW_BUCKET}`
      );
      fs.writeFileSync(prodEnvPath, envContent);
      console.log('✅ .env.production file updated successfully');
    } else {
      console.log('ℹ️ .env.production file already using correct storage bucket or format not found');
    }
  } catch (error) {
    console.error('❌ Error updating .env.production file:', error);
  }
}

// Update Firebase storage CORS configuration
console.log('\n📝 Updating Firebase Storage CORS configuration...');
console.log('This will apply the CORS settings to the correct storage bucket.');

try {
  // Check if firebase-storage-cors.json exists
  const corsFilePath = path.resolve(process.cwd(), 'firebase-storage-cors.json');
  if (fs.existsSync(corsFilePath)) {
    console.log('✅ Found firebase-storage-cors.json file');
    
    // Check if gsutil is available
    try {
      console.log('🔍 Checking for gsutil...');
      execSync('gsutil --version', { stdio: 'ignore' });
      console.log('✅ gsutil is available');
      
      // Apply CORS configuration to the correct bucket
      console.log(`📤 Applying CORS configuration to gs://${NEW_BUCKET}...`);
      try {
        execSync(`gsutil cors set firebase-storage-cors.json gs://${NEW_BUCKET}`, { 
          stdio: 'inherit' 
        });
        console.log('✅ CORS configuration applied successfully');
      } catch (error) {
        console.error('❌ Error applying CORS configuration:', error.message);
      }
    } catch (error) {
      console.error('❌ gsutil not found. Please install Google Cloud SDK and try again.');
      console.log('   See: https://cloud.google.com/sdk/docs/install');
    }
  } else {
    console.log('❌ firebase-storage-cors.json not found');
  }
} catch (error) {
  console.error('❌ Error updating CORS configuration:', error);
}

console.log('\n🚀 Configuration update complete!');
console.log('\nNext steps:');
console.log('1. Rebuild your application: npm run build');
console.log('2. Deploy to production using your deployment script');
console.log('   ./deploy-production.sh');
