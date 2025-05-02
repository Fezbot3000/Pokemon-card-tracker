import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import logger from '../utils/logger';

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
  // Get the storage bucket from the environment
  const storageBucket = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '';
  
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
 * Upload an image to Firebase Storage with direct URL construction
 * This is a workaround for CORS issues with Firebase Storage
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
    
    // Use a direct fetch approach if the standard method fails
    let uploadSuccessful = false;
    let downloadURL = '';
    
    try {
      // Try the standard Firebase SDK approach first
      const snapshot = await uploadBytes(storageRef, imageBlob, metadata);
      downloadURL = await getDownloadURL(snapshot.ref);
      uploadSuccessful = true;
    } catch (uploadError) {
      logger.warn('Standard upload failed, trying direct approach:', uploadError);
      
      // If that fails, we'll try a direct fetch approach
      uploadSuccessful = false;
    }
    
    // If the standard approach failed, try a direct fetch
    if (!uploadSuccessful) {
      // This is a fallback approach using direct fetch to the correct URL
      const formData = new FormData();
      formData.append('file', imageBlob);
      
      // Construct the correct URL directly
      const bucketName = 'mycardtracker-c8479.firebasestorage.app';
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodeURIComponent(imagePath)}`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Direct upload failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(imagePath)}?alt=media&token=${data.downloadTokens}`;
    }
    
    // Fix the URL if needed
    downloadURL = fixStorageUrl(downloadURL);
    
    logger.debug(`Upload succeeded with URL: ${downloadURL}`);
    return downloadURL;
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
