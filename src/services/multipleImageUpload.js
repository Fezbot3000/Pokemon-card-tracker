/**
 * Multiple Image Upload Service
 * Handles uploading multiple compressed images to Firebase Storage
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../services/firebase';
import { 
  validateMultipleImages, 
  compressMultipleImages, 
  generateImageId,
  cleanupPreviews 
} from '../utils/imageUtils';
import { createImageMetadata } from '../utils/cardDataStructure';
import logger from '../services/LoggingService';

/**
 * Upload multiple images to Firebase Storage for a card
 * @param {File[]} files - Array of image files to upload
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object[]>} - Array of uploaded image metadata
 */
export const uploadMultipleImages = async (files, userId, cardId, onProgress = null) => {
  if (!files || files.length === 0) {
    return [];
  }

  if (!userId || !cardId) {
    throw new Error('User ID and Card ID are required for image upload');
  }

  logger.debug(`Starting multiple image upload for user ${userId}, card ${cardId}`);

  try {
    // Validate files
    const validation = validateMultipleImages(files);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Compress images
    const compressedFiles = await compressMultipleImages(
      validation.validFiles,
      (progress) => {
        if (onProgress) {
          onProgress(progress * 0.5); // Compression is 50% of total progress
        }
      }
    );

    // Upload images to Firebase Storage
    const uploadPromises = compressedFiles.map(async (file, index) => {
      const imageId = generateImageId();
      const filename = `${imageId}.jpg`; // Standardize to .jpg
      const storagePath = `users/${userId}/cards/${cardId}/${filename}`;
      
      try {
        // Create storage reference
        const storageRef = ref(storage, storagePath);
        
        // Upload file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Create image metadata
        const imageMetadata = createImageMetadata(
          imageId,
          downloadURL,
          file.name, // Original filename
          file.size,
          file.type,
          index, // Order
          index === 0 // First image is primary
        );
        
        logger.debug(`Image ${index + 1} uploaded successfully: ${imageId}`);
        
        return imageMetadata;
      } catch (error) {
        logger.error(`Error uploading image ${index + 1}:`, error);
        throw error;
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    
    if (onProgress) {
      onProgress(1.0); // 100% complete
    }

    logger.debug(`Successfully uploaded ${results.length} images for card ${cardId}`);
    return results;

  } catch (error) {
    logger.error('Error in multiple image upload:', error);
    throw error;
  }
};

/**
 * Upload a single image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string} imageId - Image ID (optional, will generate if not provided)
 * @returns {Promise<Object>} - Uploaded image metadata
 */
export const uploadSingleImage = async (file, userId, cardId, imageId = null) => {
  if (!file) {
    throw new Error('File is required for image upload');
  }

  if (!userId || !cardId) {
    throw new Error('User ID and Card ID are required for image upload');
  }

  logger.debug(`Starting single image upload for user ${userId}, card ${cardId}`);

  try {
    // Use the multiple image upload function for consistency
    const results = await uploadMultipleImages([file], userId, cardId);
    
    if (results.length === 0) {
      throw new Error('No images were uploaded');
    }

    return results[0];

  } catch (error) {
    logger.error('Error in single image upload:', error);
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string} imageId - Image ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteImage = async (userId, cardId, imageId) => {
  if (!userId || !cardId || !imageId) {
    throw new Error('User ID, Card ID, and Image ID are required for deletion');
  }

  try {
    const filename = `${imageId}.jpg`;
    const storagePath = `users/${userId}/cards/${cardId}/${filename}`;
    const storageRef = ref(storage, storagePath);
    
    await deleteObject(storageRef);
    
    logger.debug(`Image deleted successfully: ${imageId}`);
    return true;

  } catch (error) {
    // If image doesn't exist, consider it a success
    if (error.code === 'storage/object-not-found') {
      logger.debug(`Image ${imageId} not found, considering deletion successful`);
      return true;
    }
    
    logger.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Delete multiple images from Firebase Storage
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string[]} imageIds - Array of image IDs to delete
 * @returns {Promise<Object>} - { successful: string[], failed: string[] }
 */
export const deleteMultipleImages = async (userId, cardId, imageIds) => {
  if (!userId || !cardId || !Array.isArray(imageIds)) {
    throw new Error('User ID, Card ID, and Image IDs array are required for deletion');
  }

  const results = {
    successful: [],
    failed: []
  };

  for (const imageId of imageIds) {
    try {
      await deleteImage(userId, cardId, imageId);
      results.successful.push(imageId);
    } catch (error) {
      logger.error(`Failed to delete image ${imageId}:`, error);
      results.failed.push(imageId);
    }
  }

  return results;
};

/**
 * Replace all images for a card (delete old ones, upload new ones)
 * @param {File[]} newFiles - New image files to upload
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string[]} oldImageIds - IDs of old images to delete
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object[]>} - Array of new image metadata
 */
export const replaceAllImages = async (newFiles, userId, cardId, oldImageIds = [], onProgress = null) => {
  if (!userId || !cardId) {
    throw new Error('User ID and Card ID are required for image replacement');
  }

  logger.debug(`Replacing images for card ${cardId}: ${oldImageIds.length} old, ${newFiles.length} new`);

  try {
    // Delete old images if any exist
    if (oldImageIds.length > 0) {
      await deleteMultipleImages(userId, cardId, oldImageIds);
      logger.debug(`Deleted ${oldImageIds.length} old images`);
    }

    // Upload new images
    const newImageMetadata = await uploadMultipleImages(newFiles, userId, cardId, onProgress);
    
    logger.debug(`Successfully replaced images for card ${cardId}`);
    return newImageMetadata;

  } catch (error) {
    logger.error('Error replacing images:', error);
    throw error;
  }
};

/**
 * Add new images to existing card images
 * @param {File[]} newFiles - New image files to upload
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {Object[]} existingImages - Existing image metadata
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object[]>} - Array of all image metadata (existing + new)
 */
export const addImagesToCard = async (newFiles, userId, cardId, existingImages = [], onProgress = null) => {
  if (!userId || !cardId) {
    throw new Error('User ID and Card ID are required for adding images');
  }

  // Check if adding new images would exceed the limit
  const totalImages = existingImages.length + newFiles.length;
  if (totalImages > 5) {
    throw new Error(`Cannot add ${newFiles.length} images. Maximum 5 images allowed per card (currently has ${existingImages.length})`);
  }

  logger.debug(`Adding ${newFiles.length} images to card ${cardId} (currently has ${existingImages.length})`);

  try {
    // Upload new images with correct order
    const newImageMetadata = await uploadMultipleImages(newFiles, userId, cardId, onProgress);
    
    // Update order values for new images
    const startOrder = existingImages.length;
    const updatedNewImages = newImageMetadata.map((img, index) => ({
      ...img,
      order: startOrder + index,
      isPrimary: existingImages.length === 0 && index === 0 // Only primary if no existing images
    }));
    
    // Combine existing and new images
    const allImages = [...existingImages, ...updatedNewImages];
    
    logger.debug(`Successfully added ${newFiles.length} images to card ${cardId}`);
    return allImages;

  } catch (error) {
    logger.error('Error adding images to card:', error);
    throw error;
  }
};

/**
 * Get storage path for a card's image
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string} imageId - Image ID
 * @returns {string} - Storage path
 */
export const getImageStoragePath = (userId, cardId, imageId) => {
  const filename = `${imageId}.jpg`;
  return `users/${userId}/cards/${cardId}/${filename}`;
};

/**
 * Check if image exists in Firebase Storage
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string} imageId - Image ID
 * @returns {Promise<boolean>} - Whether image exists
 */
export const imageExists = async (userId, cardId, imageId) => {
  try {
    const storagePath = getImageStoragePath(userId, cardId, imageId);
    const storageRef = ref(storage, storagePath);
    
    // Try to get download URL - if it succeeds, image exists
    await getDownloadURL(storageRef);
    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return false;
    }
    throw error;
  }
};

/**
 * Get download URL for an image
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {string} imageId - Image ID
 * @returns {Promise<string>} - Download URL
 */
export const getImageDownloadURL = async (userId, cardId, imageId) => {
  try {
    const storagePath = getImageStoragePath(userId, cardId, imageId);
    const storageRef = ref(storage, storagePath);
    
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    logger.error(`Error getting download URL for image ${imageId}:`, error);
    throw error;
  }
}; 