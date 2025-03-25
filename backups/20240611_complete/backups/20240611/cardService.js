import { 
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, getMetadata } from 'firebase/storage';
import { db as firestore, storage } from '../config/firebase';
import { db as localDb } from './db';
import { getStorage } from 'firebase/storage';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class CardService {
  constructor() {
    this.firestore = firestore;
    this.storage = storage;
    this.localDb = localDb;
    this.missingImageCacheKey = 'missingImages';
  }

  // Helper function to delay execution
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper function to retry failed operations
  async retry(operation, retries = MAX_RETRIES) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        lastError = error;
        
        if (i < retries - 1) {
          // Wait before retrying, with exponential backoff
          await this.delay(RETRY_DELAY * Math.pow(2, i));
        }
      }
    }
    
    throw lastError;
  }

  // Save collection to both Firestore and IndexedDB
  async saveCollection(userId, collectionName, cards) {
    try {
      console.log(`saveCollection called with collectionName: ${collectionName}, cards length: ${Array.isArray(cards) ? cards.length : 'not an array'}`);
      
      // Safety check - don't save virtual collections
      if (collectionName === 'All Cards') {
        console.warn('Attempted to save virtual collection "All Cards". Operation skipped.');
        return false;
      }
      
      // Handle case where cards is an object containing multiple collections
      if (typeof collectionName === 'string' && typeof cards === 'object' && !Array.isArray(cards)) {
        // This is a bulk save of multiple collections
        const collections = cards;
        
        // Filter out any virtual collections like 'All Cards'
        const filteredCollections = Object.fromEntries(
          Object.entries(collections).filter(([name, _]) => name !== 'All Cards')
        );
        
        for (const [name, collectionCards] of Object.entries(filteredCollections)) {
          if (!Array.isArray(collectionCards)) {
            console.warn(`Collection ${name} is not an array, skipping`);
            continue;
          }
          
          // Save each collection to Firestore
          try {
            const collectionRef = doc(this.firestore, `users/${userId}/collections/${name}`);
            await setDoc(collectionRef, { cards: collectionCards });
          } catch (error) {
            console.error(`Error saving collection ${name} to Firestore:`, error);
            throw error;
          }
        }
        
        // Save to IndexedDB
        try {
          await this.localDb.saveCollections(filteredCollections);
        } catch (error) {
          console.error('Error saving collections to IndexedDB:', error);
          throw error;
        }
      } else {
        // Single collection save
        if (!Array.isArray(cards)) {
          console.error('Expected cards to be an array for collection', collectionName);
          throw new Error(`Cards for collection ${collectionName} must be an array`);
        }
        
        // Save to Firestore
        try {
          const collectionRef = doc(this.firestore, `users/${userId}/collections/${collectionName}`);
          await setDoc(collectionRef, { cards });
        } catch (error) {
          console.error(`Error saving collection ${collectionName} to Firestore:`, error);
          throw error;
        }

        // Save to IndexedDB
        try {
          const collections = await this.localDb.getCollections();
          collections[collectionName] = cards;
          await this.localDb.saveCollections(collections);
        } catch (error) {
          console.error(`Error saving collection ${collectionName} to IndexedDB:`, error);
          throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving collection:', error);
      throw error;
    }
  }

  // Get collections from Firestore and sync with IndexedDB
  async getCollections(userId) {
    try {
      // Get from Firestore
      const collectionsRef = collection(this.firestore, `users/${userId}/collections`);
      const snapshot = await getDocs(collectionsRef);
      
      const collections = {};
      snapshot.forEach(doc => {
        // Make sure we're getting the cards array from the document data
        const data = doc.data();
        collections[doc.id] = Array.isArray(data.cards) ? data.cards : [];
      });

      // Sync with IndexedDB
      await this.localDb.saveCollections(collections);

      return collections;
    } catch (error) {
      console.error('Error getting collections:', error);
      
      // If Firestore fails, try to get from IndexedDB
      try {
        return await this.localDb.getCollections();
      } catch (localError) {
        console.error('Error getting collections from IndexedDB:', localError);
        throw error;
      }
    }
  }

  // Simplified image exists check
  async checkImageExists(userId, cardId) {
    try {
      // Check if this image is known to be missing
      const missing = JSON.parse(localStorage.getItem(this.missingImageCacheKey) || '[]');
      if (missing.includes(cardId)) {
        return false;
      }
      
      const imageRef = ref(this.storage, `users/${userId}/cards/${cardId}`);
      await getMetadata(imageRef);
      return true;
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        this.addToMissingCache(cardId);
        return false;
      }
      throw error;
    }
  }
  
  // Add a cardId to missing image cache
  addToMissingCache(cardId) {
    const missing = JSON.parse(localStorage.getItem(this.missingImageCacheKey) || '[]');
    if (!missing.includes(cardId)) {
      missing.push(cardId);
      localStorage.setItem(this.missingImageCacheKey, JSON.stringify(missing));
    }
  }
  
  // Clear the missing image cache
  clearMissingImageCache() {
    localStorage.removeItem(this.missingImageCacheKey);
  }

  // Most basic implementation of getting an image - less failure points
  async getImage(userId, cardId) {
    // If no user or cardId, fail early
    if (!userId || !cardId) return null;
    
    try {
      // Get image reference
      const imageRef = ref(this.storage, `users/${userId}/cards/${cardId}`);
      
      // Try to get download URL
      try {
        const url = await getDownloadURL(imageRef);
        
        // Fetch the image
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`HTTP error ${response.status} for image ${cardId}`);
          return null;
        }
        
        // Get blob
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          console.error(`Empty blob for image ${cardId}`);
          return null;
        }
        
        return blob;
      } catch (error) {
        // Most likely 404 error - image doesn't exist
        if (error.code === 'storage/object-not-found') {
          console.error(`Image not found in Firebase: ${cardId}`);
        } else {
          console.error(`Error getting image URL: ${error.message}`);
        }
        return null;
      }
    } catch (error) {
      console.error(`Error in getImage for ${cardId}:`, error);
      return null;
    }
  }

  // Simplified image refresh
  async refreshImage(userId, cardId) {
    try {
      // Get the image from Firebase
      const imageBlob = await this.getImage(userId, cardId);
      
      // If image was found in Firebase, save to IndexedDB
      if (imageBlob) {
        await this.localDb.saveImage(cardId, imageBlob);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error refreshing image for ${cardId}:`, error);
      return false;
    }
  }

  // Simplified image upload
  async uploadImageToStorage(userId, cardId, imageBlob) {
    try {
      const imageRef = ref(this.storage, `users/${userId}/cards/${cardId}`);
      const snapshot = await uploadBytes(imageRef, imageBlob);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      // Save to IndexedDB
      await this.localDb.saveImage(cardId, imageBlob);
      
      return downloadUrl;
    } catch (error) {
      console.error(`Error uploading image for ${cardId}:`, error);
      throw error;
    }
  }

  // Save image to both Firebase Storage and IndexedDB
  async saveImage(userId, cardId, imageBlob) {
    try {
      // Save to IndexedDB first
      await this.localDb.saveImage(cardId, imageBlob);

      // Then try Firebase Storage, but don't fail if it errors
      try {
        await this.uploadImageToStorage(userId, cardId, imageBlob);
      } catch (storageError) {
        console.warn('Firebase Storage upload failed, falling back to IndexedDB only:', storageError);
      }

      return true;
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  }

  async checkImageSync(userId, cardIds) {
    const missingImages = [];
    const storage = getStorage();
    
    for (const cardId of cardIds) {
      try {
        // Check IndexedDB first
        const localImage = await this.localDb.getImage(cardId);
        if (!localImage || localImage.size === 0) {
          // Check Firebase Storage
          const imageRef = ref(storage, `users/${userId}/cards/${cardId}`);
          try {
            await getMetadata(imageRef);
            missingImages.push(cardId);
          } catch (error) {
            if (error.code === 'storage/object-not-found') {
              console.log(`Image not found in Firebase Storage for card ${cardId}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking sync status for card ${cardId}:`, error);
      }
    }
    
    return missingImages;
  }

  // Create a placeholder image
  createPlaceholderImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 200; 
    canvas.height = 300;
    
    const ctx = canvas.getContext('2d');
    
    // Simple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#3949ab');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Card outline
    ctx.strokeStyle = '#bbdefb';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Placeholder text
    ctx.fillStyle = '#bbdefb';
    ctx.textAlign = 'center';
    ctx.font = '80px Arial';
    ctx.fillText('?', canvas.width / 2, canvas.height / 2);
    ctx.font = '16px Arial';
    ctx.fillText('Image Unavailable', canvas.width / 2, canvas.height - 50);
    
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  // Delete collection from both Firestore and IndexedDB
  async deleteCollection(userId, collectionName) {
    try {
      // Delete from Firestore
      const collectionRef = doc(this.firestore, `users/${userId}/collections/${collectionName}`);
      await deleteDoc(collectionRef);

      // Delete from IndexedDB
      const collections = await this.localDb.getCollections();
      delete collections[collectionName];
      await this.localDb.saveCollections(collections);

      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw error;
    }
  }

  // Rename collection in both Firestore and IndexedDB
  async renameCollection(userId, oldName, newName) {
    try {
      // Get the collection data
      const collections = await this.getCollections(userId);
      const collectionData = collections[oldName];

      if (!collectionData) {
        throw new Error(`Collection "${oldName}" not found`);
      }

      // Save with new name
      await this.saveCollection(userId, newName, collectionData);

      // Delete old collection
      await this.deleteCollection(userId, oldName);

      return true;
    } catch (error) {
      console.error('Error renaming collection:', error);
      throw error;
    }
  }

  // Add or update this function to improve saving with retry logic
  async saveCollectionWithRetry(userId, collectionName, cards, retries = 3, backoff = 1000) {
    try {
      console.log(`Saving collection ${collectionName} with ${cards.length} cards (attempt 1/${retries + 1})`);
      return await this.saveCollection(userId, collectionName, cards);
    } catch (error) {
      if (retries <= 0) {
        console.error(`Failed to save collection ${collectionName} after multiple attempts:`, error);
        throw error;
      }
      
      // Wait with exponential backoff
      const delay = backoff * Math.random();
      console.warn(`Error saving collection ${collectionName}, retrying in ${delay.toFixed(0)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry with exponential backoff
      return this.saveCollectionWithRetry(userId, collectionName, cards, retries - 1, backoff * 2);
    }
  }

  // Add this function to batch save collections to avoid overwhelming the database
  async batchSaveCollections(userId, collections, batchSize = 1) {
    console.log(`Batch saving ${Object.keys(collections).length} collections with batch size ${batchSize}`);
    
    // Filter out invalid collections
    const validCollections = Object.entries(collections)
      .filter(([name, cards]) => name !== 'All Cards' && Array.isArray(cards));
    
    if (validCollections.length === 0) {
      console.warn('No valid collections to save');
      return true;
    }
    
    // Process collections in batches to avoid overwhelming the system
    const results = { success: 0, failed: 0, errors: [] };
    
    // Create batches of collections to save
    for (let i = 0; i < validCollections.length; i += batchSize) {
      const batch = validCollections.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validCollections.length/batchSize)}: ${batch.map(([name]) => name).join(', ')}`);
      
      // Process each collection in the current batch with retry logic
      const promises = batch.map(async ([name, cards]) => {
        try {
          await this.saveCollectionWithRetry(userId, name, cards);
          console.log(`Successfully saved collection: ${name}`);
          results.success++;
          return { name, success: true };
        } catch (error) {
          console.error(`Failed to save collection ${name}:`, error);
          results.failed++;
          results.errors.push({ name, error: error.message });
          return { name, success: false, error };
        }
      });
      
      // Wait for the current batch to complete
      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < validCollections.length) {
        const delay = 1000;
        console.log(`Waiting ${delay}ms before processing next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`Batch save completed: ${results.success} succeeded, ${results.failed} failed`);
    
    // Throw error if any collections failed to save
    if (results.failed > 0) {
      const error = new Error(`Failed to save ${results.failed} of ${results.success + results.failed} collections`);
      error.details = results;
      throw error;
    }
    
    return true;
  }

  // Upload image to Firebase Storage
  async uploadImage(userId, cardId, imageFile) {
    try {
      const imageRef = ref(this.storage, `users/${userId}/cards/${cardId}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      
      // Image was uploaded successfully, remove from missing cache
      this.clearMissingCache();
      
      // Also update in db if possible
      if (localDb.markImageAsSynced) {
        localDb.markImageAsSynced(cardId);
      }
      if (localDb.isImageMissing && localDb.markImageAsMissing) {
        if (localDb.isImageMissing(cardId)) {
          // Remove from missing images list
          localDb.missingImages.delete(cardId);
        }
      }
      
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
  }

  // Check batch of images for sync
  async checkImagesForSync(userId, cardIds) {
    // Return early if no cards to check
    if (!cardIds || cardIds.length === 0) {
      return { missingImages: [], existingImages: [] };
    }
    
    const missingImages = [];
    const existingImages = [];
    
    // Process in batches to avoid flooding Firebase
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < cardIds.length; i += BATCH_SIZE) {
      const batch = cardIds.slice(i, i + BATCH_SIZE);
      
      // Run checks in parallel with a small batch
      await Promise.all(batch.map(async (cardId) => {
        try {
          // First check if image is known missing or in IndexedDB
          if (this.checkImageExists(userId, cardId)) {
            existingImages.push(cardId);
            return;
          }
          
          // Not in local DB, check Firebase
          const exists = await this.checkImageExists(userId, cardId);
          if (exists) {
            existingImages.push(cardId);
          } else {
            missingImages.push(cardId);
          }
        } catch (error) {
          console.error(`Error checking image for card ${cardId}:`, error);
          // Assume missing if there's an error
          missingImages.push(cardId);
        }
      }));
      
      // Small delay between batches
      if (i + BATCH_SIZE < cardIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return { missingImages, existingImages };
  }
}

// Create and export a singleton instance
export const cardService = new CardService(); 