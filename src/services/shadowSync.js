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

class ShadowSyncService {
  constructor() {
    this.repository = null;
    this.userId = null;
    this.isInitialized = false;
    this.listenerUnsubscribe = null;
    this.onlineStatus = navigator.onLine;

    // Track migration status
    this.migrationInProgress = false;
    this.migrationProgress = 0;
    this.migrationError = null;
    
    // Track sync activity
    this.syncInProgress = false;
    this.syncOperationsCount = 0;
    this.lastSyncTime = null;
    
    // Track card queue processing
    this._processingQueue = false;
    this._cardQueue = [];
    this._lastSaveTimestamp = null;
    this._updateInProgress = false;
    
    // Track cards that have been recently updated
    this._recentlyUpdatedCards = new Set();
    
    // Track skipped card counts to reduce log spam
    this._skippedCardCount = 0;
    this._lastLogTimestamp = 0;
    
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
  }

  /**
   * Cleanup resources when user signs out
   */
  cleanup() {
    if (this.listenerUnsubscribe) {
      this.listenerUnsubscribe();
      this.listenerUnsubscribe = null;
    }
    this.repository = null;
    this.userId = null;
    this.isInitialized = false;
  }

  /**
   * Notify the UI about sync activity
   * @private
   */
  _notifySyncStarted() {
    this.syncInProgress = true;
    this.syncOperationsCount++;
    
    // Dispatch event for UI components to listen to
    window.dispatchEvent(new CustomEvent('shadow-sync-activity', {
      detail: {
        type: 'started',
        count: this.syncOperationsCount
      }
    }));
  }
  
  /**
   * Notify the UI about sync completion
   * @private
   */
  _notifySyncCompleted(success = true) {
    this.syncInProgress = false;
    this.lastSyncTime = new Date();
    
    // Dispatch event for UI components to listen to
    window.dispatchEvent(new CustomEvent('shadow-sync-activity', {
      detail: {
        type: 'completed',
        success,
        time: this.lastSyncTime
      }
    }));
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
      isInitialized: this.isInitialized
    };
  }

  /**
   * Checks if the browser is currently online
   * @returns {boolean} - True if online, false otherwise
   */
  isOnline() {
    return this.onlineStatus;
  }

  /**
   * Process cards from the cache and write them to Firestore
   * @returns {Promise<void>}
   */
  async _processCardQueue() {
    if (!this.isInitialized || !this.isOnline() || this._processingQueue || !featureFlags.enableFirestoreSync) {
      return;
    }

    // Skip process if we just saved a card - prevents mass update cascades from a single save
    const now = Date.now();
    if (this._lastSaveTimestamp && (now - this._lastSaveTimestamp < 3000)) {
      logger.debug(`[ShadowSync] Skipping queue processing - recent save detected (${now - this._lastSaveTimestamp}ms ago)`);
      return;
    }

    // Skip if queue is empty
    if (this._cardQueue.length === 0) {
      return;
    }

    // Set processing flag to prevent concurrent processing
    this._processingQueue = true;
    logger.debug(`[ShadowSync] Processing card queue with ${this._cardQueue.length} items...`);

    // Create a local copy of the queue and clear the global queue
    const queueCopy = [...this._cardQueue];
    this._cardQueue = [];

    try {
      // If queue is too large (over 5 cards), only process the first card to prevent performance issues
      const itemsToProcess = queueCopy.length > 5 ? [queueCopy[0]] : queueCopy;
      
      if (queueCopy.length > 5) {
        logger.debug(`[ShadowSync] Queue has ${queueCopy.length} items - limiting to only process first item to prevent performance issues`);
      }

      // Only process if we're not in the middle of a save
      if (!this._updateInProgress) {
        for (const item of itemsToProcess) {
          try {
            await this.shadowWriteCard(item.id, item.card, item.collectionName);
          } catch (error) {
            logger.error(`[ShadowSync] Error processing queue item for card ${item?.id}:`, error);
          }
        }
      } else {
        logger.debug(`[ShadowSync] Skipping queue processing - update already in progress`);
      }
      
      // Clear the rest of the queue if we limited processing
      if (queueCopy.length > itemsToProcess.length) {
        logger.debug(`[ShadowSync] Cleared remaining ${queueCopy.length - itemsToProcess.length} items from queue`);
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
      logger.debug(`[ShadowSync] Skipping queue add for ${cardId} - update already in progress`);
      return;
    }

    // Skip if not initialized or offline
    if (!this.isInitialized || !this.isOnline()) {
      return;
    }
    
    // Skip if we're in a cooling-off period after a save
    const now = Date.now();
    if (this._lastSaveTimestamp && (now - this._lastSaveTimestamp < 3000)) {
      logger.debug(`[ShadowSync] Skipping queue add - in cooling period (${now - this._lastSaveTimestamp}ms since last save)`);
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
        collectionName
      };
    } else {
      // Add new card to queue
      this._cardQueue.push({
        id: cardId,
        card,
        collectionName
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
    if (!featureFlags.enableFirestoreSync || !this.isInitialized || !this.isOnline()) {
      logger.debug('[ShadowSync] Skipping shadow write for card, feature flag disabled or offline');
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
        hasDebugFlag: card._saveDebug || false
      });
    }

    // Skip processing if card has no ID
    if (!cardId) {
      logger.error('[ShadowSync] Card object missing ID for shadow write.');
      return false;
    }
    
    // Skip if user is saving a card directly (_saveDebug flag set)
    if (card._saveDebug) {
      logger.debug(`[ShadowSync] Skipping shadow write for card ${cardId} - card is being saved directly`);
      this._lastSaveTimestamp = now;
      
      // Add to recently updated cards set
      this._recentlyUpdatedCards.add(cardId);
      
      // Reset skipped card counter when a direct card save happens
      if (this._skippedCardCount > 0) {
        logger.debug(`[ShadowSync] Skipped shadow write for ${this._skippedCardCount} cards in previous batch`);
        this._skippedCardCount = 0;
      }
      
      return true;
    }
    
    // Check if this is already part of a managed update flow
    // If _lastUpdateTime exists, this card is being handled by the updateCard function directly
    if (card._lastUpdateTime) {
      // Only log individual skips for non-batch operations or the first few cards
      if (!isInBatchMode || this._skippedCardCount < 5) {
        logger.debug(`[ShadowSync] Skipping shadow write for card ${cardId} - already part of tracked update flow (${card._lastUpdateTime})`);
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
        logger.debug(`[ShadowSync] Skipping shadow write for card ${cardId} - recently updated`);
      }
      
      this._skippedCardCount++;
      return true;
    }
    
    // Skip if we're in an update cooldown period
    if (this._lastSaveTimestamp && (now - this._lastSaveTimestamp < 3000)) {
      // Only log individual skips for non-batch operations or the first few cards
      if (!isInBatchMode || this._skippedCardCount < 5) {
        logger.debug(`[ShadowSync] Skipping shadow write for card ${cardId} - in cooldown period (${now - this._lastSaveTimestamp}ms since last save)`);
      }
      
      this._skippedCardCount++;
      
      // Periodically log summary of skipped cards to reduce spam but still provide info
      if (this._skippedCardCount > 0 && now - this._lastLogTimestamp > 1000) {
        logger.debug(`[ShadowSync] Skipped shadow write for ${this._skippedCardCount} cards due to cooldown`);
        this._lastLogTimestamp = now;
      }
      
      return true;
    }
    
    // Mark that we're in the middle of an update
    this._updateInProgress = true;
    
    // Reset skipped card counter when doing an actual write
    if (this._skippedCardCount > 0) {
      logger.debug(`[ShadowSync] Skipped shadow write for ${this._skippedCardCount} cards in previous batch`);
      this._skippedCardCount = 0;
    }
    
    // Track start time for performance monitoring
    const startTime = performance.now();
    this._notifySyncStarted();
    
    try {
      logger.debug(`[ShadowSync] Preparing to write card ${cardId} to collection ${collectionName || 'unknown'}`);
      
      // Ensure collectionId is included in the data to be written
      const cardDataToWrite = {
        ...card
      };
      
      // Only add collection fields if collectionName is valid
      if (collectionName) {
        cardDataToWrite.collectionId = collectionName; // Explicitly add collectionId
        cardDataToWrite.collection = collectionName;  // Add collection property for backward compatibility
      }
      
      // Remove the id property from the data itself if it exists, as it's the document key
      delete cardDataToWrite.id; 

      // Combine ID, data, and collection into a single payload object
      const updatePayload = {
        ...cardDataToWrite,
        id: cardId, // Ensure the ID is included
        collection: collectionName, // Use the collection name passed
        collectionId: collectionName // Also set collectionId for consistency
      };

      // Directly update the card without extensive checks (our getCard optimization will handle this)
      logger.debug(`[ShadowSync] Calling repository.updateCard for ${cardId}`);
      const repoStart = performance.now();
      await this.repository.updateCard(updatePayload);
      const repoEnd = performance.now();
      
      // Log performance metrics
      const endTime = performance.now();
      logger.debug(`[ShadowSync] Repository update took ${(repoEnd - repoStart).toFixed(2)}ms`);
      logger.debug(`[ShadowSync] Total shadow write operation for ${cardId} completed in ${(endTime - startTime).toFixed(2)}ms`);
      
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
      logger.error(`[ShadowSync] Error writing card ${cardId} to Firestore:`, error);
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
      logger.debug('[ShadowSync] Skipping shadow write for collection, feature flag disabled');
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

      logger.debug(`[ShadowSync] Shadow writing collection ${collectionId} to Firestore`);
      if (collectionId && collectionData) {
        await this.repository.createCollectionWithId(collectionId, collectionData);
        logger.debug(`[ShadowSync] Successfully shadow wrote collection ${collectionId}`);
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
        logger.debug('[ShadowSync] Device is offline, skipping shadow write');
        this._notifySyncCompleted(false);
        return false;
      }

      logger.debug(`[ShadowSync] Shadow writing sold card ${cardId} to Firestore`);
      
      if (cardId && soldData) {
        // Ensure soldPrice is a valid number
        const processedSoldData = { ...soldData };
        if (processedSoldData.soldPrice !== undefined) {
          // Convert to number if it's a string
          if (typeof processedSoldData.soldPrice === 'string') {
            processedSoldData.soldPrice = parseFloat(processedSoldData.soldPrice);
          }
          
          // If still not a valid number after conversion, set a default value
          if (isNaN(processedSoldData.soldPrice) || typeof processedSoldData.soldPrice !== 'number') {
            processedSoldData.soldPrice = 0;
          }
        } else {
          // Default value if soldPrice is missing
          processedSoldData.soldPrice = 0;
        }
        
        // Mark card as sold in Firestore
        await this.repository.markCardAsSold(cardId, processedSoldData);
        logger.debug(`[ShadowSync] Successfully shadow wrote sold card ${cardId}`);
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      logger.error(`[ShadowSync] Error writing sold card ${cardId} to Firestore:`, error);
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

      logger.debug(`[ShadowSync] Shadow deleting card ${cardId} from Firestore`);
      
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

      logger.debug(`[ShadowSync] Updating fields for card ${cardId} in Firestore:`, fieldsToUpdate);
      
      if (cardId && fieldsToUpdate && Object.keys(fieldsToUpdate).length > 0) {
        // Update only the specified fields
        await this.repository.updateCardFields(cardId, fieldsToUpdate);
        if (!silent) logger.debug(`[ShadowSync] Successfully updated fields for card ${cardId}`);
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
      logger.error('[ShadowSync] Cannot fetch cloud data: No user ID available');
      return { collections: [], cards: [] };
    }
    
    try {
      logger.debug(`[ShadowSync] Fetching all cloud data for user ${this.userId}...`);
      
      // Get all collections from the cloud
      const collections = await this.repository.getCollections();
      logger.debug(`[ShadowSync] Fetched ${collections.length} collections from cloud`);
      
      // Get all cards from the cloud
      const cards = await this.repository.getAllCards();
      logger.debug(`[ShadowSync] Fetched ${cards.length} cards from cloud`);
      
      // Log a summary of the retrieved data
      if (collections.length > 0) {
        logger.debug(`[ShadowSync] Cloud collections: ${collections.map(c => c.name || c.id).join(', ')}`);
      }
      
      if (cards.length > 0) {
        logger.debug(`[ShadowSync] Cloud cards: ${cards.length} total cards`);
        // Log a sample of card IDs to help with debugging
        const sampleCards = cards.slice(0, 5).map(c => c.id || c.slabSerial).join(', ');
        logger.debug(`[ShadowSync] Sample cloud card IDs: ${sampleCards}${cards.length > 5 ? '...' : ''}`);
      }
      
      return {
        collections,
        cards
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

  /**
   * Get the current migration status
   * @returns {Object} Migration status object
   */
  getMigrationStatus() {
    return {
      inProgress: this.migrationInProgress,
      progress: this.migrationProgress,
      error: this.migrationError
    };
  }

  // Additional methods will be implemented in future phases:
  // - startBackgroundMigration
  // - enableRealtimeListeners
  // - syncFromFirestore
}

// Create singleton instance
const shadowSync = new ShadowSyncService();
export default shadowSync;
