import { databaseService } from './databaseService';
import { firebaseService } from './firebaseService';
import { auth } from '../config/firebase';
import { cardService } from './cardService';

/**
 * DataService - Facade over Firebase and IndexedDB services
 * Provides a unified API for all data operations and handles synchronization logic
 */
class DataService {
  constructor() {
    this.db = databaseService;
    this.firebase = firebaseService;
    this.collections = {};
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    // Set up offline/online detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Handle device coming online
   */
  handleOnline() {
    console.log('Device is online');
    this.isOnline = true;
    
    // Trigger sync when we come back online
    this.syncData().catch(console.error);
  }

  /**
   * Handle device going offline
   */
  handleOffline() {
    console.log('Device is offline');
    this.isOnline = false;
  }

  /**
   * Get the current user's ID
   * @returns {string|null} User ID or null if not authenticated
   */
  getCurrentUserId() {
    try {
      return firebaseService.getCurrentUserId();
    } catch (error) {
      console.log('No authenticated user');
      return null;
    }
  }

  /**
   * Initialize data for the current user
   * This should be called when the app starts or when a user signs in
   */
  async initialize() {
    try {
      console.log('Initializing database service...');
      
      // First ensure database is initialized
      await this.db.initDatabase();
      
      console.log('Database initialized, fetching collections...');
      
      // Try to get collections from IndexedDB first
      let collections;
      try {
        collections = await this.db.getCollections();
        console.log('Got collections from IndexedDB:', collections);
      } catch (error) {
        console.error('Error getting collections from IndexedDB:', error);
        collections = null;
      }
      
      // If no local collections, try Firebase
      if (!collections || Object.keys(collections).length === 0) {
        console.log('No local collections, checking Firebase...');
        const user = auth.currentUser;
        if (user) {
          try {
            const firebaseCollections = await cardService.getCollections(user.uid);
            console.log('Got collections from Firebase:', firebaseCollections);
            
            // Ensure all collections have a cards array
            const normalizedCollections = {};
            for (const [name, cards] of Object.entries(firebaseCollections)) {
              normalizedCollections[name] = Array.isArray(cards) ? cards : [];
            }
            
            if (Object.keys(normalizedCollections).length > 0) {
              // Save Firebase collections to IndexedDB without triggering sync back to Firebase
              await this.db.saveCollections(normalizedCollections, false);
              return normalizedCollections;
            }
          } catch (error) {
            console.error('Error fetching collections from Firebase:', error);
          }
        }
        
        // If still no collections, create default
        console.log('Creating default collection...');
        const defaultCollections = { 'Default Collection': [] };
        await this.db.saveCollections(defaultCollections, false);
        return defaultCollections;
      }
      
      // Ensure all collections have a cards array
      const normalizedCollections = {};
      for (const [name, cards] of Object.entries(collections)) {
        normalizedCollections[name] = Array.isArray(cards) ? cards : [];
      }
      
      return normalizedCollections;
    } catch (error) {
      console.error('Error in initialize:', error);
      // Return default collection on error to allow app to function
      return { 'Default Collection': [] };
    }
  }

  /**
   * Sync data between local database and Firebase
   */
  async syncData() {
    if (this.syncInProgress || !this.isOnline) {
      return false;
    }
    
    this.syncInProgress = true;
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        this.syncInProgress = false;
        return false;
      }
      
      // Step 1: Sync local changes to Firebase
      await this.db.processSyncQueue();
      
      // Step 2: Pull any remote changes
      // This is done less frequently to avoid overwhelming the user with constant updates
      const remoteCollections = await this.firebase.getCollections(userId);
      
      // Merge collections to handle potential conflicts
      // (Local changes since last sync would have been sent to Firebase in step 1)
      const localCollections = await this.db.getCollections();
      
      // Compare remote and local collections to detect changes
      let hasChanges = false;
      const mergedCollections = { ...localCollections };
      
      for (const [name, cards] of Object.entries(remoteCollections)) {
        // Skip virtual collections
        if (name === 'All Cards') continue;
        
        // If remote collection doesn't exist locally or has different count, update it
        if (!localCollections[name] || 
            JSON.stringify(localCollections[name]) !== JSON.stringify(cards)) {
          mergedCollections[name] = cards;
          hasChanges = true;
        }
      }
      
      // Check for local collections that don't exist remotely (might have been deleted)
      for (const name of Object.keys(localCollections)) {
        if (name === 'All Cards') continue;
        
        if (!remoteCollections[name]) {
          // Collection exists locally but not remotely
          // Keep it if it has pending changes (in the sync queue)
          // Otherwise, remove it as it was likely deleted in another client
          const hasPendingChanges = await this.hasPendingChangesForCollection(name);
          if (!hasPendingChanges) {
            delete mergedCollections[name];
            hasChanges = true;
          }
        }
      }
      
      // Save merged collections locally if changes were detected
      if (hasChanges) {
        await this.db.saveCollections(mergedCollections, false);
        this.collections = mergedCollections;
      }
      
      // Step 3: Sync images
      await this.db.syncImagesFromStorage(userId);
      
      this.syncInProgress = false;
      return true;
    } catch (error) {
      console.error('Error syncing data:', error);
      this.syncInProgress = false;
      return false;
    }
  }

  /**
   * Check if a collection has pending changes in the sync queue
   * @param {string} collectionName - Name of the collection
   */
  async hasPendingChangesForCollection(collectionName) {
    // This would normally check the sync queue for pending operations
    // Since we don't have direct access to the queue from this service,
    // we'll assume no pending changes for now
    return false;
  }

  // ======= Collection Operations =======

  /**
   * Get all collections with error handling
   */
  async getCollections() {
    try {
      return await this.db.getCollections();
    } catch (error) {
      console.error('Error getting collections:', error);
      return { 'Default Collection': [] };
    }
  }

  /**
   * Save a collection
   * @param {string} name - Collection name
   * @param {Array} cards - Card array
   * @returns {Promise<boolean>} - Success status
   */
  async saveCollection(name, cards) {
    try {
      // Ensure cards is always an array
      const normalizedCards = Array.isArray(cards) ? cards : [];
      
      // Get current collections
      const collections = await this.getCollections();
      
      // Update the specific collection
      collections[name] = normalizedCards;
      
      // Save to IndexedDB
      await this.db.saveCollections(collections);
      
      // Save to Firebase if user is authenticated
      const user = auth.currentUser;
      if (user) {
        try {
          await cardService.saveCollection(user.uid, name, normalizedCards);
        } catch (error) {
          console.error('Error saving to Firebase:', error);
          // Don't fail if Firebase save fails, data is still in IndexedDB
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving collection:', error);
      throw error;
    }
  }

  /**
   * Save multiple collections
   * @param {Object} collections - Collections object
   * @returns {Promise<boolean>} - Success status
   */
  async saveCollections(collections) {
    // Filter out virtual collections
    const filteredCollections = { ...collections };
    if (filteredCollections['All Cards']) {
      delete filteredCollections['All Cards'];
    }
    
    // Save to local database (will queue for sync if online)
    await this.db.saveCollections(filteredCollections);
    
    // Update local cache
    this.collections = {
      ...this.collections,
      ...filteredCollections
    };
    
    return true;
  }

  /**
   * Delete a collection
   * @param {string} name - Collection name
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCollection(name) {
    try {
      // Get current collections
      const collections = await this.getCollections();
      
      // Delete the collection
      delete collections[name];
      
      // Save updated collections to IndexedDB
      await this.db.saveCollections(collections);
      
      // Delete from Firebase if user is authenticated
      const user = auth.currentUser;
      if (user) {
        try {
          await cardService.deleteCollection(user.uid, name);
        } catch (error) {
          console.error('Error deleting from Firebase:', error);
          // Don't fail if Firebase delete fails
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  /**
   * Rename a collection
   * @param {string} oldName - Current collection name
   * @param {string} newName - New collection name
   * @returns {Promise<boolean>} - Success status
   */
  async renameCollection(oldName, newName) {
    try {
      // Get current collections
      const collections = await this.getCollections();
      
      // Rename the collection
      if (collections[oldName]) {
        collections[newName] = collections[oldName];
        delete collections[oldName];
        
        // Save to IndexedDB
        await this.db.saveCollections(collections);
        
        // Update in Firebase if user is authenticated
        const user = auth.currentUser;
        if (user) {
          try {
            await cardService.renameCollection(user.uid, oldName, newName);
          } catch (error) {
            console.error('Error renaming in Firebase:', error);
            // Don't fail if Firebase rename fails
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error renaming collection:', error);
      throw error;
    }
  }

  // ======= Image Operations =======

  /**
   * Save image
   * @param {string} cardId - Card ID (serial number)
   * @param {Blob} imageBlob - Image as Blob
   * @returns {Promise<boolean>} - Success status
   */
  async saveImage(cardId, imageBlob) {
    // Save to local database (will queue for sync if online)
    return await this.db.saveImage(cardId, imageBlob);
  }

  /**
   * Get image
   * @param {string} cardId - Card ID (serial number)
   * @returns {Promise<Blob|null>} - Image blob or null if not found
   */
  async getImage(cardId) {
    // Try local database first
    const localImage = await this.db.getImage(cardId);
    if (localImage) {
      return localImage;
    }
    
    // If not in local database and we're online, try to get from Firebase
    if (this.isOnline) {
      try {
        const userId = this.getCurrentUserId();
        if (!userId) {
          return null;
        }
        
        // Get URL from Firebase
        const url = await this.firebase.getImageUrl(cardId, userId);
        
        // Fetch the image
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        // Convert to blob
        const blob = await response.blob();
        
        // Save to local database for future use
        await this.db.saveImage(cardId, blob, false);
        
        return blob;
      } catch (error) {
        console.error(`Error getting image ${cardId} from Firebase:`, error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Delete image
   * @param {string} cardId - Card ID (serial number)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteImage(cardId) {
    // Delete from local database (will queue for sync if online)
    return await this.db.deleteImage(cardId);
  }

  // ======= Backup Operations =======

  /**
   * Create a backup
   * @param {Blob} backupData - Backup data as Blob
   * @returns {Promise<string>} - Download URL or local result
   */
  async createBackup(backupData) {
    // If online, save to Firebase
    if (this.isOnline) {
      try {
        const userId = this.getCurrentUserId();
        if (userId) {
          return await this.firebase.createBackup(backupData, userId);
        }
      } catch (error) {
        console.error('Error creating backup in Firebase:', error);
        // Fall back to local backup
      }
    }
    
    // Local backup (return object URL for download)
    const url = URL.createObjectURL(backupData);
    return url;
  }

  /**
   * Get all backups
   * @returns {Promise<Array>} - Array of backup metadata
   */
  async getBackups() {
    if (!this.isOnline) {
      return [];
    }
    
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return [];
      }
      
      return await this.firebase.getBackups(userId);
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  }

  // ======= User Operations =======

  /**
   * Register auth state change listener
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  onAuthStateChanged(callback) {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, initialize data
        await this.initialize();
      } else {
        // User is signed out, clear cache
        this.collections = {};
      }
      
      // Call the callback
      callback(user);
    });
    
    return unsubscribe;
  }
}

export const dataService = new DataService();