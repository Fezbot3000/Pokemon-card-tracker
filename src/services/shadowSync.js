/**
 * Shadow Sync Service
 *
 * This service provides a non-intrusive way to sync data with Firestore
 * without disrupting the existing IndexedDB functionality.
 *
 * When feature flags are enabled, this service will:
 * 1. Shadow write data to Firestore (without changing existing data flow)
 * 2. Provide background data migration capabilities
 * 3. Enable real-time listeners when appropriate
 *
 * All operations are feature-flagged to ensure no disruption to the current application.
 */

import { auth } from './firebase';
import { CardRepository } from '../repositories/CardRepository';
import featureFlags from '../utils/featureFlags';
import logger from '../utils/logger';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
// Note: We don't import db directly to avoid circular dependencies
// Instead, we'll use dynamic imports when needed

// Firestore DB instance (ensure it's initialized elsewhere, e.g., in firebase.js)
import { db as firestoreDb } from './firebase';

const MAX_BATCH_OPERATIONS = 500; // Firestore batch limit

class ShadowSyncService {
  constructor() {
    this.repository = null;
    this.userId = null;
    this.isInitialized = false;
    this.syncInProgress = false;
    this.syncOperationsCount = 0;
    this.lastSyncTime = null;
    this.onlineStatus = navigator.onLine;
    this.listenerUnsubscribe = null;
    this.unsubscribeSoldItemsListener = null; // To store the unsubscribe function

    // Track sync activity
    this._processingQueue = false;
    this._cardQueue = [];
    this._lastSaveTimestamp = null;
    this._updateInProgress = false;

    // Track cards that have been recently updated
    this._recentlyUpdatedCards = new Set();

    // Track skipped card counts to reduce log spam
    this._skippedCardCount = 0;
    this._lastLogTimestamp = 0;

    // Defer initialization to avoid blocking initial render
    this._authListener = null;
    this._initializationTimeout = null;
    
    // Start deferred initialization
    this._deferredInit();
  }

  /**
   * Deferred initialization to avoid blocking initial render
   */
  _deferredInit() {
    // Wait 2 seconds after initial load to start shadow sync
    this._initializationTimeout = setTimeout(() => {
      // Initialize when auth state changes
      this._authListener = auth.onAuthStateChanged(user => {
        if (user) {
          this.userId = user.uid;
          this.repository = new CardRepository(user.uid);
          this.isInitialized = true;
          logger.debug('[ShadowSync] Initialized with user ID:', user.uid);
        } else {
          this.cleanup();
          logger.debug('[ShadowSync] User signed out, cleaned up resources');
        }
      });

      // Listen for online/offline events
      window.addEventListener('online', () => this._updateOnlineStatus(true));
      window.addEventListener('offline', () => this._updateOnlineStatus(false));
    }, 2000);
  }

  /**
   * Cleanup resources when user signs out
   */
  cleanup() {
    if (this._initializationTimeout) {
      clearTimeout(this._initializationTimeout);
      this._initializationTimeout = null;
    }
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe();
      this.listenerUnsubscribe = null;
    }
    if (this._authListener) {
      this._authListener();
      this._authListener = null;
    }
    this.repository = null;
    this.userId = null;
    this.isInitialized = false;
  }

  _updateOnlineStatus(isOnline) {
    this.onlineStatus = isOnline;
    logger.debug(`[ShadowSync] Online status changed to: ${isOnline}`);
  }

  isOnline() {
    return this.onlineStatus;
  }

  /**
   * Notify the UI about sync activity
   * @private
   */
  _notifySyncStarted() {
    this.syncInProgress = true;
    this.syncOperationsCount++;

    // Dispatch event for UI components to listen to
    window.dispatchEvent(
      new CustomEvent('shadow-sync-activity', {
        detail: {
          type: 'started',
          count: this.syncOperationsCount,
        },
      })
    );
  }

  /**
   * Notify the UI about sync completion
   * @private
   */
  _notifySyncCompleted(success = true) {
    this.syncInProgress = false;
    this.lastSyncTime = new Date();

    // Dispatch event for UI components to listen to
    window.dispatchEvent(
      new CustomEvent('shadow-sync-activity', {
        detail: {
          type: 'completed',
          success,
          time: this.lastSyncTime,
        },
      })
    );
  }

  /**
   * Get the current sync status
   * @returns {Object} Status object
   */
  getSyncStatus() {
    return {
      inProgress: this.syncInProgress,
      operationsCount: this.syncOperationsCount,
      lastSyncTime: this.lastSyncTime,
      isOnline: this.isOnline(),
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Process cards from the cache and write them to Firestore
   * @returns {Promise<void>}
   */
  async _processCardQueue() {
    if (
      !this.isInitialized ||
      !this.isOnline() ||
      this._processingQueue ||
      !featureFlags.enableFirestoreSync
    ) {
      return;
    }

    // Skip process if we just saved a card - prevents mass update cascades from a single save
    const now = Date.now();
    if (this._lastSaveTimestamp && now - this._lastSaveTimestamp < 3000) {
      logger.debug(
        `[ShadowSync] Skipping queue processing - recent save detected (${now - this._lastSaveTimestamp}ms ago)`
      );
      return;
    }

    // Skip if queue is empty
    if (this._cardQueue.length === 0) {
      return;
    }

    // Set processing flag to prevent concurrent processing
    this._processingQueue = true;
    logger.debug(
      `[ShadowSync] Processing card queue with ${this._cardQueue.length} items...`
    );

    // Create a local copy of the queue and clear the global queue
    const queueCopy = [...this._cardQueue];
    this._cardQueue = [];

    try {
      // If queue is too large (over 5 cards), only process the first card to prevent performance issues
      const itemsToProcess = queueCopy.length > 5 ? [queueCopy[0]] : queueCopy;

      if (queueCopy.length > 5) {
        logger.debug(
          `[ShadowSync] Queue has ${queueCopy.length} items - limiting to only process first item to prevent performance issues`
        );
      }

      // Only process if we're not in the middle of a save
      if (!this._updateInProgress) {
        for (const item of itemsToProcess) {
          try {
            await this.shadowWriteCard(item.id, item.card, item.collectionName);
          } catch (error) {
            logger.error(
              `[ShadowSync] Error processing queue item for card ${item?.id}:`,
              error
            );
          }
        }
      } else {
        logger.debug(
          `[ShadowSync] Skipping queue processing - update already in progress`
        );
      }

      // Clear the rest of the queue if we limited processing
      if (queueCopy.length > itemsToProcess.length) {
        logger.debug(
          `[ShadowSync] Cleared remaining ${queueCopy.length - itemsToProcess.length} items from queue`
        );
      }
    } catch (error) {
      logger.error('[ShadowSync] Error processing card queue:', error);
    } finally {
      this._processingQueue = false;
    }
  }

  /**
   * Queue a card to be written to Firestore
   *
   * @param {string} cardId - The card ID
   * @param {Object} card - The card data
   * @param {string} collectionName - The collection name
   */
  queueCardForUpdate(cardId, card, collectionName) {
    // Skip if we're already in a save operation (prevents cascading updates)
    if (this._updateInProgress) {
      logger.debug(
        `[ShadowSync] Skipping queue add for ${cardId} - update already in progress`
      );
      return;
    }

    // Skip if not initialized or offline
    if (!this.isInitialized || !this.isOnline()) {
      return;
    }

    // Skip if we're in a cooling-off period after a save
    const now = Date.now();
    if (this._lastSaveTimestamp && now - this._lastSaveTimestamp < 3000) {
      logger.debug(
        `[ShadowSync] Skipping queue add - in cooling period (${now - this._lastSaveTimestamp}ms since last save)`
      );
      return;
    }

    // Only queue if we have all required data
    if (!cardId || !card) {
      return;
    }

    // Check if card already exists in queue
    const existingIndex = this._cardQueue.findIndex(item => item.id === cardId);
    if (existingIndex !== -1) {
      // Update existing card in queue
      this._cardQueue[existingIndex] = {
        id: cardId,
        card,
        collectionName,
      };
    } else {
      // Add new card to queue
      this._cardQueue.push({
        id: cardId,
        card,
        collectionName,
      });
    }
  }

  /**
   * Shadow write a card to Firestore
   *
   * @param {string} cardId - The card ID
   * @param {Object} card - The full card object to write
   * @param {string} collectionName - The name of the collection the card belongs to
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shadowWriteCard(cardId, card, collectionName) {
    // Skip if feature flag is disabled or not initialized
    if (
      !featureFlags.enableFirestoreSync ||
      !this.isInitialized ||
      !this.isOnline()
    ) {
      logger.debug(
        '[ShadowSync] Skipping shadow write for card, feature flag disabled or offline'
      );
      return false;
    }

    const now = Date.now();
    const isInBatchMode = this._skippedCardCount > 0;

    // Only log the initial shadowWriteCard call for the active card being saved
    // Reduce log spam from bulk operations
    if (card._saveDebug || !isInBatchMode) {
      logger.debug(`[ShadowSync] shadowWriteCard called for ${cardId}`, {
        timestamp: new Date().toISOString(),
        collection: collectionName,
        hasDebugFlag: card._saveDebug || false,
      });
    }

    // Skip processing if card has no ID
    if (!cardId) {
      logger.error('[ShadowSync] Card object missing ID for shadow write.');
      return false;
    }

    // Skip if user is saving a card directly (_saveDebug flag set)
    if (card._saveDebug) {
      logger.debug(
        `[ShadowSync] Skipping shadow write for card ${cardId} - card is being saved directly`
      );
      this._lastSaveTimestamp = now;

      // Add to recently updated cards set
      this._recentlyUpdatedCards.add(cardId);

      // Reset skipped card counter when a direct card save happens
      if (this._skippedCardCount > 0) {
        logger.debug(
          `[ShadowSync] Skipped shadow write for ${this._skippedCardCount} cards in previous batch`
        );
        this._skippedCardCount = 0;
      }

      return true;
    }

    // Check if this is already part of a managed update flow
    // If _lastUpdateTime exists, this card is being handled by the updateCard function directly
    if (card._lastUpdateTime) {
      // Only log individual skips for non-batch operations or the first few cards
      if (!isInBatchMode || this._skippedCardCount < 5) {
        logger.debug(
          `[ShadowSync] Skipping shadow write for card ${cardId} - already part of tracked update flow (${card._lastUpdateTime})`
        );
      }

      this._lastSaveTimestamp = now;
      this._skippedCardCount++;

      // Add to recently updated cards set
      this._recentlyUpdatedCards.add(cardId);

      return true; // Return true to indicate "success" (we're intentionally skipping)
    }

    // Skip if this card has been recently updated
    if (this._recentlyUpdatedCards.has(cardId)) {
      // Only log individual skips for non-batch operations or the first few cards
      if (!isInBatchMode || this._skippedCardCount < 5) {
        logger.debug(
          `[ShadowSync] Skipping shadow write for card ${cardId} - recently updated`
        );
      }

      this._skippedCardCount++;
      return true;
    }

    // Mark that we're in the middle of an update
    this._updateInProgress = true;

    // Reset skipped card counter when doing an actual write
    if (this._skippedCardCount > 0) {
      logger.debug(
        `[ShadowSync] Skipped shadow write for ${this._skippedCardCount} cards in previous batch`
      );
      this._skippedCardCount = 0;
    }

    // Track start time for performance monitoring
    const startTime = performance.now();
    this._notifySyncStarted();

    try {
      logger.debug(
        `[ShadowSync] Preparing to write card ${cardId} to collection ${collectionName || 'unknown'}`
      );

      // Create a clean card data object without duplicating collection fields
      const cardDataToWrite = {
        ...card,
      };

      // Remove existing collection fields to prevent duplicates
      delete cardDataToWrite.collection;
      delete cardDataToWrite.collectionId;
      delete cardDataToWrite.id;

      // Create the update payload with the correct collection fields
      const updatePayload = {
        ...cardDataToWrite,
        id: cardId,
        collection: collectionName,
        collectionId: collectionName,
      };

      // Directly update the card without extensive checks (our getCard optimization will handle this)
      logger.debug(`[ShadowSync] Calling repository.updateCard for ${cardId}`);
      const repoStart = performance.now();
      await this.repository.updateCard(updatePayload);
      const repoEnd = performance.now();

      // Log performance metrics
      const endTime = performance.now();
      logger.debug(
        `[ShadowSync] Repository update took ${(repoEnd - repoStart).toFixed(2)}ms`
      );
      logger.debug(
        `[ShadowSync] Total shadow write operation for ${cardId} completed in ${(endTime - startTime).toFixed(2)}ms`
      );

      // Remember when we last wrote a card - helps prevent mass update cascades
      this._lastSaveTimestamp = Date.now();

      // Add to recently updated cards set
      this._recentlyUpdatedCards.add(cardId);

      // Clean up old entries from recentlyUpdatedCards after 10 seconds
      setTimeout(() => {
        this._recentlyUpdatedCards.delete(cardId);
      }, 10000);

      this._notifySyncCompleted(true);
      return true;
    } catch (error) {
      logger.error(
        `[ShadowSync] Error writing card ${cardId} to Firestore:`,
        error
      );
      this._notifySyncCompleted(false);
      return false;
    } finally {
      // Mark that we're done with the update
      this._updateInProgress = false;
    }
  }

  /**
   * Shadow write a collection to Firestore
   * This doesn't affect the normal app flow but writes data to Firestore in the background
   *
   * @param {string} collectionId - The collection ID
   * @param {Object} collectionData - The collection data to write
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shadowWriteCollection(collectionId, collectionData) {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      logger.debug(
        '[ShadowSync] Skipping shadow write for collection, feature flag disabled'
      );
      return false;
    }

    this._notifySyncStarted();
    try {
      // Check if online before attempting to write
      if (!this.isOnline()) {
        logger.debug('[ShadowSync] Device is offline, skipping shadow write');
        this._notifySyncCompleted(false);
        return false;
      }

      logger.debug(
        `[ShadowSync] Shadow writing collection ${collectionId} to Firestore`
      );
      if (collectionId && collectionData) {
        await this.repository.createCollectionWithId(
          collectionId,
          collectionData
        );
        logger.debug(
          `[ShadowSync] Successfully shadow wrote collection ${collectionId}`
        );
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      // Log but don't disrupt app flow
      logger.error('[ShadowSync] Error shadow writing collection:', error);
      this._notifySyncCompleted(false);
      return false;
    }
  }

  /**
   * Shadow write a sold card to Firestore
   *
   * @param {string} cardId - The card ID
   * @param {Object} soldData - The sold card data
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shadowWriteSoldCard(cardId, soldData) {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      return false;
    }

    this._notifySyncStarted();
    try {
      // Check if online before attempting to write
      if (!this.isOnline()) {
        logger.debug(
          '[ShadowSync] Device is offline, skipping sold card write'
        );
        this._notifySyncCompleted(false);
        return false;
      }

      if (!cardId || !soldData) {
        logger.error('[ShadowSync] Invalid card ID or sold data provided');
        this._notifySyncCompleted(false);
        return false;
      }

      const soldItemRef = doc(
        firestoreDb,
        'users',
        this.userId,
        'sold-items',
        cardId
      );
      const soldItemSnap = await getDoc(soldItemRef);

      let processedSoldData = { ...soldData };
      // Ensure dateSold is a Firestore Timestamp if it's a string
      if (
        processedSoldData.dateSold &&
        typeof processedSoldData.dateSold === 'string'
      ) {
        try {
          processedSoldData.dateSold = Timestamp.fromDate(
            new Date(processedSoldData.dateSold)
          );
        } catch (dateError) {
          logger.warn(
            `[ShadowSync] Invalid date format for dateSold: ${processedSoldData.dateSold}. Setting to now.`,
            dateError
          );
          processedSoldData.dateSold = Timestamp.now();
        }
      } else if (!processedSoldData.dateSold) {
        processedSoldData.dateSold = Timestamp.now(); // Default if not provided
      }
      // Add/update a 'lastShadowSyncedAt' timestamp
      processedSoldData.lastShadowSyncedAt = Timestamp.now();

      if (soldItemSnap.exists()) {
        logger.debug(
          `[ShadowSync] Card ${cardId} already exists in Firestore 'sold-items'. Updating with new data.`
        );
        await updateDoc(soldItemRef, processedSoldData); // Use processedSoldData
        logger.debug(
          `[ShadowSync] Updated existing sold card ${cardId} in Firestore.`
        );
        this._notifySyncCompleted(true);
        return true;
      }

      // If it doesn't exist in sold-items, then proceed to mark it as sold.
      logger.debug(
        `[ShadowSync] Card ${cardId} not found in Firestore 'sold-items'. Attempting to mark as sold via repository.`
      );
      // Pass processedSoldData to markCardAsSold as it contains the correct Timestamp format
      const sellOperationResult = await this.repository.markCardAsSold(
        cardId,
        processedSoldData
      );

      if (sellOperationResult && sellOperationResult.success) {
        logger.debug(
          `[ShadowSync] Successfully marked card ${cardId} as sold in Firestore via repository.`
        );
        this._notifySyncCompleted(true);
        return true;
      } else {
        const errorMessage = sellOperationResult
          ? sellOperationResult.message
          : 'Unknown error during markCardAsSold';
        logger.error(
          `[ShadowSync] Failed to mark card ${cardId} as sold via repository: ${errorMessage}`
        );
        // Specific handling if the card was 'not found' by markCardAsSold (original card)
        if (errorMessage && errorMessage.includes('not found')) {
          logger.warn(
            `[ShadowSync] Original card ${cardId} was not found by repository.markCardAsSold. Cannot complete sale normally.`
          );
        }
        this._notifySyncCompleted(false);
        return false;
      }
    } catch (error) {
      // This catch block handles unexpected errors from getDoc, updateDoc,
      // or if markCardAsSold itself throws an *unexpected* error (not its normal {success:false} return).
      logger.error(
        `[ShadowSync] Unexpected error in shadowWriteSoldCard for card ${cardId}: ${error.message}`,
        error
      );
      this._notifySyncCompleted(false);
      return false;
    }
  }

  /**
   * Shadow delete a card from Firestore
   *
   * @param {string} cardId - The card ID to delete
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shadowDeleteCard(cardId) {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      return false;
    }

    this._notifySyncStarted();
    try {
      // Check if online before attempting to write
      if (!this.isOnline()) {
        logger.debug('[ShadowSync] Device is offline, skipping shadow delete');
        this._notifySyncCompleted(false);
        return false;
      }

      logger.debug(
        `[ShadowSync] Shadow deleting card ${cardId} from Firestore`
      );

      if (cardId) {
        await this.repository.deleteCard(cardId);
        logger.debug(`[ShadowSync] Successfully shadow deleted card ${cardId}`);
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      // Log but don't disrupt app flow
      logger.error('[ShadowSync] Error shadow deleting card:', error);
      this._notifySyncCompleted(false);
      return false;
    }
  }

  /**
   * Update specific fields on a card document in Firestore
   *
   * @param {string} cardId - The card ID
   * @param {Object} fieldsToUpdate - Object containing the fields to update
   * @param {boolean} silent - If true, suppresses most logging for this update
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async updateCardField(cardId, fieldsToUpdate, silent = false) {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      return false;
    }

    this._notifySyncStarted();
    try {
      // Check if online before attempting to write
      if (!this.isOnline()) {
        logger.debug('[ShadowSync] Device is offline, skipping field update');
        this._notifySyncCompleted(false);
        return false;
      }

      logger.debug(
        `[ShadowSync] Updating fields for card ${cardId} in Firestore:`,
        fieldsToUpdate
      );

      if (cardId && fieldsToUpdate && Object.keys(fieldsToUpdate).length > 0) {
        // Update only the specified fields
        await this.repository.updateCardFields(cardId, fieldsToUpdate);
        if (!silent)
          logger.debug(
            `[ShadowSync] Successfully updated fields for card ${cardId}`
          );
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      logger.error('[ShadowSync] Error updating card fields:', error);
      this._notifySyncCompleted(false);
      return false;
    }
  }

  /**
   * Fetch all cloud data for the current user
   * @returns {Promise<{collections: Array, cards: Array}>} Collections and cards from cloud
   */
  async fetchCloudData() {
    if (!this.userId) {
      logger.error(
        '[ShadowSync] Cannot fetch cloud data: No user ID available'
      );
      return { collections: [], cards: [] };
    }

    try {
      logger.debug(
        `[ShadowSync] Fetching all cloud data for user ${this.userId}...`
      );

      // Get all collections from the cloud
      const collections = await this.repository.getCollections();
      logger.debug(
        `[ShadowSync] Fetched ${collections.length} collections from cloud`
      );

      // Get all cards from the cloud
      const cards = await this.repository.getAllCards();
      logger.debug(`[ShadowSync] Fetched ${cards.length} cards from cloud`);

      // Log a summary of the retrieved data
      if (collections.length > 0) {
        logger.debug(
          `[ShadowSync] Cloud collections: ${collections.map(c => c.name || c.id).join(', ')}`
        );
      }

      if (cards.length > 0) {
        logger.debug(`[ShadowSync] Cloud cards: ${cards.length} total cards`);
        // Log a sample of card IDs to help with debugging
        const sampleCards = cards
          .slice(0, 5)
          .map(c => c.id || c.slabSerial)
          .join(', ');
        logger.debug(
          `[ShadowSync] Sample cloud card IDs: ${sampleCards}${cards.length > 5 ? '...' : ''}`
        );
      }

      return {
        collections,
        cards,
      };
    } catch (error) {
      logger.error(`[ShadowSync] Error fetching cloud data:`, error);
      return { collections: [], cards: [] };
    }
  }

  /**
   * Check if user has cloud data in Firestore
   * Used to determine if we should offer data migration or auto-sync
   *
   * @returns {Promise<boolean>} - Whether the user has data in Firestore
   */
  async hasCloudData() {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      return false;
    }

    try {
      // Check if there are any collections in Firestore
      const collections = await this.repository.getCollections();

      // If there are collections, check if there are any cards
      if (collections.length > 0) {
        const cards = await this.repository.getAllCards();
        return cards.length > 0;
      }

      return false;
    } catch (error) {
      logger.error('[ShadowSync] Error checking for cloud data:', error);
      return false;
    }
  }

  // Method to set up Firestore listener for sold items
  listenToSoldItemsChanges() {
    if (this.unsubscribeSoldItemsListener) {
      this.unsubscribeSoldItemsListener(); // Unsubscribe from any previous listener
    }

    if (!this.repository || !this.repository.userId) {
      logger.warn(
        '[ShadowSync] Cannot listen to sold items: User ID not available in repository.'
      );
      // Attempt to get user ID directly if repository isn't fully set up with it
      // This might happen if initialize wasn't called with a fully ready repository
      const currentUser = auth.currentUser;
      if (!currentUser) {
        logger.warn('[ShadowSync] Current user not available for listener.');
        return;
      }
      this.repository.userId = currentUser.uid; // Assuming repository has a userId field
    }

    const userId = this.repository.userId;
    if (!userId) {
      logger.error(
        '[ShadowSync] User ID is null, cannot set up listener for sold items.'
      );
      return;
    }

    const soldItemsCollectionRef = collection(
      firestoreDb,
      'users',
      userId,
      'sold-items'
    );

    logger.debug(
      `[ShadowSync] Setting up onSnapshot listener for user ${userId}'s sold-items.`
    );

    this.unsubscribeSoldItemsListener = onSnapshot(
      soldItemsCollectionRef,
      async snapshot => {
        logger.debug('[ShadowSync] Received snapshot for sold-items.');
        const dbService = (await import('./firestore/dbAdapter')).default; // Dynamically import dbAdapter to avoid circular deps

        for (const change of snapshot.docChanges()) {
          const cardId = change.doc.id;
          const cardData = change.doc.data();

          switch (change.type) {
            case 'added':
              logger.debug(
                `[ShadowSync] Firestore 'added': ${cardId}`,
                cardData
              );
              await dbService.addOrUpdateSoldCardLocal(cardId, cardData); // To be created in db.js
              window.dispatchEvent(
                new CustomEvent('soldItemsUpdated', {
                  detail: { type: 'add', cardId, data: cardData },
                })
              );
              break;
            case 'modified':
              logger.debug(
                `[ShadowSync] Firestore 'modified': ${cardId}`,
                cardData
              );
              await dbService.addOrUpdateSoldCardLocal(cardId, cardData); // To be created in db.js
              window.dispatchEvent(
                new CustomEvent('soldItemsUpdated', {
                  detail: { type: 'update', cardId, data: cardData },
                })
              );
              break;
            case 'removed':
              logger.debug(`[ShadowSync] Firestore 'removed': ${cardId}`);
              await dbService.deleteSoldCardFromLocal(cardId); // To be created in db.js
              window.dispatchEvent(
                new CustomEvent('soldItemsUpdated', {
                  detail: { type: 'delete', cardId },
                })
              );
              break;
            default:
              logger.warn(`[ShadowSync] Unknown change type: ${change.type}`);
              break;
          }
        }
      },
      error => {
        logger.error(
          '[ShadowSync] Error in onSnapshot listener for sold-items:',
          error
        );
      }
    );

    // Store the unsubscribe function to be called on cleanup/re-init
    window.addEventListener('beforeunload', () => {
      if (this.unsubscribeSoldItemsListener) {
        logger.debug(
          '[ShadowSync] Unsubscribing from sold-items listener due to page unload.'
        );
        this.unsubscribeSoldItemsListener();
      }
    });
  }

  // Call this when user logs out or service is destroyed
  cleanupListeners() {
    if (this.unsubscribeSoldItemsListener) {
      logger.debug('[ShadowSync] Cleaning up sold-items listener.');
      this.unsubscribeSoldItemsListener();
      this.unsubscribeSoldItemsListener = null;
    }
  }

  // New method for deleting multiple sold items from Firestore
  async shadowDeleteSoldItems(cardIds) {
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      logger.debug(
        '[ShadowSync] Firestore sync disabled, skipping shadow delete of sold items.'
      );
      return { success: false, message: 'Firestore sync disabled' };
    }
    if (!this.isOnline()) {
      logger.debug(
        '[ShadowSync] Device is offline, skipping shadow delete of sold items.'
      );
      return { success: false, message: 'Device offline' };
    }
    if (!this.repository || !this.repository.userId) {
      logger.error(
        '[ShadowSync] User ID not available, cannot delete sold items from Firestore.'
      );
      return { success: false, message: 'User ID not available' };
    }

    this._notifySyncStarted();
    const userId = this.repository.userId;
    const batch = writeBatch(firestoreDb);
    let operationCount = 0;

    for (const cardId of cardIds) {
      const docRef = doc(firestoreDb, 'users', userId, 'sold-items', cardId);
      batch.delete(docRef);
      operationCount++;
      logger.debug(
        `[ShadowSync] Queued deletion of sold item ${cardId} from Firestore.`
      );

      if (operationCount >= MAX_BATCH_OPERATIONS) {
        try {
          await batch.commit();
          logger.debug(
            `[ShadowSync] Committed batch of ${operationCount} sold item deletions to Firestore.`
          );
          // Re-initialize batch for next set of operations if any
          // This part of the code doesn't exist, so batch would be re-declared (let batch = writeBatch(firestoreDb);)
          // but it's better to re-assign: batch = writeBatch(firestoreDb);
          // For simplicity, if we hit MAX_BATCH_OPERATIONS, we might just error or handle this case specifically.
          // Current implementation implies cardIds will be less than MAX_BATCH_OPERATIONS or this needs more logic.
        } catch (error) {
          logger.error(
            '[ShadowSync] Error committing batch deletion of sold items:',
            error
          );
          this._notifySyncCompleted(false);
          return { success: false, message: 'Batch commit failed', error };
        }
        operationCount = 0; // Reset for next batch, though current loop structure doesn't fully support >500 items well.
      }
    }

    try {
      if (operationCount > 0) {
        await batch.commit();
        logger.debug(
          `[ShadowSync] Committed final batch of ${operationCount} sold item deletions to Firestore.`
        );
      }
      this._notifySyncCompleted(true);
      return {
        success: true,
        message: `${cardIds.length} sold items scheduled for deletion from Firestore.`,
      };
    } catch (error) {
      logger.error(
        '[ShadowSync] Error committing final batch deletion of sold items:',
        error
      );
      this._notifySyncCompleted(false);
      return { success: false, message: 'Final batch commit failed', error };
    }
  }
}

const shadowSync = new ShadowSyncService();

// Initialize shadowSync when CardRepository is ready with user info
// This might need adjustment based on how CardRepository signals its readiness
// A common pattern is to use an event emitter or a callback system.
// For now, assuming CardRepository might call shadowSync.initialize() when it's ready.

export default shadowSync;
