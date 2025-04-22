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

    // Track migration status
    this.migrationInProgress = false;
    this.migrationProgress = 0;
    this.migrationError = null;
    
    // Track sync activity
    this.syncInProgress = false;
    this.syncOperationsCount = 0;
    this.lastSyncTime = null;
    
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
      isOnline: navigator.onLine,
      isInitialized: this.isInitialized
    };
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
      if (!navigator.onLine) {
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
   * Shadow write a card to Firestore
   * 
   * @param {Object} card - The full card object to write
   * @param {string} collectionName - The name of the collection the card belongs to
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async shadowWriteCard(card, collectionName) {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      logger.debug('[ShadowSync] Skipping shadow write for card, feature flag disabled');
      return false;
    }

    this._notifySyncStarted();
    try {
      // Check if online before attempting to write
      if (!navigator.onLine) {
        logger.debug('[ShadowSync] Device is offline, skipping shadow write');
        this._notifySyncCompleted(false);
        return false;
      }

      // Extract cardId and prepare data object
      const cardId = card.id;
      if (!cardId) {
        logger.error('[ShadowSync] Card object missing ID for shadow write.');
        this._notifySyncCompleted(false);
        return false;
      }
      
      // Ensure collectionId is included in the data to be written
      const cardDataToWrite = {
        ...card,
        collectionId: collectionName // Explicitly add collectionId
      };
      // Remove the id property from the data itself if it exists, as it's the document key
      delete cardDataToWrite.id; 

      logger.debug(`[ShadowSync] Shadow writing card ${cardId} to Firestore in collection ${collectionName}`);
      
      if (cardId && cardDataToWrite) {
        // Check if the card exists in Firestore first (using cardId and userId)
        const existingCard = await this.repository.getCard(cardId);
        
        if (existingCard) {
          // Pass the full data including collectionId for update
          await this.repository.updateCard(cardId, cardDataToWrite);
        } else {
          // If card doesn't exist, we might still want to update fields if it's a partial sync scenario
          // Ensure updateCardFields also handles/expects collectionId if needed
          // Forcing a full update might be safer if create isn't handled separately.
          // Let's assume updateCard can handle creating if not exists, or handle appropriately.
          // Reverting to updateCard as updateCardFields might not be suitable for full object sync.
          await this.repository.updateCard(cardId, cardDataToWrite); 
        }
        
        logger.debug(`[ShadowSync] Successfully shadow wrote card ${cardId}`);
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      logger.error(`[ShadowSync] Error writing card ${cardId} to Firestore:`, error);
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
      if (!navigator.onLine) {
        logger.debug('[ShadowSync] Device is offline, skipping shadow write');
        this._notifySyncCompleted(false);
        return false;
      }

      logger.debug(`[ShadowSync] Shadow writing sold card ${cardId} to Firestore`);
      
      if (cardId && soldData) {
        // Mark card as sold in Firestore
        await this.repository.markCardAsSold(cardId, soldData);
        logger.debug(`[ShadowSync] Successfully shadow wrote sold card ${cardId}`);
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      // Log but don't disrupt app flow
      logger.error('[ShadowSync] Error shadow writing sold card:', error);
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
      if (!navigator.onLine) {
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
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async updateCardField(cardId, fieldsToUpdate) {
    // Skip if feature flag is disabled or not initialized
    if (!featureFlags.enableFirestoreSync || !this.isInitialized) {
      return false;
    }

    this._notifySyncStarted();
    try {
      // Check if online before attempting to write
      if (!navigator.onLine) {
        logger.debug('[ShadowSync] Device is offline, skipping field update');
        this._notifySyncCompleted(false);
        return false;
      }

      logger.debug(`[ShadowSync] Updating fields for card ${cardId} in Firestore:`, fieldsToUpdate);
      
      if (cardId && fieldsToUpdate && Object.keys(fieldsToUpdate).length > 0) {
        // Update only the specified fields
        await this.repository.updateCardFields(cardId, fieldsToUpdate);
        logger.debug(`[ShadowSync] Successfully updated fields for card ${cardId}`);
        this._notifySyncCompleted(true);
        return true;
      }
      this._notifySyncCompleted(false);
      return false;
    } catch (error) {
      // Log but don't disrupt app flow
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
