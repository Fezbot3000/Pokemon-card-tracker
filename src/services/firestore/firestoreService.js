/**
 * Firestore Service
 * 
 * This service provides direct Firestore operations, replacing the complex
 * IndexedDB + shadow sync pattern. Firestore's built-in offline persistence
 * handles offline/online scenarios automatically.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import logger from '../../utils/logger';

class FirestoreService {
  constructor() {
    this.unsubscribers = new Map();
  }

  /**
   * Get the current user ID
   * @returns {string|null} The current user's ID or null
   */
  getCurrentUserId() {
    return auth.currentUser?.uid || null;
  }

  /**
   * Get a user's document reference
   * @param {string} userId - The user ID
   * @returns {DocumentReference} The user document reference
   */
  getUserRef(userId = null) {
    const uid = userId || this.getCurrentUserId();
    if (!uid) throw new Error('No user ID available');
    return doc(db, 'users', uid);
  }

  /**
   * Get a collection reference for a user
   * @param {string} collectionName - The collection name
   * @param {string} userId - The user ID (optional)
   * @returns {CollectionReference} The collection reference
   */
  getUserCollection(collectionName, userId = null) {
    const uid = userId || this.getCurrentUserId();
    if (!uid) throw new Error('No user ID available');
    return collection(db, 'users', uid, collectionName);
  }

  // ===== COLLECTIONS OPERATIONS =====

  /**
   * Get all collections for the current user
   * @returns {Promise<Object>} Collections object with collection names as keys
   */
  async getCollections() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return {};

      const collectionsRef = this.getUserCollection('collections');
      const snapshot = await getDocs(collectionsRef);
      
      const collections = {};
      snapshot.forEach(doc => {
        collections[doc.id] = doc.data();
      });

      return collections;
    } catch (error) {
      logger.error('Error getting collections:', error);
      throw error;
    }
  }

  /**
   * Save a collection
   * @param {string} collectionName - The collection name
   * @param {Array} data - The collection data (array of cards)
   * @returns {Promise<void>}
   */
  async saveCollection(collectionName, data) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const collectionRef = doc(this.getUserCollection('collections'), collectionName);
      await setDoc(collectionRef, {
        name: collectionName,
        data: data || [],
        updatedAt: serverTimestamp()
      });

      logger.debug(`Collection ${collectionName} saved successfully`);
    } catch (error) {
      logger.error(`Error saving collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   * @param {string} collectionName - The collection name
   * @returns {Promise<void>}
   */
  async deleteCollection(collectionName) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      // First, delete all cards in this collection
      const cardsRef = collection(db, 'users', userId, 'cards');
      const q = query(cardsRef, where('collection', '==', collectionName));
      const snapshot = await getDocs(q);
      
      // Delete each card in the collection
      const deletePromises = [];
      snapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      
      // Find the collection document by name field and delete it
      const collectionsRef = this.getUserCollection('collections');
      const collectionQuery = query(collectionsRef, where('name', '==', collectionName));
      const collectionSnapshot = await getDocs(collectionQuery);
      
      if (!collectionSnapshot.empty) {
        // Delete the collection document
        const collectionDoc = collectionSnapshot.docs[0];
        await deleteDoc(collectionDoc.ref);
        logger.debug(`Collection ${collectionName} document deleted`);
      } else {
        logger.warn(`Collection document not found for: ${collectionName}`);
      }

      logger.debug(`Collection ${collectionName} and ${deletePromises.length} cards deleted successfully`);
    } catch (error) {
      logger.error(`Error deleting collection ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== CARDS OPERATIONS =====

  /**
   * Get all cards for a specific collection
   * @param {string} collectionName - The collection name
   * @returns {Promise<Array>} Array of cards
   */
  async getCards(collectionName) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];

      const collectionRef = doc(this.getUserCollection('collections'), collectionName);
      const collectionDoc = await getDoc(collectionRef);

      if (!collectionDoc.exists()) {
        return [];
      }

      return collectionDoc.data().data || [];
    } catch (error) {
      logger.error(`Error getting cards for collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Save a card to a collection
   * @param {string} collectionName - The collection name
   * @param {Object} card - The card data
   * @returns {Promise<void>}
   */
  async saveCard(collectionName, card) {
    try {
      const cards = await this.getCards(collectionName);
      const existingIndex = cards.findIndex(c => c.id === card.id);

      if (existingIndex >= 0) {
        cards[existingIndex] = { ...cards[existingIndex], ...card };
      } else {
        cards.push(card);
      }

      await this.saveCollection(collectionName, cards);
      logger.debug(`Card ${card.id} saved to collection ${collectionName}`);
    } catch (error) {
      logger.error(`Error saving card to collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a card from a collection
   * @param {string} collectionName - The collection name
   * @param {string} cardId - The card ID
   * @returns {Promise<void>}
   */
  async deleteCard(collectionName, cardId) {
    try {
      const cards = await this.getCards(collectionName);
      const filteredCards = cards.filter(c => c.id !== cardId);
      
      await this.saveCollection(collectionName, filteredCards);
      logger.debug(`Card ${cardId} deleted from collection ${collectionName}`);
    } catch (error) {
      logger.error(`Error deleting card from collection ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== SOLD ITEMS OPERATIONS =====

  /**
   * Get all sold items
   * @returns {Promise<Array>} Array of sold items
   */
  async getSoldItems() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];

      const soldItemsRef = this.getUserCollection('sold-items');
      const snapshot = await getDocs(soldItemsRef);
      
      const soldItems = [];
      snapshot.forEach(doc => {
        soldItems.push({ id: doc.id, ...doc.data() });
      });

      return soldItems;
    } catch (error) {
      logger.error('Error getting sold items:', error);
      throw error;
    }
  }

  /**
   * Save a sold item
   * @param {Object} soldItem - The sold item data
   * @returns {Promise<void>}
   */
  async saveSoldItem(soldItem) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const soldItemRef = doc(this.getUserCollection('sold-items'), soldItem.id);
      await setDoc(soldItemRef, {
        ...soldItem,
        updatedAt: serverTimestamp()
      });

      logger.debug(`Sold item ${soldItem.id} saved successfully`);
    } catch (error) {
      logger.error('Error saving sold item:', error);
      throw error;
    }
  }

  /**
   * Delete sold items by IDs
   * @param {Array<string>} itemIds - Array of item IDs to delete
   * @returns {Promise<void>}
   */
  async deleteSoldItems(itemIds) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const batch = writeBatch(db);
      
      itemIds.forEach(itemId => {
        const itemRef = doc(this.getUserCollection('sold-items'), itemId);
        batch.delete(itemRef);
      });

      await batch.commit();
      logger.debug(`${itemIds.length} sold items deleted successfully`);
    } catch (error) {
      logger.error('Error deleting sold items:', error);
      throw error;
    }
  }

  // ===== PROFILE OPERATIONS =====

  /**
   * Get user profile
   * @returns {Promise<Object|null>} User profile data
   */
  async getProfile() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return null;

      const profileRef = doc(this.getUserCollection('profile'), 'data');
      const profileDoc = await getDoc(profileRef);

      return profileDoc.exists() ? profileDoc.data() : null;
    } catch (error) {
      logger.error('Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Save user profile
   * @param {Object} profileData - The profile data
   * @returns {Promise<void>}
   */
  async saveProfile(profileData) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const profileRef = doc(this.getUserCollection('profile'), 'data');
      await setDoc(profileRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });

      logger.debug('Profile saved successfully');
    } catch (error) {
      logger.error('Error saving profile:', error);
      throw error;
    }
  }

  // ===== PURCHASE INVOICES OPERATIONS =====

  /**
   * Get all purchase invoices
   * @returns {Promise<Array>} Array of purchase invoices
   */
  async getPurchaseInvoices() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return [];

      const invoicesRef = this.getUserCollection('purchaseInvoices');
      const snapshot = await getDocs(query(invoicesRef, orderBy('date', 'desc')));
      
      const invoices = [];
      snapshot.forEach(doc => {
        invoices.push({ id: doc.id, ...doc.data() });
      });

      return invoices;
    } catch (error) {
      logger.error('Error getting purchase invoices:', error);
      throw error;
    }
  }

  /**
   * Save a purchase invoice
   * @param {Object} invoice - The invoice data
   * @returns {Promise<void>}
   */
  async savePurchaseInvoice(invoice) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const invoiceRef = doc(this.getUserCollection('purchaseInvoices'), invoice.id);
      await setDoc(invoiceRef, {
        ...invoice,
        updatedAt: serverTimestamp()
      });

      logger.debug(`Purchase invoice ${invoice.id} saved successfully`);
    } catch (error) {
      logger.error('Error saving purchase invoice:', error);
      throw error;
    }
  }

  /**
   * Delete a purchase invoice
   * @param {string} invoiceId - The invoice ID
   * @returns {Promise<void>}
   */
  async deletePurchaseInvoice(invoiceId) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      const invoiceRef = doc(this.getUserCollection('purchaseInvoices'), invoiceId);
      await deleteDoc(invoiceRef);

      logger.debug(`Purchase invoice ${invoiceId} deleted successfully`);
    } catch (error) {
      logger.error('Error deleting purchase invoice:', error);
      throw error;
    }
  }

  // ===== REAL-TIME LISTENERS =====

  /**
   * Listen to collection changes
   * @param {string} collectionName - The collection name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  listenToCollection(collectionName, callback) {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return () => {};

      const collectionRef = doc(this.getUserCollection('collections'), collectionName);
      
      const unsubscribe = onSnapshot(collectionRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data().data || []);
        } else {
          callback([]);
        }
      }, (error) => {
        logger.error(`Error listening to collection ${collectionName}:`, error);
      });

      // Store unsubscriber
      this.unsubscribers.set(`collection-${collectionName}`, unsubscribe);
      
      return unsubscribe;
    } catch (error) {
      logger.error(`Error setting up listener for collection ${collectionName}:`, error);
      return () => {};
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers.clear();
  }
}

// Export singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;
