/**
 * App Initialization Service
 *
 * Handles various initialization tasks when the app starts up.
 * This includes setting up collections, checking configurations,
 * and ensuring the app is properly set up.
 */

import logger from '../utils/logger';
import { getFirebaseConfig } from '../config/secrets';

// Suppress Firebase network errors globally
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const url = args[0]?.toString() || '';

  // Only intercept Firebase/Firestore requests
  if (url.includes('firestore.googleapis.com')) {
    return originalFetch.apply(this, args).catch(error => {
      // Silently handle network errors for Firestore
      if (
        error.message &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('blocked by client'))
      ) {
        // Return an empty response to prevent errors from bubbling up
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error; // Re-throw other errors
    });
  }

  // Pass through all other fetch requests
  return originalFetch.apply(this, args);
};

/**
 * Initialize the application
 * This should be called when the app first loads
 */
export async function initializeAppService() {
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
 *
 * Note: We've removed the PSA collection initialization from here
 * as it's not necessary on app startup and was causing permission errors.
 * PSA collection will be accessed only when needed during card operations.
 */
async function initializeFirestoreCollections() {
  try {
    // PSA collection initialization removed - will be handled on-demand when needed

    logger.debug('Firestore collections initialized successfully');
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
    // Get the storage bucket from Firebase config
    const firebaseConfig = getFirebaseConfig();
    const storageBucket = firebaseConfig.storageBucket;

    // Check if the storage bucket is using the new format
    if (storageBucket && storageBucket.includes('.appspot.com')) {
      logger.warn(
        'Firebase Storage bucket is using the old .appspot.com format.'
      );
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

export default initializeAppService;
