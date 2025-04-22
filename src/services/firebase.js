import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Import environment validation to ensure all variables are loaded
import '../env';

// IMPORTANT: Use environment variables if available, fall back to hardcoded values
// This ensures consistent behavior across environments while still allowing for
// environment-specific configuration when needed
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDIxG9wMoOm0xO72YCAs4RO9YVrGjRcvLQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "mycardtracker-c8479.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "mycardtracker-c8479",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "mycardtracker-c8479.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "726820232287",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:726820232287:web:fc27495f506950a78dcfea"
};

// Log which configuration is being used (for debugging)
console.log("Firebase config source:", process.env.REACT_APP_FIREBASE_API_KEY ? "Environment Variables" : "Hardcoded Values");

// Check if Firebase app is already initialized to prevent multiple instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with persistence settings
let db;
try {
  // Always use getFirestore to avoid conflicts with multiple initialization
  db = getFirestore(app);
  
  if (process.env.NODE_ENV === 'development') {
    console.log("Firestore initialized successfully");
  }
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
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

// Set custom parameters
googleProvider.setCustomParameters({
  // Use environment variable for client ID if available, otherwise fall back to hardcoded value
  client_id: process.env.REACT_APP_FIREBASE_CLIENT_ID || "726820232287-qcmvs1a9u5g5vf5rjb5uf8c7m7i7qdnv.apps.googleusercontent.com",
  // Allow user to select account every time
  prompt: 'select_account'
});

export { db, storage, auth, googleProvider, functions, httpsCallable };