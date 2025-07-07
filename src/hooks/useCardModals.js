import { useState, useCallback } from 'react';

/**
 * Custom hook to manage card-related modal states and handlers
 */
export const useCardModals = () => {
  // Modal states
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [initialCardCollection, setInitialCardCollection] = useState(null);

  // Modal handlers
  const openNewCardForm = useCallback(() => {
    setShowNewCardForm(true);
  }, []);

  const closeNewCardForm = useCallback(() => {
    setShowNewCardForm(false);
  }, []);

  const openCardDetails = useCallback((card, collection) => {
    setSelectedCard(card);
    setInitialCardCollection(collection);
  }, []);

  const closeCardDetails = useCallback(() => {
    setSelectedCard(null);
    setInitialCardCollection(null);
  }, []);

  return {
    // States
    showNewCardForm,
    selectedCard,
    initialCardCollection,

    // Handlers
    openNewCardForm,
    closeNewCardForm,
    openCardDetails,
    closeCardDetails,

    // Direct setters (for compatibility)
    setShowNewCardForm,
    setSelectedCard,
    setInitialCardCollection,
  };
};
