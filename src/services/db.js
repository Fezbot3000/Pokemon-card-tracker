const DB_NAME = 'PokemonCardDB';
const DB_VERSION = 1;
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initDatabase();
  }

  initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject('Error opening database');
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create collections store
        if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
          db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'name' });
        }

        // Create images store
        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  async getCollections() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
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

      request.onerror = () => reject('Error fetching collections');
    });
  }

  async saveCollections(collections) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Clear existing collections
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          console.log('Cleared existing collections');
          
          // Add new collections
          Object.entries(collections).forEach(([name, data]) => {
            console.log(`Saving collection: ${name} with ${Array.isArray(data) ? data.length : 0} cards`);
            store.put({ name, data });
          });
          
          transaction.oncomplete = () => {
            console.log('Successfully saved all collections');
            resolve();
          };
        };
        
        transaction.onerror = (error) => {
          console.error('Error saving collections:', error);
          reject('Error saving collections');
        };
      } catch (error) {
        console.error('Error in saveCollections:', error);
        reject(error);
      }
    });
  }

  async saveImage(cardId, imageBlob) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.put({ id: cardId, blob: imageBlob });

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving image');
    });
  }

  async getImage(cardId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
      const store = transaction.objectStore(IMAGES_STORE);
      const request = store.get(cardId);

      request.onsuccess = () => resolve(request.result?.blob || null);
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

  async ensureDB() {
    if (!this.db) {
      await this.initDatabase();
    }
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
}

export const db = new DatabaseService(); 