/**
 * Image utilities for handling multiple card images
 * Includes validation, compression, and file management
 */

import logger from '../services/LoggingService';

// Constants
export const MAX_IMAGES_PER_CARD = 5;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
export const ALLOWED_FORMATS = ['image/jpeg', 'image/png'];
export const COMPRESSION_QUALITY = 0.8; // 80% quality for compression

/**
 * Validate a single image file
 * @param {File} file - The image file to validate
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file type
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Only JPEG and PNG files are allowed' 
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return { 
      isValid: false, 
      error: `File size must be less than ${maxSizeMB}MB` 
    };
  }

  return { isValid: true };
};

/**
 * Validate multiple image files
 * @param {FileList|File[]} files - The image files to validate
 * @returns {Object} - { isValid: boolean, validFiles: File[], errors: string[] }
 */
export const validateMultipleImages = (files) => {
  const fileArray = Array.from(files);
  const validFiles = [];
  const errors = [];

  // Check total count
  if (fileArray.length > MAX_IMAGES_PER_CARD) {
    errors.push(`Maximum ${MAX_IMAGES_PER_CARD} images allowed per card`);
    return { isValid: false, validFiles: [], errors };
  }

  // Validate each file
  fileArray.forEach((file, index) => {
    const validation = validateImageFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`File ${index + 1}: ${validation.error}`);
    }
  });

  return {
    isValid: validFiles.length > 0 && errors.length === 0,
    validFiles,
    errors
  };
};

/**
 * Compress an image file while maintaining quality
 * @param {File} file - The image file to compress
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<File>} - The compressed image file
 */
export const compressImage = (file, quality = COMPRESSION_QUALITY) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate dimensions (maintain aspect ratio)
        const maxWidth = 2048;
        const maxHeight = 2048;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File object with the compressed blob
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files to compress
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<File[]>} - Array of compressed image files
 */
export const compressMultipleImages = async (files, onProgress = null) => {
  const compressedFiles = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    try {
      const compressedFile = await compressImage(files[i]);
      compressedFiles.push(compressedFile);
      
      if (onProgress) {
        onProgress((i + 1) / total);
      }
    } catch (error) {
      logger.error(`Error compressing image ${i + 1}:`, error);
      // On compression error, use original file
      compressedFiles.push(files[i]);
    }
  }

  return compressedFiles;
};

/**
 * Generate a unique ID for an image
 * @returns {string} - Unique image ID
 */
export const generateImageId = () => {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create image metadata object
 * @param {File} file - The image file
 * @param {number} order - Display order
 * @param {boolean} isPrimary - Is this the primary image
 * @returns {Object} - Image metadata object
 */
export const createImageMetadata = (file, order = 0, isPrimary = false) => {
  return {
    id: generateImageId(),
    filename: file.name,
    size: file.size,
    type: file.type,
    order,
    isPrimary,
    uploadDate: new Date().toISOString(),
    url: null // Will be set after upload
  };
};

/**
 * Convert files to preview URLs for display
 * @param {File[]} files - Array of image files
 * @returns {Promise<Object[]>} - Array of preview objects
 */
export const createImagePreviews = async (files) => {
  const previews = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const previewUrl = URL.createObjectURL(file);
    
    previews.push({
      id: generateImageId(),
      file,
      previewUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      order: i,
      isPrimary: i === 0 // First image is primary
    });
  }
  
  return previews;
};

/**
 * Clean up preview URLs to prevent memory leaks
 * @param {Object[]} previews - Array of preview objects
 */
export const cleanupPreviews = (previews) => {
  previews.forEach(preview => {
    if (preview.previewUrl && preview.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(preview.previewUrl);
      } catch (error) {
        logger.warn('Failed to revoke preview URL:', error);
      }
    }
  });
};

/**
 * Reorder images by drag and drop
 * @param {Object[]} images - Array of image objects
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 * @returns {Object[]} - Reordered array
 */
export const reorderImages = (images, fromIndex, toIndex) => {
  const result = Array.from(images);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  // Update order values and primary status
  return result.map((image, index) => ({
    ...image,
    order: index,
    isPrimary: index === 0 // First image is always primary
  }));
};

/**
 * Get the primary image from an array of images
 * @param {Object[]} images - Array of image objects
 * @returns {Object|null} - Primary image or null
 */
export const getPrimaryImage = (images) => {
  if (!images || images.length === 0) return null;
  
  // Look for explicitly marked primary image
  const primaryImage = images.find(img => img.isPrimary);
  if (primaryImage) return primaryImage;
  
  // Fallback to first image
  return images[0];
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 