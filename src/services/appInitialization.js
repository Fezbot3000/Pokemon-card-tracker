/**
 * App Initialization Service
 * 
 * Handles various initialization tasks when the app starts up.
 * This includes setting up collections, checking configurations,
 * and ensuring the app is properly set up.
 */

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import psaDataService from './psaDataService';
import logger from '../utils/logger';
import subscriptionManager from '../utils/subscriptionManager';

// Log the initialization of the app
logger.debug('Initializing app with proper Firestore subscription management');

/**
 * Initialize the application
 * This should be called when the app first loads
 */
export async function initializeApp() {
  try {
    logger.debug('Starting app initialization...');
    
    // Initialize Firebase collections
    await initializeFirestoreCollections();
    
    // Check Firebase storage configuration
    checkStorageConfiguration();
    
    logger.debug('App initialization complete');
    return true;
  } catch (error) {
    logger.error('Error during app initialization:', error);
    return false;
  }
}

/**
 * Initialize Firestore collections
 * This ensures all required collections exist
 */
async function initializeFirestoreCollections() {
  try {
    // We no longer initialize PSA collection on startup to avoid permission errors
    // PSA collection will be initialized on-demand when needed
    
    logger.debug('Firestore collections initialization skipped');
    return true;
  } catch (error) {
    logger.error('Error initializing Firestore collections:', error);
    return false;
  }
}

/**
 * Check Firebase storage configuration
 * This logs warnings if the configuration appears incorrect
 */
function checkStorageConfiguration() {
  try {
    // Get the storage bucket from environment
    const storageBucket = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
    
    // Check if the storage bucket is using the new format
    if (storageBucket && storageBucket.includes('.appspot.com')) {
      logger.warn('Firebase Storage bucket is using the old .appspot.com format.');
      logger.warn('Consider updating to .firebasestorage.app format.');
      
      // Log the correct format for reference
      const projectId = storageBucket.split('.')[0];
      logger.info(`Suggested value: ${projectId}.firebasestorage.app`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking storage configuration:', error);
    return false;
  }
}

export default initializeApp;
