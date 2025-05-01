import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import logger from '../utils/logger';

/**
 * Upload an image to Firebase Storage
 * @param {Blob|File} imageBlob - The image blob to upload
 * @param {string} userId - The user ID to associate with the image
 * @param {string} cardId - The card ID to associate with the image
 * @param {Object} options - Additional options
 * @param {Function} options.onProgress - Optional progress callback
 * @param {boolean} options.isReplacement - Whether this is replacing an existing image
 * @returns {Promise<string>} - The download URL for the uploaded image
 */
export const saveImageToCloud = async (imageBlob, userId, cardId, options = {}) => {
  if (!imageBlob || !(imageBlob instanceof Blob || imageBlob instanceof File)) {
    logger.warn('Invalid image blob provided to saveImageToCloud');
    throw new Error('Invalid image blob provided');
  }

  if (!userId || !cardId) {
    logger.warn('Invalid userId or cardId provided to saveImageToCloud');
    throw new Error('Invalid userId or cardId provided');
  }

  try {
    // Create a reference to the image location in Firebase Storage
    const imagePath = `images/${userId}/${cardId}.jpeg`;
    logger.debug(`Uploading image to path: ${imagePath}`);
    
    // Create a storage reference
    const storageRef = ref(storage, imagePath);
    
    // Set metadata to force cache refresh
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        updateTimestamp: new Date().toISOString(),
        cardId: cardId
      }
    };
    
    // Upload the image directly
    logger.debug(`Uploading image directly to Firebase Storage: ${imagePath}`);
    const snapshot = await uploadBytes(storageRef, imageBlob, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    logger.debug(`Direct upload succeeded with URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    logger.error(`Error uploading image to Firebase Storage:`, error);
    throw error;
  }
};

/**
 * Get the expected image path for a card
 * This helps with caching and prefetching
 * @param {string} userId - The user ID
 * @param {string} cardId - The card ID
 * @returns {string} - The storage path for the image
 */
export const getImagePath = (userId, cardId) => {
  return `images/${userId}/${cardId}.jpeg`;
};
