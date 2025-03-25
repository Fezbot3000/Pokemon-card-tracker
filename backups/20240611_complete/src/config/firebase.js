import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 