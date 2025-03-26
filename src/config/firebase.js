// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB6eUt7AhO8PlKRrGwjxhlZdCDCd768W7Q",
    authDomain: "mycardtracker-c8479.firebaseapp.com",
    projectId: "mycardtracker-c8479",
    storageBucket: "mycardtracker-c8479.firebasestorage.app",
    messagingSenderId: "726820232287",
    appId: "1:726820232287:web:6c27495f506950a78dcfea",
    clientId: "726820232287-um3olcq8194u1juan0b3il4avsqm18fo.apps.googleusercontent.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with proper client id
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  client_id: firebaseConfig.clientId,
  // Allow user to select account every time
  prompt: 'select_account'
});

// Configure auth settings
auth.useDeviceLanguage();

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

const db = getFirestore(app);

export { auth, db, googleProvider }; 