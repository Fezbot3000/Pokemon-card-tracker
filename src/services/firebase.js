import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Import environment validation to ensure all variables are loaded
import '../env';
import logger from '../utils/logger';

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

// Build Firebase config preferring environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDIxG9wMoOm0xO72YCAs4RO9YVrGjRcvLQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "mycardtracker-c8479.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "mycardtracker-c8479",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "mycardtracker-c8479.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "726820232287",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:726820232287:web:fc27495f506950a78dcfea"
};

// Log configured source (environment or fallback) in development mode only
if (process.env.NODE_ENV === 'development') {
  const envSourceMap = {
    apiKey: !!process.env.REACT_APP_FIREBASE_API_KEY ? 'Environment' : 'Fallback',
    authDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'Environment' : 'Fallback',
    projectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Environment' : 'Fallback',
    storageBucket: !!process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? 'Environment' : 'Fallback',
    messagingSenderId: !!process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? 'Environment' : 'Fallback',
    appId: !!process.env.REACT_APP_FIREBASE_APP_ID ? 'Environment' : 'Fallback'
  };
  
  logger.log("Firebase config sources:", envSourceMap);
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

// Initialize Storage with explicit region
const storage = getStorage(app);

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
const clientId = process.env.REACT_APP_FIREBASE_CLIENT_ID || 
                "726820232287-qcmvs1a9u5g5vf5rjb5uf8c7m7i7qdnv.apps.googleusercontent.com";

googleProvider.setCustomParameters({
  client_id: clientId,
  // Allow user to select account every time
  prompt: 'select_account'
});

// Export Firebase instances
export { db, storage, auth, googleProvider, functions, httpsCallable };