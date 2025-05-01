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
        
        // Return the cached data
        return {
          certNumber,
          cardData: data.cardData,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
      }
      
      logger.debug(`PSA card not found in Firestore cache: ${certNumber}`);
      return null;
    } catch (error) {
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
        logger.warn('Permission denied saving to PSA database. Please update your Firestore rules.');
        return false;
      }
      
      logger.error(`Error saving PSA card to Firestore: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Initialize the PSA collection in Firestore if it doesn't exist
   * This should be called during app initialization
   */
  async initializeCollection() {
    try {
      // Check if collection exists by trying to get a document
      const testDoc = doc(db, PSA_COLLECTION, 'test-doc');
      await setDoc(testDoc, { 
        initialized: true,
        timestamp: serverTimestamp()
      });
      
      logger.debug('PSA collection initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize PSA collection:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const psaDataService = new PSADataService();
export default psaDataService;
