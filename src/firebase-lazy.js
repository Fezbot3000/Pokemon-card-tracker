// Lazy Firebase initialization - auth only loads when needed
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import logger from './utils/logger';

// Import the env validation
import './env';

/**
 * Validate that a required environment variable is present
 */
const requireEnvVar = (envVar, description) => {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${envVar} (${description}). Please check your .env file.`
    );
  }
  return value;
};

// Firebase configuration from environment variables only
const firebaseConfig = {
  apiKey: requireEnvVar('REACT_APP_FIREBASE_API_KEY', 'Firebase API Key'),
  authDomain: requireEnvVar(
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'Firebase Auth Domain'
  ),
  projectId: requireEnvVar(
    'REACT_APP_FIREBASE_PROJECT_ID',
    'Firebase Project ID'
  ),
  storageBucket: requireEnvVar(
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'Firebase Storage Bucket'
  ),
  messagingSenderId: requireEnvVar(
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'Firebase Messaging Sender ID'
  ),
  appId: requireEnvVar('REACT_APP_FIREBASE_APP_ID', 'Firebase App ID'),
};

// Initialize Firebase app (lightweight)
const app = initializeApp(firebaseConfig);

// Initialize non-auth services immediately (these are lightweight)
const db = initializeFirestore(app, {
  cache: {
    sizeBytes: CACHE_SIZE_UNLIMITED,
  },
});

const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');

// Lazy initialization for auth services (these trigger heavy iframe loading)
let auth = null;
let googleProvider = null;

/**
 * Lazy load Firebase Auth only when needed
 * This eliminates the 90.31 KiB, 2,966ms critical path delay
 */
export const getFirebaseAuth = async () => {
  if (!auth) {
    const { 
      getAuth, 
      GoogleAuthProvider, 
      setPersistence, 
      browserLocalPersistence 
    } = await import('firebase/auth');
    
    auth = getAuth(app);
    
    // Set persistence
    try {
      await setPersistence(auth, browserLocalPersistence);
      logger.debug('Auth persistence set to local (lazy loaded)');
    } catch (error) {
      logger.error('Error setting auth persistence (lazy loaded):', error);
    }
    
    // Initialize Google provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    // Configure Google OAuth client ID if available
    const googleClientId = process.env.REACT_APP_FIREBASE_CLIENT_ID;
    if (googleClientId) {
      googleProvider.setCustomParameters({
        client_id: googleClientId,
        prompt: 'select_account',
      });
    }
    
    logger.debug('Firebase Auth lazy loaded successfully');
  }
  return auth;
};

/**
 * Lazy load Google Auth Provider
 */
export const getGoogleProvider = async () => {
  if (!googleProvider) {
    await getFirebaseAuth(); // This will initialize the provider
  }
  return googleProvider;
};

// Export immediate services
export { db, storage, functions };
export default app; 
