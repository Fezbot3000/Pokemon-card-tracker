// Basic Firebase initialization without any extra complexity
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Import the env validation
import './env';

/**
 * Validate that a required environment variable is present
 * @param {string} envVar - The environment variable name
 * @param {string} description - Human-readable description of the variable
 * @returns {string} - The environment variable value
 * @throws {Error} - If the environment variable is not set
 */
const requireEnvVar = (envVar, description) => {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVar} (${description}). Please check your .env file.`);
  }
  return value;
};

// Firebase configuration from environment variables only
const firebaseConfig = {
  apiKey: requireEnvVar('REACT_APP_FIREBASE_API_KEY', 'Firebase API Key'),
  authDomain: requireEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN', 'Firebase Auth Domain'),
  projectId: requireEnvVar('REACT_APP_FIREBASE_PROJECT_ID', 'Firebase Project ID'),
  storageBucket: requireEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET', 'Firebase Storage Bucket'),
  messagingSenderId: requireEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', 'Firebase Messaging Sender ID'),
  appId: requireEnvVar('REACT_APP_FIREBASE_APP_ID', 'Firebase App ID')
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with new persistence API
const db = initializeFirestore(app, {
  cache: {
    sizeBytes: CACHE_SIZE_UNLIMITED
  }
});

const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const functions = getFunctions(app, 'us-central1'); // Specify the region where functions are deployed

// Configure Google provider
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Configure Google OAuth client ID if available
const googleClientId = process.env.REACT_APP_FIREBASE_CLIENT_ID;
if (googleClientId) {
  googleProvider.setCustomParameters({
    client_id: googleClientId,
    prompt: 'select_account'
  });
}

// Set persistence for authentication
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence set to local');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Export Firebase services
export { db, storage, auth, googleProvider, functions };
export default app;
