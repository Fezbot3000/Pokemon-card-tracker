import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Import environment validation to ensure all variables are loaded
import '../env';

// Log environment variables for debugging (remove in production)
console.log("Services - API Key available:", !!process.env.REACT_APP_FIREBASE_API_KEY);
console.log("Services - Auth Domain available:", !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Check if Firebase app is already initialized to prevent multiple instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with persistence settings
let db;
try {
  // Always use getFirestore to avoid conflicts with multiple initialization
  db = getFirestore(app);
  
  if (process.env.NODE_ENV === 'development') {
    console.log("Firestore initialized for services module");
  }
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
  db = getFirestore(app);
}

// Initialize Storage with explicit region
const storage = getStorage(app);

// Initialize Auth
const auth = getAuth(app);

// Create a Google provider instance
const googleProvider = new GoogleAuthProvider();

// Add scopes specifically required with API restrictions
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Set custom parameters
googleProvider.setCustomParameters({
  // Use environment variable for client ID
  client_id: process.env.REACT_APP_FIREBASE_CLIENT_ID,
  // Allow user to select account every time
  prompt: 'select_account'
});

export { db, storage, auth, googleProvider }; 