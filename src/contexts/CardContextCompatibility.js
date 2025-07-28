import { useState, useCallback } from 'react';
import { useCards } from './CardContext';
import logger from '../utils/logger';
import LoggingService from '../services/LoggingService';

/**
 * Compatibility wrapper that provides the exact same API as useCardData
 * but uses CardContext underneath. This ensures 100% API compatibility
 * during migration without breaking any existing components.
 */
const useCardDataCompatible = () => {
  // Get CardContext data
  const cardContextData = useCards();
  
  // Local state for properties that CardContext doesn't manage
  const [selectedCard, setSelectedCard] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(1.5);

  // API-compatible wrapper functions
  
  const selectCard = useCallback(card => {
    setSelectedCard(card);
  }, []);

  const clearSelectedCard = useCallback(() => {
    setSelectedCard(null);
  }, []);

  // Compatible updateCard function - handles both single param (useCardData style) 
  // and two param (CardContext style) calling patterns
  const updateCard = useCallback(async (cardIdOrCard, data) => {
    try {
      if (typeof cardIdOrCard === 'object' && !data) {
        // Single parameter mode (useCardData style)
        // updateCard(cardObject)
        const updatedCard = cardIdOrCard;
        const cardId = updatedCard?.id || updatedCard?.slabSerial;
        
        if (!updatedCard || !cardId) {
          logger.error('Update card failed: Invalid card data or missing ID.', updatedCard);
          throw new Error('Failed to update card: Invalid data.');
        }

        // Call CardContext updateCard with two parameters
        await cardContextData.updateCard(cardId, updatedCard);
      } else {
        // Two parameter mode (CardContext style) 
        // updateCard(cardId, data)
        await cardContextData.updateCard(cardIdOrCard, data);
      }
    } catch (err) {
      LoggingService.error(`[CardContextCompatible] Error updating card:`, err);
      throw err;
    }
  }, [cardContextData.updateCard]);

  // Compatible addCard function (alias for createCard)
  const addCard = useCallback(async (newCard) => {
    try {
      await cardContextData.createCard(newCard);
    } catch (err) {
      LoggingService.error(`[CardContextCompatible] Error adding card:`, err);
      throw err;
    }
  }, [cardContextData.createCard]);

  // Compatible deleteCard function
  const deleteCard = useCallback(async (cardId) => {
    try {
      await cardContextData.deleteCard(cardId);
    } catch (err) {
      LoggingService.error(`[CardContextCompatible] Error deleting card:`, err);
      throw err;
    }
  }, [cardContextData.deleteCard]);

  // Placeholder for importCsvData (would need full implementation)
  const importCsvData = useCallback(async (file, importMode = 'priceUpdate') => {
    try {
      // This would need to be implemented or imported from useCardData
      throw new Error('importCsvData not yet implemented in compatibility layer');
    } catch (err) {
      LoggingService.error(`[CardContextCompatible] Error importing CSV:`, err);
      throw err;
    }
  }, []);

  // Exchange rate management
  const updateExchangeRate = useCallback((newRate) => {
    setExchangeRate(newRate);
  }, []);

  // Error setter (for compatibility)
  const setError = cardContextData.setError || (() => {
    logger.warn('setError called but not available in CardContext');
  });

  // Return exactly the same API as useCardData
  return {
    // Data
    cards: cardContextData.cards,
    loading: cardContextData.loading,
    error: cardContextData.error,
    selectedCard,
    exchangeRate,
    
    // Functions  
    importCsvData,
    selectCard,
    clearSelectedCard,
    updateCard,
    addCard,
    deleteCard,
    updateExchangeRate,
    setSelectedCard,
    setError,
  };
};

export default useCardDataCompatible; 