import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  runTransaction,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

/**
 * Firebase Service - Responsible for all Firebase operations
 * This service follows the Repository pattern, providing a clean abstraction 
 * over Firebase Firestore and Storage operations
 */
class FirebaseService {
  constructor() {
    this.db = db;
    this.storage = storage;
    this.auth = auth;
    this.listeners = new Map();
  }

  // ======= User Data Operations =======

  /**
   * Get the current user's ID or throw an error if not authenticated
   */
  getCurrentUserId() {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * Get user data from Firestore
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The user data
   */
  async getUserData(userId = null) {
    const uid = userId || this.getCurrentUserId();
    const userRef = doc(this.db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return { id: userSnap.id, ...userSnap.data() };
  }

  /**
   * Update user data in Firestore
   * @param {Object} userData - The user data to update
   * @param {string} userId - The user ID (optional, default: current user)
   */
  async updateUserData(userData, userId = null) {
    const uid = userId || this.getCurrentUserId();
    const userRef = doc(this.db, 'users', uid);
    
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  }

  // ======= Collection Operations =======

  /**
   * Get all collections for a user
   * @param {string} userId - The user ID (optional, default: current user)
   * @returns {Promise<Object>} - Object with collection names as keys and card arrays as values
   */
  async getCollections(userId = null) {
    const uid = userId || this.getCurrentUserId();
    const collectionsRef = collection(this.db, `users/${uid}/collections`);
    const snapshot = await getDocs(collectionsRef);
    
    const collections = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      collections[doc.id] = Array.isArray(data.cards) ? data.cards : [];
    });
    
    return collections;
  }

  /**
   * Save a collection with optimistic concurrency control
   * @param {string} collectionName - Name of the collection
   * @param {Array} cards - Array of card objects
   * @param {string} userId - User ID (optional, default: current user)
   */
  async saveCollection(collectionName, cards, userId = null) {
    if (collectionName === 'All Cards') {
      throw new Error('Cannot save virtual collection "All Cards"');
    }
    
    if (!Array.isArray(cards)) {
      throw new Error(`Cards for collection ${collectionName} must be an array`);
    }
    
    const uid = userId || this.getCurrentUserId();
    const collectionRef = doc(this.db, `users/${uid}/collections/${collectionName}`);

    // Use a transaction for optimistic concurrency control
    await runTransaction(this.db, async (transaction) => {
      // Get the current document
      const docSnap = await transaction.get(collectionRef);
      
      // Prepare the new document
      const newData = {
        cards: cards,
        updatedAt: serverTimestamp(),
        cardCount: cards.length
      };
      
      // If the document doesn't exist, include creation metadata
      if (!docSnap.exists()) {
        newData.createdAt = serverTimestamp();
      }
      
      // Set the document
      transaction.set(collectionRef, newData);
    });
    
    return true;
  }

  /**
   * Save multiple collections in a batch operation
   * @param {Object} collections - Object with collection names as keys and card arrays as values
   * @param {string} userId - User ID (optional, default: current user)
   */
  async saveCollections(collections, userId = null) {
    const uid = userId || this.getCurrentUserId();
    
    // Filter out virtual collections
    const collectionsToSave = Object.entries(collections).filter(([name]) => name !== 'All Cards');
    
    // Use batched writes for better performance
    const BATCH_SIZE = 20; // Firestore has a limit of 500 operations per batch
    
    for (let i = 0; i < collectionsToSave.length; i += BATCH_SIZE) {
      const batch = writeBatch(this.db);
      const currentBatch = collectionsToSave.slice(i, i + BATCH_SIZE);
      
      currentBatch.forEach(([name, cards]) => {
        if (!Array.isArray(cards)) {
          console.warn(`Collection ${name} is not an array, skipping`);
          return;
        }
        
        const collectionRef = doc(this.db, `users/${uid}/collections/${name}`);
        batch.set(collectionRef, {
          cards: cards,
          updatedAt: serverTimestamp(),
          cardCount: cards.length
        });
      });
      
      await batch.commit();
    }
    
    return true;
  }

  /**
   * Delete a collection
   * @param {string} collectionName - Name of the collection to delete
   * @param {string} userId - User ID (optional, default: current user)
   */
  async deleteCollection(collectionName, userId = null) {
    const uid = userId || this.getCurrentUserId();
    const collectionRef = doc(this.db, `users/${uid}/collections/${collectionName}`);
    await deleteDoc(collectionRef);
    return true;
  }

  /**
   * Rename a collection using a transaction
   * @param {string} oldName - Current collection name
   * @param {string} newName - New collection name
   * @param {string} userId - User ID (optional, default: current user)
   */
  async renameCollection(oldName, newName, userId = null) {
    if (oldName === newName) return true;
    
    const uid = userId || this.getCurrentUserId();
    
    // Use a transaction to ensure atomicity
    await runTransaction(this.db, async (transaction) => {
      // References to old and new documents
      const oldRef = doc(this.db, `users/${uid}/collections/${oldName}`);
      const newRef = doc(this.db, `users/${uid}/collections/${newName}`);
      
      // Get the old collection
      const oldDoc = await transaction.get(oldRef);
      if (!oldDoc.exists()) {
        throw new Error(`Collection ${oldName} does not exist`);
      }
      
      // Check if new name already exists
      const newDoc = await transaction.get(newRef);
      if (newDoc.exists()) {
        throw new Error(`Collection ${newName} already exists`);
      }
      
      // Copy data to new document
      const data = oldDoc.data();
      transaction.set(newRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      // Delete old document
      transaction.delete(oldRef);
    });
    
    return true;
  }

  /**
   * Set up a real-time listener for collections
   * @param {string} userId - User ID (optional, default: current user)
   * @param {Function} onUpdate - Callback function for updates
   * @returns {Function} - Unsubscribe function
   */
  listenToCollections(onUpdate, userId = null) {
    const uid = userId || this.getCurrentUserId();
    const collectionsRef = collection(this.db, `users/${uid}/collections`);
    
    // Create a unique key for this listener
    const listenerKey = `collections_${uid}`;
    
    // Remove any existing listener with the same key
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)();
      this.listeners.delete(listenerKey);
    }
    
    // Set up the listener
    const unsubscribe = onSnapshot(collectionsRef, (snapshot) => {
      const collections = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        collections[doc.id] = Array.isArray(data.cards) ? data.cards : [];
      });
      
      // Call the callback with the collections
      onUpdate(collections);
    }, (error) => {
      console.error('Error listening to collections:', error);
    });
    
    // Store the unsubscribe function
    this.listeners.set(listenerKey, unsubscribe);
    
    // Return the unsubscribe function for manual cleanup
    return unsubscribe;
  }

  // ======= Image Operations =======

  /**
   * Upload an image to Firebase Storage
   * @param {string} userId - User ID
   * @param {string} cardId - Card ID (serial number)
   * @param {Blob} imageBlob - Image blob to upload
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<string>} - Download URL of the uploaded image
   */
  async uploadImage(userId, cardId, imageBlob, onProgress = null) {
    if (!userId) {
      userId = this.getCurrentUserId();
    }
    
    if (!cardId || !imageBlob) {
      console.error('Missing cardId or imageBlob for uploadImage', { cardId, imageBlob });
      throw new Error('Missing cardId or imageBlob for upload');
    }
    
    // Ensure imageBlob is an instance of Blob or File
    if (!(imageBlob instanceof Blob) && !(imageBlob instanceof File)) {
      console.error('imageBlob is not a Blob or File', imageBlob);
      throw new Error('Invalid image format for upload');
    }
    
    console.log(`Uploading image for card ${cardId}, size: ${imageBlob.size} bytes, type: ${imageBlob.type}`);
    
    try {
      // Create storage reference
      const storageRef = ref(this.storage, `users/${userId}/images/${cardId}`);
      
      // Set metadata to ensure correct content type
      const metadata = {
        contentType: imageBlob.type || 'image/jpeg'
      };
      
      // Upload the file with metadata
      const uploadTask = uploadBytesResumable(storageRef, imageBlob, metadata);
      
      // Return promise that resolves when upload is complete
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          // Progress callback
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress for ${cardId}: ${progress.toFixed(1)}%`);
            
            if (onProgress && typeof onProgress === 'function') {
              onProgress(progress);
            }
          },
          // Error callback
          (error) => {
            console.error(`Error uploading image for ${cardId}:`, error);
            reject(error);
          },
          // Success callback
          async () => {
            try {
              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`Upload complete for ${cardId}, URL:`, downloadURL);
              resolve(downloadURL);
            } catch (error) {
              console.error(`Error getting download URL for ${cardId}:`, error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error(`Exception uploading image for ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Get an image download URL from Firebase Storage
   * @param {string} serialNumber - Card serial number
   * @param {string} userId - User ID (optional, default: current user)
   * @returns {Promise<string>} - Download URL
   */
  async getImageUrl(serialNumber, userId = null) {
    const uid = userId || this.getCurrentUserId();
    
    try {
      // First check if we have metadata in Firestore for faster access
      const metadataRef = doc(this.db, `users/${uid}/imageMetadata/${serialNumber}`);
      const metadataSnap = await getDoc(metadataRef);
      
      if (metadataSnap.exists() && metadataSnap.data().downloadURL) {
        return metadataSnap.data().downloadURL;
      }
      
      // If not in Firestore, get directly from Storage
      const imageRef = ref(this.storage, `users/${uid}/images/${serialNumber}`);
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error(`Error getting download URL for ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * Delete an image from Firebase Storage
   * @param {string} serialNumber - Card serial number
   * @param {string} userId - User ID (optional, default: current user)
   */
  async deleteImage(serialNumber, userId = null) {
    const uid = userId || this.getCurrentUserId();
    
    try {
      // Delete from Storage
      const imageRef = ref(this.storage, `users/${uid}/images/${serialNumber}`);
      await deleteObject(imageRef);
      
      // Delete metadata from Firestore
      const metadataRef = doc(this.db, `users/${uid}/imageMetadata/${serialNumber}`);
      await deleteDoc(metadataRef);
      
      return true;
    } catch (error) {
      console.error(`Error deleting image ${serialNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get all images for a user
   * @param {string} userId - User ID (optional, default: current user)
   * @returns {Promise<Array>} - Array of image metadata objects
   */
  async getAllImageMetadata(userId = null) {
    const uid = userId || this.getCurrentUserId();
    
    try {
      // Get metadata from Firestore
      const metadataRef = collection(this.db, `users/${uid}/imageMetadata`);
      const metadataSnap = await getDocs(metadataRef);
      
      const metadata = [];
      metadataSnap.forEach(doc => {
        metadata.push({ id: doc.id, ...doc.data() });
      });
      
      return metadata;
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw error;
    }
  }

  /**
   * List all images in Storage (for sync operations)
   * @param {string} userId - User ID (optional, default: current user)
   * @returns {Promise<Array>} - Array of image references
   */
  async listAllImages(userId = null) {
    const uid = userId || this.getCurrentUserId();
    
    try {
      const imagesRef = ref(this.storage, `users/${uid}/images`);
      const result = await listAll(imagesRef);
      return result.items;
    } catch (error) {
      console.error('Error listing all images:', error);
      throw error;
    }
  }

  // ======= Backup Operations =======

  /**
   * Create a backup in Firebase Storage
   * @param {Blob} backupBlob - Backup data as a blob
   * @param {string} userId - User ID (optional, default: current user)
   * @returns {Promise<string>} - Download URL of the backup
   */
  async createBackup(backupBlob, userId = null) {
    const uid = userId || this.getCurrentUserId();
    const timestamp = new Date().toISOString();
    const backupRef = ref(this.storage, `backups/${uid}/${timestamp}.zip`);
    
    try {
      // Upload the backup
      const uploadTask = await uploadBytesResumable(backupRef, backupBlob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      // Record the backup in Firestore
      await setDoc(doc(this.db, `users/${uid}/backups/${timestamp}`), {
        timestamp,
        downloadURL,
        size: backupBlob.size,
        createdAt: serverTimestamp()
      });
      
      return downloadURL;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Get all backups for a user
   * @param {string} userId - User ID (optional, default: current user)
   * @returns {Promise<Array>} - Array of backup metadata
   */
  async getBackups(userId = null) {
    const uid = userId || this.getCurrentUserId();
    
    try {
      const backupsRef = collection(this.db, `users/${uid}/backups`);
      const backupsSnap = await getDocs(backupsRef);
      
      const backups = [];
      backupsSnap.forEach(doc => {
        backups.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by timestamp descending (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return backups;
    } catch (error) {
      console.error('Error getting backups:', error);
      throw error;
    }
  }

  /**
   * Clean up old listeners when the service is no longer needed
   */
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

export const firebaseService = new FirebaseService(); 