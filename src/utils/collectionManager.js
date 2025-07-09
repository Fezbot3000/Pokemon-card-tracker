import { toast } from 'react-hot-toast';
import logger from './logger';
import db from '../services/firestore/dbAdapter';
import { CardRepository } from '../repositories/CardRepository';
import firestoreService from '../services/firestore/firestoreService';
import featureFlags from './featureFlags';

/**
 * Collection management utility
 * Handles creating, renaming, and deleting collections
 */
export const collectionManager = {
  /**
   * Debug utility to log collection states
   * @param {string} operation - The operation being performed
   * @param {Object} collections - Current collections state
   * @param {Object} user - Current user
   */
  debugCollectionState(operation, collections, user) {
    logger.debug(`[CollectionManager] ${operation} - Collection state:`, {
      collectionNames: Object.keys(collections || {}),
      collectionCounts: Object.entries(collections || {}).reduce(
        (acc, [name, cards]) => {
          acc[name] = Array.isArray(cards) ? cards.length : 'not-array';
          return acc;
        },
        {}
      ),
      userLoggedIn: !!user,
      userId: user?.uid || 'none',
    });
  },

  /**
   * Delete a collection and all its cards
   */
  async deleteCollection(
    name,
    {
      collections,
      user,
      selectedCollection,
      setCollections,
      setSelectedCollection,
    }
  ) {
    try {
      logger.log('collectionManager: Attempting to delete collection:', name);

      // Check if this is a protected collection
      const protectedCollections = ['sold', 'all cards', 'default collection'];
      if (protectedCollections.includes(name.toLowerCase())) {
        const errorMessage = `Cannot delete protected collection "${name}"`;
        logger.error(errorMessage);
        toast.error(errorMessage);
        return false;
      }

      const currentCollections = { ...collections };

      if (!currentCollections[name]) {
        logger.error(
          `Collection "${name}" does not exist in:`,
          Object.keys(currentCollections)
        );
        throw new Error(`Collection "${name}" does not exist`);
      }

      if (Object.keys(currentCollections).length <= 1) {
        throw new Error('Cannot delete the last collection');
      }



      toast.loading(`Deleting collection "${name}" and all its cards...`, {
        id: 'delete-collection',
      });

      let cardsInCollection = [];

      // Find cards in the collection from app state
      try {
        Object.values(collections).forEach(collectionCards => {
          if (Array.isArray(collectionCards)) {
            const matchingCards = collectionCards.filter(
              card => card.collectionName === name || card.collection === name
            );
            cardsInCollection = [...cardsInCollection, ...matchingCards];
          }
        });

        logger.log(
          `Found ${cardsInCollection.length} cards in collection "${name}" from app state`
        );
      } catch (stateError) {
        logger.error(
          'Error finding cards in collection from state:',
          stateError
        );
      }

      // If no cards found in state, check database
      if (cardsInCollection.length === 0) {
        try {
          const allCollections = await db.getCollections();
          if (
            allCollections &&
            allCollections[name] &&
            Array.isArray(allCollections[name])
          ) {
            cardsInCollection = allCollections[name];
            logger.log(
              `Found ${cardsInCollection.length} cards in collection "${name}" from database`
            );
          }
        } catch (dbError) {
          logger.error(
            'Error finding cards in collection from database:',
            dbError
          );
        }
      }

      // Revoke blob URLs and delete images
      try {
        logger.log(
          `Revoking blob URLs for ${cardsInCollection.length} cards in collection "${name}"`
        );

        cardsInCollection.forEach(card => {
          if (card.imageUrl && card.imageUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(card.imageUrl);
              logger.debug(
                `Revoked blob URL for card ${card.id || card.slabSerial}`
              );
            } catch (revokeError) {
              logger.error(
                `Error revoking blob URL for card ${card.id || card.slabSerial}:`,
                revokeError
              );
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
              logger.error(
                `Error deleting image for card ${cardId} from IndexedDB:`,
                deleteError
              );
            }
          }
        }
      } catch (blobError) {
        logger.error('Error revoking blob URLs:', blobError);
      }

      // Delete from Firestore if user is logged in
      if (user) {
        try {
          // Use firestoreService which properly queries by name
          await firestoreService.deleteCollection(name);
          logger.log(
            `Collection "${name}" and all its cards deleted from Firestore`
          );
        } catch (firestoreError) {
          logger.error(
            'Error deleting collection from Firestore:',
            firestoreError
          );
          // Don't throw here, continue with local deletion
        }
      }

      // Remove from local state and database
      delete currentCollections[name];
      logger.log('Collection removed from object, saving to DB...');

      await db.saveCollections(currentCollections);

      setCollections(currentCollections);

      // Update selected collection if needed
      if (selectedCollection === name) {
        const newSelection = Object.keys(currentCollections)[0];
        setSelectedCollection(newSelection);
        localStorage.setItem('selectedCollection', newSelection);
        logger.log('Selected new collection:', newSelection);
      }

      toast.success(
        `Collection "${name}" and all its cards deleted successfully`,
        { id: 'delete-collection' }
      );

      return true;
    } catch (error) {
      logger.error('Error deleting collection:', error);
      toast.error(`Failed to delete collection: ${error.message}`, {
        id: 'delete-collection',
      });
      throw error;
    }
  },

  /**
   * Create a new collection
   */
  async createCollection(
    name,
    { collections, setCollections, setSelectedCollection }
  ) {
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
   * Rename a collection - COMPLETE APPROACH: Update cards AND clean up old collection
   */
  async renameCollection(
    oldName,
    newName,
    {
      collections,
      setCollections,
      selectedCollection,
      setSelectedCollection,
      user,
    }
  ) {
    if (!oldName || !newName || oldName === newName) {
      return false;
    }

    // Debug: Log initial state
    this.debugCollectionState(
      `RENAME START (${oldName} -> ${newName})`,
      collections,
      user
    );

    // Check if this is a protected collection
    const protectedCollections = ['sold', 'all cards', 'default collection'];
    if (protectedCollections.includes(oldName.toLowerCase())) {
      const errorMessage = `Cannot rename protected collection "${oldName}"`;
      logger.error(errorMessage);
      toast.error(errorMessage);
      return false;
    }

    if (collections[newName]) {
      toast.error(`Collection "${newName}" already exists`);
      return false;
    }

    try {
      toast.loading(`Renaming collection "${oldName}" to "${newName}"...`, {
        id: 'rename-collection',
      });

      // Get the cards from the existing collections data
      const cardsToUpdate = collections[oldName];

      // Validate that we have a valid array of cards
      if (!cardsToUpdate || !Array.isArray(cardsToUpdate)) {
        logger.error(
          `Collection "${oldName}" not found or is not an array:`,
          cardsToUpdate
        );
        toast.error(`Collection "${oldName}" not found or is invalid`, {
          id: 'rename-collection',
        });
        return false;
      }

      logger.log(
        `Found ${cardsToUpdate.length} cards to rename from "${oldName}" to "${newName}"`
      );

      // Allow renaming empty collections
      if (cardsToUpdate.length === 0) {
        logger.log(`Renaming empty collection "${oldName}" to "${newName}"`);
      }

      // Update each card in Firestore if user is logged in
      if (user) {
        const cardRepository = new CardRepository(user.uid);

        // Update each card to have the new collection name
        for (const card of cardsToUpdate) {
          if (card && card.id) {
            await cardRepository.updateCard({
              ...card,
              collection: newName,
              collectionId: newName,
              collectionName: newName,
            });
          } else {
            logger.warn('Skipping invalid card:', card);
          }
        }

        logger.log(
          `Successfully updated ${cardsToUpdate.length} cards in Firestore`
        );

        // CRITICAL FIX: Delete the old collection from Firestore
        try {
          await firestoreService.deleteCollection(oldName);
          logger.log(
            `Successfully deleted old collection "${oldName}" from Firestore`
          );
        } catch (deleteError) {
          logger.error(
            `Error deleting old collection "${oldName}" from Firestore:`,
            deleteError
          );
          // Don't fail the entire operation, but log the error
        }

        // ADDITIONAL FIX: Create the new collection in Firestore to ensure it exists
        try {
          await firestoreService.saveCollection(newName, cardsToUpdate);
          logger.log(
            `Successfully created new collection "${newName}" in Firestore`
          );
        } catch (saveError) {
          logger.error(
            `Error creating new collection "${newName}" in Firestore:`,
            saveError
          );
          // Don't fail the entire operation, but log the error
        }
      }

      // Update selected collection if it was the renamed one
      if (selectedCollection === oldName) {
        setSelectedCollection(newName);
        localStorage.setItem('selectedCollection', newName);
      }

      // Immediately update local collections state to remove old collection and add new one
      const updatedCollections = { ...collections };
      updatedCollections[newName] = cardsToUpdate.map(card => ({
        ...card,
        collection: newName,
        collectionId: newName,
        collectionName: newName,
      }));
      delete updatedCollections[oldName];

      // Debug: Log state before setting
      this.debugCollectionState(
        `RENAME BEFORE SET STATE (${oldName} -> ${newName})`,
        updatedCollections,
        user
      );

      setCollections(updatedCollections);

      // Also update local database
      try {
        await db.saveCollections(updatedCollections);
        logger.log(`Updated local collections state and database`);
      } catch (dbError) {
        logger.warn('Failed to update local database:', dbError);
      }

      // ADDITIONAL FIX: Force a sync to ensure cloud state is consistent
      if (user && featureFlags.enableFirestoreSync) {
        try {
          const shadowSyncService = await import('../services/shadowSync').then(
            module => module.default
          );
          await shadowSyncService.shadowWriteCollection(newName, {
            name: newName,
            cardCount: cardsToUpdate.length,
            description: '',
            updatedAt: new Date(),
          });
          logger.log(
            `Successfully synced new collection "${newName}" via shadow sync`
          );
        } catch (syncError) {
          logger.error(`Error syncing new collection "${newName}":`, syncError);
          // Don't fail the operation
        }
      }

      // Debug: Log final state
      this.debugCollectionState(
        `RENAME COMPLETE (${oldName} -> ${newName})`,
        updatedCollections,
        user
      );

      toast.success(`Collection renamed from "${oldName}" to "${newName}"`, {
        id: 'rename-collection',
      });
      logger.log(
        `Successfully renamed collection from "${oldName}" to "${newName}"`
      );

      return true;
    } catch (error) {
      logger.error('Error renaming collection:', error);
      toast.error(`Failed to rename collection: ${error.message}`, {
        id: 'rename-collection',
      });
      return false;
    }
  },
};
