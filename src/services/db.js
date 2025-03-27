import { compressImage } from '../utils/imageCompression';

const DB_NAME = 'PokemonCardDB';
const DB_VERSION = 1;
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const PROFILE_STORE = 'profile';

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

    // Create collections store
    if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
      db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'name' });
    }

    // Create images store
    if (!db.objectStoreNames.contains(IMAGES_STORE)) {
      db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
    }

    // Create profile store
    if (!db.objectStoreNames.contains(PROFILE_STORE)) {
      db.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
    }
  }

  async getCollections() {
    try {
      await this.ensureDB();
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          const request = store.getAll();

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
    return new Promise((resolve, reject) => {
      try {
        console.log("DB: Saving collections:", Object.keys(collections));
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Clear existing collections
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          console.log('DB: Cleared existing collections');
          
          // Add new collections
          Object.entries(collections).forEach(([name, data]) => {
            console.log(`DB: Saving collection: ${name} with ${Array.isArray(data) ? data.length : 0} cards`);
            const request = store.put({ name, data });
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
        const request = store.put({ id: cardId, blob: compressedImage });

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
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.get(cardId);

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
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.delete(cardId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error deleting image');
    });
  }

  async getProfile() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([PROFILE_STORE], 'readonly');
      const store = transaction.objectStore(PROFILE_STORE);
      const request = store.get('user');

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };

      request.onerror = () => reject('Error fetching profile');
    });
  }

  async saveProfile(profileData) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([PROFILE_STORE], 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const request = store.put({ id: 'user', data: profileData });

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving profile');
    });
  }

  async ensureDB() {
    if (!this.db) {
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
    return this.db;
  }

  // Reset all data in the application
  resetAllData = async () => {
    try {
      console.log("Resetting all application data...");
      
      // Clear localStorage
      localStorage.removeItem('soldCards');
      localStorage.removeItem('cardListSortField');
      localStorage.removeItem('cardListSortDirection');
      localStorage.removeItem('cardListDisplayMetric');
      localStorage.removeItem('theme');
      
      // Clear IndexedDB
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        try {
          // Clear collections store
          const collectionsTransaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
          const collectionsStore = collectionsTransaction.objectStore(COLLECTIONS_STORE);
          const clearCollectionsRequest = collectionsStore.clear();
          
          // Clear images store
          const imagesTransaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const imagesStore = imagesTransaction.objectStore(IMAGES_STORE);
          const clearImagesRequest = imagesStore.clear();
          
          // Wait for transactions to complete
          collectionsTransaction.oncomplete = () => {
            console.log("Collections cleared");
          };
          
          imagesTransaction.oncomplete = () => {
            console.log("Images cleared");
          };
          
          // When both are done
          Promise.all([
            new Promise(r => { clearCollectionsRequest.onsuccess = r; }),
            new Promise(r => { clearImagesRequest.onsuccess = r; })
          ]).then(() => {
            console.log("All data reset successfully");
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
      console.error("Error resetting application data:", error);
      return false;
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

export const db = new DatabaseService(); 