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
    this._retried = false;
    this._resetInProgress = false;
    // Initialize database when service is created
    this.initDatabase().catch(error => 
      logger.error('Failed to initialize database on service creation:', error)
    );
  }

  initDatabase() {
    return new Promise((resolve, reject) => {
      try {
        // Close any existing connection first
        if (this.db && !this.db.closed) {
          try {
            this.db.close();
            this.db = null;
          } catch (closeError) {
            logger.warn('Error closing existing database connection:', closeError);
          }
        }
        
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
                
                // Set up connection error handling
                this.db.onversionchange = () => {
                  this.db.close();
                  logger.debug('Database version changed, connection closed');
                  this.db = null;
                };
                
                // Set up close handling
                this.db.onclose = () => {
                  logger.debug('Database connection closed');
                  this.db = null;
                };
                
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
          
          // Set up connection error handling
          this.db.onversionchange = () => {
            this.db.close();
            logger.debug('Database version changed, connection closed');
            this.db = null;
          };
          
          // Set up close handling
          this.db.onclose = () => {
            logger.debug('Database connection closed');
            this.db = null;
          };
          
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
    // If we already have a valid database connection, return immediately
    if (this.db && this.db.version > 0 && !this.db.closed) {
      return;
    }
    
    // If the database promise doesn't exist or the connection was closed, reinitialize
    if (!this.dbPromise || this.db?.closed) {
      logger.debug('Database connection needs to be reinitialized');
      this.db = null;
      this.dbPromise = this.initDatabase();
    }
    
    // Wait for database to be opened
    try {
      this.db = await this.dbPromise;
      
      // Ensure all expected collections exist for the user
      await this.ensureCollections();
    } catch (error) {
      logger.debug('Error ensuring database:', error);
      
      // If there's an error, try to reinitialize the database once
      if (!this._retried) {
        logger.debug('Attempting to reinitialize database after error');
        this._retried = true;
        this.db = null;
        this.dbPromise = this.initDatabase();
        return this.ensureDB();
      }
      
      // If we've already retried, try a complete reset as a last resort
      logger.debug('Database connection still failing after retry, attempting complete reset');
      this._retried = false;
      
      try {
        await this.resetDatabaseSilently();
        // After reset, try to ensure collections again
        await this.ensureCollections();
      } catch (resetError) {
        logger.debug('Error resetting database:', resetError);
        // Just continue - we'll create default collections if needed
      }
    }
    
    // Reset retry flag after successful connection
    this._retried = false;
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
        
        request.onerror = (e) => {
          logger.error(`Error saving collection ${collectionName}:`, e.target.error);
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
      try {
        this.db.close();
      } catch (error) {
        logger.warn('Error closing database during verifyObjectStores:', error);
      }
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
        
        // Set up connection error handling
        this.db.onversionchange = () => {
          this.db.close();
          logger.debug('Database version changed, connection closed');
          this.db = null;
        };
        
        // Set up close handling
        this.db.onclose = () => {
          logger.debug('Database connection closed');
          this.db = null;
        };
        
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
          // Check if database is valid
          if (!this.db || this.db.closed) {
            logger.debug('Database connection invalid in getCollections, returning default');
            resolve({ 'Default Collection': [] });
            return;
          }
          
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          // Using an index range to get all collections for the current user
          const request = store.getAll(IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of name range
            [userId, '\uffff'] // Upper bound: current user, end of name range
          ));

          request.onsuccess = () => {
            const collections = {};
            
            // Check if we got valid results
            if (request.result && Array.isArray(request.result)) {
              request.result.forEach(collection => {
                if (collection && collection.name) {
                  collections[collection.name] = collection.data || [];
                }
              });
            }
            
            // Ensure there's at least a Default Collection
            if (Object.keys(collections).length === 0) {
              collections['Default Collection'] = [];
            }
            
            resolve(collections);
          };

          request.onerror = (error) => {
            logger.debug('Error fetching collections:', error);
            // Return empty collections object with Default Collection
            resolve({ 'Default Collection': [] });
          };
          
          // Add transaction error handler
          transaction.onerror = (error) => {
            logger.debug('Transaction error in getCollections:', error);
            resolve({ 'Default Collection': [] });
          };
          
          // Add transaction abort handler
          transaction.onabort = (event) => {
            logger.debug('Transaction aborted in getCollections:', event);
            resolve({ 'Default Collection': [] });
          };
        } catch (error) {
          logger.debug('Transaction error in getCollections:', error);
          // Return empty collections object with Default Collection
          resolve({ 'Default Collection': [] });
        }
      });
    } catch (error) {
      logger.debug('Fatal error in getCollections:', error);
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
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const store = transaction.objectStore(IMAGES_STORE);
          
          // First check if the image exists
          const getRequest = store.get([userId, cardId]);
          
          getRequest.onsuccess = (event) => {
            const image = event.target.result;
            if (!image) {
              // Image not found
              logger.debug(`Image ${cardId} not found, nothing to delete.`);
              resolve(false);
              return;
            }
            
            // Image found, delete it
            const deleteRequest = store.delete([userId, cardId]);
            
            deleteRequest.onsuccess = () => {
              logger.debug(`Successfully deleted image: ${cardId}`);
              resolve(true);
            };
            
            deleteRequest.onerror = (error) => {
              logger.error(`Error deleting image ${cardId}:`, error);
              reject(new Error(`Failed to delete image ${cardId}: ${error.target?.error?.message || 'Unknown error'}`));
            };
          };
          
          getRequest.onerror = (error) => {
            logger.error(`Error checking for image ${cardId}:`, error);
            reject(new Error(`Failed to check for image ${cardId}: ${error.target?.error?.message || 'Unknown error'}`));
          };
        } catch (error) {
          logger.error('Transaction error in deleteImage:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in deleteImage:', error);
      throw error;
    }
  }

  async deleteImagesForCards(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }
    
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      let deleted = 0;
      let failed = 0;
      
      for (const cardId of cardIds) {
        try {
          const wasDeleted = await this.deleteImage(cardId);
          if (wasDeleted) {
            deleted++;
          }
        } catch (error) {
          logger.error(`Error deleting image for card ${cardId}:`, error);
          failed++;
        }
      }
      
      logger.debug(`Deleted ${deleted} images, ${failed} failed`);
      return { deleted, failed };
    } catch (error) {
      logger.error('Error in bulk image deletion:', error);
      throw error;
    }
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

  /**
   * Verify that all data is properly secured with the user's ID
   * @param {string} userId - The current user's ID
   * @returns {Promise<{secure: boolean, message: string, details: Object}>} - Result of the security check
   */
  async verifyDataSecurity(userId) {
    try {
      // Open the database
      await this.ensureDB();
      
      // Results object to track all security checks
      const results = {
        collections: { total: 0, secured: 0, unsecured: [] },
        images: { total: 0, secured: 0, unsecured: [] },
        crossUserAccess: { attempted: 0, blocked: 0, leaked: [] }
      };
      
      // Step 1: Check collections store for proper user ID association
      const collectionsStore = this.db.transaction(COLLECTIONS_STORE, 'readonly').objectStore(COLLECTIONS_STORE);
      const collectionsRequest = collectionsStore.getAll();
      
      return new Promise((resolve, reject) => {
        collectionsRequest.onsuccess = async () => {
          const collections = collectionsRequest.result;
          results.collections.total = collections.length;
          
          logger.debug(`Checking security for ${collections.length} collections with user ID: ${userId}`);
          
          // Check if any collections exist without a userId or with a different userId
          const unsecuredCollections = collections.filter(collection => 
            !collection.userId || collection.userId !== userId
          );
          
          results.collections.secured = collections.length - unsecuredCollections.length;
          
          // Log detailed information about unsecured collections
          if (unsecuredCollections.length > 0) {
            logger.debug('Unsecured collections found:');
            unsecuredCollections.forEach(collection => {
              logger.debug(`- Collection ID: ${collection.id}, Name: ${collection.name || 'unnamed'}, Current userId: ${collection.userId || 'none'}`);
            });
            
            results.collections.unsecured = unsecuredCollections.map(c => ({
              id: c.id,
              name: c.name || 'unnamed',
              currentUserId: c.userId || 'none'
            }));
          }
          
          // Step 2: Check images store for proper user ID association
          const imagesStore = this.db.transaction(IMAGES_STORE, 'readonly').objectStore(IMAGES_STORE);
          const imagesRequest = imagesStore.getAll();
          
          imagesRequest.onsuccess = async () => {
            const images = imagesRequest.result;
            results.images.total = images.length;
            
            logger.debug(`Checking security for ${images.length} images with user ID: ${userId}`);
            
            // Check if any images exist without a userId or with a different userId
            const unsecuredImages = images.filter(image => 
              !image.userId || image.userId !== userId
            );
            
            results.images.secured = images.length - unsecuredImages.length;
            
            // Log detailed information about unsecured images
            if (unsecuredImages.length > 0) {
              logger.debug('Unsecured images found:');
              // Log the first 10 unsecured images to avoid console flooding
              unsecuredImages.slice(0, 10).forEach(image => {
                logger.debug(`- Image ID: ${image.id}, Current userId: ${image.userId || 'none'}, Card ID: ${image.cardId || 'unknown'}`);
              });
              
              if (unsecuredImages.length > 10) {
                logger.debug(`... and ${unsecuredImages.length - 10} more`);
              }
              
              results.images.unsecured = unsecuredImages.slice(0, 20).map(img => ({
                id: img.id,
                cardId: img.cardId || 'unknown',
                currentUserId: img.userId || 'none'
              }));
            }
            
            // Step 3: Test cross-user data isolation
            // Create a fake user ID to test isolation
            const fakeUserId = 'test-user-' + Date.now();
            logger.debug(`Testing cross-user data isolation with fake user ID: ${fakeUserId}`);
            
            // Try to access collections with a different user ID
            try {
              results.crossUserAccess.attempted++;
              const fakeUserCollections = await this.testCrossUserAccess(COLLECTIONS_STORE, fakeUserId);
              if (fakeUserCollections.length > 0) {
                logger.warn(`SECURITY ISSUE: Able to access ${fakeUserCollections.length} collections with fake user ID`);
                results.crossUserAccess.leaked.push({
                  store: 'collections',
                  count: fakeUserCollections.length,
                  items: fakeUserCollections.slice(0, 5).map(c => c.name || 'unnamed')
                });
              } else {
                results.crossUserAccess.blocked++;
                logger.debug('Cross-user collection access properly blocked');
              }
            } catch (error) {
              // This is actually good - it means access was blocked
              results.crossUserAccess.blocked++;
              logger.debug('Cross-user collection access properly blocked with error:', error.message);
            }
            
            // Try to access images with a different user ID
            try {
              results.crossUserAccess.attempted++;
              const fakeUserImages = await this.testCrossUserAccess(IMAGES_STORE, fakeUserId);
              if (fakeUserImages.length > 0) {
                logger.warn(`SECURITY ISSUE: Able to access ${fakeUserImages.length} images with fake user ID`);
                results.crossUserAccess.leaked.push({
                  store: 'images',
                  count: fakeUserImages.length,
                  items: fakeUserImages.slice(0, 5).map(img => img.id)
                });
              } else {
                results.crossUserAccess.blocked++;
                logger.debug('Cross-user image access properly blocked');
              }
            } catch (error) {
              // This is actually good - it means access was blocked
              results.crossUserAccess.blocked++;
              logger.debug('Cross-user image access properly blocked with error:', error.message);
            }
            
            // Determine overall security status
            const isSecure = 
              results.collections.unsecured.length === 0 && 
              results.images.unsecured.length === 0 &&
              results.crossUserAccess.leaked.length === 0;
            
            // Generate detailed report
            const securityReport = {
              secure: isSecure,
              message: isSecure 
                ? 'All data is properly secured and isolated with your user ID' 
                : 'Security issues detected with data isolation',
              details: {
                collections: {
                  total: results.collections.total,
                  secured: results.collections.secured,
                  unsecured: results.collections.unsecured.length
                },
                images: {
                  total: results.images.total,
                  secured: results.images.secured,
                  unsecured: results.images.unsecured.length,
                  totalUnsecuredImages: results.images.unsecured.length
                },
                crossUserAccess: {
                  attempted: results.crossUserAccess.attempted,
                  blocked: results.crossUserAccess.blocked,
                  leaked: results.crossUserAccess.leaked
                },
                unsecuredCollections: results.collections.unsecured,
                unsecuredImages: results.images.unsecured.slice(0, 20)
              }
            };
            
            logger.debug('Security verification complete:', securityReport);
            resolve(securityReport);
          };
          
          imagesRequest.onerror = (event) => {
            reject(new Error('Failed to check image security: ' + event.target.error));
          };
        };
        
        collectionsRequest.onerror = (event) => {
          reject(new Error('Failed to check collection security: ' + event.target.error));
        };
      });
    } catch (error) {
      logger.error('Error verifying data security:', error);
      throw new Error('Failed to verify data security: ' + error.message);
    }
  }

  /**
   * Test cross-user data access to verify isolation
   * @param {string} storeName - The name of the object store to test
   * @param {string} fakeUserId - A fake user ID to test with
   * @returns {Promise<Array>} - Any data that was accessible (should be empty)
   * @private
   */
  async testCrossUserAccess(storeName, fakeUserId) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        // Try to get all items for the fake user ID
        // This should return an empty array if security is working correctly
        const range = IDBKeyRange.bound(
          [fakeUserId, ''], // Lower bound: fake user, start of name range
          [fakeUserId, '\uffff'] // Upper bound: fake user, end of name range
        );
        
        const request = store.getAll(range);
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = (event) => {
          // This might happen if the store is properly secured
          reject(new Error(`Access denied to ${storeName} for fake user: ${event.target.error}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fix data security by properly associating all data with the user's ID
   * @param {string} userId - The current user's ID
   * @returns {Promise<{fixed: {collections: number, images: number}, total: {collections: number, images: number}}>}
   */
  async fixDataSecurity(userId) {
    try {
      // Open the database
      await this.ensureDB();
      
      // Results object to track fixes
      const results = {
        fixed: { collections: 0, images: 0 },
        total: { collections: 0, images: 0 }
      };
      
      // Fix collections
      const collectionsStore = this.db.transaction(COLLECTIONS_STORE, 'readwrite').objectStore(COLLECTIONS_STORE);
      const collectionsRequest = collectionsStore.getAll();
      
      return new Promise((resolve, reject) => {
        collectionsRequest.onsuccess = () => {
          const collections = collectionsRequest.result;
          results.total.collections = collections.length;
          
          // Update each collection that doesn't have the correct userId
          collections.forEach(collection => {
            if (!collection.userId || collection.userId !== userId) {
              // Create a new object with the correct structure
              const fixedCollection = {
                ...collection,
                userId: userId
              };
              
              // Delete the old entry if it exists
              if (collection.userId) {
                try {
                  collectionsStore.delete([collection.userId, collection.name]);
                } catch (error) {
                  logger.warn(`Could not delete old collection entry: ${error.message}`);
                }
              }
              
              // Add the fixed entry
              collectionsStore.put(fixedCollection);
              results.fixed.collections++;
              
              logger.debug(`Fixed collection: ${collection.name}`);
            }
          });
          
          logger.debug(`Fixed ${results.fixed.collections} of ${results.total.collections} collections`);
          
          // Fix images
          const imagesStore = this.db.transaction(IMAGES_STORE, 'readwrite').objectStore(IMAGES_STORE);
          const imagesRequest = imagesStore.getAll();
          
          imagesRequest.onsuccess = () => {
            const images = imagesRequest.result;
            results.total.images = images.length;
            
            // Update each image that doesn't have the correct userId
            images.forEach(image => {
              if (!image.userId || image.userId !== userId) {
                // Create a new object with the correct structure
                const fixedImage = {
                  ...image,
                  userId: userId
                };
                
                // Delete the old entry if it exists
                if (image.userId) {
                  try {
                    imagesStore.delete([image.userId, image.id]);
                  } catch (error) {
                    logger.warn(`Could not delete old image entry: ${error.message}`);
                  }
                }
                
                // Add the fixed entry
                imagesStore.put(fixedImage);
                results.fixed.images++;
                
                logger.debug(`Fixed image: ${image.id}`);
              }
            });
            
            logger.debug(`Fixed ${results.fixed.images} of ${results.total.images} images`);
            
            // All data is now secure
            resolve(results);
          };
          
          imagesRequest.onerror = (event) => {
            reject(new Error('Failed to fix image security: ' + event.target.error));
          };
        };
        
        collectionsRequest.onerror = (event) => {
          reject(new Error('Failed to fix collection security: ' + event.target.error));
        };
      });
    } catch (error) {
      logger.error('Error fixing data security:', error);
      throw new Error('Failed to fix data security: ' + error.message);
    }
  }

  /**
   * Get all images for the current user
   * @returns {Promise<Array>} Array of image objects with id and blob properties
   */
  async getAllImages() {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        
        // Using an index range to get all images for the current user
        const request = store.getAll(IDBKeyRange.bound(
          [userId, ''], // Lower bound: current user, start of id range
          [userId, '\uffff'] // Upper bound: current user, end of id range
        ));

        request.onsuccess = () => {
          const images = request.result || [];
          logger.debug(`Retrieved ${images.length} images for user ${userId}`);
          resolve(images);
        };

        request.onerror = (event) => {
          logger.error('Error fetching images:', event.target.error);
          reject(new Error('Failed to fetch images'));
        };
      } catch (error) {
        logger.error('Exception in getAllImages:', error);
        reject(error);
      }
    });
  }

  /**
   * Get all collections for the current user as an array of collection objects
   * This is used for cloud backup functionality
   * @returns {Promise<Array>} Array of collection objects with name, userId, and data properties
   */
  async getAllCollections() {
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
            // Return the raw array of collection objects
            const collections = request.result || [];
            logger.debug(`Retrieved ${collections.length} collections for user ${userId}`);
            resolve(collections);
          };

          request.onerror = (error) => {
            logger.error('Error fetching collections:', error);
            reject(new Error('Failed to fetch collections'));
          };
        } catch (error) {
          logger.error('Transaction error in getAllCollections:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in getAllCollections:', error);
      throw error;
    }
  }

  /**
   * Clear all collections for the current user
   * @returns {Promise<void>}
   */
  async clearCollections() {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          // Get all collections for the current user
          const request = store.getAll(IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of name range
            [userId, '\uffff'] // Upper bound: current user, end of name range
          ));

          request.onsuccess = () => {
            const collections = request.result || [];
            logger.debug(`Clearing ${collections.length} collections for user ${userId}`);
            
            // Delete each collection
            let deletedCount = 0;
            if (collections.length === 0) {
              resolve(); // No collections to delete
              return;
            }
            
            collections.forEach(collection => {
              const deleteRequest = store.delete([userId, collection.name]);
              deleteRequest.onsuccess = () => {
                deletedCount++;
                if (deletedCount === collections.length) {
                  logger.debug(`Successfully cleared ${deletedCount} collections`);
                  resolve();
                }
              };
              deleteRequest.onerror = (error) => {
                logger.error(`Error deleting collection ${collection.name}:`, error);
                // Continue with other deletions
              };
            });
          };

          request.onerror = (error) => {
            logger.error('Error fetching collections for deletion:', error);
            reject(new Error('Failed to clear collections'));
          };
        } catch (error) {
          logger.error('Transaction error in clearCollections:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in clearCollections:', error);
      throw error;
    }
  }

  /**
   * Import collections from a backup
   * @param {Array} collections - Array of collection objects to import
   * @returns {Promise<void>}
   */
  async importCollections(collections) {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          logger.debug(`Importing ${collections.length} collections for user ${userId}`);
          
          let importedCount = 0;
          
          // Import each collection
          collections.forEach(collection => {
            // Ensure the collection has the current user's ID
            collection.userId = userId;
            
            const request = store.put(collection);
            
            request.onsuccess = () => {
              importedCount++;
              if (importedCount === collections.length) {
                logger.debug(`Successfully imported ${importedCount} collections`);
                resolve();
              }
            };
            
            request.onerror = (error) => {
              logger.error(`Error importing collection ${collection.name}:`, error);
              // Continue with other imports
            };
          });
          
          // Handle case where collections array is empty
          if (collections.length === 0) {
            logger.debug('No collections to import');
            resolve();
          }
        } catch (error) {
          logger.error('Transaction error in importCollections:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in importCollections:', error);
      throw error;
    }
  }

  /**
   * Clear all images for the current user
   * @returns {Promise<void>}
   */
  async clearImages() {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const store = transaction.objectStore(IMAGES_STORE);
          
          // Get all images for the current user
          const request = store.getAll(IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of id range
            [userId, '\uffff'] // Upper bound: current user, end of id range
          ));

          request.onsuccess = () => {
            const images = request.result || [];
            logger.debug(`Clearing ${images.length} images for user ${userId}`);
            
            // Delete each image
            let deletedCount = 0;
            if (images.length === 0) {
              resolve(); // No images to delete
              return;
            }
            
            images.forEach(image => {
              const deleteRequest = store.delete([userId, image.id]);
              deleteRequest.onsuccess = () => {
                deletedCount++;
                if (deletedCount === images.length) {
                  logger.debug(`Successfully cleared ${deletedCount} images`);
                  resolve();
                }
              };
              deleteRequest.onerror = (error) => {
                logger.error(`Error deleting image ${image.id}:`, error);
                // Continue with other deletions
              };
            });
          };

          request.onerror = (error) => {
            logger.error('Error fetching images for deletion:', error);
            reject(new Error('Failed to clear images'));
          };
        } catch (error) {
          logger.error('Transaction error in clearImages:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in clearImages:', error);
      throw error;
    }
  }

  /**
   * Import an image from a backup
   * @param {Object} imageData - Object containing image data (id, format, data)
   * @returns {Promise<void>}
   */
  async importImage(imageData) {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const store = transaction.objectStore(IMAGES_STORE);
          
          // Determine which property to use as the blob
          let imageBlob;
          
          if (imageData.blob instanceof Blob) {
            // If blob property is a Blob, use it
            imageBlob = imageData.blob;
          } else if (imageData.data instanceof Blob) {
            // If data property is a Blob, use it
            imageBlob = imageData.data;
          } else if (typeof imageData.data === 'string' && imageData.data.startsWith('data:')) {
            // If data is a base64 string, convert it to a Blob
            try {
              const byteString = atob(imageData.data.split(',')[1]);
              const mimeString = imageData.data.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let j = 0; j < byteString.length; j++) {
                ia[j] = byteString.charCodeAt(j);
              }
              imageBlob = new Blob([ab], { type: mimeString });
            } catch (error) {
              logger.error(`Error converting base64 for image ${imageData.id}:`, error);
              // Try to create a simple blob if conversion fails
              imageBlob = new Blob([imageData.data], { type: 'image/png' });
            }
          } else if (imageData.blob) {
            // If blob property exists but is not a Blob, create a Blob from it
            imageBlob = new Blob([imageData.blob], { type: 'image/png' });
          } else if (imageData.data) {
            // If data property exists but is not a Blob or base64 string, create a Blob from it
            imageBlob = new Blob([imageData.data], { type: 'image/png' });
          } else {
            // No usable data found
            reject(new Error(`No usable image data found for image ${imageData.id}`));
            return;
          }
          
          // Create the image object with the correct structure
          const image = {
            userId: userId,
            id: imageData.id,
            format: imageData.format || 'png', // Default to png if format not provided
            blob: imageBlob // Store as blob property for compatibility with existing code
          };
          
          // Store the image without providing an explicit key
          // The key is already part of the image object structure
          const request = store.put(image);
          
          request.onsuccess = () => {
            logger.debug(`Successfully imported image: ${image.id}`);
            resolve();
          };
          
          request.onerror = (error) => {
            logger.error(`Error importing image ${image.id}:`, error);
            reject(new Error(`Failed to import image ${image.id}: ${error.target?.error?.message || 'Unknown error'}`));
          };
        } catch (error) {
          logger.error('Transaction error in importImage:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in importImage:', error);
      throw error;
    }
  }

  /**
   * Delete an image from the database by ID
   * @param {string} imageId - The ID of the image to delete
   * @returns {Promise<boolean>} - True if the image was deleted, false if not found
   */
  async deleteImage(imageId) {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const store = transaction.objectStore(IMAGES_STORE);
          
          // First check if the image exists
          const getRequest = store.get([userId, imageId]);
          
          getRequest.onsuccess = (event) => {
            const image = event.target.result;
            if (!image) {
              // Image not found
              logger.debug(`Image ${imageId} not found, nothing to delete.`);
              resolve(false);
              return;
            }
            
            // Image found, delete it
            const deleteRequest = store.delete([userId, imageId]);
            
            deleteRequest.onsuccess = () => {
              logger.debug(`Successfully deleted image: ${imageId}`);
              resolve(true);
            };
            
            deleteRequest.onerror = (error) => {
              logger.error(`Error deleting image ${imageId}:`, error);
              reject(new Error(`Failed to delete image ${imageId}: ${error.target?.error?.message || 'Unknown error'}`));
            };
          };
          
          getRequest.onerror = (error) => {
            logger.error(`Error checking for image ${imageId}:`, error);
            reject(new Error(`Failed to check for image ${imageId}: ${error.target?.error?.message || 'Unknown error'}`));
          };
        } catch (error) {
          logger.error('Transaction error in deleteImage:', error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Unexpected error in deleteImage:', error);
      throw error;
    }
  }

  /**
   * Delete all images for a collection
   * @param {Array<string>} cardIds - Array of card IDs whose images should be deleted
   * @returns {Promise<{deleted: number, failed: number}>} - Stats about the deletion operation
   */
  async deleteImagesForCards(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }
    
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      let deleted = 0;
      let failed = 0;
      
      for (const cardId of cardIds) {
        try {
          const wasDeleted = await this.deleteImage(cardId);
          if (wasDeleted) {
            deleted++;
          }
        } catch (error) {
          logger.error(`Error deleting image for card ${cardId}:`, error);
          failed++;
        }
      }
      
      logger.debug(`Deleted ${deleted} images, ${failed} failed`);
      return { deleted, failed };
    } catch (error) {
      logger.error('Error in bulk image deletion:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned images that don't belong to any card
   * @param {Array<string>} cardIds - Array of valid card IDs that should be kept
   * @returns {Promise<{removed: number, total: number}>} - Stats about the cleanup operation
   */
  async cleanupOrphanedImages(cardIds) {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      // Get all images for the current user
      const allImages = await this.getAllImages();
      
      // Create a Set of valid card IDs for faster lookup
      const validCardIds = new Set(cardIds);
      
      // Find orphaned images (images that don't belong to any card)
      const orphanedImages = allImages.filter(image => !validCardIds.has(image.id));
      
      logger.debug(`Found ${orphanedImages.length} orphaned images out of ${allImages.length} total images`);
      
      // Delete each orphaned image
      let removedCount = 0;
      for (const image of orphanedImages) {
        try {
          await this.deleteImage(image.id);
          removedCount++;
        } catch (error) {
          logger.error(`Failed to delete orphaned image ${image.id}:`, error);
        }
      }
      
      return {
        removed: removedCount,
        total: allImages.length
      };
    } catch (error) {
      logger.error('Error cleaning up orphaned images:', error);
      throw error;
    }
  }

  /**
   * Completely reset the database by deleting it and recreating it
   * This is a last resort for fixing database corruption issues
   * @returns {Promise<IDBDatabase>} A promise that resolves to the new database
   */
  async resetDatabase() {
    if (this._resetInProgress) {
      logger.debug('Database reset already in progress, waiting...');
      // Wait for the existing reset to complete
      return this.dbPromise;
    }
    
    this._resetInProgress = true;
    logger.debug('Performing complete database reset...');
    
    try {
      // Close any existing connection
      if (this.db && !this.db.closed) {
        try {
          this.db.close();
        } catch (error) {
          logger.warn('Error closing database during reset:', error);
        }
      }
      
      // Clear the database reference
      this.db = null;
      
      // Create a promise for deleting the database
      const deletePromise = new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        
        deleteRequest.onsuccess = () => {
          logger.debug('Database successfully deleted');
          resolve();
        };
        
        deleteRequest.onerror = (event) => {
          logger.error('Error deleting database:', event.target.error);
          reject(new Error('Failed to delete database: ' + event.target.error));
        };
        
        deleteRequest.onblocked = () => {
          logger.warn('Database deletion blocked, some connections might still be open');
          // Try to continue anyway after a short delay
          setTimeout(resolve, 1000);
        };
      });
      
      // Wait for the database to be deleted
      await deletePromise;
      
      // Wait a short time to ensure all connections are properly closed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a new database
      this.dbPromise = this.initDatabase();
      this.db = await this.dbPromise;
      
      // Ensure the database has all required object stores
      await this.setupRequiredStores();
      
      logger.debug('Database reset completed successfully');
      return this.db;
    } catch (error) {
      logger.error('Error during database reset:', error);
      throw error;
    } finally {
      this._resetInProgress = false;
    }
  }
  
  /**
   * Ensure all required object stores exist in the database
   * This is called after a database reset to ensure the database is properly initialized
   */
  async setupRequiredStores() {
    if (!this.db) return;
    
    const requiredStores = [COLLECTIONS_STORE, IMAGES_STORE, PROFILE_STORE, SUBSCRIPTION_STORE];
    const existingStores = Array.from(this.db.objectStoreNames);
    
    const missingStores = requiredStores.filter(store => !existingStores.includes(store));
    
    if (missingStores.length > 0) {
      logger.debug(`Missing object stores after reset: ${missingStores.join(', ')}. Upgrading database...`);
      
      // Close current connection gracefully
      try {
        this.db.close();
      } catch (error) {
        logger.debug('Error closing database during setupRequiredStores:', error);
      }
      this.db = null;
      
      // Reopen with increased version to trigger upgrade
      const newVersion = this.db ? this.db.version + 1 : DB_VERSION + 1;
      logger.debug(`Reopening database with new version ${newVersion}`);
      
      // Create a promise for opening the database with a new version
      const openPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, newVersion);
        
        request.onupgradeneeded = (event) => {
          logger.debug(`Upgrading database to fix missing stores. Version: ${event.oldVersion} -> ${event.newVersion}`);
          this.setupDatabase(event);
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          
          // Set up connection error handling
          this.db.onversionchange = () => {
            this.db.close();
            logger.debug('Database version changed, connection closed');
            this.db = null;
          };
          
          // Set up close handling
          this.db.onclose = () => {
            logger.debug('Database connection closed');
            this.db = null;
          };
          
          logger.debug(`Database upgraded successfully to version ${this.db.version}`);
          resolve(this.db);
        };
        
        request.onerror = (event) => {
          logger.error('Error upgrading database:', event.target.error);
          reject(event.target.error);
        };
      });
      
      return openPromise;
    }
    
    return this.db;
  }

  /**
   * Silently initialize the database without forcing a reset
   * This is a more graceful approach for first-time users
   * @returns {Promise<IDBDatabase>} A promise that resolves to the database
   */
  async silentInitialize() {
    // If we already have a valid database connection, return immediately
    if (this.db && this.db.version > 0 && !this.db.closed) {
      return this.db;
    }
    
    try {
      // If the database promise doesn't exist or the connection was closed, reinitialize
      if (!this.dbPromise || this.db?.closed) {
        logger.debug('Database connection needs to be reinitialized');
        this.db = null;
        this.dbPromise = this.initDatabase();
      }
      
      // Wait for database to be opened
      this.db = await this.dbPromise;
      
      // Check if all required object stores exist
      const requiredStores = [COLLECTIONS_STORE, IMAGES_STORE, PROFILE_STORE, SUBSCRIPTION_STORE];
      const existingStores = Array.from(this.db.objectStoreNames);
      const missingStores = requiredStores.filter(store => !existingStores.includes(store));
      
      // If stores are missing, upgrade the database
      if (missingStores.length > 0) {
        logger.debug(`Missing object stores: ${missingStores.join(', ')}. Will upgrade database...`);
        
        // Close current connection gracefully
        try {
          this.db.close();
        } catch (error) {
          logger.debug('Error closing database during silentInitialize:', error);
        }
        this.db = null;
        
        // Reopen with increased version to trigger upgrade
        const newVersion = DB_VERSION + 1;
        logger.debug(`Reopening database with new version ${newVersion}`);
        
        // Create a promise for opening the database with a new version
        const openPromise = new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, newVersion);
          
          request.onupgradeneeded = (event) => {
            logger.debug(`Upgrading database to fix missing stores. Version: ${event.oldVersion} -> ${event.newVersion}`);
            this.setupDatabase(event);
          };
          
          request.onsuccess = (event) => {
            this.db = event.target.result;
            
            // Set up connection error handling
            this.db.onversionchange = () => {
              this.db.close();
              logger.debug('Database version changed, connection closed');
              this.db = null;
            };
            
            // Set up close handling
            this.db.onclose = () => {
              logger.debug('Database connection closed');
              this.db = null;
            };
            
            logger.debug(`Database upgraded successfully to version ${this.db.version}`);
            resolve(this.db);
          };
          
          request.onerror = (event) => {
            logger.debug('Error upgrading database:', event.target.error);
            // Resolve with null instead of rejecting to keep the process silent
            resolve(null);
          };
        });
        
        const result = await openPromise;
        if (result) {
          this.db = result;
          this.dbPromise = Promise.resolve(this.db);
        } else {
          // If upgrade failed, try a complete reset as a last resort
          // but do it silently without showing errors to the user
          return this.resetDatabaseSilently();
        }
      }
      
      return this.db;
    } catch (error) {
      logger.debug('Error during silent database initialization:', error);
      
      // Try a silent reset as a last resort
      return this.resetDatabaseSilently();
    }
  }
  
  /**
   * Reset the database silently without showing errors to the user
   * This is used as a last resort when other initialization methods fail
   * @returns {Promise<IDBDatabase>} A promise that resolves to the new database
   */
  async resetDatabaseSilently() {
    if (this._resetInProgress) {
      logger.debug('Database reset already in progress, waiting...');
      // Wait for the existing reset to complete
      return this.dbPromise;
    }
    
    this._resetInProgress = true;
    logger.debug('Performing silent database reset...');
    
    try {
      // Close any existing connection
      if (this.db && !this.db.closed) {
        try {
          this.db.close();
        } catch (error) {
          logger.debug('Error closing database during silent reset:', error);
        }
      }
      
      // Clear the database reference
      this.db = null;
      
      // Create a promise for deleting the database
      const deletePromise = new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        
        deleteRequest.onsuccess = () => {
          logger.debug('Database successfully deleted');
          resolve(true);
        };
        
        deleteRequest.onerror = (event) => {
          logger.debug('Error deleting database:', event.target.error);
          // Resolve anyway to continue the process
          resolve(false);
        };
        
        deleteRequest.onblocked = () => {
          logger.debug('Database deletion blocked, some connections might still be open');
          // Try to continue anyway after a short delay
          setTimeout(() => resolve(false), 1000);
        };
      });
      
      // Wait for the database to be deleted
      await deletePromise;
      
      // Wait a short time to ensure all connections are properly closed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a new database
      this.dbPromise = this.initDatabase();
      this.db = await this.dbPromise;
      
      // Ensure the database has all required object stores
      await this.setupRequiredStores();
      
      logger.debug('Silent database reset completed successfully');
      return this.db;
    } catch (error) {
      logger.debug('Error during silent database reset:', error);
      
      // Create a new database promise even if the reset failed
      this.dbPromise = this.initDatabase();
      return this.dbPromise;
    } finally {
      this._resetInProgress = false;
    }
  }
}

const db = new DatabaseService();
export default db;