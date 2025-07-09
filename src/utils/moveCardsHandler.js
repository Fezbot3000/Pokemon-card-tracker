/**
 * Move Cards Handler
 *
 * A robust utility for moving cards between collections with proper error handling,
 * Firestore sync, and state management.
 */

import db from '../services/firestore/dbAdapter';
import { toast } from 'react-hot-toast';
import LoggingService from '../services/LoggingService';

/**
 * Moves cards from one collection to another with proper validation and sync
 * @param {Object} params - The parameters object
 * @param {Array} params.cardsToMove - Array of card objects to move
 * @param {string} params.targetCollection - Name of the target collection
 * @param {string} params.sourceCollection - Name of the source collection (for logging)
 * @param {Object} params.collections - Current collections object
 * @param {Function} params.setCollections - Function to update collections state
 * @param {Function} params.clearSelection - Function to clear card selection
 * @param {boolean} params.isAllCardsView - Whether we're in "All Cards" view
 * @returns {Promise<boolean>} - Success status
 */
export async function moveCards({
  cardsToMove,
  targetCollection,
  sourceCollection,
  collections,
  setCollections,
  clearSelection,
  isAllCardsView = false,
}) {
  try {
    // Validation
    if (!cardsToMove || cardsToMove.length === 0) {
      toast.error('No cards selected to move');
      return false;
    }

    if (!targetCollection) {
      toast.error('No target collection specified');
      return false;
    }

    if (!collections) {
      toast.error('Collections data not available');
      return false;
    }

    // Create a deep copy of collections to avoid mutation issues
    const updatedCollections = JSON.parse(JSON.stringify(collections));

    // Ensure target collection exists and is an array
    if (!updatedCollections[targetCollection]) {
      updatedCollections[targetCollection] = [];
    } else if (!Array.isArray(updatedCollections[targetCollection])) {
      // Try to preserve data if it's an object with card data
      if (typeof updatedCollections[targetCollection] === 'object') {
        const values = Object.values(updatedCollections[targetCollection]);
        if (
          values.length > 0 &&
          values[0] &&
          typeof values[0] === 'object' &&
          values[0].slabSerial
        ) {
          updatedCollections[targetCollection] = values;
        } else {
          updatedCollections[targetCollection] = [];
        }
      } else {
        updatedCollections[targetCollection] = [];
      }
    }

    // Track processed cards to prevent duplicates
    const processedCardIds = new Set();
    const successfulMoves = [];
    const failedMoves = [];

    // Process each card
    for (const card of cardsToMove) {
      try {
        const cardId = card.slabSerial || card.id;

        if (!cardId) {
          LoggingService.warn('[MoveCardsHandler] Card missing ID:', card);
          failedMoves.push({ card, reason: 'Missing card ID' });
          continue;
        }

        // Skip if already processed (prevent duplicates)
        if (processedCardIds.has(cardId)) {
          LoggingService.warn(`[MoveCardsHandler] Skipping duplicate card: ${cardId}`);
          continue;
        }
        processedCardIds.add(cardId);

        // Create updated card with new collection info
        const updatedCard = {
          ...card,
          collection: targetCollection,
          collectionId: targetCollection,
          lastMoved: new Date().toISOString(),
          movedFrom: card.collection || sourceCollection,
        };

        // Add to target collection
        updatedCollections[targetCollection].push(updatedCard);

        // Remove from source collection(s)
        if (isAllCardsView) {
          // In "All Cards" view, find and remove from actual source collection
          const actualSourceCollection = card.collection || card.collectionId;
          if (
            actualSourceCollection &&
            updatedCollections[actualSourceCollection]
          ) {
            if (Array.isArray(updatedCollections[actualSourceCollection])) {
              const originalLength =
                updatedCollections[actualSourceCollection].length;
              updatedCollections[actualSourceCollection] = updatedCollections[
                actualSourceCollection
              ].filter(c => (c.slabSerial || c.id) !== cardId);
              const removed =
                updatedCollections[actualSourceCollection].length <
                originalLength;
              if (removed) {
              }
            } else {
              LoggingService.warn(
                `[MoveCardsHandler] Source collection ${actualSourceCollection} is not an array, cannot remove card`
              );
            }
          }
        } else {
          // Normal view: remove from current collection
          if (updatedCollections[sourceCollection]) {
            if (Array.isArray(updatedCollections[sourceCollection])) {
              const originalLength =
                updatedCollections[sourceCollection].length;
              updatedCollections[sourceCollection] = updatedCollections[
                sourceCollection
              ].filter(c => (c.slabSerial || c.id) !== cardId);
              const removed =
                updatedCollections[sourceCollection].length < originalLength;
              if (removed) {
              }
            } else {
              LoggingService.warn(
                `[MoveCardsHandler] Source collection ${sourceCollection} is not an array, cannot remove card`
              );
            }
          }
        }

        // Sync to Firestore
        try {
          const shadowSync = await import('../services/shadowSync').then(
            module => module.default
          );
          await shadowSync.shadowWriteCard(
            cardId,
            updatedCard,
            targetCollection
          );

          successfulMoves.push({
            id: cardId,
            name: card.cardName || card.card || 'Unnamed Card',
            from: card.collection || sourceCollection,
            to: targetCollection,
          });
        } catch (syncError) {
          LoggingService.error(
            `[MoveCardsHandler] Error syncing card ${cardId}:`,
            syncError
          );
          failedMoves.push({
            card,
            reason: 'Firestore sync failed',
            error: syncError,
          });
        }
      } catch (cardError) {
        LoggingService.error('[MoveCardsHandler] Error processing card:', cardError);
        failedMoves.push({
          card,
          reason: 'Processing error',
          error: cardError,
        });
      }
    }

    // Save collections to database
    try {
      const saveOptions = {
        preserveSold: true,
        operationType: 'moveCards',
      };

      await db.saveCollections(
        updatedCollections,
        saveOptions.preserveSold,
        saveOptions
      );
    } catch (saveError) {
      LoggingService.error('[MoveCardsHandler] Error saving collections:', saveError);
      toast.error('Failed to save collections. Changes may not persist.');
    }

    // Update parent state
    setCollections(updatedCollections);

    // Clear selection
    if (clearSelection) {
      clearSelection();
    }

    // Show results
    if (successfulMoves.length > 0) {
      const cardCount = successfulMoves.length;
      toast.success(
        `Successfully moved ${cardCount} card${cardCount !== 1 ? 's' : ''} to ${targetCollection}`
      );
    }

    if (failedMoves.length > 0) {
      LoggingService.warn(
        '[MoveCardsHandler] Some cards failed to move:',
        failedMoves
      );
      toast.warning(
        `${failedMoves.length} card${failedMoves.length !== 1 ? 's' : ''} failed to move`
      );
    }

    // Store operation details for debugging
    localStorage.setItem(
      'lastCardMove',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        successful: successfulMoves,
        failed: failedMoves,
        targetCollection,
        sourceCollection,
      })
    );

    return successfulMoves.length > 0;
  } catch (error) {
    LoggingService.error(
      '[MoveCardsHandler] Critical error during move operation:',
      error
    );
    toast.error('Failed to move cards. Please try again.');
    return false;
  }
}

/**
 * Validates collections structure and repairs if necessary
 * @param {Object} collections - Collections object to validate
 * @returns {Object} - Validated/repaired collections object
 */
export function validateCollectionsStructure(collections) {
  if (!collections || typeof collections !== 'object') {
    LoggingService.warn(
      '[MoveCardsHandler] Invalid collections structure, creating empty object'
    );
    return {};
  }

  const validatedCollections = {};

  Object.keys(collections).forEach(collectionName => {
    const collection = collections[collectionName];

    if (Array.isArray(collection)) {
      validatedCollections[collectionName] = collection;
    } else if (collection && typeof collection === 'object') {
      // Check if it's an object with numeric keys (array-like)
      const keys = Object.keys(collection);
      const isArrayLike =
        keys.length > 0 && keys.every(key => !isNaN(parseInt(key)));

      if (isArrayLike && keys.length > 0) {
        validatedCollections[collectionName] = Object.values(collection);
      } else if (keys.length === 0) {
        // Empty object, convert to empty array
        validatedCollections[collectionName] = [];
      } else {
        // Object with non-numeric keys - might contain valid data, let's preserve it as an array of values
        const values = Object.values(collection);
        if (values.length > 0 && values[0] && typeof values[0] === 'object') {
          validatedCollections[collectionName] = values;
        } else {
          validatedCollections[collectionName] = [];
          LoggingService.warn(
            `[MoveCardsHandler] Collection ${collectionName} has invalid structure, reset to empty array`
          );
        }
      }
    } else {
      validatedCollections[collectionName] = [];
      LoggingService.warn(
        `[MoveCardsHandler] Collection ${collectionName} is not an array or object, reset to empty array`
      );
    }
  });

  return validatedCollections;
}

const moveCardsHandler = { moveCards, validateCollectionsStructure };
export default moveCardsHandler;
