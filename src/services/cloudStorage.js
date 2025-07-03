import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import logger from '../utils/logger';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseConfig } from '../config/secrets';

/**
 * Fix Firebase Storage URL to use the correct domain
 * @param {string} url - The original URL
 * @returns {string} - The fixed URL
 */
function fixStorageUrl(url) {
  if (!url) return url;
  
  try {
    // Check if this is a Firebase Storage URL with any of the old domains
    if (url.includes('appspot.com') || url.includes('firebaseapp.com')) {
      // Replace the old domains with the new one
      let fixedUrl = url;
      fixedUrl = fixedUrl.replace('mycardtracker-c8479.appspot.com', 'mycardtracker-c8479.firebasestorage.app');
      fixedUrl = fixedUrl.replace('mycardtracker-c8479.firebaseapp.com', 'mycardtracker-c8479.firebasestorage.app');
      
      logger.debug(`Fixed Storage URL: ${url.substring(0, 30)}... -> ${fixedUrl.substring(0, 30)}...`);
      return fixedUrl;
    }
    
    return url;
  } catch (error) {
    logger.error('Error fixing Storage URL:', error);
    return url; // Return the original URL in case of error
  }
}

/**
 * Get the correct Firebase Storage bucket name
 * This handles the transition from .appspot.com to .firebasestorage.app
 * @returns {string} The correct storage bucket name
 */
function getCorrectBucketName() {
  // Get the storage bucket from the Firebase config
  const firebaseConfig = getFirebaseConfig();
  const storageBucket = firebaseConfig.storageBucket;
  
  // If it's already using the new format, return it
  if (storageBucket.includes('.firebasestorage.app')) {
    return storageBucket;
  }
  
  // If it's using the old format, convert it
  if (storageBucket.includes('.appspot.com')) {
    const projectId = storageBucket.split('.')[0];
    return `${projectId}.firebasestorage.app`;
  }
  
  // Return whatever we have
  return storageBucket;
}

/**
 * Upload an image to Firebase Storage using Cloud Functions
 * This approach avoids CORS issues by using server-side uploads
 * @param {Blob|File} imageBlob - The image blob to upload
 * @param {string} userId - The user ID to associate with the image
 * @param {string} cardId - The card ID to associate with the image
 * @param {Object} options - Additional options
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
    logger.debug(`Starting image upload for user ${userId}, card ${cardId}`);
    
    // Always treat this as a replacement to force deletion of the old image
    const isReplacement = true;
    
    // Convert the image blob to base64
    const reader = new FileReader();
    
    // Create a promise to handle the FileReader async operation
    const base64Promise = new Promise((resolve, reject) => {
      reader.onload = () => {
        try {
          // Get the base64 string from the result
          const base64String = reader.result;
          // Extract just the base64 data part (remove the data:image/jpeg;base64, prefix)
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
    });
    
    // Start reading the blob as a data URL
    reader.readAsDataURL(imageBlob);
    
    // Wait for the base64 conversion to complete
    const base64Data = await base64Promise;
    
    // Get a reference to Firebase Functions
    const functions = getFunctions();
    
    // First, try to delete the existing image if it exists
    try {
      const deleteCardImageFn = httpsCallable(functions, 'deleteCardImage');
      await deleteCardImageFn({
        userId,
        cardId
      });
      logger.debug(`Successfully requested deletion of existing image for card ${cardId}`);
    } catch (deleteError) {
      // Don't fail if deletion fails, just log it
      logger.warn(`Failed to delete existing image for card ${cardId}:`, deleteError);
    }
    
    // Get a reference to the storeCardImage function
    const storeCardImageFn = httpsCallable(functions, 'storeCardImage');
    
    // Call the Cloud Function to store the image
    logger.debug('Calling storeCardImage Cloud Function');
    const result = await storeCardImageFn({
      userId,
      cardId,
      imageBase64: base64Data,
      isReplacement: isReplacement // Always force replacement
    });
    
    // Get the download URL from the result
    const downloadURL = result.data.downloadUrl;
    
    if (!downloadURL) {
      throw new Error('No download URL returned from Cloud Function');
    }
    
    // Fix the URL if needed
    const fixedUrl = fixStorageUrl(downloadURL);
    
    // Add a cache-busting parameter to the URL to force refresh
    const cacheBustUrl = `${fixedUrl}?t=${Date.now()}`;
    
    logger.debug(`Image upload successful, URL: ${cacheBustUrl.substring(0, 30)}...`);
    return cacheBustUrl;
  } catch (error) {
    logger.error('Error uploading image to Firebase Storage:', error);
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
