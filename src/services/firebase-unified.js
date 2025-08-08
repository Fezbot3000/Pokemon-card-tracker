// Canonical Firebase initialization preserving persistence/cache behavior
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

import '../env';
import { getFirebaseConfig } from '../config/secrets';

const firebaseConfig = getFirebaseConfig();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Preserve existing persistence/cache settings
const db = initializeFirestore(app, {
  cache: { sizeBytes: CACHE_SIZE_UNLIMITED },
});

const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

export { app, db, auth, storage, functions, googleProvider, httpsCallable };

export default {
  app,
  db,
  auth,
  storage,
  functions,
  googleProvider,
  httpsCallable,
};


