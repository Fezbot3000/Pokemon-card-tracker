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
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
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
          // Ensure cards is always an array
          const normalizedCards = Array.isArray(collectionCards) ? collectionCards : [];
          
          // Save each collection to Firestore
          try {
            const collectionRef = doc(this.firestore, `users/${userId}/collections/${name}`);
            await setDoc(collectionRef, { cards: normalizedCards });
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
        // Ensure cards is always an array
        const normalizedCards = Array.isArray(cards) ? cards : [];
        
        // Save to Firestore
        try {
          const collectionRef = doc(this.firestore, `users/${userId}/collections/${collectionName}`);
          await setDoc(collectionRef, { cards: normalizedCards });
        } catch (error) {
          console.error(`Error saving collection ${collectionName} to Firestore:`, error);
          throw error;
        }

        // Save to IndexedDB
        try {
          const collections = await this.localDb.getCollections();
          collections[collectionName] = normalizedCards;
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

  // Improved uploadImageToStorage method with better error handling
  async uploadImageToStorage(userId, serialNumber, imageBlob) {
    if (!userId || !serialNumber || !imageBlob) {
      throw new Error('Missing required parameters for image upload');
    }

    // Implement a retry mechanism with exponential backoff
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        console.log(`Uploading image ${serialNumber} to Firebase Storage (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Get a fresh reference to the storage
        const storage = getStorage();
        
        // Create a reference to the file path using the correct path structure
        const imageRef = ref(storage, `users/${userId}/images/${serialNumber}`);
        
        // Upload the file with metadata
        const metadata = {
          contentType: imageBlob.type || 'image/jpeg',
          customMetadata: {
            serialNumber,
            uploadedAt: new Date().toISOString(),
            userId // Add userId to metadata for verification
          }
        };

        // First check if we can write to this location
        try {
          // Perform a small test upload to verify permissions
          const testBlob = new Blob(['test'], { type: 'text/plain' });
          await uploadBytes(imageRef, testBlob);
          // Clean up test upload
          const testRef = ref(storage, `users/${userId}/images/${serialNumber}_test`);
          await deleteObject(testRef).catch(() => {}); // Ignore cleanup errors
        } catch (error) {
          if (error.code === 'storage/unauthorized') {
            throw new Error(`Unauthorized: Please check if you're properly authenticated and have permission to upload to this location.`);
          }
          // If it's not a permissions error, continue with the main upload
        }

        // Perform the actual upload with progress monitoring
        const uploadTask = uploadBytesResumable(imageRef, imageBlob, metadata);
        
        // Return a promise that resolves when the upload is complete
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              // Track upload progress if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload progress for ${serialNumber}: ${progress.toFixed(1)}%`);
            },
            (error) => {
              console.error(`Error uploading ${serialNumber}:`, error);
              
              // Handle specific error cases
              switch (error.code) {
                case 'storage/unauthorized':
                  reject(new Error('You do not have permission to upload this image.'));
                  break;
                case 'storage/canceled':
                  reject(new Error('Upload was canceled.'));
                  break;
                case 'storage/unknown':
                  reject(new Error('An unknown error occurred during upload.'));
                  break;
                default:
                  reject(error);
              }
            },
            async () => {
              try {
                // Get the download URL
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                console.log(`Upload completed for ${serialNumber}`);
                resolve(downloadURL);
              } catch (urlError) {
                console.error(`Error getting download URL for ${serialNumber}:`, urlError);
                reject(urlError);
              }
            }
          );
        });

      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        lastError = error;
        
        // If it's a permissions error, don't retry
        if (error.code === 'storage/unauthorized' || error.message.includes('Unauthorized')) {
          throw error;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait before retrying, with exponential backoff
          await this.delay(1000 * Math.pow(2, retryCount));
        }
      }
    }
    
    throw lastError || new Error('Failed to upload image after multiple attempts');
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

  // Get image from IndexedDB or Firebase Storage
  async getImage(userId, cardId) {
    try {
      // Try IndexedDB first for offline/cached access
      const localImage = await this.localDb.getImage(cardId);
      if (localImage) {
        return localImage;
      }

      // If not in IndexedDB, load directly from Firebase Storage
      try {
        // Get the download URL 
        const storageRef = ref(this.storage, `users/${userId}/images/${cardId}.jpg`);
        const url = await getDownloadURL(storageRef);
        
        // Simple direct fetch - should work with public read rules
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Cache in IndexedDB for future
        if (blob.size > 0) {
          await this.localDb.saveImage(cardId, blob).catch(e => 
            console.log('Non-critical IndexedDB save error:', e));
          return blob;
        } else {
          throw new Error('Empty image');
        }
      } catch (error) {
        console.log('Error loading image, using placeholder:', error);
        return this.createPlaceholderImage();
      }
    } catch (error) {
      console.error('Error in getImage:', error);
      return this.createPlaceholderImage();
    }
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
    let lastError = null;
    
    // Ensure cards is always an array before attempting any saves
    const normalizedCards = Array.isArray(cards) ? cards : [];
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Saving collection ${collectionName} (attempt ${attempt + 1}/${retries})`);
        
        // Save to Firestore
        const collectionRef = doc(this.firestore, `users/${userId}/collections/${collectionName}`);
        await setDoc(collectionRef, { cards: normalizedCards });
        
        console.log(`Successfully saved collection ${collectionName}`);
        return true;
      } catch (error) {
        console.error(`Error saving collection ${collectionName} (attempt ${attempt + 1}/${retries}):`, error);
        lastError = error;
        
        if (attempt < retries - 1) {
          const delay = backoff * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    // If we've reached here, all attempts failed
    throw lastError || new Error(`Failed to save collection ${collectionName} after ${retries} attempts`);
  }

  // Add this function to batch save collections to avoid overwhelming the database
  async batchSaveCollections(userId, collections, batchSize = 1) {
    if (!collections || typeof collections !== 'object') {
      throw new Error('Collections must be an object');
    }
    
    // Normalize all collections to ensure they have valid cards arrays
    const normalizedCollections = {};
    for (const [name, cards] of Object.entries(collections)) {
      if (name === 'All Cards') continue; // Skip virtual collections
      normalizedCollections[name] = Array.isArray(cards) ? cards : [];
    }
    
    const keys = Object.keys(normalizedCollections);
    const results = [];
    
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (name) => {
          try {
            return await this.saveCollectionWithRetry(userId, name, normalizedCollections[name]);
          } catch (error) {
            console.error(`Failed to save collection ${name} in batch:`, error);
            return { name, success: false, error };
          }
        })
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Create and export a singleton instance
export const cardService = new CardService(); 