/**
 * Database Adapter
 *
 * This adapter provides a compatibility layer between the old db.js API
 * and the new Firestore service. It allows gradual migration by maintaining
 * the same API surface while using Firestore directly.
 */

import firestoreService from './firestoreService';
import logger from '../../utils/logger';
import { storage } from '../firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

class DatabaseAdapter {
  constructor() {
    this.db = null; // Compatibility property
    this.dbPromise = Promise.resolve(); // Compatibility property
  }

  // ===== COMPATIBILITY METHODS =====

  async ensureDB() {
    // No-op - Firestore is always ready
    return Promise.resolve();
  }

  async initDatabase() {
    // No-op - Firestore initializes automatically
    return Promise.resolve();
  }

  getCurrentUserId() {
    return firestoreService.getCurrentUserId();
  }

  // ===== COLLECTIONS METHODS =====

  async getCollections() {
    try {
      const collections = await firestoreService.getCollections();
      // Convert to old format if needed
      return collections;
    } catch (error) {
      logger.error('Error in getCollections adapter:', error);
      return {};
    }
  }

  async saveCollections(collections = {}, preserveSold = true) {
    try {
      // Save each collection
      for (const [name, collection] of Object.entries(collections)) {
        if (name === 'sold' && !preserveSold) continue;

        const data = Array.isArray(collection)
          ? collection
          : collection.data || [];
        await firestoreService.saveCollection(name, data);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in saveCollections adapter:', error);
      return { success: false, error };
    }
  }

  async saveCollection(collectionName, data) {
    try {
      await firestoreService.saveCollection(collectionName, data);
      return { success: true };
    } catch (error) {
      logger.error('Error in saveCollection adapter:', error);
      return { success: false, error };
    }
  }

  async deleteCollection(collectionName) {
    try {
      await firestoreService.deleteCollection(collectionName);
      return { success: true };
    } catch (error) {
      logger.error('Error in deleteCollection adapter:', error);
      return { success: false, error };
    }
  }

  // ===== CARDS METHODS =====

  async getCards(collectionName) {
    try {
      return await firestoreService.getCards(collectionName);
    } catch (error) {
      logger.error('Error in getCards adapter:', error);
      return [];
    }
  }

  async saveCard(card, collectionName) {
    try {
      await firestoreService.saveCard(collectionName, card);
      return { success: true };
    } catch (error) {
      logger.error('Error in saveCard adapter:', error);
      return { success: false, error };
    }
  }

  async addCard(cardData, imageFile, targetCollection) {
    try {
      // Generate a unique ID for the card if it doesn't have one
      if (!cardData.id) {
        cardData.id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Set slabSerial if not already set (use certificationNumber or generate one)
      if (!cardData.slabSerial) {
        cardData.slabSerial = cardData.certificationNumber || cardData.id;
      }

      // Add timestamp
      cardData.addedAt = new Date().toISOString();

      // Add the collection field to the card data
      cardData.collection = targetCollection;
      cardData.collectionId = targetCollection;

      // Handle image upload if provided
      if (imageFile) {
        try {
          const userId = this.getCurrentUserId();
          if (!userId) {
            throw new Error('No user ID available for image upload');
          }

          // Create a reference to the storage location using slabSerial
          const storageRef = ref(
            storage,
            `users/${userId}/cards/${cardData.slabSerial}`
          );

          // Upload the image
          const snapshot = await uploadBytes(storageRef, imageFile);

          // Get the download URL
          const imageUrl = await getDownloadURL(snapshot.ref);

          // Add the image URL to the card data
          cardData.imageUrl = imageUrl;

          logger.debug(
            `Image uploaded successfully for card ${cardData.slabSerial}`
          );
        } catch (imageError) {
          logger.error('Error uploading image:', imageError);
          // Don't fail the entire operation if image upload fails
          // but log the error
        }
      }

      // Save the card to the collection
      await firestoreService.saveCard(targetCollection, cardData);

      return cardData;
    } catch (error) {
      logger.error('Error in addCard adapter:', error);
      throw error;
    }
  }

  async deleteCard(cardId, collectionName) {
    try {
      await firestoreService.deleteCard(collectionName, cardId);
      return { success: true };
    } catch (error) {
      logger.error('Error in deleteCard adapter:', error);
      return { success: false, error };
    }
  }

  // ===== SOLD ITEMS METHODS =====

  async getSoldCards() {
    try {
      const soldItems = await firestoreService.getSoldItems();
      // Return in old format (wrapped in data property)
      return { data: soldItems };
    } catch (error) {
      logger.error('Error in getSoldCards adapter:', error);
      return { data: [] };
    }
  }

  async saveSoldCards(soldCards) {
    try {
      // Handle both array and object formats
      const cardsArray = Array.isArray(soldCards)
        ? soldCards
        : soldCards.data || [];

      // Save each sold card
      for (const card of cardsArray) {
        await firestoreService.saveSoldItem(card);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in saveSoldCards adapter:', error);
      return { success: false, error };
    }
  }

  async deleteSoldItemsByIds(cardIds) {
    try {
      await firestoreService.deleteSoldItems(cardIds);
      return { success: true };
    } catch (error) {
      logger.error('Error in deleteSoldItemsByIds adapter:', error);
      return { success: false, error };
    }
  }

  // ===== PROFILE METHODS =====

  async getProfile() {
    try {
      return await firestoreService.getProfile();
    } catch (error) {
      logger.error('Error in getProfile adapter:', error);
      return null;
    }
  }

  async saveProfile(profileData) {
    try {
      await firestoreService.saveProfile(profileData);
      return { success: true };
    } catch (error) {
      logger.error('Error in saveProfile adapter:', error);
      return { success: false, error };
    }
  }

  // ===== PURCHASE INVOICES METHODS =====

  async getPurchaseInvoices() {
    try {
      return await firestoreService.getPurchaseInvoices();
    } catch (error) {
      logger.error('Error in getPurchaseInvoices adapter:', error);
      return [];
    }
  }

  async savePurchaseInvoice(invoice) {
    try {
      await firestoreService.savePurchaseInvoice(invoice);
      return { success: true };
    } catch (error) {
      logger.error('Error in savePurchaseInvoice adapter:', error);
      return { success: false, error };
    }
  }

  async deletePurchaseInvoice(invoiceId) {
    try {
      await firestoreService.deletePurchaseInvoice(invoiceId);
      return { success: true };
    } catch (error) {
      logger.error('Error in deletePurchaseInvoice adapter:', error);
      return { success: false, error };
    }
  }

  // ===== IMAGE METHODS =====

  async saveImage(cardId, imageFile) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('No user ID available for image upload');
      }

      // Create a reference to the storage location
      const storageRef = ref(storage, `users/${userId}/cards/${cardId}`);

      // Upload the image
      const snapshot = await uploadBytes(storageRef, imageFile);

      // Get the download URL
      const imageUrl = await getDownloadURL(snapshot.ref);

      logger.debug(`Image uploaded successfully for card ${cardId}`);

      // Return the URL string directly (not an object)
      return imageUrl;
    } catch (error) {
      logger.error('Error uploading image:', error);
      throw error;
    }
  }

  async getImage(cardId) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.warn('No user ID available for image retrieval');
        return null;
      }

      // Create a reference to the storage location - FIX: Add .jpg extension to match storage
      const storageRef = ref(storage, `users/${userId}/cards/${cardId}.jpg`);

      // Get the download URL
      const imageUrl = await getDownloadURL(storageRef);

      return imageUrl;
    } catch (error) {
      // If image doesn't exist, return null instead of throwing
      if (error.code === 'storage/object-not-found') {
        return null;
      }
      logger.error('Error retrieving image:', error);
      return null;
    }
  }

  async deleteImage(cardId) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        logger.warn('No user ID available for image deletion');
        return { success: false };
      }

      // Create a reference to the storage location
      const storageRef = ref(storage, `users/${userId}/cards/${cardId}`);

      // Delete the image
      await deleteObject(storageRef);

      logger.debug(`Image deleted successfully for card ${cardId}`);
      return { success: true };
    } catch (error) {
      // If image doesn't exist, consider it a success
      if (error.code === 'storage/object-not-found') {
        return { success: true };
      }
      logger.error('Error deleting image:', error);
      return { success: false, error };
    }
  }

  // ===== UTILITY METHODS =====

  async resetAllData() {
    logger.warn(
      'resetAllData called - placeholder implementation (not yet fully implemented)'
    );
    // Note: Full data reset would require Firestore batch operations to delete user collections
    // Currently returns success for UI compatibility but performs no actual reset
    return { success: true };
  }

  async syncFromCloud() {
    // No-op - Firestore handles sync automatically
    logger.debug('syncFromCloud called - Firestore handles sync automatically');
    return { success: true };
  }

  // ===== REAL-TIME LISTENERS =====

  listenToCollection(collectionName, callback) {
    return firestoreService.listenToCollection(collectionName, callback);
  }

  async deleteImagesForCards(cardIds) {
    // This method is for cleaning up local image cache
    // Since we're using Firestore, this is a no-op
    // The actual image cleanup happens in Firebase Storage
    logger.info('Image cleanup requested for cards:', cardIds);
    return Promise.resolve();
  }

  cleanup() {
    firestoreService.cleanup();
  }
}

// Export singleton instance
const dbAdapter = new DatabaseAdapter();
export default dbAdapter;
