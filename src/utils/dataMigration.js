/**
 * Data migration utility for handling the transition from anonymous to authenticated storage
 * This utility helps migrate data from the legacy 'anonymous' ID to proper user-specific storage
 */

import db from '../services/db';
import { auth } from '../services/firebase';
import { toast } from 'react-hot-toast';
import logger from './logger';

/**
 * Checks if a user needs data migration from anonymous storage
 * @returns {Promise<boolean>} Whether migration is needed
 */
export const checkIfMigrationNeeded = async () => {
  try {
    // Only check for authenticated users
    if (!auth.currentUser || !auth.currentUser.uid) {
      return false;
    }
    
    // First check if there's any data in the anonymous account
    const anonymousData = await getAnonymousData();
    
    // If there's no anonymous data, no migration is needed
    if (!anonymousData || !anonymousData.collections || Object.keys(anonymousData.collections).length === 0) {
      return false;
    }
    
    // Now check if the user already has data in their account
    const userData = await getUserData(auth.currentUser.uid);
    
    // If user already has data, we would need a merge strategy rather than simple migration
    if (userData && userData.collections && Object.keys(userData.collections).length > 0) {
      return 'merge'; // Return 'merge' to indicate a more complex migration is needed
    }
    
    // If anonymous data exists and user doesn't have data, migration is needed
    return true;
  } catch (error) {
    logger.error('Error checking migration status:', error);
    return false; // On error, don't suggest migration
  }
};

/**
 * Gets data from the anonymous storage
 * @returns {Promise<Object>} The anonymous user data
 */
export const getAnonymousData = async () => {
  try {
    // Access IndexedDB directly with 'anonymous' user ID
    return {
      collections: await getAnonymousCollections(),
      images: await getAnonymousImages(),
      profile: await getAnonymousProfile(),
      soldCards: await getAnonymousSoldCards()
    };
  } catch (error) {
    logger.error('Error getting anonymous data:', error);
    throw error;
  }
};

/**
 * Gets anonymous collections data directly from IndexedDB
 * @returns {Promise<Object>} Collections data
 */
const getAnonymousCollections = async () => {
  return new Promise((resolve, reject) => {
    try {
      // Open the database directly to access anonymous data
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          // Access the collections store 
          const transaction = db.transaction(['collections'], 'readonly');
          const store = transaction.objectStore('collections');
          
          // Get all collections for anonymous user
          const range = IDBKeyRange.bound(
            ['anonymous', ''], // Lower bound: anonymous user, start of name range
            ['anonymous', '\uffff'] // Upper bound: anonymous user, end of name range
          );
          
          const request = store.getAll(range);
          
          request.onsuccess = () => {
            const collections = {};
            request.result.forEach(collection => {
              collections[collection.name] = collection.data;
            });
            resolve(collections);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting anonymous collections:', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          logger.error('Error in transaction:', error);
          reject(error);
        }
      };
    } catch (error) {
      logger.error('Error accessing IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Gets anonymous images data directly from IndexedDB
 * @returns {Promise<Array>} Images data
 */
const getAnonymousImages = async () => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['images'], 'readonly');
          const store = transaction.objectStore('images');
          
          // Get all images for anonymous user
          const range = IDBKeyRange.bound(
            ['anonymous', ''], 
            ['anonymous', '\uffff']
          );
          
          const request = store.getAll(range);
          
          request.onsuccess = () => {
            resolve(request.result || []);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting anonymous images:', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          logger.error('Error in transaction:', error);
          reject(error);
        }
      };
    } catch (error) {
      logger.error('Error accessing IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Gets anonymous profile data directly from IndexedDB
 * @returns {Promise<Object>} Profile data
 */
const getAnonymousProfile = async () => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['profile'], 'readonly');
          const store = transaction.objectStore('profile');
          
          const request = store.get(['anonymous', 'user']);
          
          request.onsuccess = () => {
            resolve(request.result?.data || null);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting anonymous profile:', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          logger.error('Error in transaction:', error);
          reject(error);
        }
      };
    } catch (error) {
      logger.error('Error accessing IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Gets anonymous sold cards directly from IndexedDB
 * @returns {Promise<Array>} Sold cards data
 */
const getAnonymousSoldCards = async () => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['collections'], 'readonly');
          const store = transaction.objectStore('collections');
          
          const request = store.get(['anonymous', 'sold']);
          
          request.onsuccess = () => {
            resolve(request.result?.data || []);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting anonymous sold cards:', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          logger.error('Error in transaction:', error);
          reject(error);
        }
      };
    } catch (error) {
      logger.error('Error accessing IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Gets user data for a specific user ID
 * @param {string} userId The user ID to get data for
 * @returns {Promise<Object>} The user data
 */
export const getUserData = async (userId) => {
  try {
    if (!userId) {
      throw new Error('No user ID provided');
    }
    
    return {
      collections: await getUserCollections(userId),
      // We can add other data types as needed
    };
  } catch (error) {
    logger.error(`Error getting data for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Gets collections for a specific user ID directly from IndexedDB
 * @param {string} userId The user ID to get collections for
 * @returns {Promise<Object>} Collections data
 */
const getUserCollections = async (userId) => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['collections'], 'readonly');
          const store = transaction.objectStore('collections');
          
          // Get all collections for the specified user
          const range = IDBKeyRange.bound(
            [userId, ''], 
            [userId, '\uffff']
          );
          
          const request = store.getAll(range);
          
          request.onsuccess = () => {
            const collections = {};
            request.result.forEach(collection => {
              collections[collection.name] = collection.data;
            });
            resolve(collections);
          };
          
          request.onerror = (event) => {
            logger.error(`Error getting collections for user ${userId}:`, event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          logger.error('Error in transaction:', error);
          reject(error);
        }
      };
    } catch (error) {
      logger.error('Error accessing IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Migrates data from anonymous storage to user account
 * @param {Object} options Migration options
 * @param {boolean} options.preserveAnonymous Whether to keep anonymous data after migration
 * @param {Function} options.progressCallback Callback for progress updates
 * @returns {Promise<Object>} Migration result
 */
export const migrateData = async (options = {}) => {
  const { 
    preserveAnonymous = false, 
    progressCallback = () => {} 
  } = options;
  
  try {
    // Ensure user is authenticated
    if (!auth.currentUser || !auth.currentUser.uid) {
      throw new Error('User must be authenticated to migrate data');
    }
    
    const userId = auth.currentUser.uid;
    
    // Update progress
    progressCallback(10, 'Getting anonymous data...');
    
    // Get anonymous data
    const anonymousData = await getAnonymousData();
    
    // Update progress
    progressCallback(30, 'Preparing to migrate data...');
    
    // Save collections to user account
    if (anonymousData.collections && Object.keys(anonymousData.collections).length > 0) {
      progressCallback(40, 'Migrating collections...');
      await db.saveCollections(anonymousData.collections, true);
    }
    
    // Migrate images
    if (anonymousData.images && anonymousData.images.length > 0) {
      progressCallback(60, 'Migrating images...');
      
      for (let i = 0; i <anonymousData.images.length; i++) {
        const image = anonymousData.images[i];
        // Save image with user ID
        await db.saveImage(image.id, image.blob);
        
        // Update progress periodically
        if (i % 10 === 0 || i === anonymousData.images.length - 1) {
          const percent = 60 + Math.floor((i / anonymousData.images.length) * 20);
          progressCallback(percent, `Migrating image ${i + 1} of ${anonymousData.images.length}...`);
        }
      }
    }
    
    // Migrate profile
    if (anonymousData.profile) {
      progressCallback(85, 'Migrating profile data...');
      await db.saveProfile(anonymousData.profile);
    }
    
    // Migrate sold cards
    if (anonymousData.soldCards && anonymousData.soldCards.length > 0) {
      progressCallback(90, 'Migrating sold cards...');
      await db.saveSoldCards(anonymousData.soldCards);
    }
    
    // Always mark anonymous data as migrated in storage flags
    // This prevents the migration UI from showing again
    localStorage.setItem('anonymousDataMigrated', 'true');
    localStorage.setItem('migrationPromptDismissed', 'true');
    sessionStorage.setItem('migrationPromptDismissed', 'true');
    
    // Update the anonymous data to add a flag indicating it's been migrated
    // This prevents duplicate migrations
    progressCallback(95, 'Finalizing migration...');
    await markAnonymousDataAsMigrated();
    
    // Complete
    progressCallback(100, 'Migration complete');
    
    return {
      success: true,
      message: 'Data migrated successfully',
      anonymousData
    };
  } catch (error) {
    logger.error('Error migrating data:', error);
    throw error;
  }
};

/**
 * Marks anonymous data as migrated without deleting it
 * Updates the database to indicate migration has happened
 * @returns {Promise<void>}
 */
const markAnonymousDataAsMigrated = async () => {
  try {
    // Create markers in localStorage to indicate migration has happened
    localStorage.setItem('anonymousDataMigrated', 'true');
    localStorage.setItem('migrationPromptDismissed', 'true');
    sessionStorage.setItem('migrationPromptDismissed', 'true');
    
    // Also set a global window variable for immediate effect
    window.__MIGRATION_PROMPTS_DISABLED = true;
    
    return Promise.resolve();
  } catch (error) {
    logger.error('Error marking anonymous data as migrated:', error);
    return Promise.reject(error);
  }
};

/**
 * Clears all anonymous data from IndexedDB
 * @returns {Promise<void>}
 */
const clearAnonymousData = async () => {
  try {
    const request = indexedDB.open('pokemonCardTracker', 1);
    
    return new Promise((resolve, reject) => {
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = async (event) => {
        const db = event.target.result;
        try {
          // Delete anonymous collections
          await deleteAnonymousStoreData(db, 'collections');
          
          // Delete anonymous images
          await deleteAnonymousStoreData(db, 'images');
          
          // Delete anonymous profile
          await deleteAnonymousStoreData(db, 'profile');
          
          // Delete anonymous sold cards
          await deleteAnonymousStoreData(db, 'soldCards');
          
          resolve();
        } catch (error) {
          logger.error('Error clearing anonymous data:', error);
          reject(error);
        }
      };
    });
  } catch (error) {
    logger.error('Error in clearAnonymousData:', error);
    throw error;
  }
};

/**
 * Deletes anonymous data from a specific store
 * @param {IDBDatabase} db The IndexedDB database
 * @param {string} storeName The store name to delete from
 * @returns {Promise<void>}
 */
const deleteAnonymousStoreData = (db, storeName) => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Use index if available to find anonymous data
      if (store.indexNames.contains('userId')) {
        const index = store.index('userId');
        const request = index.openCursor(IDBKeyRange.only('anonymous'));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        
        transaction.oncomplete = () => {
          resolve();
        };
        
        transaction.onerror = (event) => {
          logger.error(`Error deleting anonymous data from ${storeName}:`, event.target.error);
          reject(event.target.error);
        };
      } else {
        // For stores without userId index, use a range
        const range = IDBKeyRange.bound(
          ['anonymous', ''], // Lower bound
          ['anonymous', '\uffff'] // Upper bound
        );
        
        const request = store.openCursor(range);
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        
        transaction.oncomplete = () => {
          resolve();
        };
        
        transaction.onerror = (event) => {
          logger.error(`Error deleting anonymous data from ${storeName}:`, event.target.error);
          reject(event.target.error);
        };
      }
    } catch (error) {
      logger.error(`Error in deleteAnonymousStoreData for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Checks if the current anonymous user has any meaningful data
 * @returns {Promise<boolean>} Whether the anonymous user has data
 */
export const anonymousUserHasData = async () => {
  try {
    const collections = await getAnonymousCollections();
    // Return true if there are collections other than just Default Collection with no cards
    
    if (!collections || Object.keys(collections).length === 0) {
      return false;
    }
    
    // If there's only Default Collection and it's empty, return false
    if (Object.keys(collections).length === 1 && 
        collections['Default Collection'] && 
        collections['Default Collection'].length === 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking if anonymous user has data:', error);
    return false;
  }
};
