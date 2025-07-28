// Ghost Card Detector - Utility to identify and clean up cards that exist in frontend but not in backend
import LoggingService from '../services/LoggingService';
import { CardRepository } from '../repositories/CardRepository';

/**
 * Detects cards that exist in frontend state but not in Firestore database
 */
export class GhostCardDetector {
  constructor(userId) {
    this.repository = new CardRepository(userId);
    this.userId = userId;
  }

  /**
   * Compare frontend cards with backend data to find ghost cards
   * @param {Array} frontendCards - Cards from frontend state
   * @returns {Promise<Object>} Analysis results
   */
  async detectGhostCards(frontendCards) {
    try {
      LoggingService.info(`[GhostCardDetector] Analyzing ${frontendCards.length} frontend cards`);
      
      const results = {
        totalFrontendCards: frontendCards.length,
        ghostCards: [],
        validCards: [],
        errors: []
      };

      // Check each frontend card against backend
      for (const card of frontendCards) {
        try {
          const backendCard = await this.repository.getCard(card.id);
          
          if (!backendCard) {
            // Ghost card detected
            results.ghostCards.push({
              id: card.id,
              cardName: card.cardName || card.card || 'Unknown',
              collection: card.collection || card.collectionId || 'Unknown',
              slabSerial: card.slabSerial,
              reason: 'Card exists in frontend but not in Firestore'
            });
            LoggingService.warn(`[GhostCardDetector] Ghost card detected: ${card.id}`);
          } else {
            results.validCards.push(card.id);
          }
        } catch (error) {
          results.errors.push({
            cardId: card.id,
            error: error.message
          });
          LoggingService.error(`[GhostCardDetector] Error checking card ${card.id}:`, error);
        }
      }

      LoggingService.info(`[GhostCardDetector] Analysis complete: ${results.ghostCards.length} ghost cards found`);
      return results;
    } catch (error) {
      LoggingService.error('[GhostCardDetector] Error during ghost card detection:', error);
      throw error;
    }
  }

  /**
   * Clean up ghost cards from frontend state and local storage
   * @param {Array} ghostCards - List of ghost cards to remove
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupGhostCards(ghostCards) {
    try {
      LoggingService.info(`[GhostCardDetector] Starting cleanup of ${ghostCards.length} ghost cards`);
      
      const results = {
        totalCleaned: 0,
        errors: [],
        cleanedCards: []
      };

      for (const ghostCard of ghostCards) {
        try {
          // Use the repository's force delete method to clean up ghost data
          const cleanupResult = await this.repository.forceDeleteCard(ghostCard.id);
          
          if (cleanupResult.success) {
            results.cleanedCards.push(ghostCard.id);
            results.totalCleaned++;
            LoggingService.info(`[GhostCardDetector] Successfully cleaned ghost card: ${ghostCard.id}`);
          } else {
            results.errors.push({
              cardId: ghostCard.id,
              error: cleanupResult.error || 'Unknown cleanup error'
            });
          }
        } catch (error) {
          results.errors.push({
            cardId: ghostCard.id,
            error: error.message
          });
          LoggingService.error(`[GhostCardDetector] Error cleaning ghost card ${ghostCard.id}:`, error);
        }
      }

      // Dispatch event to notify components to refresh their state
      window.dispatchEvent(new CustomEvent('ghost-cards-cleaned', {
        detail: { cleanedCardIds: results.cleanedCards }
      }));

      LoggingService.info(`[GhostCardDetector] Cleanup complete: ${results.totalCleaned} cards cleaned`);
      return results;
    } catch (error) {
      LoggingService.error('[GhostCardDetector] Error during ghost card cleanup:', error);
      throw error;
    }
  }

  /**
   * Complete ghost card detection and cleanup process
   * @param {Array} frontendCards - Cards from frontend state
   * @returns {Promise<Object>} Full analysis and cleanup results
   */
  async detectAndCleanup(frontendCards) {
    try {
      LoggingService.info('[GhostCardDetector] Starting ghost card detection and cleanup process');
      
      // Step 1: Detect ghost cards
      const detection = await this.detectGhostCards(frontendCards);
      
      // Step 2: Clean up ghost cards if any found
      let cleanup = null;
      if (detection.ghostCards.length > 0) {
        cleanup = await this.cleanupGhostCards(detection.ghostCards);
      }

      const results = {
        detection,
        cleanup,
        summary: {
          totalFrontendCards: detection.totalFrontendCards,
          ghostCardsFound: detection.ghostCards.length,
          ghostCardsRemoved: cleanup ? cleanup.totalCleaned : 0,
          validCards: detection.validCards.length,
          errors: [...detection.errors, ...(cleanup ? cleanup.errors : [])]
        }
      };

      LoggingService.info('[GhostCardDetector] Process complete:', results.summary);
      return results;
    } catch (error) {
      LoggingService.error('[GhostCardDetector] Error in detectAndCleanup process:', error);
      throw error;
    }
  }
}

/**
 * Utility function to create and run ghost card detection
 * @param {string} userId - User ID
 * @param {Array} frontendCards - Cards from frontend state
 * @returns {Promise<Object>} Results
 */
export async function detectAndCleanupGhostCards(userId, frontendCards) {
  const detector = new GhostCardDetector(userId);
  return await detector.detectAndCleanup(frontendCards);
} 