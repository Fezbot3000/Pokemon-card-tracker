import { compressImage } from '../utils/imageCompression';
import { auth } from './firebase'; // Import Firebase auth to get the current user

const DB_NAME = 'PokemonCardDB';
const DB_VERSION = 3; // Incrementing version to trigger database upgrade
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const PROFILE_STORE = 'profile';
const SUBSCRIPTION_STORE = 'subscription';

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
  }

  // Helper to get the current user ID or a default for anonymous users
  getCurrentUserId() {
    const currentUser = auth.currentUser;
    return currentUser ? currentUser.uid : 'anonymous';
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
            console.error('Error fetching collections:', error);
            // Return empty collections object with Default Collection
            resolve({ 'Default Collection': [] });
          };
        } catch (error) {
          console.error('Transaction error in getCollections:', error);
          // Return empty collections object with Default Collection
          resolve({ 'Default Collection': [] });
        }
      });
    } catch (error) {
      console.error('Unexpected error in getCollections:', error);
      // Return empty collections object with Default Collection
      return { 'Default Collection': [] };
    }
  }

  async saveCollections(collections) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      try {
        console.log("DB: Saving collections:", Object.keys(collections));
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Clear existing collections for this user
        const range = IDBKeyRange.bound(
          [userId, ''], // Lower bound: current user, start of name range
          [userId, '\uffff'] // Upper bound: current user, end of name range
        );
        
        const clearRequest = store.delete(range);
        
        clearRequest.onsuccess = () => {
          console.log('DB: Cleared existing collections for user:', userId);
          
          // Add new collections
          Object.entries(collections).forEach(([name, data]) => {
            console.log(`DB: Saving collection: ${name} with ${Array.isArray(data) ? data.length : 0} cards`);
            const request = store.put({ userId, name, data });
            request.onerror = (e) => {
              console.error(`Error saving collection ${name}:`, e.target.error);
            };
          });
          
          transaction.oncomplete = () => {
            console.log('DB: Successfully saved all collections:', Object.keys(collections));
            resolve();
          };
        };
        
        clearRequest.onerror = (error) => {
          console.error('DB: Error clearing collections:', error);
          reject('Error clearing collections');
        };
        
        transaction.onerror = (error) => {
          console.error('DB: Error saving collections:', error);
          reject('Error saving collections');
        };
      } catch (error) {
        console.error('DB: Error in saveCollections:', error);
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
      console.error('Error compressing image:', error);
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

  async ensureDB() {
    if (!this.db) {
      console.log("Database connection not initialized, creating new connection");
      try {
        await this.initDatabase();
      } catch (error) {
        console.error("Failed to initialize database:", error);
        
        // Create a default empty database state to prevent cascading errors
        this.db = {
          transaction: () => {
            throw new Error("Database not available");
          }
        };
        
        // Show user-friendly error
        if (typeof window !== 'undefined') {
          // Only show in browser environment
          setTimeout(() => {
            alert("There was a problem with the database. Try reloading the page or clearing your browser data.");
          }, 100);
        }
      }
    }
    
    // Check if the connection is still valid
    try {
      // Access the objectStoreNames property as a simple test
      // This will throw an error if the connection is closed
      const storeCount = this.db.objectStoreNames?.length;
      
      // If we got here, the connection seems valid
      return this.db;
    } catch (error) {
      // The database connection appears to be invalid
      console.warn("Database connection appears invalid, reinitializing:", error);
      
      // Reset the db reference
      this.db = null;
      
      // Try to initialize again
      try {
        await this.initDatabase();
      } catch (reinitError) {
        console.error("Failed to reinitialize database after connection error:", reinitError);
        // Create a minimal mock to prevent further errors
        this.db = {
          transaction: () => {
            throw new Error("Database reconnection failed");
          },
          objectStoreNames: { length: 0 }
        };
      }
      
      return this.db;
    }
  }

  // Reset all data for the current user
  resetAllData = async () => {
    try {
      console.log("Resetting all application data for current user...");
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
            console.log("Collections cleared for user:", userId);
          };
          
          imagesTransaction.oncomplete = () => {
            console.log("Images cleared for user:", userId);
          };
          
          profileTransaction.oncomplete = () => {
            console.log("Profile cleared for user:", userId);
          };
          
          // When all are done
          Promise.all([
            new Promise(r => { clearCollectionsRequest.onsuccess = r; }),
            new Promise(r => { clearImagesRequest.onsuccess = r; }),
            new Promise(r => { clearProfileRequest.onsuccess = r; })
          ]).then(() => {
            console.log("All data reset successfully for user:", userId);
            resolve(true);
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
}

const db = new DatabaseService();
export default db; 