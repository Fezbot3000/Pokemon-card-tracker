// Basic Firebase initialization without any extra complexity
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Import the env validation
import './env';

// Development fallback configuration - ONLY used for local development when env vars are missing
// These will NOT be used in production if environment variables are properly set
const devFallbackConfig = {
  apiKey: "AIzaSyCVy6jUYutMLSyTCVBww38JNdKbAS6W9ak",
  authDomain: "mycardtracker-c8479.firebaseapp.com",
  projectId: "mycardtracker-c8479",
  storageBucket: "mycardtracker-c8479.appspot.com",
  messagingSenderId: "726820232287",
  appId: "1:726820232287:web:fc2749f506950a78dcfea"
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Basic Firebase configuration with fallbacks for local development only
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || (isDevelopment ? devFallbackConfig.apiKey : null),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || (isDevelopment ? devFallbackConfig.authDomain : null),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || (isDevelopment ? devFallbackConfig.projectId : null),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || (isDevelopment ? devFallbackConfig.storageBucket : null),
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || (isDevelopment ? devFallbackConfig.messagingSenderId : null),
  appId: process.env.REACT_APP_FIREBASE_APP_ID || (isDevelopment ? devFallbackConfig.appId : null)
};

// Log configuration status
if (isDevelopment) {
  if (!process.env.REACT_APP_FIREBASE_API_KEY) {
    console.info('Using development fallback Firebase configuration. For better security, consider setting up environment variables.');
  } else {
    console.info('Using environment variables for Firebase configuration.');
  }
}

// Only log error if a required config is missing
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is incomplete. Please check your environment variables.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Configure Google provider
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Add the client ID for restricted API keys
if (process.env.REACT_APP_FIREBASE_CLIENT_ID) {
  googleProvider.setCustomParameters({
    client_id: process.env.REACT_APP_FIREBASE_CLIENT_ID,
    prompt: 'select_account'
  });
} else {
  // Removed: console.error('Missing CLIENT_ID for Google provider');
}

// Export the Firebase services
export { app, auth, googleProvider, db, storage, functions };