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
      const hasPermission = await this._checkWritePermission();
      if (!hasPermission) {
        logger.debug(`Skipping PSA cache write for cert #${certNumber} - user not authenticated`);
        return false; // Silently skip writing without showing errors to the user
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
        logger.debug('Permission denied saving to PSA database - user likely not authenticated');
        return false;
      }
      
      logger.error(`Error saving PSA card to Firestore: ${error.message}`, error);
      return false;
    }
  }

  /**
   * Check if the current user has permission to write to the PSA collection
   * @returns {Promise<boolean>} - Whether the user has permission
   * @private
   */
  async _checkWritePermission() {
    const auth = getAuth();
    return auth.currentUser !== null;
  }
  
  /**
   * Initialize the PSA collection in Firestore if it doesn't exist
   * This is now only called when needed, not during app initialization
   * @deprecated - This method is kept for backward compatibility but should not be used directly
   */
  async initializeCollection() {
    // This method is kept for backward compatibility but doesn't do anything
    // PSA collection operations are now handled on-demand when needed
    logger.debug('PSA collection initialization skipped - will be handled on-demand');
    return true;
  }
}

// Create and export a singleton instance
const psaDataService = new PSADataService();
export default psaDataService;
