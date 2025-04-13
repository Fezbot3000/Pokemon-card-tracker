// Comprehensive Firebase configuration checker
// Run with: node check-firebase-config.js

const dotenv = require('dotenv');
const fetch = require('node-fetch');
const fs = require('fs');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the API key
const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;

console.log('\n🔍 Firebase Configuration Checker 🔍\n');

// Check if API key is defined
if (!apiKey) {
  console.error('❌ API key is not defined in .env.local');
  process.exit(1);
}

// Log API key info
console.log(`API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
console.log(`Length: ${apiKey.length} characters`);

// Check for whitespace
const hasWhitespace = /\s/.test(apiKey);
if (hasWhitespace) {
  console.error('❌ API key contains whitespace characters. This will cause issues.');
  
  // Try to fix by trimming
  const trimmedKey = apiKey.trim();
  console.log(`Suggested fix: ${trimmedKey}`);
  
  // Update .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const updatedContent = envContent.replace(
    /REACT_APP_FIREBASE_API_KEY=.*/,
    `REACT_APP_FIREBASE_API_KEY=${trimmedKey}`
  );
  
  fs.writeFileSync('.env.local', updatedContent);
  console.log('✅ Fixed: Removed whitespace from API key in .env.local');
} else {
  console.log('✅ API key does not contain whitespace');
}

// Test the Identity Toolkit API
async function testIdentityToolkitAPI() {
  try {
    console.log('\nTesting Identity Toolkit API...');
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`
    );
    
    if (response.ok) {
      console.log('✅ Identity Toolkit API access is working!');
      return true;
    } else {
      const data = await response.json();
      console.error('❌ Identity Toolkit API access failed:', data.error?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing Identity Toolkit API:', error.message);
    return false;
  }
}

// Test Firebase project configuration
async function testFirebaseProjectConfig() {
  try {
    console.log('\nTesting Firebase Project Configuration...');
    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Firebase project configuration is accessible');
      console.log('Project details:');
      console.log(`- Project ID: ${data.projectId}`);
      console.log(`- API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
      
      if (data.authorizedDomains && data.authorizedDomains.length > 0) {
        console.log('Authorized domains:');
        data.authorizedDomains.forEach(domain => {
          console.log(`- ${domain}`);
        });
        
        // Check for localhost
        if (!data.authorizedDomains.includes('localhost')) {
          console.warn('⚠️ localhost is not in the list of authorized domains');
          console.log('You need to add localhost in Firebase Console > Authentication > Settings > Authorized domains');
        } else {
          console.log('✅ localhost is properly authorized');
        }
      } else {
        console.warn('⚠️ No authorized domains found');
      }
      
      return true;
    } else {
      const data = await response.json();
      console.error('❌ Firebase project configuration access failed:', data.error?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing Firebase project configuration:', error.message);
    return false;
  }
}

// Provide guidance based on test results
async function runAllTests() {
  const identityToolkitResult = await testIdentityToolkitAPI();
  const projectConfigResult = await testFirebaseProjectConfig();
  
  console.log('\n📋 Test Results Summary:');
  console.log(`Identity Toolkit API: ${identityToolkitResult ? '✅ Working' : '❌ Failed'}`);
  console.log(`Project Configuration: ${projectConfigResult ? '✅ Working' : '❌ Failed'}`);
  
  if (!identityToolkitResult || !projectConfigResult) {
    console.log('\n🛠️ Troubleshooting Steps:');
    console.log('1. Verify your API key is correct and not expired');
    console.log('2. Ensure the Identity Toolkit API is enabled in Google Cloud Console');
    console.log('3. Check API key restrictions in Google Cloud Console');
    console.log('4. Make sure localhost is added to authorized domains in Firebase Console');
    console.log('5. Try generating a new API key in Google Cloud Console');
  } else {
    console.log('\n🎉 All tests passed! Your Firebase configuration appears to be working correctly.');
  }
}

runAllTests(); 