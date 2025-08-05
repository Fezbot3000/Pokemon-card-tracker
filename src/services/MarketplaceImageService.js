/**
 * Marketplace Image Service
 * 
 * Centralized service for handling image processing across all marketplace components.
 * This service eliminates code duplication and provides consistent image handling
 * patterns for marketplace listings, seller profiles, and messaging components.
 */

import logger from '../utils/logger';
import db from '../services/firestore/dbAdapter';

export class MarketplaceImageService {
  /**
   * Convert various image data types to string URLs
   * Handles File objects, blob data, object URLs, and various image properties
   * @param {*} imageData - Image data in various formats
   * @returns {string|null} - String URL or null if conversion fails
   */
  static ensureStringUrl(imageData) {
    if (!imageData) return null;

    // If it's already a string, return it
    if (typeof imageData === 'string') {
      return imageData;
    }

    // If it's a File object with a preview URL
    if (imageData instanceof File && window.URL) {
      return window.URL.createObjectURL(imageData);
    }

    // If it's an object with a URL property, use that
    if (typeof imageData === 'object') {
      // Check for common URL properties
      if (imageData.url) return imageData.url;
      if (imageData.src) return imageData.src;
      if (imageData.uri) return imageData.uri;
      if (imageData.href) return imageData.href;
      if (imageData.downloadURL) return imageData.downloadURL;
      if (imageData.path && typeof imageData.path === 'string')
        return imageData.path;

      // If it has a toString method, try that
      if (typeof imageData.toString === 'function') {
        const stringValue = imageData.toString();
        if (stringValue !== '[object Object]') {
          return stringValue;
        }
      }
    }

    // If it's a Blob with a type
    if (
      imageData instanceof Blob &&
      imageData.type &&
      imageData.type.startsWith('image/')
    ) {
      return window.URL.createObjectURL(imageData);
    }

    // If we can't extract a URL, return null
    return null;
  }

  /**
   * Clean up existing blob URLs to prevent memory leaks
   * @param {Object} cardImages - Object containing card image URLs
   */
  static cleanup(cardImages) {
    if (!cardImages || typeof cardImages !== 'object') return;

    Object.values(cardImages).forEach(url => {
      if (url && typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          logger.warn('Failed to revoke blob URL:', error);
        }
      }
    });
  }

  /**
   * Load card images from listings data with fallback to IndexedDB
   * @param {Array} listingsData - Array of marketplace listings
   * @param {Object} existingImages - Existing card images to clean up
   * @returns {Object} - Object mapping card IDs to image URLs
   */
  static async loadCardImages(listingsData, existingImages = {}) {
    if (!listingsData || listingsData.length === 0) return {};

    // Clean up existing blob URLs before loading new ones
    this.cleanup(existingImages);

    const newCardImages = {};

    // Process each listing
    for (const listing of listingsData) {
      try {
        const card = listing.card;
        if (!card) continue;

        const cardId = card.slabSerial || card.id || listing.cardId;
        if (!cardId) continue;

        // First, check if the card has an imageUrl property
        if (card.imageUrl) {
          const url = this.ensureStringUrl(card.imageUrl);
          if (url) {
            newCardImages[cardId] = url;
            continue;
          }
        }

        // Next, check if the card has an image property
        if (card.image) {
          const imageUrl = this.ensureStringUrl(card.image);
          if (imageUrl) {
            newCardImages[cardId] = imageUrl;
            continue;
          }
        }

        // Check all other possible image properties
        const possibleImageProps = [
          'frontImageUrl',
          'backImageUrl',
          'imageData',
          'cardImageUrl',
        ];
        let foundImage = false;

        for (const prop of possibleImageProps) {
          if (card[prop]) {
            const url = this.ensureStringUrl(card[prop]);
            if (url) {
              newCardImages[cardId] = url;
              foundImage = true;
              break;
            }
          }
        }

        if (foundImage) continue;

        // Check listing-level image properties
        const listingImageProps = ['cloudImageUrl', 'imageURL', 'imageUrl'];
        for (const prop of listingImageProps) {
          if (listing[prop]) {
            const url = this.ensureStringUrl(listing[prop]);
            if (url) {
              newCardImages[cardId] = url;
              foundImage = true;
              break;
            }
          }
        }

        if (foundImage) continue;

        // If no image in card object, try to load from IndexedDB
        try {
          const blobUrl = await db.getCardImage(cardId);
          if (blobUrl) {
            newCardImages[cardId] = blobUrl;
            continue;
          }
        } catch (error) {
          // Silently handle IndexedDB errors
          logger.warn(
            `Error loading image from IndexedDB for card ${cardId}:`,
            error
          );
        }

        // If we still don't have an image, set to null
        newCardImages[cardId] = null;
      } catch (error) {
        logger.warn('Error processing card image:', error);
      }
    }

    return newCardImages;
  }

  /**
   * Get card image from listing data using standardized resolution logic
   * @param {Object} listing - Marketplace listing object
   * @returns {string|null} - Image URL or null
   */
  static getCardImage(listing) {
    if (!listing || !listing.card) return null;

    const card = listing.card;

    // Try multiple image sources in priority order
    const cardImage =
      card.cloudImageUrl ||
      card.imageURL ||
      card.imageUrl ||
      card.img ||
      listing.images?.[0] ||
      null;

    return this.ensureStringUrl(cardImage);
  }

  /**
   * Get all images for a listing (for gallery/carousel display)
   * @param {Object} listing - Marketplace listing object
   * @returns {Array} - Array of image URLs
   */
  static getListingImages(listing) {
    if (!listing) return [];

    const cardImage = this.getCardImage(listing);
    const images = listing.images?.length > 0 ? listing.images : [];

    // If we have a card image but no listing images, use the card image
    if (cardImage && images.length === 0) {
      return [cardImage];
    }

    // If we have listing images, use those
    if (images.length > 0) {
      return images.map(img => this.ensureStringUrl(img)).filter(Boolean);
    }

    return [];
  }
}

export default MarketplaceImageService;