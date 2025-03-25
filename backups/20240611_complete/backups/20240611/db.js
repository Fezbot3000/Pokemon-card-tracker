import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'PokemonCardDB';
const DB_VERSION = 2;
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const SOLD_CARDS_STORE = 'soldCards';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this.initDatabase();
  }

  initDatabase() {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('Failed to open database:', request.error);
          reject('Error opening database');
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          
          // Add error handler for database
          this.db.onerror = (event) => {
            console.error('Database error:', event.target.error);
          };
          
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

          // Create sold cards store if it doesn't exist
          if (!db.objectStoreNames.contains(SOLD_CARDS_STORE)) {
            const soldCardsStore = db.createObjectStore(SOLD_CARDS_STORE, { 
              keyPath: 'id'
            });
            soldCardsStore.createIndex('dateSold', 'dateSold', { unique: false });
            soldCardsStore.createIndex('buyer', 'buyer', { unique: false });
            soldCardsStore.createIndex('slabSerial', 'slabSerial', { unique: false });
          }
        };
      });
    }
    return this.initPromise;
  }

  // Helper method to ensure database is initialized
  async ensureDB() {
    if (!this.db) {
      await this.initDatabase();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Helper method to create a transaction
  createTransaction(storeNames, mode = 'readonly') {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeNames, mode);
    transaction.onerror = (event) => {
      console.error(`Transaction error for ${storeNames.join(',')}:`, event.target.error);
    };
    return transaction;
  }

  // Helper method to wrap IndexedDB requests in promises
  request(storeName, mode, callback) {
    return this.ensureDB().then(() => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.createTransaction([storeName], mode);
          const store = transaction.objectStore(storeName);
          const request = callback(store);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(`Failed to execute request on ${storeName}`));
        } catch (error) {
          console.error(`Error in ${storeName} operation:`, error);
          reject(error);
        }
      });
    });
  }

  // Database operations using the request helper
  getCollections() {
    return this.request(COLLECTIONS_STORE, 'readonly', (store) => {
      return store.getAll();
    }).then(results => {
      const collections = {};
      results.forEach(collection => {
        if (collection && collection.name) {
          collections[collection.name] = collection.data || [];
        }
      });
      return collections;
    });
  }

  saveCollections(collections) {
    return this.request(COLLECTIONS_STORE, 'readwrite', (store) => {
      store.clear();
      Object.entries(collections).forEach(([name, data]) => {
        if (name) {
          store.put({
            name: name,
            data: Array.isArray(data) ? data : []
          });
        }
      });
      return store.count(); // Return a request to track completion
    });
  }

  // Clear method for image sync status
  clearSyncStatus() {
    localStorage.removeItem('lastImageSync');
    localStorage.removeItem('missingImages');
  }

  // Simplified tracking of missing images with localStorage
  markImageAsMissing(cardId) {
    const missing = JSON.parse(localStorage.getItem('missingImages') || '[]');
    if (!missing.includes(cardId)) {
      missing.push(cardId);
      localStorage.setItem('missingImages', JSON.stringify(missing));
    }
  }

  isImageMissing(cardId) {
    const missing = JSON.parse(localStorage.getItem('missingImages') || '[]');
    return missing.includes(cardId);
  }

  // Basic getImage implementation 
  async getImage(cardId) {
    if (!cardId) return null;
    
    try {
      // Get from IndexedDB
      const imageData = await this.request(IMAGES_STORE, 'readonly', (store) => {
        return store.get(cardId);
      });
      
      // If we have a valid blob, return it
      if (imageData?.blob && imageData.blob.size > 0) {
        return imageData.blob;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting image from IndexedDB for ${cardId}:`, error);
      return null;
    }
  }

  // Basic saveImage implementation
  async saveImage(cardId, imageBlob) {
    if (!cardId || !imageBlob) return false;
    
    try {
      // Save to IndexedDB
      await this.request(IMAGES_STORE, 'readwrite', (store) => {
        return store.put({ id: cardId, blob: imageBlob });
      });
      return true;
    } catch (error) {
      console.error(`Error saving image to IndexedDB for ${cardId}:`, error);
      return false;
    }
  }

  deleteImage(cardId) {
    return this.request(IMAGES_STORE, 'readwrite', (store) => {
      return store.delete(cardId);
    });
  }

  addSoldCard(card) {
    const uniqueId = `${card.slabSerial}_${Date.now()}`;
    const uniqueCard = {
      ...card,
      id: uniqueId,
      originalSlabSerial: card.slabSerial
    };
    
    return this.request(SOLD_CARDS_STORE, 'readwrite', (store) => {
      return store.add(uniqueCard);
    }).then(() => uniqueId);
  }

  getSoldCards() {
    return this.request(SOLD_CARDS_STORE, 'readonly', (store) => {
      return store.getAll();
    });
  }

  getAllImages() {
    return this.request(IMAGES_STORE, 'readonly', (store) => {
      return store.getAll();
    });
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
          
          // Clear sold cards store
          const soldCardsTransaction = this.db.transaction([SOLD_CARDS_STORE], 'readwrite');
          const soldCardsStore = soldCardsTransaction.objectStore(SOLD_CARDS_STORE);
          const clearSoldCardsRequest = soldCardsStore.clear();
          
          // Wait for transactions to complete
          collectionsTransaction.oncomplete = () => {
            console.log("Collections cleared");
          };
          
          imagesTransaction.oncomplete = () => {
            console.log("Images cleared");
          };
          
          soldCardsTransaction.oncomplete = () => {
            console.log("Sold cards cleared");
          };
          
          // When all are done
          Promise.all([
            new Promise(r => { clearCollectionsRequest.onsuccess = r; }),
            new Promise(r => { clearImagesRequest.onsuccess = r; }),
            new Promise(r => { clearSoldCardsRequest.onsuccess = r; })
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

  // Function to clear all sold cards
  clearSoldCards = async () => {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SOLD_CARDS_STORE], 'readwrite');
      const store = transaction.objectStore(SOLD_CARDS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error clearing sold cards');
    });
  };

  // Function to delete a sold card
  deleteSoldCard = async (id) => {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([SOLD_CARDS_STORE], 'readwrite');
        const store = transaction.objectStore(SOLD_CARDS_STORE);
        
        // Delete using the ID directly
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = (event) => {
          console.error("Error deleting sold card:", event.target.error);
          reject(`Error deleting sold card: ${event.target.error}`);
        };
        
        transaction.oncomplete = () => {
          console.log("Delete transaction completed successfully");
        };
        
        transaction.onerror = (event) => {
          console.error("Delete transaction error:", event.target.error);
          reject(`Delete transaction error: ${event.target.error}`);
        };
      } catch (error) {
        console.error("Exception in deleteSoldCard:", error);
        reject(error);
      }
    });
  };

  // Function to save a collection to IndexedDB
  saveCollection = async (name, cards) => {
    await this.ensureDB();
    if (name === 'All Cards') {
      console.warn('Attempted to save virtual collection "All Cards". Operation skipped.');
      return false;
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Saving collection: ${name} with ${cards.length} cards`);
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        const collectionData = { name, cards };
        const request = store.put(collectionData);
        
        request.onsuccess = () => {
          console.log(`Successfully saved collection: ${name}`);
          resolve();
        };
        
        request.onerror = (event) => {
          console.error(`Error saving collection ${name}:`, event.target.error);
          reject(`Error saving collection: ${event.target.error}`);
        };
        
        transaction.oncomplete = () => {
          console.log(`Save collection transaction for ${name} completed successfully`);
        };
        
        transaction.onerror = (event) => {
          console.error(`Transaction error for ${name}:`, event.target.error);
          reject(`Transaction error: ${event.target.error}`);
        };
      } catch (error) {
        console.error(`Exception in saveCollection for ${name}:`, error);
        reject(error);
      }
    });
  };
  
  // Function to save multiple collections at once
  saveCollections = async (collections) => {
    await this.ensureDB();
    
    // Filter out any All Cards collection
    if (collections['All Cards']) {
      console.warn('Removing virtual collection "All Cards" before saving');
      const { ['All Cards']: _, ...filteredCollections } = collections;
      collections = filteredCollections;
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Saving ${Object.keys(collections).length} collections...`);
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        let successCount = 0;
        const promises = [];
        
        // Process each collection
        for (const [name, cards] of Object.entries(collections)) {
          if (!Array.isArray(cards)) {
            console.warn(`Collection ${name} is not an array, skipping`);
            continue;
          }
          
          const collectionData = { name, cards };
          const request = store.put(collectionData);
          
          const promise = new Promise((res, rej) => {
            request.onsuccess = () => {
              console.log(`Successfully saved collection: ${name}`);
              successCount++;
              res();
            };
            
            request.onerror = (event) => {
              console.error(`Error saving collection ${name}:`, event.target.error);
              rej(`Error saving collection ${name}: ${event.target.error}`);
            };
          });
          
          promises.push(promise);
        }
        
        transaction.oncomplete = () => {
          console.log(`Save collections transaction completed successfully. Saved ${successCount} collections.`);
          resolve();
        };
        
        transaction.onerror = (event) => {
          console.error("Transaction error for saveCollections:", event.target.error);
          reject(`Transaction error: ${event.target.error}`);
        };
        
        // Only resolve when all operations are complete
        Promise.all(promises)
          .then(() => transaction.oncomplete ? null : resolve())
          .catch((error) => {
            console.error("Error in saveCollections promises:", error);
            // Only reject if the transaction hasn't already failed
            if (!transaction.error) {
              reject(error);
            }
          });
      } catch (error) {
        console.error("Exception in saveCollections:", error);
        reject(error);
      }
    });
  };

  // Simplified image sync that just tries to download all missing images
  syncImagesFromStorage = async (userId) => {
    if (!userId) {
      console.error('Cannot sync images: No user ID provided');
      return { status: 'error', error: 'No user ID provided' };
    }

    try {
      await this.ensureDB();
      
      // Get all unique card IDs
      const collections = await this.getCollections();
      const allCards = Object.values(collections)
        .filter(Array.isArray)
        .flat()
        .filter(card => card?.slabSerial);
      
      if (allCards.length === 0) {
        return { status: 'complete', message: 'No cards found' };
      }

      const uniqueIds = [...new Set(allCards.map(card => card.slabSerial))];
      console.log(`Found ${uniqueIds.length} unique cards to sync`);
      
      // Initialize Firebase Storage
      const storage = getStorage();
      
      // Process in small batches (fewer cards per batch for reliability)
      const BATCH_SIZE = 2;
      const DELAY = 1000;
      let syncedCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
        const batch = uniqueIds.slice(i, i + BATCH_SIZE);
        
        // Process each card in this batch
        await Promise.all(batch.map(async (cardId) => {
          try {
            // Check if we already have this image
            const existingImage = await this.getImage(cardId);
            if (existingImage && existingImage.size > 0) {
              return; // Already have it
            }
            
            // Get the image from Firebase
            try {
              const imageRef = storageRef(storage, `users/${userId}/cards/${cardId}`);
              const url = await getDownloadURL(imageRef);
              const response = await fetch(url);
              
              if (response.ok) {
                const blob = await response.blob();
                if (blob && blob.size > 0) {
                  await this.saveImage(cardId, blob);
                  syncedCount++;
                }
              }
            } catch (error) {
              // Most errors will be 404s - image not in Firebase
              failedCount++;
            }
          } catch (error) {
            failedCount++;
            console.error(`Error syncing image for ${cardId}:`, error);
          }
        }));
        
        // Add delay between batches
        if (i + BATCH_SIZE < uniqueIds.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY));
        }
      }
      
      // Update the last sync time
      localStorage.setItem('lastImageSync', Date.now().toString());
      
      return {
        status: 'complete',
        synced: syncedCount,
        failed: failedCount,
        total: uniqueIds.length,
        message: `Synchronized ${syncedCount} images. ${failedCount} images not found.`
      };
    } catch (error) {
      console.error('Error in image sync:', error);
      return {
        status: 'error',
        error: error.message || 'Unknown error during sync'
      };
    }
  };
}

export const db = new DatabaseService(); 