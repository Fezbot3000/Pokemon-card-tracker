import { compressImage } from '../utils/imageCompression';
import { auth } from './firebase'; // Import Firebase auth to get the current user
import logger from '../utils/logger';
import shadowSync from './shadowSync'; // Import shadow sync service
import featureFlags from '../utils/featureFlags'; // Import feature flags

const DB_NAME = 'pokemonCardTracker';
const DB_VERSION = 5; // Match the existing database version
const COLLECTIONS_STORE = 'collections';
const IMAGES_STORE = 'images';
const PROFILE_STORE = 'profile';
const SUBSCRIPTION_STORE = 'subscription';
const CARDS_STORE = 'cards';
const PSA_RESULTS_STORE = 'psaResults'; // Add PSA results store
const PURCHASE_INVOICES_STORE = 'purchaseInvoices'; // Store for purchase invoices

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
      return this.db;
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
      
      return this.db;
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
        return this.db;
      } catch (resetError) {
        logger.debug('Error resetting database:', resetError);
        // Just continue - we'll create default collections if needed
      }
    }
    
    // Reset retry flag after successful connection
    this._retried = false;
    
    // If we got here and still don't have a valid DB, initialize it one more time
    if (!this.db || this.db.closed) {
      logger.debug('Last attempt to initialize database after all recovery attempts failed');
      this.dbPromise = this.initDatabase();
      this.db = await this.dbPromise;
    }
    
    return this.db;
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
      // Check each expected collection with a separate transaction for each
      for (const collectionName of expectedCollections) {
        try {
          // Create a new transaction for each collection check
          const readTransaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
          const store = readTransaction.objectStore(COLLECTIONS_STORE);
          
          const collectionExists = await new Promise((resolve, reject) => {
            const request = store.get([userId, collectionName]);
            
            request.onsuccess = () => {
              resolve(!!request.result);
            };
            
            request.onerror = (event) => {
              logger.error(`Error checking for collection "${collectionName}":`, event.target.error);
              resolve(false); // Assume it doesn't exist if there's an error
            };
          });
          
          // If collection doesn't exist, create it in a new transaction
          if (!collectionExists) {
            logger.debug(`Collection "${collectionName}" not found for user, creating it`);
            
            await new Promise((resolve, reject) => {
              const writeTransaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
              const writeStore = writeTransaction.objectStore(COLLECTIONS_STORE);
              
              const writeRequest = writeStore.put({
                userId,
                name: collectionName,
                cards: []
              });
              
              writeTransaction.oncomplete = () => {
                logger.debug(`Collection "${collectionName}" created successfully`);
                resolve();
              };
              
              writeTransaction.onerror = (event) => {
                logger.error(`Error creating collection "${collectionName}":`, event.target.error);
                resolve(); // Resolve anyway to continue with other collections
              };
            });
          }
        } catch (collectionError) {
          logger.error(`Error processing collection "${collectionName}":`, collectionError);
          // Continue with other collections
        }
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
      const collectionsStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: ['userId', 'name'] });
      // Add userId index for faster lookups
      collectionsStore.createIndex('userId', 'userId', { unique: false });
    } else {
      try {
        // Get the existing store to check if it has the userId index
        const transaction = event.target.transaction;
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Check if the index exists, if not create it
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
          logger.debug("Added missing userId index to collections store");
        }
      } catch (error) {
        // If there's an error, recreate the store with the proper index
        logger.debug("Error checking collections store, recreating it:", error);
        db.deleteObjectStore(COLLECTIONS_STORE);
        const collectionsStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: ['userId', 'name'] });
        collectionsStore.createIndex('userId', 'userId', { unique: false });
      }
    }

    // Create images store with compound key for user isolation
    if (!db.objectStoreNames.contains(IMAGES_STORE)) {
      logger.debug("Creating images store");
      const imagesStore = db.createObjectStore(IMAGES_STORE, { keyPath: ['userId', 'id'] });
      // Add userId index for faster lookups
      imagesStore.createIndex('userId', 'userId', { unique: false });
    } else {
      try {
        // Get the existing store to check if it has the userId index
        const transaction = event.target.transaction;
        const store = transaction.objectStore(IMAGES_STORE);
        
        // Check if the index exists, if not create it
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
          logger.debug("Added missing userId index to images store");
        }
      } catch (error) {
        // If there's an error, recreate the store with the proper index
        logger.debug("Error checking images store, recreating it:", error);
        db.deleteObjectStore(IMAGES_STORE);
        const imagesStore = db.createObjectStore(IMAGES_STORE, { keyPath: ['userId', 'id'] });
        imagesStore.createIndex('userId', 'userId', { unique: false });
      }
    }

    // Create profile store with compound key for user isolation
    if (!db.objectStoreNames.contains(PROFILE_STORE)) {
      logger.debug("Creating profile store");
      const profileStore = db.createObjectStore(PROFILE_STORE, { keyPath: ['userId', 'id'] });
      // Add userId index for faster lookups
      profileStore.createIndex('userId', 'userId', { unique: false });
    } else {
      try {
        // Get the existing store to check if it has the userId index
        const transaction = event.target.transaction;
        const store = transaction.objectStore(PROFILE_STORE);
        
        // Check if the index exists, if not create it
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
          logger.debug("Added missing userId index to profile store");
        }
      } catch (error) {
        // If there's an error, recreate the store with the proper index
        logger.debug("Error checking profile store, recreating it:", error);
        db.deleteObjectStore(PROFILE_STORE);
        const profileStore = db.createObjectStore(PROFILE_STORE, { keyPath: ['userId', 'id'] });
        profileStore.createIndex('userId', 'userId', { unique: false });
      }
    }

    // Create cards store with compound key for user isolation
    if (!db.objectStoreNames.contains(CARDS_STORE)) {
      logger.debug("Creating cards store");
      const cardsStore = db.createObjectStore(CARDS_STORE, { keyPath: ['userId', 'id'] });
      // Add userId index for faster lookups
      cardsStore.createIndex('userId', 'userId', { unique: false });
      cardsStore.createIndex('collectionId', 'collectionId', { unique: false });
    } else {
      try {
        // Get the existing store to check if it has the userId index
        const transaction = event.target.transaction;
        const store = transaction.objectStore(CARDS_STORE);
        
        // Check if the index exists, if not create it
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
          logger.debug("Added missing userId index to cards store");
        }
        
        if (!store.indexNames.contains('collectionId')) {
          store.createIndex('collectionId', 'collectionId', { unique: false });
          logger.debug("Added missing collectionId index to cards store");
        }
      } catch (error) {
        // If there's an error, recreate the store with the proper index
        logger.debug("Error checking cards store, recreating it:", error);
        db.deleteObjectStore(CARDS_STORE);
        const cardsStore = db.createObjectStore(CARDS_STORE, { keyPath: ['userId', 'id'] });
        cardsStore.createIndex('userId', 'userId', { unique: false });
        cardsStore.createIndex('collectionId', 'collectionId', { unique: false });
      }
    }

    // Create PSA results store with compound key for user isolation
    if (!db.objectStoreNames.contains(PSA_RESULTS_STORE)) {
      logger.debug("Creating PSA results store");
      const psaResultsStore = db.createObjectStore(PSA_RESULTS_STORE, { keyPath: ['userId', 'id'] });
      // Add userId index for faster lookups
      psaResultsStore.createIndex('userId', 'userId', { unique: false });
    } else {
      try {
        // Get the existing store to check if it has the userId index
        const transaction = event.target.transaction;
        const store = transaction.objectStore(PSA_RESULTS_STORE);
        
        // Check if the index exists, if not create it
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
          logger.debug("Added missing userId index to PSA results store");
        }
      } catch (error) {
        // If there's an error, recreate the store with the proper index
        logger.debug("Error checking PSA results store, recreating it:", error);
        db.deleteObjectStore(PSA_RESULTS_STORE);
        const psaResultsStore = db.createObjectStore(PSA_RESULTS_STORE, { keyPath: ['userId', 'id'] });
        psaResultsStore.createIndex('userId', 'userId', { unique: false });
      }
    }

    // Create purchase invoices store with compound key for user isolation
    if (!db.objectStoreNames.contains(PURCHASE_INVOICES_STORE)) {
      logger.debug("Creating purchase invoices store");
      const purchaseInvoicesStore = db.createObjectStore(PURCHASE_INVOICES_STORE, { keyPath: ['userId', 'id'] });
      // Add userId index for faster lookups
      purchaseInvoicesStore.createIndex('userId', 'userId', { unique: false });
    } else {
      try {
        // Get the existing store to check if it has the userId index
        const transaction = event.target.transaction;
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        
        // Check if the index exists, if not create it
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
          logger.debug("Added missing userId index to purchase invoices store");
        }
      } catch (error) {
        // If there's an error, recreate the store with the proper index
        logger.debug("Error checking purchase invoices store, recreating it:", error);
        db.deleteObjectStore(PURCHASE_INVOICES_STORE);
        const purchaseInvoicesStore = db.createObjectStore(PURCHASE_INVOICES_STORE, { keyPath: ['userId', 'id'] });
        purchaseInvoicesStore.createIndex('userId', 'userId', { unique: false });
      }
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
    
    const requiredStores = [COLLECTIONS_STORE, IMAGES_STORE, PROFILE_STORE, SUBSCRIPTION_STORE, CARDS_STORE, PSA_RESULTS_STORE, PURCHASE_INVOICES_STORE];
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
            logger.debug('Database connection invalid in getCollections, returning empty object');
            resolve({});
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
            
            // Return collections as is without forcing Default Collection
            resolve(collections);
          };

          request.onerror = (error) => {
            logger.error('Error fetching collections:', error);
            // Return empty collections object without forcing Default Collection
            resolve({});
          };
          
          // Add transaction error handler
          transaction.onerror = (error) => {
            logger.error('Transaction error in getCollections:', error);
            resolve({});
          };
          
          // Add transaction abort handler
          transaction.onabort = (event) => {
            logger.error('Transaction aborted in getCollections:', event);
            resolve({});
          };
        } catch (error) {
          logger.error('Transaction error in getCollections:', error);
          // Return empty collections object without forcing Default Collection
          resolve({});
        }
      });
    } catch (error) {
      logger.error('Fatal error in getCollections:', error);
      return {};
    }
  }

  async saveCollections(collections = {}, preserveSold = true, options = {}) {
    logger.debug(`DB: Saving collections: ${Object.keys(collections)}`);
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('No user ID available, cannot save collections');
      }

      // Optional: Preserve sold items if requested
      let soldItems = [];
      if (preserveSold) {
        try {
          soldItems = await this.getSoldCards() || [];
          logger.debug(`DB: Retrieved ${soldItems.length} sold items to preserve during collection save`);
        } catch (err) {
          logger.warn('No sold collection found or invalid format, returning empty array');
          soldItems = [];
        }
      }

      // First, clear all existing collections for the user
      await this._clearExistingCollections(userId);
      logger.debug(`DB: Cleared existing collections for user: ${userId}`);

      const savedCollections = {};
      const collectionPromises = [];

      // Check if this is a card movement operation
      const isCardMovement = options?.operationType === 'moveCards';
      if (isCardMovement) {
        logger.debug('DB: This is a card movement operation, ensuring proper sync');
      }

      // Process each collection
      for (const [name, cards] of Object.entries(collections)) {
        if (!name) continue; // Skip unnamed collections
        
        const cardArray = Array.isArray(cards) ? cards : [];
        logger.debug(`DB: Saving collection: ${name} with ${cardArray.length} cards`);

        // Save to IndexedDB
        const collectionPromise = new Promise((resolve, reject) => {
          const db = this.db;
          const transaction = db.transaction(['collections'], 'readwrite');
          const store = transaction.objectStore('collections');
          
          // Create collection object with user ID to ensure data isolation
          const collection = {
            userId,
            name,
            data: cardArray || []
          };
          
          const request = store.put(collection);
          
          request.onsuccess = async () => { // Add async back here
            logger.debug(`Collection '${name}' saved successfully for user ${userId}`);
            
            // Improved Firestore sync for collections
            if (featureFlags.enableFirestoreSync) {
              try {
                // First, ensure the collection exists in Firestore
                await shadowSync.shadowWriteCollection(name, {
                  name: name,
                  cardCount: cardArray?.length || 0,
                  description: '',
                  updatedAt: new Date()
                });
                
                // Determine which cards to sync
                let cardsToSync = [];
                
                if (isCardMovement) {
                  // For card movement operations, sync all cards with _saveDebug flag
                  // AND also sync cards with lastMoved timestamp that's recent
                  const now = Date.now();
                  const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes ago
                  
                  cardsToSync = cardArray.filter(card => {
                    // Include cards with _saveDebug flag
                    if (card._saveDebug === true) return true;
                    
                    // Include recently moved cards
                    if (card.lastMoved) {
                      const movedTime = new Date(card.lastMoved).getTime();
                      return movedTime > fiveMinutesAgo;
                    }
                    
                    return false;
                  });
                  
                  logger.debug(`DB: Found ${cardsToSync.length} cards to sync for movement operation`);
                } else {
                  // Normal case: only sync cards with _saveDebug flag
                  cardsToSync = cardArray.filter(card => card._saveDebug === true);
                  logger.debug(`DB: Found ${cardsToSync.length} cards with _saveDebug flag`);
                }
                
                if (cardsToSync.length > 0) {
                  // Sync the identified cards
                  logger.debug(`DB: Syncing ${cardsToSync.length} cards to Firestore`);
                  
                  for (const card of cardsToSync) {
                    // Skip cards without proper ID
                    if (!card.id && !card.slabSerial) continue;
                    
                    // Ensure card has the correct collection properties
                    const cardWithCollection = {
                      ...card,
                      collection: name,
                      collectionId: name
                    };
                    
                    // Use shadowWriteCard with cardId and correct collection
                    const cardId = card.id || card.slabSerial;
                    try {
                      await shadowSync.shadowWriteCard(cardId, cardWithCollection, name);
                      logger.debug(`DB: Successfully synced card ${cardId} to collection ${name}`);
                    } catch (cardError) {
                      logger.error(`Failed to sync card ${cardId} to Firestore:`, cardError);
                      // Continue with other cards even if one fails
                    }
                  }
                } else {
                  // If no cards to sync, this is likely a full collection sync
                  // In this case, the shadowSync might be processing all cards in a different context
                  logger.debug(`No cards to sync found for collection ${name}`);
                }
              } catch (syncError) {
                // Log but don't affect the main operation's success
                logger.error(`Failed to sync collection ${name} with Firestore:`, syncError);
              }
            }
            
            savedCollections[name] = collection;
            resolve(collection);
          };
          
          request.onerror = (event) => {
            const errorMsg = `Error saving collection '${name}': ${event.target.error}`;
            logger.error(errorMsg);
            reject(new Error(errorMsg));
          };
        });

        collectionPromises.push(collectionPromise);
      }

      // Wait for all collections to be saved
      await Promise.all(collectionPromises);
      logger.debug(`DB: Successfully saved all collections: ${Object.keys(collections)}`);

      // Re-save sold items if we preserved them
      if (preserveSold && soldItems.length > 0) {
        await this.saveSoldCards(soldItems);
      }

      return savedCollections;
    } catch (error) {
      logger.error('Failed to save collections:', error);
      throw error;
    }
  }

  async saveImage(cardId, imageFile, options = {}) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    try {
      // Compress the image before saving
      const compressedImage = await compressImage(imageFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
      });

      // Save to IndexedDB first (always do this as a fallback/cache)
      await new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([IMAGES_STORE], 'readwrite');
          const store = transaction.objectStore(IMAGES_STORE);
          const request = store.put({ userId, id: cardId, blob: compressedImage });

          request.onsuccess = () => resolve();
          request.onerror = (error) => {
            logger.error(`Error saving image to IndexedDB: ${error}`);
            reject('Error saving image to IndexedDB');
          };
        } catch (error) {
          logger.error('Transaction error in saveImage:', error);
          reject(error);
        }
      });
      
      // If Firestore sync is enabled, save to Firebase Storage
      let downloadURL = null;
      if (featureFlags.enableFirestoreSync) {
        try {
          // Import here to avoid circular dependencies
          const { saveImageToCloud } = await import('./cloudStorage');
          const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
          
          // Check if this is a replacement (card already has an image)
          let isReplacement = options.isReplacement || false;
          
          try {
            // Try to get the card directly from the cache first
            const card = this.getCardFromCache(cardId);
            isReplacement = card?.hasImage === true;
          } catch (e) {
            // Just continue with the isReplacement value we have
            logger.debug(`Couldn't check card cache, using isReplacement=${isReplacement}`);
          }
          
          // Upload to Firebase Storage and get the download URL
          downloadURL = await saveImageToCloud(
            compressedImage, 
            userId, 
            cardId, 
            {...options, isReplacement}
          );
          
          // Make sure we have a valid download URL before updating the card
          if (downloadURL) {
            // We don't need to update the local card here - the CardDetails component will handle this
            // when it saves the card with the new image URL
            logger.debug(`Image URL ready for card ${cardId}: ${downloadURL}`);
            
            // Store the image URL in IndexedDB's images store for caching
            try {
              const transaction = this.db.transaction([CARDS_STORE], 'readwrite');
              const store = transaction.objectStore(CARDS_STORE);
              const getRequest = store.get(cardId);
              
              getRequest.onsuccess = async () => {
                if (getRequest.result) {
                  const card = getRequest.result;
                  card.imageUrl = downloadURL;
                  card.hasImage = true;
                  card.imageUpdatedAt = new Date().toISOString();
                  
                  const putRequest = store.put(card);
                  putRequest.onsuccess = () => {
                    logger.debug(`Updated local card cache with new image URL for card ${cardId}`);
                  };
                  putRequest.onerror = (error) => {
                    logger.error(`Error updating local card cache: ${error}`);
                  };
                }
              };
              
              getRequest.onerror = (error) => {
                logger.error(`Error getting card from local cache: ${error}`);
              };
            } catch (localUpdateError) {
              logger.error(`Failed to update local card cache with image URL: ${localUpdateError}`);
            }
            
            // Silently update the card in Firestore with the image URL
            // Doing this without triggering shadow sync to reduce noise
            try {
              // Get a direct Firestore reference to avoid shadow sync
              const db = getFirestore();
              const cardRef = doc(db, 'users', userId, 'cards', cardId);
              await updateDoc(cardRef, {
                imageUrl: downloadURL,
                hasImage: true,
                imageUpdatedAt: new Date()
              });
              logger.debug(`Directly updated Firestore with image URL for card ${cardId}`);
            } catch (firestoreError) {
              // Fall back to shadow sync if direct update fails
              logger.warn(`Direct Firestore update failed, falling back to shadowSync: ${firestoreError}`);
              shadowSync.updateCardField(cardId, { 
                imageUrl: downloadURL,
                hasImage: true,
                imageUpdatedAt: new Date()
              }, true).catch(error => {
                logger.error(`Failed to update card in Firestore with image URL: ${error}`);
              });
            }
          } else {
            logger.error(`No download URL received for card ${cardId} image upload`);
          }
          
          logger.debug(`Image uploaded to cloud for card ${cardId}, URL: ${downloadURL}`);
        } catch (cloudError) {
          logger.error(`Failed to save image to cloud: ${cloudError}`);
          // Continue with the local-only image, don't rethrow the error
        }
      }
    
      return downloadURL;
    } catch (error) {
      logger.error('Error compressing image:', error);
      throw error;
    }
  }

  async getImage(cardId) {
    if (!cardId) {
      logger.warn('No cardId provided to getImage');
      return null;
    }

    await this.ensureDB();
    const userId = this.getCurrentUserId();
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([IMAGES_STORE], 'readonly');
        const store = transaction.objectStore(IMAGES_STORE);
        const request = store.get([userId, cardId]);
        
        request.onsuccess = () => {
          if (request.result && request.result.blob) {
            resolve(request.result.blob);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = (error) => {
          logger.error(`Error fetching image for card ${cardId}:`, error);
          reject(error);
        };
      } catch (error) {
        logger.error(`Transaction error in getImage for card ${cardId}:`, error);
        reject(error);
      }
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
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      // Get all object stores in the database
      const storeNames = Array.from(this.db.objectStoreNames);
      
      // Create a transaction for all stores
      const transaction = this.db.transaction(storeNames, 'readwrite');
      
      // Clear each store
      const clearPromises = storeNames.map(storeName => {
        return new Promise((resolve, reject) => {
          logger.debug(`Clearing store: ${storeName}`);
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => {
            logger.debug(`Successfully cleared store: ${storeName}`);
            resolve();
          };
          
          request.onerror = (event) => {
            logger.error(`Error clearing store ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      });
      
      // Wait for all stores to be cleared
      await Promise.all(clearPromises);
      
      // Create a default collection only if no other collections exist
      const collections = await this.getCollections();
      if (Object.keys(collections).length === 0) {
        await this.createEmptyCollection('Default Collection');
      }
      
      logger.debug('All local data has been reset successfully');
      return true;
    } catch (error) {
      logger.error('Error resetting all data:', error);
      return false;
    }
  };

  /**
   * Migrate and compress images in the database
   * @param {Function} progressCallback - A callback to report progress
   * @returns {Promise<Object>} - A promise that resolves to the migration stats
   */
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
    try {
      const userId = this.getCurrentUserId();
      const db = await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        const request = store.put({ userId, name: 'sold', data: soldCards });
        
        request.onsuccess = async () => {
          logger.debug(`Sold cards saved successfully for user ${userId}`);
          
          // Shadow write to Firestore if feature flag is enabled
          if (featureFlags.enableFirestoreSync) {
            // Shadow write each sold card individually
            const shadowWritePromises = soldCards.map(soldCard => {
              // Ensure each card has the necessary fields
              const soldCardData = {
                ...soldCard,
                userId: userId,
                updatedAt: new Date()
              };
              
              // Use shadowSync service to write to Firestore
              return shadowSync.shadowWriteSoldCard(soldCard.id || soldCard.cardId, soldCardData)
                .catch(error => {
                  // Log but don't affect the main operation's success
                  logger.error(`Shadow write of sold card to Firestore failed:`, error);
                  // Continue with other cards even if one fails
                  return null;
                });
            });
            
            // Wait for all shadow writes to complete, but don't block the main operation
            Promise.all(shadowWritePromises).catch(error => {
              logger.error('Error during batch shadow write of sold cards:', error);
            });
          }
          
          resolve(soldCards);
        };
        
        request.onerror = (event) => {
          logger.error('Error saving sold cards:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error('Error in saveSoldCards:', error);
      throw error;
    }
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
      const userId = this.getCurrentUserId(); // Keep userId for logging
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          // Clear the entire object store
          const request = store.clear();

          // We mainly rely on the transaction's success/failure
          request.onerror = (event) => {
             // Log the specific request error, but the transaction error handler will reject the promise
             logger.warn('Error during store.clear() in collections:', event.target.error);
          };

          transaction.oncomplete = () => {
             logger.debug(`Transaction complete: Cleared ALL collections (triggered by user ${userId})`);
             resolve(); 
          };

          transaction.onerror = (event) => {
            logger.error('Transaction error during clearCollections:', event.target.error);
            reject(event.target.error);
          };

        } catch (error) {
          logger.error('Error initiating clearCollections transaction:', error);
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
            userId: userId, // Always use the current user's ID, not the one from the backup
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
    
    const requiredStores = [COLLECTIONS_STORE, IMAGES_STORE, PROFILE_STORE, SUBSCRIPTION_STORE, CARDS_STORE, PSA_RESULTS_STORE];
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
      const requiredStores = [COLLECTIONS_STORE, IMAGES_STORE, PROFILE_STORE, SUBSCRIPTION_STORE, CARDS_STORE, PSA_RESULTS_STORE];
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
            
            // Verify that all required object stores exist
            this.verifyObjectStores().catch(error => {
              logger.error('Error verifying object stores:', error);
            });
            
            // Sync purchase invoices from Firestore if enabled
            if (featureFlags.enableFirestoreSync && featureFlags.enableFirestoreReads) {
              this.syncPurchaseInvoicesFromFirestore().catch(error => {
                logger.error('Error syncing purchase invoices from Firestore:', error);
              });
            }
            
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

  /**
   * Save a collection to IndexedDB
   * @param {string} name - The name of the collection
   * @param {Array} cards - The cards in the collection
   * @returns {Promise<Object>} - A promise that resolves to the saved collection
   */
  async saveCollection(name, cards = []) {
    try {
      const userId = this.getCurrentUserId();
      
      // Ensure we have a valid DB connection
      const db = await this.ensureDB();
      
      // Additional sanity check to prevent "Cannot read properties of undefined (reading 'transaction')" error
      if (!db || db.closed) {
        logger.error("Database is not available for saveCollection");
        throw new Error("Database connection is not available");
      }
      
      // Verify the required store exists
      if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
        logger.error(`Required store ${COLLECTIONS_STORE} does not exist`);
        // Try to create the store by forcing a database upgrade
        await this.resetDatabaseSilently();
        // Get the new DB instance after reset
        const newDb = await this.ensureDB();
        if (!newDb || !newDb.objectStoreNames.contains(COLLECTIONS_STORE)) {
          throw new Error(`Cannot save collection - ${COLLECTIONS_STORE} store does not exist`);
        }
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([COLLECTIONS_STORE], 'readwrite');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          // Normalize collection name
          name = (name || 'Default Collection').trim();
          
          // Create collection object with user ID to ensure data isolation
          const collection = {
            userId,
            name,
            data: cards || []
          };
          
          const request = store.put(collection);
          
          request.onsuccess = () => {
            logger.debug(`Collection '${name}' saved successfully for user ${userId}`);
            
            // Shadow write to Firestore if feature flag is enabled
            if (featureFlags.enableFirestoreSync) {
              shadowSync.shadowWriteCollection(name, {
                name: name,
                cardCount: cards?.length || 0,
                description: '',
                createdAt: new Date(),
                updatedAt: new Date()
              }).catch(error => {
                // Log but don't affect the main operation's success
                logger.error('Shadow write to Firestore failed:', error);
              });
            }
            
            resolve(collection);
          };
          
          request.onerror = (event) => {
            const errorMsg = `Error saving collection '${name}': ${event.target.error}`;
            logger.error(errorMsg);
            reject(new Error(errorMsg));
          };
          
          transaction.onerror = (event) => {
            const errorMsg = `Transaction error saving collection '${name}': ${event.target.error}`;
            logger.error(errorMsg);
            reject(new Error(errorMsg));
          };
          
          transaction.onabort = (event) => {
            const errorMsg = `Transaction aborted saving collection '${name}': ${event.target.error}`;
            logger.error(errorMsg);
            reject(new Error(errorMsg));
          };
        } catch (innerError) {
          logger.error(`Internal error in saveCollection promise: ${innerError}`);
          reject(innerError);
        }
      });
    } catch (error) {
      logger.error(`Error in saveCollection: ${error}`);
      // Try to save to localStorage as a fallback
      try {
        // Create a fallback entry in localStorage as last resort
        const storageKey = `collection_${name}_${this.getCurrentUserId()}`;
        localStorage.setItem(storageKey, JSON.stringify({
          userId: this.getCurrentUserId(),
          name,
          data: cards || []
        }));
        logger.debug(`Saved collection '${name}' to localStorage as fallback`);
      } catch (storageError) {
        logger.error(`Failed to save collection even to localStorage: ${storageError}`);
      }
      throw error;
    }
  }

  /**
   * Save a card to a collection
   * @param {Object} card - The card to save
   * @param {File} imageFile - The image file to associate with the card
   * @param {string} collectionName - The name of the collection
   * @returns {Promise<Object>} - The saved card
   */
  async saveCard(card, imageFile, collectionName) {
    try {
      // First, get the collection
      const collection = await this.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection '${collectionName}' not found`);
      }
      
      // If no ID, generate one
      if (!card.id) {
        card.id = this.generateId();
      }
      
      // Find index of card in collection if it exists
      const cardIndex = collection.data.findIndex(c => c.id === card.id);
      
      // Handle image file if provided and is a valid Blob or File
      if (imageFile && (imageFile instanceof Blob || imageFile instanceof File)) {
        try {
          // Compress the image before saving
          const compressedImage = await compressImage(imageFile);
          
          // Save the image to IndexedDB
          await this.saveImage(card.id, compressedImage);
          
          // Update card with placeholder for image URL
          card.hasImage = true;
        } catch (imageError) {
          logger.error(`Error processing image for card ${card.id}:`, imageError);
          // Continue without image if there's an error
          card.hasImage = false;
        }
      } else if (cardIndex >= 0) {
        // If no new image but card exists, preserve existing image status
        card.hasImage = collection.data[cardIndex].hasImage;
      }
      
      // Update or add the card
      if (cardIndex >= 0) {
        // Preserve any fields not included in the update
        collection.data[cardIndex] = { ...collection.data[cardIndex], ...card };
      } else {
        // Add new card
        collection.data.push(card);
      }
      
      // Save the updated collection
      await this.saveCollection(collectionName, collection.data);
      
      // Shadow write to Firestore if feature flag is enabled
      if (featureFlags.enableFirestoreSync) {
        const userId = this.getCurrentUserId();
        // Prepare card data with the collection reference
        const firestoreCardData = {
          ...card,
          userId: userId,
          updatedAt: new Date()
        };
        
        // Use shadowSync service to write to Firestore
        shadowSync.shadowWriteCard(card.id, firestoreCardData)
          .catch(error => {
            // Log but don't affect the main operation's success
            logger.error(`Shadow write of card ${card.id} to Firestore failed:`, error);
          });
      }
      
      return card;
    } catch (error) {
      logger.error('Error saving card:', error);
      throw error;
    }
  }

  /**
   * Delete a card from a collection
   * @param {string} cardId - The ID of the card to delete
   * @param {string} collectionName - The name of the collection
   * @returns {Promise<Array>} - A promise that resolves to the updated collection
   */
  async deleteCard(cardId, collectionName) {
    try {
      // Get the collection
      const collection = await this.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection '${collectionName}' not found`);
      }
      
      // Find the card in the collection
      const cardIndex = collection.data.findIndex(card => card.id === cardId);
      if (cardIndex === -1) {
        throw new Error(`Card with ID ${cardId} not found in collection '${collectionName}'`);
      }
      
      // Remove the card from the collection
      collection.data.splice(cardIndex, 1);
      
      // Save the updated collection
      await this.saveCollection(collectionName, collection.data);
      
      // Delete the card image from IndexedDB
      try {
        await this.deleteImage(cardId);
      } catch (error) {
        logger.warn(`Error deleting image for card ${cardId}:`, error);
        // Continue even if image deletion fails
      }
      
      // Shadow delete from Firestore if feature flag is enabled
      if (featureFlags.enableFirestoreSync) {
        shadowSync.shadowDeleteCard(cardId)
          .catch(error => {
            // Log but don't affect the main operation's success
            logger.error(`Shadow delete of card ${cardId} from Firestore failed:`, error);
          });
      }
      
      return collection.data;
    } catch (error) {
      logger.error('Error deleting card:', error);
      throw error;
    }
  }

  /**
   * Add a new card to a collection
   * @param {Object} card - The card data to add
   * @param {File} imageFile - The image file to associate with the card
   * @param {string} collectionName - The name of the collection
   * @returns {Promise<Object>} - The added card
   */
  async addCard(card, imageFile, collectionName) {
    try {
      const userId = this.getCurrentUserId();
      
      // Generate a unique ID for the card if it doesn't have one
      const cardId = card.slabSerial || `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Process the image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await this.saveImage(cardId, imageFile);
      }
      
      // Use the provided collection name, don't default to 'Default Collection'
      const targetCollection = collectionName || '';
      
      // Get existing collections
      const collections = await this.getCollections();
      
      // Check if the collection exists
      if (!collections[targetCollection]) {
        // If no collection is specified or the collection doesn't exist, create it
        if (targetCollection) {
          await this.createEmptyCollection(targetCollection);
          collections[targetCollection] = [];
          logger.debug(`Creating new collection "${targetCollection}" since it did not exist`);
        } else {
          // No collection specified and no Default Collection exists
          // Let's handle this case by returning an error
          throw new Error('No collection specified and no default collection exists');
        }
      }
      
      // Create the card object
      const cardData = {
        ...card,
        id: cardId,
        slabSerial: cardId,
        imageUrl,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        collection: targetCollection,
        collectionName: targetCollection,
        // Ensure PSA data is preserved
        psaData: card.psaData || null,
        psaSearched: card.psaSearched || false,
        // Ensure financial values are properly formatted as numbers
        investmentAUD: parseFloat(card.investmentAUD) || 0,
        currentValueAUD: parseFloat(card.currentValueAUD) || 0,
        investmentUSD: parseFloat(card.investmentUSD) || 0,
        currentValueUSD: parseFloat(card.currentValueUSD) || 0
      };
      
      // Save the card to the database
      await this.saveCard(cardData);
      
      // Add the card to the collection
      if (targetCollection) {
        collections[targetCollection].push(cardData);
        await this.saveCollections(collections);
      }
      
      return cardData;
    } catch (error) {
      logger.error('Error adding card:', error);
      throw error;
    }
  }

  /**
   * Generate a unique ID for new cards
   * @returns {string} - A unique ID
   */
  generateId() {
    return `card_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Get a specific collection by name
   * @param {string} collectionName - The name of the collection to retrieve
   * @returns {Promise<Object|null>} - The collection or null if not found
   */
  async getCollection(collectionName) {
    try {
      if (!collectionName) {
        collectionName = 'Default Collection';
      }
      
      const userId = this.getCurrentUserId();
      await this.ensureDB();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([COLLECTIONS_STORE], 'readonly');
          const store = transaction.objectStore(COLLECTIONS_STORE);
          
          // Query for the specific collection by its name and user ID
          const request = store.get([userId, collectionName.trim()]);
          
          request.onsuccess = () => {
            if (request.result) {
              resolve(request.result);
            } else {
              // Create a default empty collection object if none exists
              const defaultCollection = {
                userId,
                name: collectionName,
                data: []
              };
              
              if (collectionName === 'Default Collection') {
                // For Default Collection, auto-create it
                resolve(defaultCollection);
              } else {
                // For other collections, return null to indicate not found
                resolve(null);
              }
            }
          };

          request.onerror = (error) => {
            logger.error(`Error fetching collection '${collectionName}':`, error);
            reject(error);
          };
        } catch (innerError) {
          logger.error('Transaction error in getCollection:', innerError);
          reject(innerError);
        }
      });
    } catch (error) {
      logger.error(`Error in getCollection('${collectionName}'):`, error);
      return null;
    }
  }

  /**
   * Get all cards for a specific collection
   * @param {string} collectionName - The name of the collection
   * @returns {Promise<Array>} - A promise that resolves to the cards in the collection
   */
  async getCardsInCollection(collectionName) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARDS_STORE], 'readonly');
      const store = transaction.objectStore(CARDS_STORE);
      const index = store.index('collectionId'); // Assuming 'collectionId' index exists
      const cards = [];

      // Query using the collectionId index
      const request = index.openCursor(IDBKeyRange.only(collectionName));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Check if the card belongs to the current user
          if (cursor.value.userId === userId) { 
            cards.push(cursor.value);
          }
          cursor.continue();
        } else {
          // No more entries
          logger.debug(`Retrieved ${cards.length} cards for collection '${collectionName}' from DB`);
          resolve(cards);
        }
      };

      request.onerror = (event) => {
        logger.error(`Error getting cards for collection ${collectionName}:`, event.target.error);
        reject(event.target.error);
      };

      // Add transaction error handler
      transaction.onerror = (event) => {
        logger.error(`Transaction error getting cards for collection ${collectionName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Get all cards for the current user from IndexedDB
   * @returns {Promise<Array>} - A promise that resolves to an array of card objects
   */
  async getAllCards() {
    await this.ensureDB();
    const userId = this.getCurrentUserId();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CARDS_STORE], 'readonly');
      const store = transaction.objectStore(CARDS_STORE);
      const index = store.index('userId'); // Use the userId index
      const cards = [];

      // Query using the userId index
      const request = index.openCursor(IDBKeyRange.only(userId));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Add the card to the list
          cards.push(cursor.value);
          cursor.continue();
        } else {
          // No more entries
          logger.debug(`Retrieved ${cards.length} cards for user ${userId} from DB`);
          resolve(cards);
        }
      };

      request.onerror = (event) => {
        logger.error(`Error getting all cards for user ${userId}:`, event.target.error);
        reject(event.target.error);
      };

      // Add transaction error handler
      transaction.onerror = (event) => {
        logger.error(`Transaction error getting all cards for user ${userId}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  async syncFromCloud(onProgress) {
    try {
      const { force = false } = onProgress;
      
      // Skip if Firestore sync is not enabled
      if (!featureFlags.enableFirestoreSync) {
        logger.debug('Skipping cloud sync, Firestore sync is disabled');
        return false;
      }
      
      // Ensure shadow sync service is initialized
      if (!this.shadowSync || !this.shadowSync.isInitialized) {
        logger.debug('Shadow sync service not initialized, skipping cloud sync');
        return false;
      }
      
      // ALWAYS force sync on a new browser for better cross-browser compatibility
      const browserKey = 'browser_id';
      const storedBrowserId = localStorage.getItem(browserKey);
      const isNewBrowser = !storedBrowserId;
      
      if (isNewBrowser) {
        // Create and store a unique browser ID for future reference
        const browserId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem(browserKey, browserId);
        logger.debug('New browser detected, will check for cloud data');
        
        // Force sync for new browsers
        force = true;
      }
      
      // Check if user has any local data
      if (!force) {
        await this.ensureDB();
        const hasLocalData = await this.hasLocalData();
        
        // If we have local data and not forcing, skip sync
        if (hasLocalData) {
          logger.debug('Local data exists and not a new browser, skipping cloud sync');
          return false;
        }
      }
      
      // Check if user has cloud data
      const hasCloudData = await this.shadowSync.hasCloudData();
      if (!hasCloudData) {
        logger.debug('No cloud data found, skipping sync');
        return false;
      }
      
      // Fetch cloud data
      logger.debug('Fetching data from cloud...');
      const { collections, cards } = await this.shadowSync.fetchCloudData();
      
      logger.debug(`Received from cloud: ${collections.length} collections and ${cards.length} cards`);
      
      if (collections.length === 0 && cards.length === 0) {
        logger.debug('No cloud data fetched, skipping sync');
        return false;
      }
      
      // Group cards by collection for proper association
      const cardsByCollection = {};
      
      // Organize cards by collection
      for (const card of cards) {
        const collectionId = card.collectionId || 'Default Collection';
        if (!cardsByCollection[collectionId]) {
          cardsByCollection[collectionId] = [];
        }
        cardsByCollection[collectionId].push(card);
      }
      
      logger.debug(`Organized cards by collection: ${Object.keys(cardsByCollection).join(', ')}`);
      
      // Create a "Default Collection" if we have cards but no matching collection
      if (cards.length > 0 && collections.length === 0) {
        logger.debug('Creating Default Collection since it was not found in cloud data');
        await this.createEmptyCollection('Default Collection');
      }
      
      // First, save all collections to local storage
      for (const collection of collections) {
        try {
          // Create or update the collection
          logger.debug(`Syncing collection ${collection.name || collection.id} from cloud`);
          
          // Initialize the collection data structure
          const collectionData = {
            name: collection.name || 'Unknown Collection',
            description: collection.description || '',
            cardCount: collection.cardCount || 0,
            // Ensure we have required fields
            ...collection
          };
          
          // Save collection to local database
          await this.saveCollection(collectionData.name, collectionData);
          
          logger.debug(`Saved collection ${collectionData.name} to local database`);
        } catch (collectionError) {
          logger.error(`Error syncing collection from cloud:`, collectionError);
        }
      }
      
      // Now save all cards to local storage
      for (const [collectionName, collectionCards] of Object.entries(cardsByCollection)) {
        try {
          logger.debug(`Processing ${collectionCards.length} cards for collection ${collectionName}`);
          
          // Ensure the collection exists
          let collection = await this.getCollection(collectionName);
          if (!collection) {
            logger.debug(`Collection ${collectionName} not found locally, creating it`);
            await this.createEmptyCollection(collectionName);
            collection = await this.getCollection(collectionName);
          }
          
          // Track the local cards we'll add to the collection
          const localCards = [];
          
          // Add each card to local storage
          for (const card of collectionCards) {
            try {
              // Prepare the card data for local storage
              const cardData = {
                ...card,
                // Convert Firestore timestamps to Date objects if needed
                createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt || Date.now()),
                updatedAt: card.updatedAt instanceof Date ? card.updatedAt : new Date(card.updatedAt || Date.now()),
                // Make sure we have an id
                id: card.id || card.slabSerial || Math.random().toString(36).substring(2, 15)
              };
              
              // Add explicit collection reference to ensure association
              cardData.collectionId = collectionName;
              
              // Add card to local storage
              await this.addCard(cardData, null, collectionName);
              logger.debug(`Added card ${cardData.id} to collection ${collectionName}`);
              
              // If card has an image URL, fetch and save the image
              if (card.imageUrl) {
                try {
                  // Fetch the image from the URL
                  logger.debug(`Fetching image from URL: ${card.imageUrl} for card ${card.id || card.slabSerial}`);
                  const response = await fetch(card.imageUrl);
                  if (response.ok) {
                    const blob = await response.blob();
                    // Save the image to local storage AND sync to cloud
                    await this.saveImage(card.id || card.slabSerial, blob, { syncToCloud: true });
                    logger.debug(`Synced image for card ${card.id || card.slabSerial} to local and cloud storage`);
                  } else {
                    logger.error(`Failed to fetch image from URL: ${card.imageUrl}, status: ${response.status}`);
                  }
                } catch (imageError) {
                  logger.error(`Error fetching image for card ${card.id || card.slabSerial}:`, imageError);
                }
              } else if (card.hasImage === true) {
                // If card has hasImage flag but no URL, try to generate dummy image for testing
                try {
                  logger.debug(`Card ${card.id || card.slabSerial} has hasImage flag but no URL, creating placeholder`);
                  // Create a canvas element to generate a placeholder image
                  const canvas = document.createElement('canvas');
                  canvas.width = 400;
                  canvas.height = 550;
                  const ctx = canvas.getContext('2d');
                  
                  // Fill background
                  ctx.fillStyle = '#f0f0f0';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  // Draw card details
                  ctx.fillStyle = '#333';
                  ctx.font = '24px Arial';
                  ctx.fillText(card.name || 'Unknown Card', 20, 40);
                  ctx.font = '18px Arial';
                  ctx.fillText(card.set || 'Unknown Set', 20, 70);
                  ctx.fillText(`Value: $${card.value || '0.00'}`, 20, 100);
                  
                  // Convert to blob and save
                  canvas.toBlob(async (blob) => {
                    await this.saveImage(card.id || card.slabSerial, blob, { syncToCloud: true });
                    logger.debug(`Created and synced placeholder image for card ${card.id || card.slabSerial}`);
                  }, 'image/jpeg', 0.8);
                } catch (placeholderError) {
                  logger.error(`Error creating placeholder image:`, placeholderError);
                }
              }
            } catch (cardError) {
              logger.error(`Error adding card to local storage:`, cardError);
            }
          }
          
          // Update the collection with the synced cards
          if (collection && localCards.length > 0) {
            // Ensure we're adding to any existing cards, not replacing them
            const existingCards = collection.cards || [];
            const updatedCards = [...existingCards];
            
            // Add new cards from cloud, avoiding duplicates
            for (const card of localCards) {
              const cardId = card.id || card.slabSerial;
              const existingIndex = updatedCards.findIndex(c => (c.id || c.slabSerial) === cardId);
              
              if (existingIndex >= 0) {
                // Update existing card
                updatedCards[existingIndex] = { ...updatedCards[existingIndex], ...card };
              } else {
                // Add new card
                updatedCards.push(card);
              }
            }
            
            // Save the updated collection with all cards
            await this.saveCollection(collectionName, {
              ...collection,
              cards: updatedCards,
              cardCount: updatedCards.length,
              updatedAt: new Date()
            });
            
            logger.debug(`Updated collection ${collectionName} with ${updatedCards.length} total cards`);
          }
        } catch (collectionError) {
          logger.error(`Error processing collection ${collectionName}:`, collectionError);
        }
      }
      
      // Force a page reload to show the synced data
      logger.debug('Cloud sync completed successfully, reloading page to reflect changes');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return true;
    } catch (error) {
      logger.error('Error syncing from cloud:', error);
      return false;
    }
  }
  
  /**
   * Check if user has any local data
   * @returns {Promise<boolean>} - Whether user has any local data
   */
  async hasLocalData() {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      // Check collections
      const collections = await this.getCollections();
      if (collections.length > 0) {
        return true;
      }
      
      // Check if any cards exist
      return new Promise((resolve) => {
        const transaction = this.db.transaction([CARDS_STORE], 'readonly');
        const store = transaction.objectStore(CARDS_STORE);
        
        // Use IDBKeyRange to find cards for the current user
        const range = IDBKeyRange.bound([userId, ''], [userId, '\uffff']);
        const countRequest = store.count(range);
        
        countRequest.onsuccess = () => {
          resolve(countRequest.result > 0);
        };
        
        countRequest.onerror = () => {
          resolve(false);
        };
      });
    } catch (error) {
      logger.error('Error checking for local data:', error);
      return false;
    }
  }

  /**
   * Reset all data in the database
   * This deletes all collections, cards, and other user data
   * @returns {Promise<boolean>} - Whether the reset was successful
   */
  async resetAllData() {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      // Get all object stores in the database
      const storeNames = Array.from(this.db.objectStoreNames);
      
      // Create a transaction for all stores
      const transaction = this.db.transaction(storeNames, 'readwrite');
      
      // Clear each store
      const clearPromises = storeNames.map(storeName => {
        return new Promise((resolve, reject) => {
          logger.debug(`Clearing store: ${storeName}`);
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => {
            logger.debug(`Successfully cleared store: ${storeName}`);
            resolve();
          };
          
          request.onerror = (event) => {
            logger.error(`Error clearing store ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      });
      
      // Wait for all stores to be cleared
      await Promise.all(clearPromises);
      
      // Create a default collection only if no other collections exist
      const collections = await this.getCollections();
      if (Object.keys(collections).length === 0) {
        await this.createEmptyCollection('Default Collection');
      }
      
      logger.debug('All local data has been reset successfully');
      return true;
    } catch (error) {
      logger.error('Error resetting all data:', error);
      return false;
    }
  };

  /**
   * Helper to clear existing collections for a user
   * @param {string} userId - The ID of the user whose collections should be cleared
   * @returns {Promise<void>}
   */
  async _clearExistingCollections(userId) {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        
        // Create a range for the specific user ID
        // Use IDBKeyRange.bound to target all collections for the specific user
        const lowerBound = [userId, '']; // Start range for this user
        const upperBound = [userId, '\uffff']; // End range for this user
        const range = IDBKeyRange.bound(lowerBound, upperBound);
        
        const request = store.delete(range);

        request.onsuccess = () => {
          logger.debug(`Successfully cleared existing collections for user ${userId}`);
          resolve();
        };

        request.onerror = (event) => {
          logger.error(`Error clearing collections for user ${userId}:`, event.target.error);
          reject(new Error(`Error clearing collections: ${event.target.error}`));
        };
      } catch (error) {
        logger.error('Transaction error in _clearExistingCollections:', error);
        reject(error);
      }
    });
  }

  async checkCardHasImage(cardId) {
    try {
      const card = await this.getCardFromCache(cardId);
      return card && card.hasImage === true;
    } catch (error) {
      logger.error(`Error checking if card has image: ${error}`);
      return false; // Default to false if we can't determine
    }
  }

  // Helper to get a card directly from the cache without triggering sync operations
  getCardFromCache(cardId) {
    if (!this.cache.cards || !this.cache.cards[cardId]) {
      return null;
    }
    return this.cache.cards[cardId];
  }
  
  /**
   * Get purchase invoices from the database
   * @returns {Promise<Array>} - Promise resolving to an array of purchase invoices
   */
  async getPurchaseInvoices() {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      // Check if the purchase invoices store exists
      if (!this.db.objectStoreNames.contains(PURCHASE_INVOICES_STORE)) {
        logger.debug('Purchase invoices store does not exist yet, returning empty array');
        return [];
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readonly');
          const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
          
          // Use the userId index to get only the current user's invoices
          const index = store.index('userId');
          const request = index.getAll(userId);
          
          request.onsuccess = () => {
            const invoices = request.result || [];
            logger.debug(`Retrieved ${invoices.length} purchase invoices`);
            resolve(invoices);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting purchase invoices:', event.target.error);
            reject(event.target.error);
          };
        } catch (transactionError) {
          logger.error('Transaction error in getPurchaseInvoices:', transactionError);
          resolve([]); // Return empty array on transaction error
        }
      });
    } catch (error) {
      logger.error('Error in getPurchaseInvoices:', error);
      return [];
    }
  }
  
  /**
   * Save a purchase invoice to the database
   * @param {Object} invoice - The invoice to save
   * @returns {Promise<string>} - Promise resolving to the ID of the saved invoice
   */
  async savePurchaseInvoice(invoice) {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      // Generate an ID if one doesn't exist
      if (!invoice.id) {
        invoice.id = `invoice_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      }
      
      // Add timestamp if not present
      if (!invoice.timestamp) {
        invoice.timestamp = Date.now();
      }
      
      // Add userId to the invoice for the compound key
      invoice.userId = userId;
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readwrite');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        // The store expects the object to have userId and id properties that match the keyPath
        const request = store.put(invoice);
        
        request.onsuccess = () => {
          logger.debug(`Saved purchase invoice with ID: ${invoice.id}`);
          
          // Sync to Firestore if enabled
          if (featureFlags.enableFirestoreSync) {
            // Use a try-catch to prevent errors from disrupting the user experience
            try {
              this.syncPurchaseInvoiceToFirestore(invoice).catch(error => {
                // Log the error but don't show it to the user
                logger.error('Error syncing purchase invoice to Firestore:', error);
              });
            } catch (error) {
              // Catch any synchronous errors
              logger.error('Error initiating Firestore sync:', error);
            }
          }
          
          resolve(invoice.id);
        };
        
        request.onerror = (event) => {
          logger.error('Error saving purchase invoice:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error('Error in savePurchaseInvoice:', error);
      throw error;
    }
  }
  
  /**
   * Delete a purchase invoice from the database
   * @param {string} invoiceId - The ID of the invoice to delete
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async deletePurchaseInvoice(invoiceId) {
    try {
      await this.ensureDB();
      const userId = this.getCurrentUserId();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readwrite');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        // Use the compound key [userId, invoiceId] to delete the invoice
        const request = store.delete([userId, invoiceId]);
        
        request.onsuccess = () => {
          logger.debug(`Deleted purchase invoice with ID: ${invoiceId}`);
          
          // Delete from Firestore if enabled
          if (featureFlags.enableFirestoreSync) {
            // Use a try-catch to prevent errors from disrupting the user experience
            try {
              this.deletePurchaseInvoiceFromFirestore(invoiceId).catch(error => {
                // Log the error but don't show it to the user
                logger.error('Error deleting purchase invoice from Firestore:', error);
              });
            } catch (error) {
              // Catch any synchronous errors
              logger.error('Error initiating Firestore delete:', error);
            }
          }
          
          resolve(true);
        };
        
        request.onerror = (event) => {
          logger.error('Error deleting purchase invoice:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error('Error in deletePurchaseInvoice:', error);
      return false;
    }
  }
  
  /**
   * Sync a purchase invoice to Firestore
   * @param {Object} invoice - The invoice to sync
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async syncPurchaseInvoiceToFirestore(invoice) {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not syncing purchase invoice');
      return false;
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.debug('No user ID available, cannot sync purchase invoice');
        return false;
      }
      
      // Import Firebase
      const { db } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      // Create a document reference
      const invoiceRef = doc(db, 'users', userId, 'purchaseInvoices', invoice.id);
      
      // Clean the invoice object to remove any undefined values
      // Firebase doesn't accept undefined values
      const cleanInvoice = JSON.parse(JSON.stringify(invoice));
      
      // Add sync metadata
      const invoiceWithMeta = {
        ...cleanInvoice,
        lastSynced: Date.now(),
        userId
      };
      
      try {
        // Save to Firestore
        await setDoc(invoiceRef, invoiceWithMeta);
        logger.debug(`Purchase invoice ${invoice.id} synced to Firestore`);
        return true;
      } catch (firestoreError) {
        // Handle permission errors gracefully
        if (firestoreError.code === 'permission-denied') {
          logger.debug('Firestore permission denied, invoice saved locally only');
        } else {
          logger.error('Error syncing purchase invoice to Firestore:', firestoreError);
        }
        return false;
      }
    } catch (error) {
      // Log the error but don't throw it further
      logger.error('Error in syncPurchaseInvoiceToFirestore:', error);
      return false;
    }
  }
  
  /**
   * Delete a purchase invoice from Firestore
   * @param {string} invoiceId - The ID of the invoice to delete
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async deletePurchaseInvoiceFromFirestore(invoiceId) {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not deleting purchase invoice from Firestore');
      return false;
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.debug('No user ID available, cannot delete purchase invoice from Firestore');
        return false;
      }
      
      // Import Firebase
      const { db } = await import('./firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      // Create a document reference
      const invoiceRef = doc(db, 'users', userId, 'purchaseInvoices', invoiceId);
      
      try {
        // Delete from Firestore
        await deleteDoc(invoiceRef);
        logger.debug(`Purchase invoice ${invoiceId} deleted from Firestore`);
        return true;
      } catch (firestoreError) {
        // Handle permission errors gracefully
        if (firestoreError.code === 'permission-denied') {
          logger.debug('Firestore permission denied, invoice deleted locally only');
        } else {
          logger.error('Error deleting purchase invoice from Firestore:', firestoreError);
        }
        return false;
      }
    } catch (error) {
      // Log the error but don't throw it further
      logger.error('Error in deletePurchaseInvoiceFromFirestore:', error);
      return false;
    }
  }
  
  /**
   * Sync purchase invoices from Firestore to local database
   * @returns {Promise<number>} - Promise resolving to the number of synced invoices
   */
  async syncPurchaseInvoicesFromFirestore() {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not syncing purchase invoices from Firestore');
      return 0;
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID available, cannot sync purchase invoices from Firestore');
        return 0;
      }
      
      // Import Firebase
      const { db } = await import('./firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      
      // Get all purchase invoices from Firestore
      const invoicesRef = collection(db, 'users', userId, 'purchaseInvoices');
      const querySnapshot = await getDocs(invoicesRef);
      
      let syncCount = 0;
      const syncPromises = [];
      
      querySnapshot.forEach((doc) => {
        const invoice = doc.data();
        syncPromises.push(
          this.savePurchaseInvoice(invoice)
            .then(() => {
              syncCount++;
            })
            .catch((error) => {
              logger.error(`Error syncing purchase invoice ${invoice.id}:`, error);
            })
        );
      });
      
      await Promise.all(syncPromises);
      logger.debug(`Synced ${syncCount} purchase invoices from Firestore`);
      
      return syncCount;
    } catch (error) {
      logger.error('Error syncing purchase invoices from Firestore:', error);
      return 0;
    }
  }

  /**
   * Get all purchase invoices from the database for a specific user
   * @param {string} userId - The user ID to get purchase invoices for
   * @returns {Promise<Array>} - Promise resolving to an array of purchase invoices
   */
  async getPurchaseInvoices(userId) {
    try {
      const db = await this.ensureDB();
      
      // If no userId is provided, use the current user ID
      if (!userId) {
        userId = this.getCurrentUserId();
      }
      
      // If still no userId, return empty array (not logged in)
      if (!userId) {
        logger.debug('No user ID available, returning empty purchase invoices array');
        return [];
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readonly');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        
        // Check if the userId index exists
        if (store.indexNames.contains('userId')) {
          // Use the userId index to filter by the current user
          const index = store.index('userId');
          const request = index.getAll(userId);
          
          request.onsuccess = () => {
            const invoices = request.result || [];
            logger.debug(`Retrieved ${invoices.length} purchase invoices for user ${userId}`);
            resolve(invoices);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting purchase invoices by userId:', event.target.error);
            reject(event.target.error);
          };
        } else {
          // If no userId index exists, get all and filter manually (fallback)
          const request = store.getAll();
          
          request.onsuccess = () => {
            const allInvoices = request.result || [];
            const userInvoices = allInvoices.filter(invoice => invoice.userId === userId);
            logger.debug(`Manually filtered ${userInvoices.length} purchase invoices for user ${userId} from ${allInvoices.length} total`);
            resolve(userInvoices);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting purchase invoices:', event.target.error);
            reject(event.target.error);
          };
        }
      });
    } catch (error) {
      logger.error('Error in getPurchaseInvoices:', error);
      return [];
    }
  }
  
  /**
   * Get a purchase invoice by ID
   * @param {string} id - ID of the invoice to get
   * @returns {Promise<Object|null>} - Promise resolving to the invoice or null if not found
   */
  async getPurchaseInvoice(id) {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readonly');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        const request = store.get(id);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        
        request.onerror = (event) => {
          logger.error(`Error getting purchase invoice ${id}:`, event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error(`Error in getPurchaseInvoice for ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get all cards from the database
   * @returns {Promise<Array>} Promise resolving to an array of cards
   */
  getAllCards() {
    return new Promise((resolve, reject) => {
      try {
        this.ensureDB().then(() => {
          const transaction = this.db.transaction([CARDS_STORE], 'readonly');
          const objectStore = transaction.objectStore(CARDS_STORE);
          const request = objectStore.getAll();
          
          request.onsuccess = () => {
            resolve(request.result || []);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting all cards:', event.target.error);
            reject(event.target.error);
          };
        }).catch(error => {
          logger.error('Error ensuring database for getAllCards:', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Error in getAllCards:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Get a card by ID from the database
   * @param {string} cardId - The ID of the card to retrieve
   * @returns {Promise<Object|null>} Promise resolving to the card object or null if not found
   */
  getCard(cardId) {
    return new Promise((resolve, reject) => {
      try {
        if (!cardId) {
          logger.error('No card ID provided to getCard');
          return resolve(null);
        }

        this.ensureDB().then(() => {
          // First try to get the card from the cache
          if (this.cache && this.cache.cards && this.cache.cards[cardId]) {
            logger.debug(`Found card ${cardId} in cache`);
            return resolve(this.cache.cards[cardId]);
          }
          
          // If not in cache, try to get from IndexedDB
          const transaction = this.db.transaction([CARDS_STORE], 'readonly');
          const objectStore = transaction.objectStore(CARDS_STORE);
          const request = objectStore.get(cardId);
          
          request.onsuccess = () => {
            if (request.result) {
              logger.debug(`Found card ${cardId} in IndexedDB`);
              resolve(request.result);
            } else {
              // If not found by direct ID lookup, try to search all collections
              this.getCollections().then(collections => {
                // Search through all collections for the card
                for (const collectionName in collections) {
                  const collection = collections[collectionName];
                  if (Array.isArray(collection)) {
                    const foundCard = collection.find(card => card.id === cardId);
                    if (foundCard) {
                      logger.debug(`Found card ${cardId} in collection ${collectionName}`);
                      return resolve(foundCard);
                    }
                  }
                }
                
                logger.debug(`Card ${cardId} not found in any collection`);
                resolve(null);
              }).catch(error => {
                logger.error(`Error searching collections for card ${cardId}:`, error);
                resolve(null);
              });
            }
          };
          
          request.onerror = (event) => {
            logger.error(`Error getting card ${cardId}:`, event.target.error);
            reject(event.target.error);
          };
        }).catch(error => {
          logger.error(`Error ensuring database for getCard ${cardId}:`, error);
          reject(error);
        });
      } catch (error) {
        logger.error(`Error in getCard for ${cardId}:`, error);
        reject(error);
      }
    });
  }

  async savePurchaseInvoice(invoice) {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readwrite');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        
        // Ensure the invoice has an ID
        if (!invoice.id) {
          invoice.id = `invoice_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        }
        
        // Add timestamp if not present
        if (!invoice.timestamp) {
          invoice.timestamp = Date.now();
        }
        
        // Count the cards if not already counted
        if (!invoice.cardCount && invoice.cards && Array.isArray(invoice.cards)) {
          invoice.cardCount = invoice.cards.length;
        }
        
        const request = store.put(invoice);
        
        request.onsuccess = () => {
          // If Firestore sync is enabled, also save to Firestore
          if (featureFlags.enableFirestoreSync) {
            this.savePurchaseInvoiceToFirestore(invoice).catch(error => {
              logger.error(`Error saving purchase invoice ${invoice.id} to Firestore:`, error);
            });
          }
          
          resolve(invoice);
        };
        
        request.onerror = (event) => {
          logger.error('Error saving purchase invoice:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error('Error in savePurchaseInvoice:', error);
      throw error;
    }
  }
  
  /**
   * Delete a purchase invoice from the database
   * @param {string} id - ID of the invoice to delete
   * @returns {Promise<boolean>} - Promise resolving to true if successful
   */
  async deletePurchaseInvoice(id) {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readwrite');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        const request = store.delete(id);
        
        request.onsuccess = () => {
          // If Firestore sync is enabled, also delete from Firestore
          if (featureFlags.enableFirestoreSync) {
            this.deletePurchaseInvoiceFromFirestore(id).catch(error => {
              logger.error(`Error deleting purchase invoice ${id} from Firestore:`, error);
            });
          }
          
          resolve(true);
        };
        
        request.onerror = (event) => {
          logger.error(`Error deleting purchase invoice ${id}:`, event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error(`Error in deletePurchaseInvoice for ID ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Save a purchase invoice to Firestore
   * @param {Object} invoice - The invoice to save
   * @returns {Promise<boolean>} - Promise resolving to true if successful
   */
  async savePurchaseInvoiceToFirestore(invoice) {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not saving purchase invoice');
      return false;
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID available, cannot save purchase invoice to Firestore');
        return false;
      }
      
      // Import Firebase
      const { db } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      // Create a document reference
      const invoiceRef = doc(db, 'users', userId, 'purchaseInvoices', invoice.id);
      
      // Clean the invoice object to remove any undefined values
      // Firebase doesn't accept undefined values
      const cleanInvoice = JSON.parse(JSON.stringify(invoice));
      
      // Add sync metadata
      const invoiceWithMeta = {
        ...cleanInvoice,
        lastSynced: Date.now(),
        userId
      };
      
      try {
        // Save to Firestore
        await setDoc(invoiceRef, invoiceWithMeta);
        logger.debug(`Purchase invoice ${invoice.id} saved to Firestore`);
        return true;
      } catch (firestoreError) {
        // Handle permission errors gracefully
        if (firestoreError.code === 'permission-denied') {
          logger.debug('Firestore permission denied, invoice saved locally only');
        } else {
          logger.error('Error saving purchase invoice to Firestore:', firestoreError);
        }
        return false;
      }
    } catch (error) {
      // Log the error but don't throw it further
      logger.error('Error in savePurchaseInvoiceToFirestore:', error);
      return false;
    }
  }
  
  /**
   * Delete a purchase invoice from Firestore
   * @param {string} id - ID of the invoice to delete
   * @returns {Promise<boolean>} - Promise resolving to true if successful
   */
  async deletePurchaseInvoiceFromFirestore(id) {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not deleting purchase invoice');
      return false;
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID available, cannot delete purchase invoice from Firestore');
        return false;
      }
      
      // Import Firebase
      const { db } = await import('./firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      // Create a document reference
      const invoiceRef = doc(db, 'users', userId, 'purchaseInvoices', id);
      
      try {
        // Delete from Firestore
        await deleteDoc(invoiceRef);
        logger.debug(`Purchase invoice ${id} deleted from Firestore`);
        return true;
      } catch (firestoreError) {
        // Handle permission errors gracefully
        if (firestoreError.code === 'permission-denied') {
          logger.debug('Firestore permission denied, invoice deleted locally only');
        } else {
          logger.error('Error deleting purchase invoice from Firestore:', firestoreError);
        }
        return false;
      }
    } catch (error) {
      // Log the error but don't throw it further
      logger.error('Error in deletePurchaseInvoiceFromFirestore:', error);
      return false;
    }
  }
  
  /**
   * Sync purchase invoices from Firestore to local database
   * @returns {Promise<number>} - Promise resolving to the number of synced invoices
   */
  async syncPurchaseInvoicesFromFirestore() {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not syncing purchase invoices from Firestore');
      return 0;
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID available, cannot sync purchase invoices from Firestore');
        return 0;
      }
      
      // Import Firebase
      const { db } = await import('./firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      
      // Get all purchase invoices from Firestore
      const invoicesRef = collection(db, 'users', userId, 'purchaseInvoices');
      const querySnapshot = await getDocs(invoicesRef);
      
      let syncCount = 0;
      const syncPromises = [];
      
      querySnapshot.forEach((doc) => {
        const invoice = doc.data();
        syncPromises.push(
          this.savePurchaseInvoice(invoice)
            .then(() => {
              syncCount++;
            })
            .catch((error) => {
              logger.error(`Error syncing purchase invoice ${invoice.id}:`, error);
            })
        );
      });
      
      await Promise.all(syncPromises);
      logger.debug(`Synced ${syncCount} purchase invoices from Firestore`);
      
      return syncCount;
    } catch (error) {
      logger.error('Error syncing purchase invoices from Firestore:', error);
      return 0;
    }
  }

  /**
   * Get all purchase invoices from the database for a specific user
   * @param {string} userId - The user ID to get purchase invoices for
   * @returns {Promise<Array>} - Promise resolving to an array of purchase invoices
   */
  async getPurchaseInvoices(userId) {
    try {
      const db = await this.ensureDB();
      
      // If no userId is provided, use the current user ID
      if (!userId) {
        userId = this.getCurrentUserId();
      }
      
      // If still no userId, return empty array (not logged in)
      if (!userId) {
        logger.debug('No user ID available, returning empty purchase invoices array');
        return [];
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([PURCHASE_INVOICES_STORE], 'readonly');
        const store = transaction.objectStore(PURCHASE_INVOICES_STORE);
        
        // Check if the userId index exists
        if (store.indexNames.contains('userId')) {
          // Use the userId index to filter by the current user
          const index = store.index('userId');
          const request = index.getAll(userId);
          
          request.onsuccess = () => {
            const invoices = request.result || [];
            logger.debug(`Retrieved ${invoices.length} purchase invoices for user ${userId}`);
            resolve(invoices);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting purchase invoices by userId:', event.target.error);
            reject(event.target.error);
          };
        } else {
          // If no userId index exists, get all and filter manually (fallback)
          const request = store.getAll();
          
          request.onsuccess = () => {
            const allInvoices = request.result || [];
            const userInvoices = allInvoices.filter(invoice => invoice.userId === userId);
            logger.debug(`Manually filtered ${userInvoices.length} purchase invoices for user ${userId} from ${allInvoices.length} total`);
            resolve(userInvoices);
          };
          
          request.onerror = (event) => {
            logger.error('Error getting purchase invoices:', event.target.error);
            reject(event.target.error);
          };
        }
      });
    } catch (error) {
      logger.error('Error in getPurchaseInvoices:', error);
      return [];
    }
  }
  
  /**
   * Save custom Pokemon set to Firestore
   * @param {string} setName - Name of the set to save
   * @param {string} year - Year the set belongs to
   * @returns {Promise} - Promise resolving to success status
   */
  async saveCustomSet(setName, year) {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not saving custom set');
      return false;
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID available, cannot save custom set');
        return false;
      }

      // Import Firebase
      const { db } = await import('./firebase');
      const { doc, getDoc, setDoc, arrayUnion } = await import('firebase/firestore');

      // Get the reference to the user's custom sets doc
      const customSetsRef = doc(db, 'userSettings', userId);
      
      // Get current custom sets or create new structure
      let customSetsDoc;
      try {
        customSetsDoc = await getDoc(customSetsRef);
      } catch (error) {
        logger.error('Error fetching custom sets:', error);
        return false;
      }

      if (customSetsDoc.exists()) {
        // Update existing document
        const customSets = customSetsDoc.data().customSets || {};
        
        // Check if this year exists in the custom sets
        if (!customSets[year]) {
          customSets[year] = [];
        }
        
        // Check if set already exists for this year
        if (!customSets[year].includes(setName)) {
          // Add to the array for this year
          await setDoc(customSetsRef, {
            customSets: {
              ...customSets,
              [year]: [...customSets[year], setName]
            }
          }, { merge: true });
        }
      } else {
        // Create new document
        await setDoc(customSetsRef, {
          customSets: {
            [year]: [setName]
          }
        });
      }
      
      logger.debug(`Custom set ${setName} for year ${year} saved to Firestore`);
      return true;
    } catch (error) {
      logger.error('Error saving custom set to Firestore:', error);
      return false;
    }
  }

  /**
   * Load custom Pokemon sets from Firestore
   * @returns {Promise<Object>} - Promise resolving to custom sets by year
   */
  async loadCustomSets() {
    if (!featureFlags.enableFirestoreSync) {
      logger.debug('Firestore sync disabled, not loading custom sets');
      return {};
    }

    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.error('No user ID available, cannot load custom sets');
        return {};
      }

      // Import Firebase
      const { db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      // Get the reference to the user's custom sets doc
      const customSetsRef = doc(db, 'userSettings', userId);
      
      try {
        const customSetsDoc = await getDoc(customSetsRef);
        if (customSetsDoc.exists()) {
          const data = customSetsDoc.data();
          return data.customSets || {};
        }
      } catch (error) {
        logger.error('Error fetching custom sets:', error);
      }
      
      return {};
    } catch (error) {
      logger.error('Error loading custom sets from Firestore:', error);
      return {};
    }
  }

  /**
   * Method called by shadowSync listener when a sold card is added/modified in Firestore
   * @param {string} cardId - The ID of the sold card
   * @param {Object} cardData - The data of the sold card
   * @returns {Promise<void>}
   */
  async addOrUpdateSoldCardLocal(cardId, cardData) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    logger.debug(`[DBService] addOrUpdateSoldCardLocal called for cardId: ${cardId}, userId: ${userId}`);

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        const request = store.get([userId, 'sold']);

        request.onsuccess = () => {
          let soldCollection = request.result;
          let soldItemsArray = [];

          if (soldCollection && Array.isArray(soldCollection.data)) {
            soldItemsArray = soldCollection.data;
          } else {
            soldCollection = { userId, name: 'sold', data: [] }; // Initialize if not found
          }

          const itemIndex = soldItemsArray.findIndex(item => (item.id === cardId || item.cardId === cardId));
          const newItemData = { ...cardData, id: cardId }; // Ensure 'id' field matches cardId

          if (itemIndex > -1) {
            logger.debug(`[DBService] Updating existing sold item ${cardId} in IndexedDB.`);
            soldItemsArray[itemIndex] = { ...soldItemsArray[itemIndex], ...newItemData };
          } else {
            logger.debug(`[DBService] Adding new sold item ${cardId} to IndexedDB.`);
            soldItemsArray.push(newItemData);
          }

          soldCollection.data = soldItemsArray;
          const putRequest = store.put(soldCollection);

          putRequest.onsuccess = () => {
            logger.debug(`[DBService] Successfully updated local sold items for card ${cardId}.`);
            resolve();
          };
          putRequest.onerror = (event) => {
            logger.error(`[DBService] Error putting updated sold collection for card ${cardId}:`, event.target.error);
            reject(event.target.error);
          };
        };

        request.onerror = (event) => {
          logger.error(`[DBService] Error getting sold collection for card ${cardId}:`, event.target.error);
          reject(event.target.error);
        };
        transaction.onerror = (event) => {
          logger.error(`[DBService] Transaction error in addOrUpdateSoldCardLocal for ${cardId}:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        logger.error(`[DBService] Exception in addOrUpdateSoldCardLocal for ${cardId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Method called by shadowSync listener when a sold card is removed in Firestore
   * @param {string} cardId - The ID of the sold card
   * @returns {Promise<void>}
   */
  async deleteSoldCardFromLocal(cardId) {
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    logger.debug(`[DBService] deleteSoldCardFromLocal called for cardId: ${cardId}, userId: ${userId}`);

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        const request = store.get([userId, 'sold']);

        request.onsuccess = () => {
          const soldCollection = request.result;
          if (soldCollection && Array.isArray(soldCollection.data)) {
            const initialLength = soldCollection.data.length;
            soldCollection.data = soldCollection.data.filter(item => (item.id !== cardId && item.cardId !== cardId));
            
            if (soldCollection.data.length < initialLength) {
              const putRequest = store.put(soldCollection);
              putRequest.onsuccess = () => {
                logger.debug(`[DBService] Successfully removed sold card ${cardId} from local IndexedDB.`);
                resolve(true); // Successfully deleted
              };
              putRequest.onerror = (event) => {
                logger.error(`[DBService] Error putting updated sold collection after deleting ${cardId}:`, event.target.error);
                reject(event.target.error);
              };
            } else {
              logger.debug(`[DBService] Sold card ${cardId} not found in local IndexedDB for deletion.`);
              resolve(false); // Card not found, considered success for this op's purpose
            }
          } else {
            logger.debug(`[DBService] No sold collection or empty data, card ${cardId} not found for deletion.`);
            resolve(false); // No collection or card not found
          }
        };
        request.onerror = (event) => {
          logger.error(`[DBService] Error getting sold collection to delete card ${cardId}:`, event.target.error);
          reject(event.target.error);
        };
        transaction.onerror = (event) => {
          logger.error(`[DBService] Transaction error in deleteSoldCardFromLocal for ${cardId}:`, event.target.error);
          reject(event.target.error);
        };
      } catch (error) {
        logger.error(`[DBService] Exception in deleteSoldCardFromLocal for ${cardId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Method to delete multiple sold items by their IDs from IndexedDB and trigger shadow deletion
   * @param {Array<string>} cardIds - The IDs of the sold cards to delete
   * @returns {Promise<{success: boolean, message: string}>} - Promise resolving to success status and message
   */
  async deleteSoldItemsByIds(cardIds) {
    if (!cardIds || cardIds.length === 0) {
      logger.debug('[DBService] deleteSoldItemsByIds called with no card IDs.');
      return { success: true, message: 'No card IDs provided.' };
    }
    await this.ensureDB();
    const userId = this.getCurrentUserId();
    logger.debug(`[DBService] deleteSoldItemsByIds called for ${cardIds.length} cards, userId: ${userId}`);

    let localDeleteSuccess = false;
    try {
      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([COLLECTIONS_STORE], 'readwrite');
        const store = transaction.objectStore(COLLECTIONS_STORE);
        const request = store.get([userId, 'sold']);

        request.onsuccess = () => {
          const soldCollection = request.result;
          if (soldCollection && Array.isArray(soldCollection.data)) {
            const initialLength = soldCollection.data.length;
            soldCollection.data = soldCollection.data.filter(item => 
              !cardIds.includes(item.id) && !cardIds.includes(item.cardId)
            );

            if (soldCollection.data.length < initialLength) {
              const putRequest = store.put(soldCollection);
              putRequest.onsuccess = () => {
                logger.debug(`[DBService] Successfully removed ${initialLength - soldCollection.data.length} sold cards from local IndexedDB.`);
                localDeleteSuccess = true;
                resolve();
              };
              putRequest.onerror = (event) => {
                logger.error('[DBService] Error putting updated sold collection after batch deleting:', event.target.error);
                reject(event.target.error);
              };
            } else {
              logger.debug('[DBService] No specified sold cards found in local IndexedDB for batch deletion.');
              localDeleteSuccess = true; // No items to delete, but operation is 'successful'
              resolve();
            }
          } else {
            logger.debug('[DBService] No sold collection or empty data, no cards found for batch deletion.');
            localDeleteSuccess = true; // No collection, operation 'successful'
            resolve();
          }
        };
        request.onerror = (event) => {
          logger.error('[DBService] Error getting sold collection for batch delete:', event.target.error);
          reject(event.target.error);
        };
        transaction.onerror = (event) => {
          logger.error('[DBService] Transaction error in deleteSoldItemsByIds:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      logger.error(`[DBService] Error during local deletion in deleteSoldItemsByIds:`, error);
      return { success: false, message: 'Local deletion failed', error };
    }

    if (localDeleteSuccess && featureFlags.enableFirestoreSync) {
      logger.debug('[DBService] Triggering shadow deletion for sold items.');
      try {
        // No await here, let it run in the background
        shadowSync.shadowDeleteSoldItems(cardIds)
          .then(response => {
            if (response.success) {
              logger.debug(`[DBService] Shadow deletion of ${cardIds.length} items initiated successfully.`);
            } else {
              logger.warn(`[DBService] Shadow deletion of ${cardIds.length} items failed or partially failed: ${response.message}`);
            }
          })
          .catch(shadowError => {
            logger.error('[DBService] Error calling shadowDeleteSoldItems:', shadowError);
          });
      } catch (error) {
        logger.error('[DBService] Exception when trying to call shadowSync.shadowDeleteSoldItems:', error);
        // Fall through to return local success status, as shadow sync is best-effort
      }
    }
    // The overall success is primarily based on local DB operation for this method's immediate feedback
    return { success: localDeleteSuccess, message: localDeleteSuccess ? 'Local deletion successful.' : 'Local deletion encountered an issue.' };
  }
}

const db = new DatabaseService();
export default db;