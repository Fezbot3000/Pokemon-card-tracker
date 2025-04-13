// Basic Firebase initialization without any extra complexity
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the env validation
import './env';

// DEBUGGING ONLY: Log API key info - remove before production
if (process.env.NODE_ENV === 'development') {
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY || '';
  console.log('DEBUG - API Key length:', apiKey.length);
  console.log('DEBUG - API Key first 5 chars:', apiKey.substring(0, 5));
  console.log('DEBUG - API Key last 5 chars:', apiKey.substring(apiKey.length - 5));
  
  // Check for any hidden characters or whitespace
  const hasWhitespace = /\s/.test(apiKey);
  console.log('DEBUG - API Key has whitespace:', hasWhitespace);
  
  // Test fetch to see if API key works
  fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${apiKey}`)
    .then(response => {
      console.log('DEBUG - API Key test response status:', response.status);
      return response.json().catch(() => ({ error: 'Failed to parse response' }));
    })
    .then(data => {
      if (data.error) {
        console.error('DEBUG - API Key test error:', data.error);
      } else {
        console.log('DEBUG - API Key test success');
      }
    })
    .catch(error => {
      console.error('DEBUG - API Key test fetch error:', error);
    });
}

// Basic Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Log environment variables for debugging
console.log('Firebase config keys available:', 
  Object.keys(firebaseConfig).map(key => `${key}: ${!!firebaseConfig[key]}`).join(', ')
);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Add the client ID for restricted API keys
if (process.env.REACT_APP_FIREBASE_CLIENT_ID) {
  googleProvider.setCustomParameters({
    client_id: process.env.REACT_APP_FIREBASE_CLIENT_ID,
    prompt: 'select_account'
  });
  console.log('Google provider configured with client ID:', !!process.env.REACT_APP_FIREBASE_CLIENT_ID);
} else {
  console.error('Missing CLIENT_ID for Google provider');
}

export { app, auth, db, storage, googleProvider }; 