/**
 * PSA Data Service
 * 
 * A dedicated service for managing PSA card data in Firestore.
 * This service handles caching PSA data to reduce API calls and
 * provides a centralized way to access PSA card information.
 */

import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import logger from '../utils/logger';

// Constants
const PSA_COLLECTION = 'psa-cards';
const db = getFirestore();

/**
 * PSA Data Service
 */
class PSADataService {
  /**
   * Get PSA card data from Firestore cache
   * @param {string} certNumber - PSA certification number
   * @returns {Promise<Object|null>} - Card data or null if not found
   */
  async getCardFromCache(certNumber) {
    try {
      logger.debug(`Checking Firestore cache for PSA cert #${certNumber}`);
      const docRef = doc(db, PSA_COLLECTION, certNumber);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        logger.debug(`Found PSA card in Firestore cache: ${certNumber}`);
        
        // Return the cached data in a format consistent with the PSA API response
        // This ensures it can be processed the same way as a direct API response
        return data.cardData;
      }
      
      logger.debug(`PSA card not found in Firestore cache: ${certNumber}`);
      return null;
    } catch (error) {
      // If we get a permission error, it might be because the collection doesn't exist yet
      // We'll silently handle this error since it's expected for unauthenticated users
      if (error.code === 'permission-denied') {
        logger.debug(`Permission denied reading from PSA cache: ${certNumber}`);
        return null;
      }
      
      logger.error(`Error fetching PSA card from Firestore: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Save PSA card data to Firestore cache
   * @param {string} certNumber - PSA certification number
   * @param {Object} cardData - Card data from PSA API
   * @returns {Promise<boolean>} - Success status
   */
  async saveCardToCache(certNumber, cardData) {
    try {
      // Don't save error responses
      if (cardData && cardData.error) {
        logger.debug(`Not saving error response to database for cert #${certNumber}`);
        return false;
      }
      
      // Check if user is authenticated before attempting to write
      const auth = getAuth();
      if (!auth.currentUser) {
        logger.debug('User not authenticated, skipping PSA cache write');
        return false;
      }
      
      // Ensure collection is initialized before writing
      await this.ensureCollectionInitialized();
      
      logger.debug(`Saving PSA card to Firestore cache: ${certNumber}`);
      const docRef = doc(db, PSA_COLLECTION, certNumber);
      
      await setDoc(docRef, {
        certNumber,
        cardData,
        lastUpdated: serverTimestamp()
      });
      
      logger.debug(`Successfully saved PSA card to Firestore: ${certNumber}`);
      return true;
    } catch (error) {
      // Handle permission errors gracefully
      if (error.code === 'permission-denied') {
        logger.debug('Permission denied saving to PSA database. User may not be authenticated.');
        return false;
      }
      
      logger.error(`Error saving PSA card to Firestore: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Initialize the PSA collection in Firestore if it doesn't exist
   * This is now a private method only called when needed
   * @private
   */
  async initializeCollection() {
    // Check if user is authenticated before attempting to initialize
    const auth = getAuth();
    if (!auth.currentUser) {
      logger.debug('User not authenticated, skipping PSA collection initialization');
      return false;
    }
    
    try {
      // Check if collection exists by trying to get a document
      const testDoc = doc(db, PSA_COLLECTION, 'test-doc');
      await setDoc(testDoc, { 
        initialized: true,
        timestamp: serverTimestamp()
      }, { merge: true });
      
      logger.debug('PSA collection initialized successfully');
      return true;
    } catch (error) {
      if (error.code === 'permission-denied') {
        logger.debug('Permission denied initializing PSA collection. User may not have proper permissions.');
        return false;
      } else if (error.message?.includes('network') || error.message?.includes('blocked')) {
        logger.debug('Firestore connection blocked, likely by an ad blocker');
        return false;
      }
      
      logger.error('Failed to initialize PSA collection:', error);
      return false;
    }
  }

  /**
   * Ensure the PSA collection is initialized before use
   * This is a public method that will be called before operations that require the collection
   * @returns {Promise<boolean>} - Success status
   */
  async ensureCollectionInitialized() {
    // We only need to initialize if the user is authenticated
    const auth = getAuth();
    if (!auth.currentUser) {
      return false;
    }
    
    return this.initializeCollection();
  }
}

// Create and export a singleton instance
const psaDataService = new PSADataService();
export default psaDataService;
