// Lazy Firebase initialization - auth only loads when needed
import logger from './utils/logger';
import {
  app,
  db,
  storage,
  functions,
  googleProvider as eagerProvider,
} from './services/firebase-unified';

// Lazy initialization for auth services (these trigger heavy iframe loading)
let auth = null;
let googleProvider = null;

/**
 * Lazy load Firebase Auth only when needed
 * This eliminates the 90.31 KiB, 2,966ms critical path delay
 */
export const getFirebaseAuth = async () => {
  if (!auth) {
    const { 
      getAuth, 
      GoogleAuthProvider, 
      setPersistence, 
      browserLocalPersistence 
    } = await import('firebase/auth');
    
    auth = getAuth(app);
    
    // Set persistence
    try {
      await setPersistence(auth, browserLocalPersistence);
      logger.debug('Auth persistence set to local (lazy loaded)');
    } catch (error) {
      logger.error('Error setting auth persistence (lazy loaded):', error);
    }
    
    // Initialize Google provider (reuse eagerProvider if available)
    googleProvider = eagerProvider || new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
    googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    // Configure Google OAuth client ID if available
    const googleClientId = process.env.REACT_APP_FIREBASE_CLIENT_ID;
    if (googleClientId) {
      googleProvider.setCustomParameters({
        client_id: googleClientId,
        prompt: 'select_account',
      });
    }
    
    logger.debug('Firebase Auth lazy loaded successfully');
  }
  return auth;
};

/**
 * Lazy load Google Auth Provider
 */
export const getGoogleProvider = async () => {
  if (!googleProvider) {
    await getFirebaseAuth(); // This will initialize the provider
  }
  return googleProvider;
};

// Export immediate services
export { db, storage, functions };
export default app; 
