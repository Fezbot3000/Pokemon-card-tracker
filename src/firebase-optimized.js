// Optimized Firebase initialization with lazy loading
import { initializeApp } from 'firebase/app';
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

// Firebase configuration
const firebaseConfig = {
  apiKey: requireEnvVar('REACT_APP_FIREBASE_API_KEY', 'Firebase API Key'),
  authDomain: requireEnvVar('REACT_APP_FIREBASE_AUTH_DOMAIN', 'Firebase Auth Domain'),
  projectId: requireEnvVar('REACT_APP_FIREBASE_PROJECT_ID', 'Firebase Project ID'),
  storageBucket: requireEnvVar('REACT_APP_FIREBASE_STORAGE_BUCKET', 'Firebase Storage Bucket'),
  messagingSenderId: requireEnvVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', 'Firebase Messaging Sender ID'),
  appId: requireEnvVar('REACT_APP_FIREBASE_APP_ID', 'Firebase App ID'),
};

// Initialize Firebase app immediately (lightweight)
const app = initializeApp(firebaseConfig);

// Lazy initialization for heavy Firebase services
let auth = null;
let db = null;
let storage = null;
let functions = null;
let googleProvider = null;

/**
 * Lazy load Firebase Auth (only when needed)
 */
export const getFirebaseAuth = async () => {
  if (!auth) {
    const { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } = await import('firebase/auth');
    auth = getAuth(app);
    
    // Set persistence
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.warn('Failed to set auth persistence:', error);
    }
    
    // Configure Google provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
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

/**
 * Lazy load Firestore (only when needed)
 */
export const getFirebaseFirestore = async () => {
  if (!db) {
    const { initializeFirestore, CACHE_SIZE_UNLIMITED } = await import('firebase/firestore');
    db = initializeFirestore(app, {
      cache: {
        sizeBytes: CACHE_SIZE_UNLIMITED,
      },
    });
  }
  return db;
};

/**
 * Lazy load Firebase Storage (only when needed)
 */
export const getFirebaseStorage = async () => {
  if (!storage) {
    const { getStorage } = await import('firebase/storage');
    storage = getStorage(app);
  }
  return storage;
};

/**
 * Lazy load Firebase Functions (only when needed)
 */
export const getFirebaseFunctions = async () => {
  if (!functions) {
    const { getFunctions } = await import('firebase/functions');
    functions = getFunctions(app, 'us-central1');
  }
  return functions;
};

// Export the app for compatibility
export { app };
export default app; 