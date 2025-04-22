import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Import environment validation to ensure all variables are loaded
import '../env';

// Log environment variables for debugging (remove in production)
// REMOVE DEBUG LOGS
// console.log("Services - API Key available:", !!process.env.REACT_APP_FIREBASE_API_KEY);
// console.log("Services - Auth Domain available:", !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);

// IMPORTANT: For production use, these values should be properly secured
// This configuration is using hardcoded values to ensure consistent behavior across all environments
// Firebase config is generally considered safe to include in client-side code
// as Firebase uses security rules to control access to data
const firebaseConfig = {
  apiKey: "AIzaSyDIxG9wMoOm0xO72YCAs4RO9YVrGjRcvLQ",
  authDomain: "mycardtracker-c8479.firebaseapp.com",
  projectId: "mycardtracker-c8479",
  storageBucket: "mycardtracker-c8479.appspot.com",
  messagingSenderId: "726820232287",
  appId: "1:726820232287:web:fc27495f506950a78dcfea"
};

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
  // Use hardcoded client ID for consistency across environments
  client_id: "726820232287-qcmvs1a9u5g5vf5rjb5uf8c7m7i7qdnv.apps.googleusercontent.com",
  // Allow user to select account every time
  prompt: 'select_account'
});

export { db, storage, auth, googleProvider, functions, httpsCallable }; 