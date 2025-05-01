// Simple script to test if environment variables are being loaded correctly
require('dotenv').config();

console.log('Testing environment variables:');
console.log('API Key:', process.env.REACT_APP_FIREBASE_API_KEY);
console.log('Auth Domain:', process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
console.log('Project ID:', process.env.REACT_APP_FIREBASE_PROJECT_ID);
console.log('Storage Bucket:', process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
console.log('Messaging Sender ID:', process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
console.log('App ID:', process.env.REACT_APP_FIREBASE_APP_ID);
