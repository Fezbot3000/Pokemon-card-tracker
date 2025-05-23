import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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

// Logging disabled for production readiness

// Check if Firebase app is already initialized to prevent multiple instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with persistence settings
let db;

// Silence console errors for network requests
// This will prevent the console from showing ERR_BLOCKED_BY_CLIENT errors
const originalConsoleError = console.error;
console.error = function(...args) {
  // Convert args to string in a safer way
  const stringified = args.map(arg => String(arg)).join(' ');
  
  // More targeted list of patterns to filter out specifically for Firestore channel termination
  const shouldSuppress = [
    'net::ERR_BLOCKED_BY_CLIENT',
    'google.firestore.v1.Firestore/Write/channel?TYPE=terminate',
    'google.firestore.v1.Firestore/Listen/channel?TYPE=terminate'
  ].some(fragment => stringified.includes(fragment));
  
  if (shouldSuppress) {
    // Silently suppress only the specific Firestore channel termination errors
    return;
  }
  
  // Pass through all other errors to the original console.error
  originalConsoleError.apply(console, args);
};

// Same for console.warn
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  // Convert args to string in a safer way
  const stringified = args.map(arg => String(arg)).join(' ');
  
  // More targeted list of patterns to filter out specifically for Firestore channel termination
  const shouldSuppress = [
    'google.firestore.v1.Firestore/Write/channel?TYPE=terminate',
    'google.firestore.v1.Firestore/Listen/channel?TYPE=terminate',
    'WebChannelConnection',
    'transport errored'
  ].some(fragment => stringified.includes(fragment));
  
  if (shouldSuppress) {
    // Silently suppress only the specific Firestore channel termination warnings
    return;
  }
  
  // Pass through all other warnings
  originalConsoleWarn.apply(console, args);
};

try {
  // Always use getFirestore to avoid conflicts with multiple initialization
  db = getFirestore(app);
  
  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      logger.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      logger.warn('Firestore persistence failed: Browser doesn\'t support offline persistence');
    }
  });
} catch (error) {
  // Silently handle errors and continue
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

// Logging disabled for production readiness

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