import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'PokemonCardDB';
const DB_VERSION = 2;
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const SOLD_CARDS_STORE = 'soldCards';

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

        // Create sold cards store if it doesn't exist
        if (!db.objectStoreNames.contains(SOLD_CARDS_STORE)) {
          const soldCardsStore = db.createObjectStore(SOLD_CARDS_STORE, { 
            keyPath: 'id'  // Use 'id' as the unique identifier
          });
          soldCardsStore.createIndex('dateSold', 'dateSold', { unique: false });
          soldCardsStore.createIndex('buyer', 'buyer', { unique: false });
          soldCardsStore.createIndex('slabSerial', 'slabSerial', { unique: false }); // Add index for original slabSerial
        }
      };
    });
  }

  async getCollections() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const collections = {};
          request.result.forEach(collection => {
            if (collection && collection.name) {
              collections[collection.name] = collection.data || [];
            }
          });
          resolve(collections);
        };

        request.onerror = (event) => {
          console.error('Error fetching collections:', event.target.error);
          reject('Error fetching collections');
        };

        transaction.onerror = (event) => {
          console.error('Transaction error while fetching collections:', event.target.error);
          reject('Transaction error while fetching collections');
        };
      } catch (error) {
        console.error('Error in getCollections:', error);
        reject(error);
      }
    });
  }

  async saveCollections(collections) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Clear existing collections
        store.clear().onsuccess = () => {
          try {
            // Add each collection as a separate record
            Object.entries(collections).forEach(([name, data]) => {
              if (name) {  // Only save if name exists
                store.put({
                  name: name,
                  data: Array.isArray(data) ? data : []
                });
              }
            });
            
            transaction.oncomplete = () => {
              resolve();
            };
            
            transaction.onerror = (event) => {
              console.error('Transaction error while saving collections:', event.target.error);
              reject('Error saving collections');
            };
          } catch (innerError) {
            console.error('Error while adding collections:', innerError);
            reject(innerError);
          }
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

  // Function to get all sold cards
  getSoldCards = async () => {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SOLD_CARDS_STORE], 'readonly');
      const store = transaction.objectStore(SOLD_CARDS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting sold cards');
    });
  };

  // Function to add a sold card
  addSoldCard = async (card) => {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting addSoldCard transaction...');
        const transaction = this.db.transaction([SOLD_CARDS_STORE], 'readwrite');
        const store = transaction.objectStore(SOLD_CARDS_STORE);

        // Generate a unique ID for the sold card record
        const uniqueId = `${card.slabSerial}_${Date.now()}`;
        
        // Create a new object with the unique ID but preserve original values
        const uniqueCard = {
          ...card,
          id: uniqueId,
          originalSlabSerial: card.slabSerial // Keep the original serial number
        };
        
        console.log('Adding sold card with ID:', uniqueId);
        
        const request = store.add(uniqueCard);

        request.onsuccess = () => {
          console.log('Successfully added sold card:', uniqueId);
          resolve(uniqueId);
        };
        
        request.onerror = (event) => {
          console.error("Error adding sold card:", event.target.error);
          reject(`Error adding sold card: ${event.target.error}`);
        };
        
        transaction.oncomplete = () => {
          console.log("Transaction completed successfully");
        };
        
        transaction.onerror = (event) => {
          console.error("Transaction error:", event.target.error);
          reject(`Transaction error: ${event.target.error}`);
        };
      } catch (error) {
        console.error("Exception in addSoldCard:", error);
        reject(error);
      }
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

  // Add this function to synchronize images from Firebase Storage to IndexedDB
  syncImagesFromStorage = async (userId) => {
    if (!userId) {
      console.error('Cannot sync images: No user ID provided');
      return;
    }
    
    try {
      await this.ensureDB();
      
      // Get all cards to identify which images we need
      const collections = await this.getCollections();
      const allCards = Object.values(collections)
        .filter(Array.isArray)
        .flat()
        .filter(card => card && card.slabSerial);
      
      // Unique card serials that need images
      const uniqueSerials = [...new Set(allCards.map(card => card.slabSerial))];
      console.log(`Found ${uniqueSerials.length} unique card serials that may need images`);
      
      // Get existing images from IndexedDB
      const existingImages = await this.getAllImages();
      const existingImageIds = existingImages.map(img => img.id);
      
      // Filter to find serials that need image sync
      const serialsToSync = uniqueSerials.filter(serial => !existingImageIds.includes(serial));
      console.log(`Need to sync ${serialsToSync.length} images from Firebase Storage`);
      
      if (serialsToSync.length === 0) {
        console.log('All images are already synchronized');
        return { synced: 0, total: uniqueSerials.length };
      }
      
      // Initialize Firebase Storage
      const storage = getStorage();
      let syncedCount = 0;
      
      // Process in batches to avoid overwhelming the network/storage
      const BATCH_SIZE = 10;
      for (let i = 0; i < serialsToSync.length; i += BATCH_SIZE) {
        const batch = serialsToSync.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (serial) => {
          try {
            // Try to get image from Firebase Storage
            const imageRef = storageRef(storage, `users/${userId}/cards/${serial}`);
            const url = await getDownloadURL(imageRef);
            
            // Fetch the image
            const response = await fetch(url);
            const blob = await response.blob();
            
            // Save to IndexedDB
            await this.saveImage(serial, blob);
            syncedCount++;
            console.log(`Synced image for card ${serial}`);
          } catch (error) {
            console.warn(`Could not sync image for card ${serial}:`, error);
            // Continue with other images
          }
        }));
        
        // Small delay between batches to avoid overwhelming the system
        if (i + BATCH_SIZE < serialsToSync.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`Successfully synchronized ${syncedCount} images from Firebase Storage`);
      return { synced: syncedCount, total: uniqueSerials.length };
    } catch (error) {
      console.error('Error synchronizing images from storage:', error);
      throw error;
    }
  };

  // Add this method if it doesn't exist already
  async getAllImages() {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = (event) => {
          console.error("Error getting all images:", event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error("Exception in getAllImages:", error);
        reject(error);
      }
    });
  }
}

export const db = new DatabaseService(); 