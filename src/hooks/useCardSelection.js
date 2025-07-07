import { useState, useCallback } from 'react';

/**
 * Custom hook for managing card selection state
 * @param {Array} cards - Array of cards to track selection for
 * @returns {Object} Selection state and handlers
 */
export const useCardSelection = (cards = []) => {
  const [selectedCards, setSelectedCards] = useState(new Set());

  // Handle selecting/deselecting a single card
  const handleSelectCard = useCallback((e, cardId) => {
    // If e is a boolean (direct from Card component), convert it
    if (typeof e === 'boolean') {
      const isSelected = e;
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        if (!isSelected) {
          newSet.delete(cardId);
        } else {
          newSet.add(cardId);
        }
        return newSet;
      });
      return;
    }

    // Otherwise, handle as normal event
    // If e exists, stop propagation to prevent triggering the card click
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  // Handle selecting/deselecting all cards
  const handleSelectAll = useCallback(() => {
    // If all cards are already selected, deselect all
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      // Otherwise, select all cards
      const allCardIds = cards.map(card => card.slabSerial);
      setSelectedCards(new Set(allCardIds));
    }
  }, [selectedCards.size, cards]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  // Get selected card objects
  const getSelectedCards = useCallback(() => {
    return cards.filter(card => selectedCards.has(card.slabSerial));
  }, [cards, selectedCards]);

  // Check if a card is selected
  const isCardSelected = useCallback(
    cardId => {
      return selectedCards.has(cardId);
    },
    [selectedCards]
  );

  return {
    selectedCards,
    selectedCount: selectedCards.size,
    handleSelectCard,
    handleSelectAll,
    clearSelection,
    getSelectedCards,
    isCardSelected,
    setSelectedCards, // Expose setter for edge cases
  };
};
