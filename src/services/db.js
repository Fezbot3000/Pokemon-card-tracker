import { compressImage } from '../utils/imageCompression';
import { auth } from './firebase'; // Import Firebase auth to get the current user

const DB_NAME = 'PokemonCardDB';
const DB_VERSION = 4; // Increment version to trigger database upgrade
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const PROFILE_STORE = 'profile';
const SUBSCRIPTION_STORE = 'subscription';
const SOLD_CARDS_STORE = 'soldCards'; // Add new store for sold cards

class DatabaseService {
  constructor() {
    this.db = null;
    this.initDatabase();
  }

  initDatabase() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
          console.error("Database error:", event.target.error);
          
          // Check if this is a version error
          if (event.target.error && event.target.error.name === 'VersionError') {
            // Try to delete the database and recreate it
            console.log("Version error detected, attempting to delete and recreate database");
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
            
            deleteRequest.onsuccess = () => {
              console.log("Successfully deleted database, recreating...");
              // Try again with a new request
              const newRequest = indexedDB.open(DB_NAME, DB_VERSION);
              
              newRequest.onerror = (e) => {
                console.error("Fatal database error after reset:", e.target.error);
                reject('Error opening database after reset');
              };
              
              newRequest.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
              };
              
              newRequest.onupgradeneeded = this.setupDatabase.bind(this);
            };
            
            deleteRequest.onerror = (e) => {
              console.error("Could not delete database:", e.target.error);
              reject('Error deleting database');
            };
          } else {
            // For other errors, just reject
            reject('Error opening database');
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onupgradeneeded = this.setupDatabase.bind(this);
      } catch (error) {
        console.error("Unexpected error during database initialization:", error);
        reject('Unexpected error initializing database');
      }
    });
  }
  
  // Extract database setup logic to reuse during recovery
  setupDatabase(event) {
    const db = event.target.result;

    // Create collections store with compound key for user isolation
    if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
      db.createObjectStore(COLLECTIONS_STORE, { keyPath: ['userId', 'name'] });
    } else {
      // If upgrading from version 2 to 3, we need to recreate the object store
      // with the new compound key structure
      db.deleteObjectStore(COLLECTIONS_STORE);
      db.createObjectStore(COLLECTIONS_STORE, { keyPath: ['userId', 'name'] });
    }

    // Create images store with compound key for user isolation
    if (!db.objectStoreNames.contains(IMAGES_STORE)) {
      db.createObjectStore(IMAGES_STORE, { keyPath: ['userId', 'id'] });
    } else {
      // If upgrading from version 2 to 3, we need to recreate the object store
      db.deleteObjectStore(IMAGES_STORE);
      db.createObjectStore(IMAGES_STORE, { keyPath: ['userId', 'id'] });
    }

    // Create profile store with compound key for user isolation
    if (!db.objectStoreNames.contains(PROFILE_STORE)) {
      db.createObjectStore(PROFILE_STORE, { keyPath: ['userId', 'id'] });
    } else {
      // If upgrading from version 2 to 3, we need to recreate the object store
      db.deleteObjectStore(PROFILE_STORE);
      db.createObjectStore(PROFILE_STORE, { keyPath: ['userId', 'id'] });
    }

    // Subscription store already uses userId as the key, so it's already isolated
    if (!db.objectStoreNames.contains(SUBSCRIPTION_STORE)) {
      db.createObjectStore(SUBSCRIPTION_STORE, { keyPath: 'userId' });
    }

    // Create dedicated sold cards store
    if (!db.objectStoreNames.contains(SOLD_CARDS_STORE)) {
      const soldCardsStore = db.createObjectStore(SOLD_CARDS_STORE, { keyPath: ['userId', 'id'] });
      soldCardsStore.createIndex('userId', 'userId', { unique: false });
    }
  }

  // Helper to get the current user ID or a default for anonymous users
  getCurrentUserId() {
    const currentUser = auth.currentUser;
    return currentUser ? currentUser.uid : 'anonymous';
  }

  async getCollections() {
    try {
      const userId = this.getCurrentUserId();
      
      const collections = await this.retryTransaction(COLLECTIONS_STORE, 'readonly', (store, resolve, reject) => {
        try {
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
            console.error('Error fetching collections:', error);
            reject(error);
          };
        } catch (error) {
          reject(error);
        }
      });
      
      return collections;
    } catch (error) {
      console.error('Error in getCollections:', error);
      // Return empty collections object with Default Collection as fallback
      return { 'Default Collection': [] };
    }
  }

  async saveCollections(collections) {
    const userId = this.getCurrentUserId();
    
    return this.retryTransaction(COLLECTIONS_STORE, 'readwrite', async (store, resolve, reject) => {
      try {
        console.log("DB: Saving collections:", Object.keys(collections));
        
        // Clear existing collections for this user
        const range = IDBKeyRange.bound(
          [userId, ''], // Lower bound: current user, start of name range
          [userId, '\uffff'] // Upper bound: current user, end of name range
        );
        
        await store.delete(range);
        console.log('DB: Cleared existing collections for user:', userId);
        
        // Add new collections
        for (const [name, data] of Object.entries(collections)) {
          console.log(`DB: Saving collection: ${name} with ${Array.isArray(data) ? data.length : 0} cards`);
          await store.put({ userId, name, data });
        }
        
        console.log('DB: Successfully saved all collections:', Object.keys(collections));
        resolve();
      } catch (error) {
        console.error('DB: Error in saveCollections:', error);
        reject(error);
      }
    });
  }

  async saveImage(cardId, imageFile) {
    const userId = this.getCurrentUserId();
    
    try {
      // Compress the image before saving
      const compressedImage = await compressImage(imageFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
      });

      return this.retryTransaction(IMAGES_STORE, 'readwrite', (store, resolve, reject) => {
        try {
          const request = store.put({ userId, id: cardId, blob: compressedImage });
          request.onsuccess = () => resolve();
          request.onerror = () => reject('Error saving image');
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }

  async getImage(cardId) {
    const userId = this.getCurrentUserId();
    
    return this.retryTransaction(IMAGES_STORE, 'readonly', (store, resolve, reject) => {
      try {
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
      } catch (error) {
        reject(error);
      }
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

  async ensureDB() {
    if (!this.db) {
      console.log("Database connection not initialized, creating new connection");
      try {
        await this.initDatabase();
      } catch (error) {
        console.error("Failed to initialize database:", error);
        throw new Error("Database initialization failed");
      }
    }
    
    // Check if the connection is still valid
    try {
      // Try to start a test transaction to verify the connection
      const testTransaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
      testTransaction.abort(); // Clean up the test transaction
      return this.db;
    } catch (error) {
      console.warn("Database connection appears invalid, reinitializing:", error);
      
      // Reset the db reference
      this.db = null;
      
      // Try to initialize again
      try {
        await this.initDatabase();
        return this.db;
      } catch (reinitError) {
        console.error("Failed to reinitialize database after connection error:", reinitError);
        throw new Error("Database reconnection failed");
      }
    }
  }

  // Add a helper method for retrying transactions
  async retryTransaction(storeName, mode, operation, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await this.ensureDB();
        
        return await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([storeName], mode);
          const store = transaction.objectStore(storeName);
          
          transaction.onerror = (error) => {
            console.error(`Transaction error (attempt ${attempt + 1}):`, error);
            reject(error);
          };
          
          transaction.oncomplete = () => {
            resolve();
          };
          
          operation(store, resolve, reject);
        });
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  // Reset all data for the current user
  resetAllData = async () => {
    try {
      console.log("Resetting data for current user only...");
      const userId = this.getCurrentUserId();
      
      // Clear localStorage items only for current user
      // We'll prefix all localStorage items with userId
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`${userId}_`)) {
          localStorage.removeItem(key);
        }
      }
      
      // Clear IndexedDB for current user only
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        try {
          // Clear collections for current user only
          const collectionsTransaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
          const collectionsStore = collectionsTransaction.objectStore(COLLECTIONS_STORE);
          const collectionsRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of name range
            [userId, '\uffff'] // Upper bound: current user, end of name range
          );
          const clearCollectionsRequest = collectionsStore.delete(collectionsRange);
          
          // Clear images for current user only
          const imagesTransaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const imagesStore = imagesTransaction.objectStore(IMAGES_STORE);
          const imagesRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of id range
            [userId, '\uffff'] // Upper bound: current user, end of id range
          );
          const clearImagesRequest = imagesStore.delete(imagesRange);
          
          // Clear profile for current user only
          const profileTransaction = this.db.transaction([PROFILE_STORE], 'readwrite');
          const profileStore = profileTransaction.objectStore(PROFILE_STORE);
          const profileRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of id range
            [userId, '\uffff'] // Upper bound: current user, end of id range
          );
          const clearProfileRequest = profileStore.delete(profileRange);

          // Clear sold cards for current user only
          const soldCardsTransaction = this.db.transaction([SOLD_CARDS_STORE], 'readwrite');
          const soldCardsStore = soldCardsTransaction.objectStore(SOLD_CARDS_STORE);
          const soldCardsRange = IDBKeyRange.bound(
            [userId, ''], // Lower bound: current user, start of id range
            [userId, '\uffff'] // Upper bound: current user, end of id range
          );
          const clearSoldCardsRequest = soldCardsStore.delete(soldCardsRange);
          
          // Wait for all clear operations to complete
          Promise.all([
            new Promise(r => { clearCollectionsRequest.onsuccess = r; }),
            new Promise(r => { clearImagesRequest.onsuccess = r; }),
            new Promise(r => { clearProfileRequest.onsuccess = r; }),
            new Promise(r => { clearSoldCardsRequest.onsuccess = r; })
          ]).then(async () => {
            try {
              // Set up default collection after clearing
              const defaultCollection = { userId, name: 'Default Collection', data: [] };
              const setupTransaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
              const store = setupTransaction.objectStore(COLLECTIONS_STORE);
              await store.put(defaultCollection);
              
              console.log("Reset completed successfully for user:", userId);
              resolve(true);
            } catch (setupError) {
              console.error("Error setting up default collection:", setupError);
              reject(setupError);
            }
          }).catch(error => {
            console.error("Error during reset:", error);
            reject(error);
          });
        } catch (error) {
          console.error("Error in resetAllData transaction:", error);
          reject(error);
        }
      });
    } catch (error) {
      console.error("Unexpected error in resetAllData:", error);
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
              console.error(`Error processing image ${image.id}:`, error);
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

  async getSoldCards() {
    const userId = this.getCurrentUserId();
    
    return this.retryTransaction(SOLD_CARDS_STORE, 'readonly', (store, resolve, reject) => {
      try {
        console.log('Loading sold cards from IndexedDB...');
        const index = store.index('userId');
        const request = index.getAll(userId);
        
        request.onsuccess = () => {
          const result = request.result || [];
          console.log('Loaded sold cards:', result);
          resolve(result);
        };
        request.onerror = (error) => {
          console.error('Error fetching sold cards:', error);
          reject('Error fetching sold cards');
        };
      } catch (error) {
        console.error('Error in getSoldCards:', error);
        reject(error);
      }
    });
  }

  async saveSoldCards(soldCards) {
    const userId = this.getCurrentUserId();
    
    return this.retryTransaction(SOLD_CARDS_STORE, 'readwrite', async (store, resolve, reject) => {
      try {
        console.log('Saving sold cards to IndexedDB:', soldCards);
        
        // Clear existing sold cards for this user
        const index = store.index('userId');
        const existingRequest = index.getAll(userId);
        
        existingRequest.onsuccess = async () => {
          try {
            // Delete existing cards
            const existing = existingRequest.result || [];
            for (const card of existing) {
              await store.delete([userId, card.id]);
            }
            
            // Add new cards
            for (const card of soldCards) {
              const cardId = card.originalCardId || card.slabSerial;
              await store.put({
                userId,
                id: cardId,
                ...card
              });
            }
            
            console.log('Successfully saved sold cards');
            resolve();
          } catch (error) {
            console.error('Error saving sold cards:', error);
            reject(error);
          }
        };
        
        existingRequest.onerror = (error) => {
          console.error('Error fetching existing sold cards:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Error in saveSoldCards:', error);
        reject(error);
      }
    });
  }
}

const db = new DatabaseService();
export default db; 