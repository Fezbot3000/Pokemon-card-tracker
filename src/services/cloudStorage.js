import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import logger from '../utils/logger';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Upload an image to Firebase Storage
 * @param {Blob|File} imageBlob - The image blob to upload
 * @param {string} userId - The user ID to associate with the image
 * @param {string} cardId - The card ID to associate with the image
 * @param {Object} options - Additional options
 * @param {Function} options.onProgress - Optional progress callback
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
    
    // Skip direct uploads to Firebase Storage and use Cloud Function immediately
    // Convert blob to base64 for the function call
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageBlob);
      reader.onloadend = async () => {
        try {
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = reader.result.split(',')[1];
          
          // Call the Cloud Function
          const functions = getFunctions();
          const storeCardImageFn = httpsCallable(functions, 'storeCardImage');
          
          logger.debug(`Calling storeCardImage Cloud Function for card ${cardId}`);
          const result = await storeCardImageFn({ 
            imageBase64: base64Data, 
            cardId 
          });
          
          if (result.data.success) {
            logger.debug(`Cloud Function image upload succeeded with URL: ${result.data.downloadUrl}`);
            resolve(result.data.downloadUrl);
          } else {
            throw new Error('Cloud Function failed to upload image');
          }
        } catch (fnError) {
          logger.error('Error in Cloud Function image upload:', fnError);
          reject(fnError);
        }
      };
      reader.onerror = (error) => reject(error);
    });
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
