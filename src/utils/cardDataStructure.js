/**
 * Card Data Structure Definitions
 * Defines the structure for card data including multiple image support
 */

import { generateImageId } from './imageUtils';

/**
 * Create an empty card with default values
 * @returns {Object} - Empty card object
 */
export const createEmptyCard = () => ({
  id: null,
  cardName: '',
  player: '',
  set: '',
  setName: '',
  year: '',
  category: 'pokemon',
  condition: '',
  grade: '',
  gradingCompany: '',
  certificationNumber: '',
  slabSerial: '',
  population: '',
  datePurchased: new Date().toISOString().split('T')[0],
  originalInvestmentAmount: '',
  originalInvestmentCurrency: 'AUD',
  originalCurrentValueAmount: '',
  originalCurrentValueCurrency: 'AUD',
  investmentAUD: '',
  currentValueAUD: '',
  quantity: 1,
  collection: 'Default Collection',
  
  // Legacy single image fields (maintained for backward compatibility)
  imageUrl: null,
  hasImage: false,
  
  // New multiple image fields
  images: [],
  imageCount: 0,
  primaryImageId: null,
  primaryImageUrl: null, // Denormalized for quick access
  
  // Metadata
  dateAdded: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: null
});

/**
 * Create image metadata object
 * @param {string} id - Unique image ID
 * @param {string} url - Firebase Storage URL
 * @param {string} filename - Original filename
 * @param {number} size - File size in bytes
 * @param {string} type - MIME type
 * @param {number} order - Display order
 * @param {boolean} isPrimary - Is this the primary image
 * @returns {Object} - Image metadata object
 */
export const createImageMetadata = (id, url, filename, size, type, order = 0, isPrimary = false) => ({
  id,
  url,
  filename,
  size,
  type,
  order,
  isPrimary,
  uploadDate: new Date().toISOString(),
  caption: '' // Optional caption (empty by default)
});

/**
 * Migrate legacy single image to multiple image format
 * @param {Object} card - Card with legacy image structure
 * @returns {Object} - Card with updated multiple image structure
 */
export const migrateLegacyImageToMultiple = (card) => {
  if (!card) return card;
  
  // If already has multiple images, return as-is
  if (card.images && Array.isArray(card.images) && card.images.length > 0) {
    return card;
  }
  
  // If has legacy single image, convert to multiple
  if (card.imageUrl) {
    const imageId = generateImageId();
    const imageMetadata = createImageMetadata(
      imageId,
      card.imageUrl,
      'image.jpg', // Default filename
      0, // Unknown size
      'image/jpeg', // Default type
      0, // First order
      true // Primary image
    );
    
    return {
      ...card,
      images: [imageMetadata],
      imageCount: 1,
      primaryImageId: imageId,
      primaryImageUrl: card.imageUrl,
      hasImage: true
    };
  }
  
  // No images at all
  return {
    ...card,
    images: [],
    imageCount: 0,
    primaryImageId: null,
    primaryImageUrl: null,
    hasImage: false
  };
};

/**
 * Add images to a card
 * @param {Object} card - The card object
 * @param {Object[]} imageMetadataArray - Array of image metadata objects
 * @returns {Object} - Updated card object
 */
export const addImagesToCard = (card, imageMetadataArray) => {
  if (!card || !Array.isArray(imageMetadataArray)) return card;
  
  const existingImages = card.images || [];
  const newImages = [...existingImages, ...imageMetadataArray];
  
  // Update order values
  const orderedImages = newImages.map((img, index) => ({
    ...img,
    order: index,
    isPrimary: index === 0 // First image is primary
  }));
  
  const primaryImage = orderedImages.find(img => img.isPrimary);
  
  return {
    ...card,
    images: orderedImages,
    imageCount: orderedImages.length,
    primaryImageId: primaryImage ? primaryImage.id : null,
    primaryImageUrl: primaryImage ? primaryImage.url : null,
    hasImage: orderedImages.length > 0,
    // Update legacy field for backward compatibility
    imageUrl: primaryImage ? primaryImage.url : null
  };
};

/**
 * Remove an image from a card
 * @param {Object} card - The card object
 * @param {string} imageId - ID of the image to remove
 * @returns {Object} - Updated card object
 */
export const removeImageFromCard = (card, imageId) => {
  if (!card || !card.images) return card;
  
  const filteredImages = card.images.filter(img => img.id !== imageId);
  
  // Update order values and primary status
  const orderedImages = filteredImages.map((img, index) => ({
    ...img,
    order: index,
    isPrimary: index === 0 // First image is primary
  }));
  
  const primaryImage = orderedImages.find(img => img.isPrimary);
  
  return {
    ...card,
    images: orderedImages,
    imageCount: orderedImages.length,
    primaryImageId: primaryImage ? primaryImage.id : null,
    primaryImageUrl: primaryImage ? primaryImage.url : null,
    hasImage: orderedImages.length > 0,
    // Update legacy field for backward compatibility
    imageUrl: primaryImage ? primaryImage.url : null
  };
};

/**
 * Reorder images in a card
 * @param {Object} card - The card object
 * @param {number} fromIndex - Source index
 * @param {number} toIndex - Target index
 * @returns {Object} - Updated card object
 */
export const reorderCardImages = (card, fromIndex, toIndex) => {
  if (!card || !card.images || fromIndex === toIndex) return card;
  
  const result = Array.from(card.images);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  // Update order values and primary status
  const orderedImages = result.map((img, index) => ({
    ...img,
    order: index,
    isPrimary: index === 0 // First image is primary
  }));
  
  const primaryImage = orderedImages.find(img => img.isPrimary);
  
  return {
    ...card,
    images: orderedImages,
    imageCount: orderedImages.length,
    primaryImageId: primaryImage ? primaryImage.id : null,
    primaryImageUrl: primaryImage ? primaryImage.url : null,
    hasImage: orderedImages.length > 0,
    // Update legacy field for backward compatibility
    imageUrl: primaryImage ? primaryImage.url : null
  };
};

/**
 * Get the primary image from a card
 * @param {Object} card - The card object
 * @returns {Object|null} - Primary image metadata or null
 */
export const getPrimaryImage = (card) => {
  if (!card || !card.images || card.images.length === 0) return null;
  
  // Look for explicitly marked primary image
  const primaryImage = card.images.find(img => img.isPrimary);
  if (primaryImage) return primaryImage;
  
  // Fallback to first image
  return card.images[0];
};

/**
 * Get all images from a card
 * @param {Object} card - The card object
 * @returns {Object[]} - Array of image metadata objects
 */
export const getAllImages = (card) => {
  if (!card || !card.images) return [];
  
  return [...card.images].sort((a, b) => a.order - b.order);
};

/**
 * Update image metadata in a card
 * @param {Object} card - The card object
 * @param {string} imageId - ID of the image to update
 * @param {Object} updates - Updates to apply
 * @returns {Object} - Updated card object
 */
export const updateImageInCard = (card, imageId, updates) => {
  if (!card || !card.images) return card;
  
  const updatedImages = card.images.map(img => 
    img.id === imageId ? { ...img, ...updates } : img
  );
  
  const primaryImage = updatedImages.find(img => img.isPrimary);
  
  return {
    ...card,
    images: updatedImages,
    primaryImageId: primaryImage ? primaryImage.id : null,
    primaryImageUrl: primaryImage ? primaryImage.url : null,
    // Update legacy field for backward compatibility
    imageUrl: primaryImage ? primaryImage.url : null
  };
};

/**
 * Validate card data structure
 * @param {Object} card - The card object to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validateCardStructure = (card) => {
  const errors = [];
  
  if (!card) {
    errors.push('Card object is required');
    return { isValid: false, errors };
  }
  
  // Check required fields
  if (!card.cardName || typeof card.cardName !== 'string') {
    errors.push('Card name is required and must be a string');
  }
  
  if (!card.collection || typeof card.collection !== 'string') {
    errors.push('Collection is required and must be a string');
  }
  
  // Validate images array
  if (card.images && !Array.isArray(card.images)) {
    errors.push('Images must be an array');
  }
  
  if (card.images && card.images.length > 5) {
    errors.push('Maximum 5 images allowed per card');
  }
  
  // Validate image count consistency
  if (card.images && card.imageCount !== card.images.length) {
    errors.push('Image count does not match images array length');
  }
  
  // Validate primary image consistency
  if (card.images && card.images.length > 0 && card.primaryImageId) {
    const primaryImage = card.images.find(img => img.id === card.primaryImageId);
    if (!primaryImage) {
      errors.push('Primary image ID does not match any image in the array');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Clean up card data for Firestore storage
 * @param {Object} card - The card object to clean
 * @returns {Object} - Cleaned card object
 */
export const cleanCardForFirestore = (card) => {
  if (!card) return card;
  
  // Remove any undefined values
  const cleaned = {};
  
  Object.keys(card).forEach(key => {
    if (card[key] !== undefined) {
      cleaned[key] = card[key];
    }
  });
  
  // Ensure numeric fields are properly formatted
  if (cleaned.year) cleaned.year = parseInt(cleaned.year, 10) || null;
  if (cleaned.quantity) cleaned.quantity = parseInt(cleaned.quantity, 10) || 1;
  if (cleaned.investmentAUD) cleaned.investmentAUD = parseFloat(cleaned.investmentAUD) || 0;
  if (cleaned.currentValueAUD) cleaned.currentValueAUD = parseFloat(cleaned.currentValueAUD) || 0;
  if (cleaned.originalInvestmentAmount) cleaned.originalInvestmentAmount = parseFloat(cleaned.originalInvestmentAmount) || 0;
  if (cleaned.originalCurrentValueAmount) cleaned.originalCurrentValueAmount = parseFloat(cleaned.originalCurrentValueAmount) || 0;
  
  // Ensure boolean fields are properly formatted
  cleaned.hasImage = Boolean(cleaned.hasImage);
  
  // Ensure string fields are properly formatted
  if (cleaned.cardName) cleaned.cardName = String(cleaned.cardName).trim();
  if (cleaned.collection) cleaned.collection = String(cleaned.collection).trim();
  
  return cleaned;
}; 