import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0Nh_LSixV0qgGblkRypOIe51AduU1cSA",
  authDomain: "mycardtracker-c8479.firebaseapp.com",
  projectId: "mycardtracker-c8479",
  storageBucket: "mycardtracker-c8479.firebasestorage.app",
  messagingSenderId: "726820232287",
  appId: "1:726820232287:web:fc27495f506950a78dcfea",
  measurementId: "G-363ZBLD60C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);

// Initialize Firestore with better error handling and fallback
let db;
try {
  // Initialize with custom settings for better offline support
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    ignoreUndefinedProperties: true,
    // Use the new cache setting instead of enableMultiTabIndexedDbPersistence
    cache: {
      // This enables persistence across tabs
      tabManager: 'persistentMultiTab'
    }
  });

  if (process.env.NODE_ENV !== 'test') {
    console.log('Firestore initialized with persistent cache');
  }
} catch (error) {
  console.error('Error initializing Firestore:', error);
  // Fallback to standard initialization if custom setup fails
  db = getFirestore(app);
}

export const storage = getStorage(app);
export { db };

// Connect to emulators in development mode
if (process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  console.log('Connected to Firebase emulators');
} 