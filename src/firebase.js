// Basic Firebase initialization without any extra complexity
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, doc, getDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Import the env validation
import './env';

// Development fallback configuration - ONLY used for local development when env vars are missing
// These will NOT be used in production if environment variables are properly set
const devFallbackConfig = {
  apiKey: "AIzaSyCVy6jUYutMLSyTCVBww38JNdKbAS6W9ak",
  authDomain: "mycardtracker-c8479.firebaseapp.com",
  projectId: "mycardtracker-c8479",
  storageBucket: "mycardtracker-c8479.firebasestorage.app",
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
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const functions = getFunctions(app, 'us-central1'); // Specify the region where functions are deployed

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

// Set authentication persistence
setPersistence(auth, browserLocalPersistence);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  // Connect to Functions emulator
  try {
    if (!functions._delegate._url) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('Connected to Functions emulator');
    }
  } catch (error) {
    console.log('Functions emulator connection failed or already connected:', error.message);
  }
}

// Add this section to handle ad blockers that might block Firestore
const handleFirestoreBlocking = () => {
  // Check if Firestore is being blocked
  const testFirestore = async () => {
    try {
      // Try a simple Firestore operation
      const testDoc = doc(db, '_test_connection', 'test');
      await getDoc(testDoc);
      return true; // Firestore is working
    } catch (error) {
      // Check if the error is related to being blocked
      if (error.message && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('Network Error') ||
        error.message.includes('blocked') ||
        error.message.includes('ERR_BLOCKED_BY_CLIENT')
      )) {
        console.warn('Firestore appears to be blocked by a browser extension. Enabling offline mode.');
        return false;
      }
      // Other errors might not be related to blocking
      return true;
    }
  };

  // Test Firestore and enable offline persistence if needed
  testFirestore().then(isWorking => {
    if (!isWorking) {
      // Enable offline persistence to work around blocking
      enableIndexedDbPersistence(db)
        .then(() => {
          console.log('Offline persistence enabled as a fallback');
        })
        .catch(err => {
          console.error('Error enabling offline persistence:', err);
        });
    }
  });
};

// Call the handler to check for Firestore blocking
handleFirestoreBlocking();

// Export the Firebase services
export { app, auth, googleProvider, db, storage, functions };