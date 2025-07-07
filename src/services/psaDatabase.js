import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import logger from '../utils/logger';

// Get Firestore instance
const db = getFirestore();
const PSA_COLLECTION = 'psa-cards';

/**
 * Get PSA card data from the shared database
 * @param {string} certNumber - PSA certification number
 * @returns {Promise<Object|null>} - Card data or null if not found
 */
export const getPSACardFromDatabase = async certNumber => {
  try {
    // Skip Firebase check - we'll just try to use Firestore directly
    const docRef = doc(db, PSA_COLLECTION, certNumber);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Check if data is fresh (less than 30 days old)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (data.lastUpdated) {
        const lastUpdatedDate =
          data.lastUpdated instanceof Date
            ? data.lastUpdated
            : new Date(data.lastUpdated);

        if (Date.now() - lastUpdatedDate.getTime() < thirtyDaysInMs) {
          logger.debug(
            `Using PSA data from shared database for cert #${certNumber}`
          );
          return data.cardData;
        } else {
          logger.debug(
            `Found PSA data in database for cert #${certNumber} but it's outdated`
          );
          return null; // Data is too old, should refresh
        }
      }

      // If no lastUpdated field, just return the data
      logger.debug(`Found PSA card in database: ${certNumber} (no timestamp)`);
      return data.cardData;
    } else {
      logger.debug(`PSA card not found in database: ${certNumber}`);
      return null;
    }
  } catch (error) {
    // Handle permission errors gracefully
    if (error.code === 'permission-denied') {
      logger.warn(
        'Permission denied accessing PSA database. Please update your Firestore rules.'
      );
      // Return null instead of throwing an error
      return null;
    }

    logger.error('Error fetching PSA card from database:', error);
    // Return null instead of throwing the error
    return null;
  }
};

/**
 * Save PSA card data to the shared database
 * @param {string} certNumber - PSA certification number
 * @param {Object} cardData - Card data to save
 * @returns {Promise<boolean>} - Success status
 */
export const savePSACardToDatabase = async (certNumber, cardData) => {
  try {
    // Skip Firebase check - we'll just try to use Firestore directly

    // Don't save error responses
    if (cardData && cardData.error) {
      logger.debug(
        `Not saving error response to database for cert #${certNumber}`
      );
      return false;
    }

    const docRef = doc(db, PSA_COLLECTION, certNumber);

    await setDoc(docRef, {
      certNumber,
      cardData,
      lastUpdated: serverTimestamp(),
    });

    logger.debug(`Saved PSA card to database: ${certNumber}`);
    return true;
  } catch (error) {
    // Handle permission errors gracefully
    if (error.code === 'permission-denied') {
      logger.warn(
        'Permission denied saving to PSA database. Please update your Firestore rules.'
      );
      // Return false instead of throwing an error
      return false;
    }

    logger.error('Error saving PSA card to database:', error);
    // Return false instead of throwing the error
    return false;
  }
};

/**
 * Search for PSA cards in the database by card name
 * @param {string} cardName - Card name to search for
 * @returns {Promise<Array>} - Array of matching PSA cards
 */
export const searchPSACardsByName = async cardName => {
  try {
    if (!cardName || cardName.length < 3) {
      return [];
    }

    // Convert to lowercase for case-insensitive search
    const searchTerm = cardName.toLowerCase();

    // Create a query to find cards with matching names
    // Note: This requires a Firestore index on cardData.cardName
    const q = query(
      collection(db, PSA_COLLECTION),
      where('cardData.cardName', '>=', searchTerm),
      where('cardData.cardName', '<=', searchTerm + '\uf8ff')
    );

    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach(doc => {
      results.push(doc.data());
    });

    return results;
  } catch (error) {
    logger.error('Error searching PSA cards by name:', error);
    return [];
  }
};

/**
 * Get statistics about the PSA database
 * @returns {Promise<Object>} - Statistics object
 */
export const getPSADatabaseStats = async () => {
  try {
    const snapshot = await getDocs(collection(db, PSA_COLLECTION));

    // Count total cards
    const totalCards = snapshot.size;

    // Count cards updated in the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let recentlyUpdated = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.timestamp && data.timestamp > thirtyDaysAgo) {
        recentlyUpdated++;
      }
    });

    return {
      totalCards,
      recentlyUpdated,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting PSA database stats:', error);
    return {
      totalCards: 0,
      recentlyUpdated: 0,
      error: error.message,
    };
  }
};
