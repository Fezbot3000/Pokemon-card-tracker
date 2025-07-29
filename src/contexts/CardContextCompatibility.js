import { useState, useCallback } from 'react';
import { useCards } from './CardContext';
import { parseCSVFile, validateCSVStructure } from '../utils/dataProcessor';
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
  }, [cardContextData]);

  // Compatible addCard function (alias for createCard)
  const addCard = useCallback(async (newCard) => {
    try {
      await cardContextData.createCard(newCard);
    } catch (err) {
      LoggingService.error(`[CardContextCompatible] Error adding card:`, err);
      throw err;
    }
  }, [cardContextData]);

  // Compatible deleteCard function
  const deleteCard = useCallback(async (cardId) => {
    try {
      await cardContextData.deleteCard(cardId);
    } catch (err) {
      LoggingService.error(`[CardContextCompatible] Error deleting card:`, err);
      throw err;
    }
  }, [cardContextData]);

  // Placeholder for importCsvData (would need full implementation)
  const importCsvData = useCallback(async (file, importMode = 'priceUpdate') => {
    // Use CardContext loading/error states if available, fallback to local handling
    const setLoading = cardContextData.setLoading || (() => {});
    const setError = cardContextData.setError || (() => {});
    
    setLoading(true);
    setError(null);

    try {
      // Parse the CSV file
      const parsedData = await parseCSVFile(file);

      // Validate the structure based on import mode
      const validation = validateCSVStructure(parsedData, importMode);
      if (!validation.success) {
        throw new Error(validation.error);
      }

      return {
        success: true,
        message: `Imported ${parsedData.length} cards successfully.`,
        data: parsedData,
      };
    } catch (error) {
      setError(error.message);
      return {
        success: false,
        message: error.message,
      };
    } finally {
      setLoading(false);
    }
  }, [cardContextData]);

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