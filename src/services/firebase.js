import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Import environment validation to ensure all variables are loaded
import '../env';
import logger from '../utils/logger';
import {
  getFirebaseConfig,
  getGoogleClientId,
  getConfigSources,
} from '../config/secrets';

/**
 * Firebase Configuration
 *
 * This configuration uses environment variables exclusively.
 * All required environment variables must be set in your .env file:
 * - REACT_APP_FIREBASE_API_KEY
 * - REACT_APP_FIREBASE_AUTH_DOMAIN
 * - REACT_APP_FIREBASE_PROJECT_ID
 * - REACT_APP_FIREBASE_STORAGE_BUCKET
 * - REACT_APP_FIREBASE_MESSAGING_SENDER_ID
 * - REACT_APP_FIREBASE_APP_ID
 * - REACT_APP_FIREBASE_CLIENT_ID (optional)
 */

// Get Firebase config from centralized secrets manager
const firebaseConfig = getFirebaseConfig();

// Check if Firebase app is already initialized to prevent multiple instances
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services - but don't enable persistence here since it's already done in firebase.js
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1');

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Configure Google provider with client ID if available
const googleClientId = getGoogleClientId();
if (googleClientId) {
  googleProvider.setCustomParameters({
    client_id: googleClientId,
    prompt: 'select_account',
  });
} else {
  logger.warn(
    'REACT_APP_FIREBASE_CLIENT_ID not set - Google OAuth will use default configuration'
  );
}

// Export Firebase services
export { db, storage, auth, googleProvider, functions, httpsCallable };
export default app;
