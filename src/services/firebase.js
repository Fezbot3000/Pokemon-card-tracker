import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Import environment validation to ensure all variables are loaded
import '../env';
import logger from '../utils/logger';
import { getFirebaseConfig, getGoogleClientId, getConfigSources } from '../config/secrets';

/**
 * Firebase Configuration
 * 
 * This configuration supports both environment variables for secure deployment
 * and hardcoded fallback values for backward compatibility.
 * 
 * In production environments, use environment variables:
 * - REACT_APP_FIREBASE_API_KEY
 * - REACT_APP_FIREBASE_AUTH_DOMAIN
 * - REACT_APP_FIREBASE_PROJECT_ID
 * - REACT_APP_FIREBASE_STORAGE_BUCKET
 * - REACT_APP_FIREBASE_MESSAGING_SENDER_ID
 * - REACT_APP_FIREBASE_APP_ID
 * - REACT_APP_FIREBASE_CLIENT_ID
 */

// Get Firebase config from centralized secrets manager
const firebaseConfig = getFirebaseConfig();

// Log configured source (environment or fallback) in development mode only
if (process.env.NODE_ENV === 'development') {
  logger.log("Firebase config sources:", getConfigSources().firebase);
}

// Check if Firebase app is already initialized to prevent multiple instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with persistence settings
let db;
try {
  // Always use getFirestore to avoid conflicts with multiple initialization
  db = getFirestore(app);
  
  if (process.env.NODE_ENV === 'development') {
    logger.log("Firestore initialized successfully");
  }
} catch (error) {
  logger.error('Failed to initialize Firestore:', error);
  db = getFirestore(app);
}

// Helper function to get the correct storage bucket name
function getCorrectStorageBucket() {
  const storageBucket = firebaseConfig.storageBucket || '';
  
  // If it's already using the new format, return it
  if (storageBucket.includes('.firebasestorage.app')) {
    return storageBucket;
  }
  
  // If it's using the old format, convert it
  if (storageBucket.includes('.appspot.com')) {
    const projectId = storageBucket.split('.')[0];
    return `${projectId}.firebasestorage.app`;
  }
  
  return storageBucket;
}

// Initialize Storage with explicit region and correct bucket
const storage = getStorage(app);

// Log storage bucket information in development
if (process.env.NODE_ENV === 'development') {
  logger.log("Storage bucket:", firebaseConfig.storageBucket);
  if (firebaseConfig.storageBucket.includes('.appspot.com')) {
    logger.warn("Using old .appspot.com storage bucket format. Consider updating to .firebasestorage.app");
  }
}

// Initialize Auth
const auth = getAuth(app);

// Initialize Functions
const functions = getFunctions(app, 'us-central1'); // Specify the region

// Create a Google provider instance
const googleProvider = new GoogleAuthProvider();

// Add scopes specifically required with API restrictions
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Set custom parameters with environment variable preference for client ID
const clientId = getGoogleClientId();

googleProvider.setCustomParameters({
  client_id: clientId,
  // Allow user to select account every time
  prompt: 'select_account'
});

// Export Firebase instances
export { db, storage, auth, googleProvider, functions, httpsCallable };