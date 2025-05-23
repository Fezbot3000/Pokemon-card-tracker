import { toast } from 'react-hot-toast';
import db from '../services/db';
import { CardRepository } from '../repositories/CardRepository';
import logger from './logger';

/**
 * Collection management utility
 * Handles creating, renaming, and deleting collections
 */
export const collectionManager = {
  /**
   * Delete a collection and all its cards
   */
  async deleteCollection(name, { collections, user, selectedCollection, setCollections, setSelectedCollection }) {
    try {
      logger.log("collectionManager: Attempting to delete collection:", name);
      
      const currentCollections = { ...collections };
      
      if (!currentCollections[name]) {
        logger.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
        throw new Error(`Collection "${name}" does not exist`);
      }
      
      if (Object.keys(currentCollections).length <= 1) {
        throw new Error("Cannot delete the last collection");
      }
      
      const collectionId = currentCollections[name].id;
      
      toast.loading(`Deleting collection "${name}" and all its cards...`, { id: 'delete-collection' });
      
      let cardsInCollection = [];
      
      // Find cards in the collection from app state
      try {
        Object.values(collections).forEach(collectionCards => {
          if (Array.isArray(collectionCards)) {
            const matchingCards = collectionCards.filter(card => 
              card.collectionName === name || card.collection === name
            );
            cardsInCollection = [...cardsInCollection, ...matchingCards];
          }
        });
        
        logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from app state`);
      } catch (stateError) {
        logger.error("Error finding cards in collection from state:", stateError);
      }
      
      // If no cards found in state, check database
      if (cardsInCollection.length === 0) {
        try {
          const allCollections = await db.getCollections();
          if (allCollections && allCollections[name] && Array.isArray(allCollections[name])) {
            cardsInCollection = allCollections[name];
            logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from database`);
          }
        } catch (dbError) {
          logger.error("Error finding cards in collection from database:", dbError);
        }
      }
      
      // Revoke blob URLs and delete images
      try {
        logger.log(`Revoking blob URLs for ${cardsInCollection.length} cards in collection "${name}"`);
        
        cardsInCollection.forEach(card => {
          if (card.imageUrl && card.imageUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(card.imageUrl);
              logger.debug(`Revoked blob URL for card ${card.id || card.slabSerial}`);
            } catch (revokeError) {
              logger.error(`Error revoking blob URL for card ${card.id || card.slabSerial}:`, revokeError);
            }
          }
        });
        
        // Delete images from IndexedDB
        for (const card of cardsInCollection) {
          const cardId = card.id || card.slabSerial;
          if (cardId) {
            try {
              await db.deleteImage(cardId);
              logger.debug(`Deleted image for card ${cardId} from IndexedDB`);
            } catch (deleteError) {
              logger.error(`Error deleting image for card ${cardId} from IndexedDB:`, deleteError);
            }
          }
        }
      } catch (blobError) {
        logger.error("Error revoking blob URLs:", blobError);
      }
      
      // Delete from Firestore if user is logged in
      if (collectionId && user) {
        try {
          const cardRepo = new CardRepository(user.uid);
          await cardRepo.deleteCollection(collectionId);
          logger.log(`Collection "${name}" and all its cards deleted from Firestore`);
        } catch (firestoreError) {
          logger.error("Error deleting collection from Firestore:", firestoreError);
        }
      }
      
      // Remove from local state and database
      delete currentCollections[name];
      logger.log("Collection removed from object, saving to DB...");
      
      await db.saveCollections(currentCollections);
      
      setCollections(currentCollections);
      
      // Update selected collection if needed
      if (selectedCollection === name) {
        const newSelection = Object.keys(currentCollections)[0];
        setSelectedCollection(newSelection);
        localStorage.setItem('selectedCollection', newSelection);
        logger.log("Selected new collection:", newSelection);
      }
      
      toast.success(`Collection "${name}" and all its cards deleted successfully`, { id: 'delete-collection' });
      
      return true;
    } catch (error) {
      logger.error("Error deleting collection:", error);
      toast.error(`Failed to delete collection: ${error.message}`, { id: 'delete-collection' });
      throw error;
    }
  },

  /**
   * Create a new collection
   */
  async createCollection(name, { collections, setCollections, setSelectedCollection }) {
    if (!name || collections[name]) {
      logger.warn('Attempted to create an existing or empty collection:', name);
      return false;
    }

    try {
      const newCollections = { ...collections, [name]: [] };
      await db.saveCollections(newCollections);
      setCollections(newCollections);
      setSelectedCollection(name);
      localStorage.setItem('selectedCollection', name);
      
      toast.success(`Collection "${name}" created successfully`);
      logger.log('Created new collection:', name);
      
      return true;
    } catch (error) {
      logger.error('Error creating collection:', error);
      toast.error(`Failed to create collection: ${error.message}`);
      return false;
    }
  },

  /**
   * Rename a collection
   */
  async renameCollection(oldName, newName, { collections, setCollections, selectedCollection, setSelectedCollection }) {
    if (!oldName || !newName || oldName === newName) {
      return false;
    }

    if (collections[newName]) {
      toast.error(`Collection "${newName}" already exists`);
      return false;
    }

    try {
      const newCollections = { ...collections };
      newCollections[newName] = newCollections[oldName];
      delete newCollections[oldName];
      
      await db.saveCollections(newCollections);
      setCollections(newCollections);
      
      if (selectedCollection === oldName) {
        setSelectedCollection(newName);
        localStorage.setItem('selectedCollection', newName);
      }
      
      toast.success(`Collection renamed from "${oldName}" to "${newName}"`);
      logger.log(`Renamed collection from "${oldName}" to "${newName}"`);
      
      return true;
    } catch (error) {
      logger.error('Error renaming collection:', error);
      toast.error(`Failed to rename collection: ${error.message}`);
      return false;
    }
  }
};
