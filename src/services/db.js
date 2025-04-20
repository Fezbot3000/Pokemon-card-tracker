import { compressImage } from '../utils/imageCompression';
import { auth } from './firebase'; // Import Firebase auth to get the current user
import logger from '../utils/logger';

const DB_NAME = 'pokemonCardTracker';
const DB_VERSION = 1;
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const PROFILE_STORE = 'profile';
const SUBSCRIPTION_STORE = 'subscription';

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPromise = null;
    // Initialize database when service is created
    this.initDatabase().catch(error => 
      logger.error('Failed to initialize database on service creation:', error)
    );
  }

  initDatabase() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
          logger.error("Database error:", event.target.error);
          
          // Check if this is a version error
          if (event.target.error && event.target.error.name === 'VersionError') {
            // Try to delete the database and recreate it
            logger.debug("Version error detected, attempting to delete and recreate database");
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
            
            deleteRequest.onsuccess = () => {
              logger.debug("Successfully deleted database, recreating...");
              // Try again with a new request
              const newRequest = indexedDB.open(DB_NAME, DB_VERSION);
              
              newRequest.onerror = (e) => {
                logger.error("Fatal database error after reset:", e.target.error);
                reject('Error opening database after reset');
              };
              
              newRequest.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
              };
              
              newRequest.onupgradeneeded = this.setupDatabase.bind(this);
            };
            
            deleteRequest.onerror = (e) => {
              logger.error("Could not delete database:", e.target.error);
              reject('Error deleting database');
            };
          } else {
            // For other errors, just reject
            reject('Error opening database');
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.dbPromise = Promise.resolve(this.db);
          // Check if all required object stores exist
          this.verifyObjectStores();
          resolve(this.db);
        };

        request.onupgradeneeded = this.setupDatabase.bind(this);
      } catch (error) {
        logger.error("Unexpected error during database initialization:", error);
        reject('Unexpected error initializing database');
      }
    });
  }

  async ensureDB() {
    if (this.db) return;
    
    // Wait for database to be opened
    try {
      this.db = await this.dbPromise;
      
      // Ensure all expected collections exist for the user
      await this.ensureCollections();
    } catch (error) {
      logger.error('Error ensuring database:', error);
      throw error;
    }
  }
  
  // Ensure all expected collections exist for the current user
  async ensureCollections() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      logger.warn('No user ID available to ensure collections');
      return;
    }
    
    // List of expected collection names
    const expectedCollections = ['Default Collection', 'sold'];
    
    try {
      const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
      const store = transaction.objectStore(COLLECTIONS_STORE);
      
      // Check each expected collection
      for (const collectionName of expectedCollections) {
        const request = store.get([userId, collectionName]);
        
        await new Promise((resolve) => {
          request.onsuccess = async () => {
            if (!request.result) {
              logger.debug(`Collection "${collectionName}" not found for user, creating it`);
              
              // Create the missing collection in a new transaction
              try {
                await this.createEmptyCollection(collectionName);
                logger.debug(`Created empty "${collectionName}" collection`);
              } catch (error) {
                logger.error(`Error creating "${collectionName}" collection:`, error);
              }
            } else {
              logger.debug(`Collection "${collectionName}" exists for user`);
            }
            resolve();
          };
          
          request.onerror = (event) => {
            logger.error(`Error checking for "${collectionName}" collection:`, event.target.error);
            resolve();
          };
        });
      }
    } catch (error) {
      logger.error('Error ensuring collections:', error);
    }
  }
  
  // Create an empty collection with the given name
  async createEmptyCollection(collectionName) {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('No user ID available');
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        const request = store.put({
          userId,
          name: collectionName,
          data: []
        });
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async addTestSoldItem() {
    try {
      // First get existing sold cards
      const existingSoldCards = await this.getSoldCards();
      
      // Create a new test item
      const testItem = {
        id: `test-${Date.now()}`,
        card: 'Test Card',
        set: 'Test Set',
        grade: 'PSA 10',
        slabSerial: 'TEST123456',
        imageUrl: 'https://via.placeholder.com/300',
        investmentAUD: 100.00,
        finalValueAUD: 150.00,
        finalProfitAUD: 50.00,
        buyer: 'Manual Test',
        invoiceId: 'MANUAL-TEST-1',
        dateSold: new Date().toISOString(),
        soldDate: new Date().toISOString()
      };
      
      // Add the test item to the existing sold cards
      const updatedSoldCards = [...existingSoldCards, testItem];
      
      // Save the updated sold cards
      await this.saveSoldCards(updatedSoldCards);
      
      logger.debug('Added test sold item successfully');
      return testItem;
    } catch (error) {
      logger.error('Error adding test sold item:', error);
      throw error;
    }
  }

  setupDatabase(event) {
    const db = event.target.result;
    logger.debug("Setting up database with stores");

    // Create collections store with compound key for user isolation
    if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
      logger.debug("Creating collections store");
      db.createObjectStore(COLLECTIONS_STORE, { keyPath: ['userId', 'name'] });
    } else {
      // If upgrading from version 2 to 3, we need to recreate the object store
      // with the new compound key structure
      db.deleteObjectStore(COLLECTIONS_STORE);
      db.createObjectStore(COLLECTIONS_STORE, { keyPath: ['userId', 'name'] });
    }

    // Create images store with compound key for user isolation
    if (!db.objectStoreNames.contains(IMAGES_STORE)) {
      logger.debug("Creating images store");
      db.createObjectStore(IMAGES_STORE, { keyPath: ['userId', 'id'] });
    } else {
      // If upgrading from version 2 to 3, we need to recreate the object store
      // with the new compound key structure
      db.deleteObjectStore(IMAGES_STORE);
      db.createObjectStore(IMAGES_STORE, { keyPath: ['userId', 'id'] });
    }

    // Create profile store with compound key for user isolation
    if (!db.objectStoreNames.contains(PROFILE_STORE)) {
      logger.debug("Creating profile store");
      db.createObjectStore(PROFILE_STORE, { keyPath: ['userId', 'id'] });
    } else {
      // If upgrading from version 2 to 3, we need to recreate the object store
      // with the new compound key structure
      db.deleteObjectStore(PROFILE_STORE);
      db.createObjectStore(PROFILE_STORE, { keyPath: ['userId', 'id'] });
    }

    // Subscription store already uses userId as the key, so it's already isolated
    if (!db.objectStoreNames.contains(SUBSCRIPTION_STORE)) {
      logger.debug("Creating subscription store");
      db.createObjectStore(SUBSCRIPTION_STORE, { keyPath: 'userId' });
    }
  }

  // Verify all required object stores exist and create them if needed
  verifyObjectStores() {
    if (!this.db) return;
    
    const requiredStores = [COLLECTIONS_STORE, IMAGES_STORE, PROFILE_STORE, SUBSCRIPTION_STORE];
    const existingStores = Array.from(this.db.objectStoreNames);
    
    const missingStores = requiredStores.filter(store => !existingStores.includes(store));
    
    if (missingStores.length > 0) {
      logger.debug(`Missing object stores: ${missingStores.join(', ')}. Will upgrade database...`);
      
      // Close current connection
      this.db.close();
      this.db = null;
      
      // Reopen with increased version to trigger upgrade
      const newVersion = DB_VERSION + 1;
      logger.debug(`Reopening database with new version ${newVersion}`);
      
      // This is async but we don't wait for it - the next operation will ensureDB again
      const request = indexedDB.open(DB_NAME, newVersion);
      
      request.onupgradeneeded = (event) => {
        logger.debug(`Upgrading database to fix missing stores. Version: ${event.oldVersion} -> ${event.newVersion}`);
        this.setupDatabase(event);
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        logger.debug(`Database upgraded successfully to version ${this.db.version}`);
      };
      
      request.onerror = (event) => {
        logger.error('Error upgrading database:', event.target.error);
      };
    }
  }

  // Helper to get the current user ID or a default for anonymous users
  getCurrentUserId() {
    // Get the current user from Firebase auth
    const currentUser = auth.currentUser;
    
    // If there's a logged in user, use their UID
    if (currentUser && currentUser.uid) {
      return currentUser.uid;
    }
    
    // If no user is logged in, use a consistent anonymous ID
    // This maintains data persistence for users who haven't signed up yet
    return 'anonymous';
  }

  async getCollections() {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          // Using an index range to get all collections for the current user
          const request = store.getAll(IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of name range
            [userId, '\uffff'] // Upper bound: current user, end of name range
          ));

          request.onsuccess = () => {
            const collections = {};
            request.result.forEach(collection => {
              collections[collection.name] = collection.data;
            });
            resolve(collections);
          };

          request.onerror = (error) => {
            logger.error('Error fetching collections:', error);
            // Return empty collections object with Default Collection
            resolve({ 'Default Collection': [] });
          };
        } catch (error) {
          logger.error('Transaction error in getCollections:', error);
          // Return empty collections object with Default Collection
          resolve({ 'Default Collection': [] });
        }
      });
    } catch (error) {
      logger.error('Unexpected error in getCollections:', error);
      // Return empty collections object with Default Collection
      return { 'Default Collection': [] };
    }
  }

  async saveCollections(collections, preserveSold = true) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug("DB: Saving collections:", Object.keys(collections));
        
        // If preserveSold is true, retrieve sold items first
        let soldItems = [];
        if (preserveSold) {
          try {
            soldItems = await this.getSoldCards();
            logger.debug(`DB: Retrieved ${soldItems.length} sold items to preserve during collection save`);
          } catch (error) {
            logger.warn("DB: Could not retrieve sold items to preserve:", error);
            // Continue anyway as this is not fatal
          }
        }
        
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Clear existing collections for this user
        const range = IDBKeyRange.bound(
          [userId, ''], // Lower bound: current user, start of name range
          [userId, '\uffff'] // Upper bound: current user, end of name range
        );
        
        const clearRequest = store.delete(range);
        
        clearRequest.onsuccess = () => {
          logger.debug('DB: Cleared existing collections for user:', userId);
          
          // Add new collections
          Object.entries(collections).forEach(([name, data]) => {
            logger.debug(`DB: Saving collection: ${name} with ${Array.isArray(data) ? data.length : 0} cards`);
            const request = store.put({ userId, name, data });
            request.onerror = (e) => {
              logger.error(`Error saving collection ${name}:`, e.target.error);
            };
          });
          
          // Re-add sold items if they were preserved and exist
          if (preserveSold && soldItems.length > 0) {
            logger.debug(`DB: Re-saving ${soldItems.length} preserved sold items`);
            store.put({ 
              userId, 
              name: 'sold', 
              data: soldItems 
            });
          }
          
          transaction.oncomplete = () => {
            logger.debug('DB: Successfully saved all collections:', Object.keys(collections));
            if (preserveSold && soldItems.length > 0) {
              logger.debug('DB: Successfully preserved sold items');
            }
            resolve();
          };
        };
        
        clearRequest.onerror = (error) => {
          logger.error('DB: Error clearing collections:', error);
          reject('Error clearing collections');
        };
        
        transaction.onerror = (error) => {
          logger.error('DB: Error saving collections:', error);
          reject('Error saving collections');
        };
      } catch (error) {
        logger.error('DB: Error in saveCollections:', error);
        reject(error);
      }
    });
  }

  async saveImage(cardId, imageFile) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    try {
      // Compress the image before saving
      const compressedImage = await compressImage(imageFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
      });

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.put({ userId, id: cardId, blob: compressedImage });

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error saving image');
      });
    } catch (error) {
      logger.error('Error compressing image:', error);
      throw error;
    }
  }

  async getImage(cardId) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.get([userId, cardId]);

      request.onsuccess = () => {
        const result = request.result?.blob || null;
        if (result) {
          // Create a new blob with the same content but different object identity
          // This prevents browser caching when the same image is retrieved again
          const newBlob = result.slice(0, result.size, result.type);
          resolve(newBlob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject('Error fetching image');
    });
  }

  async deleteImage(cardId) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.delete([userId, cardId]);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error deleting image');
    });
  }

  async getProfile() {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([PROFILE_STORE], 'readonly');
      const store = transaction.objectStore(PROFILE_STORE);
      const request = store.get([userId, 'user']);

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };

      request.onerror = () => reject('Error fetching profile');
    });
  }

  async saveProfile(profileData) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([PROFILE_STORE], 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const request = store.put({ userId, id: 'user', data: profileData });

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving profile');
    });
  }

  async saveSubscription(subscriptionData) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SUBSCRIPTION_STORE], 'readwrite');
      const store = transaction.objectStore(SUBSCRIPTION_STORE);
      const request = store.put(subscriptionData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving subscription');
    });
  }

  async getSubscription(userId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SUBSCRIPTION_STORE], 'readonly');
      const store = transaction.objectStore(SUBSCRIPTION_STORE);
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject('Error fetching subscription');
    });
  }

  async resetAllData() {
    try {
      logger.debug("Resetting all application data for current user...");
      const userId = this.getCurrentUserId();
      
      // Clear localStorage
      localStorage.removeItem('soldCards');
      localStorage.removeItem('cardListSortField');
      localStorage.removeItem('cardListSortDirection');
      localStorage.removeItem('cardListDisplayMetric');
      localStorage.removeItem('theme');
      
      // Clear IndexedDB for current user only
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        try {
          // Clear collections for current user
          const collectionsTransaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
          const collectionsStore = collectionsTransaction.objectStore(COLLECTIONS_STORE);
          const collectionsRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of name range
            [userId, '\uffff'] // Upper bound: current user, end of name range
          );
          const clearCollectionsRequest = collectionsStore.delete(collectionsRange);
          
          // Clear images for current user
          const imagesTransaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const imagesStore = imagesTransaction.objectStore(IMAGES_STORE);
          const imagesRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of id range
            [userId, '\uffff'] // Upper bound: current user, end of id range
          );
          const clearImagesRequest = imagesStore.delete(imagesRange);
          
          // Clear profile for current user
          const profileTransaction = this.db.transaction([PROFILE_STORE], 'readwrite');
          const profileStore = profileTransaction.objectStore(PROFILE_STORE);
          const profileRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of id range
            [userId, '\uffff'] // Upper bound: current user, end of id range
          );
          const clearProfileRequest = profileStore.delete(profileRange);
          
          // Wait for transactions to complete
          collectionsTransaction.oncomplete = () => {
            logger.debug("Collections cleared for user:", userId);
          };
          
          imagesTransaction.oncomplete = () => {
            logger.debug("Images cleared for user:", userId);
          };
          
          profileTransaction.oncomplete = () => {
            logger.debug("Profile cleared for user:", userId);
          };
          
          // When all are done
          Promise.all([
            new Promise(r => { clearCollectionsRequest.onsuccess = r; }),
            new Promise(r => { clearImagesRequest.onsuccess = r; }),
            new Promise(r => { clearProfileRequest.onsuccess = r; })
          ]).then(() => {
            logger.debug("All data reset successfully for user:", userId);
            resolve(true);
          }).catch(error => {
            logger.error("Error during reset:", error);
            reject(error);
          });
        } catch (error) {
          logger.error("Error in resetAllData transaction:", error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error("Unexpected error in resetAllData:", error);
      throw error;
    }
  };

  async migrateAndCompressImages(progressCallback = () => {}) {
    await this.ensureDB();
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.getAll();

        request.onsuccess = async () => {
          const images = request.result;
          let processed = 0;
          let compressed = 0;
          
          progressCallback({
            total: images.length,
            processed: 0,
            compressed: 0,
            status: 'Starting compression...'
          });

          for (const image of images) {
            try {
              // Check if image needs compression (rough estimate based on file size)
              const currentSize = image.blob.size;
              
              // Try to compress the image
              const compressedBlob = await compressImage(image.blob, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.8
              });

              // Only update if the compressed version is smaller
              if (compressedBlob.size < currentSize) {
                await this.saveImage(image.id, compressedBlob);
                compressed++;
              }

              processed++;
              progressCallback({
                total: images.length,
                processed,
                compressed,
                status: `Processed ${processed}/${images.length} images (${compressed} compressed)`
              });
            } catch (error) {
              logger.error(`Error processing image ${image.id}:`, error);
              // Continue with next image even if one fails
              processed++;
              progressCallback({
                total: images.length,
                processed,
                compressed,
                status: `Error on image ${image.id}, continuing...`
              });
            }
          }

          resolve({
            total: images.length,
            processed,
            compressed
          });
        };

        request.onerror = () => reject('Error fetching images for migration');
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveSoldCards(soldCards) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      try {
        if (!this.db.objectStoreNames.contains(COLLECTIONS_STORE)) {
          logger.error('Collections store does not exist');
          reject('Collections store does not exist');
          return;
        }
        
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Create or update the 'sold' collection without any transformations
        const request = store.put({
          userId,
          name: 'sold',
          data: soldCards
        });
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          logger.error('Error saving sold cards:', event.target.error);
          reject('Error saving sold cards');
        };
        
        transaction.oncomplete = () => {
        };
        
        transaction.onerror = (event) => {
          logger.error('Transaction error for saving sold cards:', event.target.error);
        };
      } catch (error) {
        logger.error('Exception in saveSoldCards:', error);
        reject(error);
      }
    });
  }
  
  async getSoldCards() {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      try {
        // Make sure collections object store exists
        if (!this.db.objectStoreNames.contains(COLLECTIONS_STORE)) {
          logger.debug('Collections store does not exist, returning empty array');
          resolve([]);
          return;
        }
        
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        const request = store.get([userId, 'sold']);

        request.onsuccess = () => {
          const soldCollection = request.result;
          if (soldCollection && Array.isArray(soldCollection.data)) {
            resolve(soldCollection.data);
          } else {
            logger.debug('No sold collection found or invalid format, returning empty array');
            resolve([]);
          }
        };

        request.onerror = (event) => {
          logger.error('Error fetching sold cards:', event.target.error);
          // Return empty array instead of rejecting to prevent UI errors
          resolve([]);
        };
        
        // Add transaction error handler
        transaction.onerror = (event) => {
          logger.error('Transaction error for getting sold cards:', event.target.error);
          resolve([]);
        };
      } catch (error) {
        logger.error('Exception in getSoldCards:', error);
        resolve([]); // Return empty array on error to prevent UI crashes
      }
    });
  }
}

const db = new DatabaseService();
export default db;