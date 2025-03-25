import { firebaseService } from './firebaseService';

const DB_NAME = 'pokemon-card-tracker';
const DB_VERSION = 2;
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const SOLD_CARDS_STORE = 'soldCards';
const SYNC_QUEUE_STORE = 'syncQueue';

/**
 * DatabaseService - Handles local persistence with IndexedDB and synchronization with Firebase
 * Implements the Repository pattern with an offline-first approach
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this.isInitializing = false;
  }

  async initDatabase() {
    // If we already have a database connection, return it
    if (this.db) {
      return this.db;
    }

    // If we're already initializing, return the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // Set initializing flag
    this.isInitializing = true;

    console.log('Initializing database...');
    
    this.initPromise = new Promise((resolve, reject) => {
      const handleError = (error) => {
        console.error('Database error:', error);
        this.db = null;
        this.initPromise = null;
        this.isInitializing = false;
        reject(error);
      };

      try {
        // Open the database directly without deleting it first
        this._openDatabase(resolve, reject);
      } catch (error) {
        handleError(error);
      }
    });

    return this.initPromise;
  }

  _openDatabase(resolve, reject) {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Error opening database:', event.target.error);
        this.db = null;
        this.initPromise = null;
        this.isInitializing = false;
        reject(event.target.error);
      };

      request.onblocked = (event) => {
        console.warn('Database connection blocked - attempting to close other connections');
        if (this.db) {
          this.db.close();
        }
      };

      request.onupgradeneeded = (event) => {
        console.log(`Upgrading database from version ${event.oldVersion} to ${event.newVersion}`);
        const db = event.target.result;
        const transaction = event.target.transaction;

        // Handle schema upgrades by version
        if (event.oldVersion < 1) {
          // Initial schema creation (version 0 to 1)
          console.log('Creating initial database schema (v1)');
          
          // Create object stores if they don't exist
          if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
            db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'name' });
          }
          if (!db.objectStoreNames.contains(IMAGES_STORE)) {
            db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(SOLD_CARDS_STORE)) {
            const store = db.createObjectStore(SOLD_CARDS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('dateSold', 'dateSold', { unique: false });
            store.createIndex('buyer', 'buyer', { unique: false });
            store.createIndex('slabSerial', 'slabSerial', { unique: false });
          }
          if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
            db.createObjectStore(SYNC_QUEUE_STORE, { 
              keyPath: 'id',
              autoIncrement: true 
            });
          }
        }
        
        if (event.oldVersion < 2) {
          // Upgrade to version 2: Update SYNC_QUEUE_STORE to use uniqueId
          console.log('Upgrading to schema version 2: Updating sync queue store');
          
          // If the store exists, delete it and recreate with new schema
          if (db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
            db.deleteObjectStore(SYNC_QUEUE_STORE);
          }
          
          // Recreate with new schema
          const store = db.createObjectStore(SYNC_QUEUE_STORE, { 
            keyPath: 'uniqueId',
            autoIncrement: false
          });
          
          // Create indexes for better querying
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        
        this.db.onclose = () => {
          console.log('Database connection closed');
          this.db = null;
          this.initPromise = null;
          this.isInitializing = false;
        };
        
        this.db.onversionchange = () => {
          console.log('Database version changed');
          if (this.db) {
            this.db.close();
          }
          this.db = null;
          this.initPromise = null;
          this.isInitializing = false;
        };
        
        console.log('Database initialized successfully');
        this.isInitializing = false;
        resolve(this.db);
      };
    } catch (error) {
      console.error('Error in _openDatabase:', error);
      this.db = null;
      this.initPromise = null;
      this.isInitializing = false;
      reject(error);
    }
  }

  async ensureDB() {
    if (!this.db) {
      await this.initDatabase();
    }
    return this.db;
  }

  // ======= Collection Operations =======

  /**
   * Get all collections from local database
   * @returns {Promise<Object>} - Object with collection names as keys and card arrays as values
   */
  async getCollections() {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const collections = {};
          request.result.forEach(item => {
            collections[item.name] = item.cards;
          });
          resolve(collections);
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save collections to local database
   * @param {Object} collections - Object with collection names as keys and card arrays as values
   * @param {boolean} queueSync - Whether to queue sync to Firebase
   */
  async saveCollections(collections, queueSync = true) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Clear existing collections
        store.clear();
        
        // Add each collection
        Object.entries(collections).forEach(([name, cards]) => {
          store.put({ name, cards });
        });
        
        transaction.oncomplete = () => {
          // Queue sync to Firebase if requested
          if (queueSync) {
            this.queueSync({
              type: 'collections',
              data: collections
            });
          }
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save a single collection to local database
   * @param {string} name - Collection name
   * @param {Array} cards - Array of card objects
   * @param {boolean} queueSync - Whether to queue sync to Firebase
   */
  async saveCollection(name, cards, queueSync = true) {
    if (!name || name === 'All Cards') {
      return false;
    }
    
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        const request = store.put({
          name: name,
          cards: Array.isArray(cards) ? cards : []
        });
        
        request.onsuccess = () => {
          if (queueSync) {
            this.queueSync({
              type: 'collection',
              name: name,
              data: cards
            });
          }
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete a collection from local database
   * @param {string} name - Collection name
   * @param {boolean} queueSync - Whether to queue sync to Firebase
   */
  async deleteCollection(name, queueSync = true) {
    if (!name || name === 'All Cards') {
      return false;
    }
    
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        const request = store.delete(name);
        
        request.onsuccess = () => {
          if (queueSync) {
            this.queueSync({
              type: 'deleteCollection',
              name: name
            });
          }
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ======= Image Operations =======

  /**
   * Save an image to local database
   * @param {string} cardId - Card ID (slab serial or unique ID)
   * @param {Blob} imageBlob - Image blob to save
   * @param {boolean} queueSync - Whether to queue sync to Firebase
   */
  async saveImage(cardId, imageBlob, queueSync = true) {
    if (!cardId || !imageBlob) {
      console.error('Missing cardId or imageBlob', { cardId, imageBlob });
      return false;
    }
    
    // Ensure imageBlob is actually a Blob or File
    if (!(imageBlob instanceof Blob) && !(imageBlob instanceof File)) {
      console.error('imageBlob is not a Blob or File', imageBlob);
      return false;
    }

    console.log(`Saving image for card ${cardId}, size: ${imageBlob.size} bytes, type: ${imageBlob.type}`);

    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        
        // Add timestamp for versioning
        const timestamp = Date.now();
        
        const imageData = {
          id: cardId,
          content: imageBlob,
          timestamp: timestamp,
          type: imageBlob.type || 'image/jpeg'
        };
        
        const request = store.put(imageData);
        
        request.onsuccess = () => {
          console.log(`Successfully saved image for card ${cardId}`);
          
          if (queueSync) {
            console.log(`Queueing image sync for card ${cardId}`);
            this.queueSync({
              type: 'image',
              id: cardId,
              timestamp: timestamp
            });
          }
          
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error(`Error saving image for card ${cardId}:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error(`Error in saveImage for card ${cardId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Get an image from local database
   * @param {string} cardId - Card ID (serial number)
   * @returns {Promise<Blob|null>} Image as Blob or null if not found
   */
  async getImage(cardId) {
    if (!cardId) {
      console.error('Invalid cardId for getImage');
      return null;
    }
    
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Fetching image for card ${cardId}`);
        const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.get(cardId);
        
        request.onsuccess = () => {
          const imageData = request.result;
          if (!imageData) {
            console.log(`No image found for card ${cardId}`);
            resolve(null);
            return;
          }
          
          console.log(`Found image for card ${cardId}, timestamp: ${imageData.timestamp}`);
          
          // Check if the image data has content or blob property
          const imageBlob = imageData.content || imageData.blob;
          
          if (!imageBlob) {
            console.error(`Image data for card ${cardId} has no content`);
            resolve(null);
            return;
          }
          
          // Ensure we're returning a blob
          if (imageBlob instanceof Blob) {
            resolve(imageBlob);
          } else {
            console.error(`Image data for card ${cardId} is not a Blob:`, typeof imageBlob);
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          console.error(`Error getting image for card ${cardId}:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error(`Exception getting image for card ${cardId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Delete image from local database
   * @param {string} cardId - Card ID (serial number)
   * @param {boolean} queueSync - Whether to queue sync to Firebase
   */
  async deleteImage(cardId, queueSync = true) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.delete(cardId);
        
        request.onsuccess = () => {
          if (queueSync) {
            this.queueSync({
              type: 'deleteImage',
              id: cardId
            });
          }
          resolve(true);
        };
        
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all images from local database
   */
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
        
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ======= Synchronization Methods =======

  /**
   * Queue an operation for syncing to Firebase
   * @param {Object} operation - Operation to queue
   */
  async queueSync(operation) {
    if (!operation || !operation.type) {
      console.error('Invalid operation for sync queue:', operation);
      return false;
    }
    
    // Skip if offline - will be synced when we come back online
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync queue:', operation.type);
      return false;
    }
    
    // Add operation to sync queue
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Queueing sync operation:', operation.type);
        
        const transaction = this.db.transaction([SYNC_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);
        
        // Prepare the operation with timestamp, status, and unique ID
        const timestamp = Date.now();
        
        // Generate a unique ID based on operation type
        let uniqueId;
        switch (operation.type) {
          case 'image':
            // For images, use the image ID and timestamp
            uniqueId = `image_${operation.id}_${timestamp}`;
            break;
          case 'collections':
            // For collections, use a timestamp
            uniqueId = `collections_${timestamp}`;
            break;
          case 'collection':
            // For a single collection, use the name and timestamp
            uniqueId = `collection_${operation.name}_${timestamp}`;
            break;
          case 'deleteCollection':
            // For collection deletion, use the name and timestamp
            uniqueId = `delete_collection_${operation.name}_${timestamp}`;
            break;
          case 'deleteImage':
            // For image deletion, use the ID and timestamp
            uniqueId = `delete_image_${operation.id}_${timestamp}`;
            break;
          default:
            // For other operations, use type and timestamp
            uniqueId = `${operation.type}_${timestamp}`;
        }
        
        const syncOperation = {
          ...operation,
          uniqueId,
          status: 'pending',
          createdAt: timestamp
        };
        
        const request = store.put(syncOperation);
        
        request.onsuccess = () => {
          console.log('Successfully queued sync operation:', operation.type, uniqueId);
          
          // Process the sync queue immediately when online
          if (navigator.onLine) {
            // Use setTimeout to avoid blocking this transaction
            setTimeout(() => {
              this.processSyncQueue().catch(err => {
                console.error('Error processing sync queue:', err);
              });
            }, 50);
          }
          
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Error queueing sync operation:', event.target.error);
          reject(event.target.error);
        };
        
        transaction.onerror = (event) => {
          console.error('Transaction error queueing sync:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Error in queueSync:', error);
        reject(error);
      }
    });
  }

  /**
   * Process the sync queue
   */
  async processSyncQueue() {
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync queue processing');
      return false;
    }
    
    // Ensure we have a user ID
    const userId = firebaseService.getCurrentUserId();
    if (!userId) {
      console.log('No user ID available, skipping sync queue processing');
      return false;
    }
    
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Processing sync queue...');
        const transaction = this.db.transaction([SYNC_QUEUE_STORE], 'readonly');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);
        const request = store.getAll();
        
        request.onsuccess = async () => {
          const operations = request.result || [];
          console.log(`Found ${operations.length} operations in sync queue`);
          
          if (operations.length === 0) {
            resolve(true);
            return;
          }
          
          // Sort operations by createdAt to process in order
          operations.sort((a, b) => a.createdAt - b.createdAt);
          
          // Group operations by type and target to avoid duplicate processing
          // For example, if there are multiple image sync operations for the same image,
          // only process the latest one
          const groupedOperations = {};
          
          // Group operations by their target (image ID, collection name, etc.)
          for (const operation of operations) {
            const target = this._getOperationTarget(operation);
            const key = `${operation.type}_${target}`;
            
            // Keep the operation with the latest timestamp
            if (!groupedOperations[key] || 
                groupedOperations[key].createdAt < operation.createdAt) {
              groupedOperations[key] = operation;
            }
          }
          
          // Process each unique operation
          const uniqueOperations = Object.values(groupedOperations);
          console.log(`Processing ${uniqueOperations.length} unique operations (after deduplication)`);
          
          for (const operation of uniqueOperations) {
            try {
              console.log(`Processing operation: ${operation.type}`, operation);
              await this.processOperation(operation);
              console.log(`Successfully processed operation: ${operation.type}`);
              await this.removeFromSyncQueue(operation.uniqueId);
            } catch (error) {
              console.error(`Error processing operation: ${operation.type}`, error);
              // Continue with next operation
            }
          }
          
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Error getting sync queue:', event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error('Error in processSyncQueue:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Helper method to get the target identifier of an operation
   * @param {Object} operation - The operation object
   * @returns {string} The target identifier
   * @private
   */
  _getOperationTarget(operation) {
    switch (operation.type) {
      case 'image':
        return operation.id || '';
      case 'deleteImage':
        return operation.id || '';
      case 'collection':
        return operation.name || '';
      case 'deleteCollection':
        return operation.name || '';
      case 'collections':
        return 'all';
      default:
        return 'unknown';
    }
  }

  /**
   * Process a sync operation
   * @param {Object} operation - Operation to process
   */
  async processOperation(operation) {
    if (!operation || !operation.type) {
      console.error('Invalid operation to process:', operation);
      return false;
    }
    
    const userId = firebaseService.getCurrentUserId();
    if (!userId) {
      console.error('No user ID available for sync operation:', operation.type);
      throw new Error('No user ID available');
    }
    
    switch (operation.type) {
      case 'collections':
        // Sync collections
        await this.syncCollections(userId, operation.data);
        break;
        
      case 'image':
        // Sync image
        await this.syncImage(userId, operation.id);
        break;
        
      case 'deleteImage':
        // Delete image
        await firebaseService.deleteImage(userId, operation.id);
        break;
        
      default:
        console.warn(`Unknown operation type: ${operation.type}`);
        break;
    }
    
    return true;
  }
  
  /**
   * Sync collections to Firebase
   * @param {string} userId - User ID
   * @param {Object} collections - Collections object
   */
  async syncCollections(userId, collections) {
    console.log('Syncing collections to Firebase...');
    
    if (!collections) {
      // Get collections from IndexedDB
      collections = await this.getCollections();
    }

    // Validate and normalize collections
    const validCollections = {};
    for (const [name, cards] of Object.entries(collections)) {
      if (name === 'All Cards') continue; // Skip virtual collection
      
      // Ensure each collection has a valid cards array
      validCollections[name] = Array.isArray(cards) ? cards : [];
    }

    // Sync each collection
    for (const [name, cards] of Object.entries(validCollections)) {
      try {
        console.log(`Syncing collection ${name} to Firebase...`);
        await firebaseService.saveCollection(userId, name, cards);
      } catch (error) {
        console.error(`Error syncing collection ${name}:`, error);
        throw error;
      }
    }
    
    return true;
  }
  
  /**
   * Sync image to Firebase
   * @param {string} userId - User ID
   * @param {string} cardId - Card ID
   */
  async syncImage(userId, cardId) {
    console.log(`Syncing image ${cardId} to Firebase...`);
    
    // Get image from IndexedDB
    const imageBlob = await this.getImage(cardId);
    
    if (!imageBlob) {
      console.error(`No image found for card ${cardId} in IndexedDB`);
      return false;
    }
    
    try {
      // Upload to Firebase Storage
      const downloadUrl = await firebaseService.uploadImage(userId, cardId, imageBlob);
      console.log(`Successfully uploaded image ${cardId} to Firebase, URL: ${downloadUrl}`);
      return true;
    } catch (error) {
      console.error(`Error uploading image ${cardId} to Firebase:`, error);
      throw error;
    }
  }

  /**
   * Remove an operation from the sync queue
   * @param {string} uniqueId - Operation unique ID
   */
  async removeFromSyncQueue(uniqueId) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([SYNC_QUEUE_STORE], 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);
        const request = store.delete(uniqueId);
        
        request.onsuccess = () => {
          console.log(`Successfully removed operation ${uniqueId} from sync queue`);
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error(`Error removing operation ${uniqueId} from sync queue:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error(`Error in removeFromSyncQueue for ${uniqueId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Pull collections from Firebase to local database
   * @param {string} userId - User ID
   */
  async pullCollectionsFromFirebase(userId) {
    try {
      const collections = await firebaseService.getCollections(userId);
      await this.saveCollections(collections, false);
      return collections;
    } catch (error) {
      console.error('Error pulling collections from Firebase:', error);
      throw error;
    }
  }

  /**
   * Synchronize images from Firebase Storage to local database
   * @param {string} userId - User ID
   */
  async syncImagesFromStorage(userId) {
    try {
      // Step 1: Get image references from Firebase Storage
      const imageRefs = await firebaseService.listAllImages(userId);
      if (!imageRefs || imageRefs.length === 0) {
        return { synced: 0, total: 0 };
      }
      
      // Step 2: Extract serial numbers from references
      const serialNumbers = imageRefs.map(ref => {
        const pathParts = ref.fullPath.split('/');
        return pathParts[pathParts.length - 1];
      });
      
      // Step 3: Get local images to avoid re-downloading
      const localImages = await this.getAllImages();
      const localSerials = new Set(localImages.map(img => img.id));
      
      // Step 4: Find missing images
      const missingSerials = serialNumbers.filter(serial => !localSerials.has(serial));
      
      if (missingSerials.length === 0) {
        return { synced: 0, total: serialNumbers.length };
      }
      
      // Step 5: Download missing images in batches
      const BATCH_SIZE = 5;
      let syncedCount = 0;
      
      for (let i = 0; i < missingSerials.length; i += BATCH_SIZE) {
        const batch = missingSerials.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (serial) => {
          try {
            // Get download URL
            const url = await firebaseService.getImageUrl(serial, userId);
            
            // Fetch the image
            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            // Convert to blob
            const blob = await response.blob();
            
            // Save to IndexedDB
            await this.saveImage(serial, blob, false);
            
            syncedCount++;
          } catch (error) {
            console.error(`Error syncing image ${serial}:`, error);
          }
        }));
        
        // Add a slight delay between batches to prevent overwhelming the browser
        if (i + BATCH_SIZE < missingSerials.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return { synced: syncedCount, total: serialNumbers.length };
    } catch (error) {
      console.error('Error synchronizing images:', error);
      throw error;
    }
  }

  /**
   * Initialize sync listeners for online/offline events
   */
  initSyncListeners() {
    window.addEventListener('online', () => {
      console.log('Device is online, processing sync queue...');
      this.processSyncQueue().catch(console.error);
    });
    
    // Set up sync when the app loads if online
    if (navigator.onLine) {
      this.processSyncQueue().catch(console.error);
    }
  }

  // ======= Reset Methods =======

  /**
   * Reset all data in the application (local only)
   */
  async resetAllData() {
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
        
        // Clear sync queue store
        const syncQueueTransaction = this.db.transaction([SYNC_QUEUE_STORE], 'readwrite');
        const syncQueueStore = syncQueueTransaction.objectStore(SYNC_QUEUE_STORE);
        const clearSyncQueueRequest = syncQueueStore.clear();
        
        // Wait for all transactions to complete
        Promise.all([
          new Promise(r => { clearCollectionsRequest.onsuccess = r; }),
          new Promise(r => { clearImagesRequest.onsuccess = r; }),
          new Promise(r => { clearSoldCardsRequest.onsuccess = r; }),
          new Promise(r => { clearSyncQueueRequest.onsuccess = r; })
        ]).then(() => {
          console.log('All local data reset successfully');
          resolve(true);
        }).catch(error => {
          console.error('Error during reset:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error in resetAllData transaction:', error);
        reject(error);
      }
    });
  }

  /**
   * Clear a specific store in the database
   * @param {string} storeName - Name of the store to clear
   * @returns {Promise<boolean>} - Success status
   */
  async clearStore(storeName) {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Clearing store: ${storeName}`);
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log(`Successfully cleared store: ${storeName}`);
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error(`Error clearing store ${storeName}:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        console.error(`Error in clearStore for ${storeName}:`, error);
        reject(error);
      }
    });
  }
}

export const databaseService = new DatabaseService();

// Initialize sync listeners when the service is loaded
databaseService.initSyncListeners();