import { useState, useCallback } from 'react';
import { parseCSVFile, validateCSVStructure } from '../utils/dataProcessor';
import logger from '../utils/logger';
import useFirestoreCardsSubscription from './cards/useFirestoreCardsSubscription';
import useCardCrud from './cards/useCardCrud';

const useCardData = () => {
  // Subscribe to Firestore (or clear when logged out)
  const {
    cards,
    setCards,
    loading,
    setLoading,
    error,
    setError,
    currentUser,
  } = useFirestoreCardsSubscription();

  // Local UI-only state
  const [selectedCard, setSelectedCard] = useState(null);

  // Import CSV data - Wrapped in useCallback
  const importCsvData = useCallback(
    async (file, importMode = 'priceUpdate') => {
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
    },
    []
  ); // Dependencies: parseCSVFile, validateCSVStructure are static imports, setLoading, setError are stable setters

  // Select a card to view details - Wrapped in useCallback
  const selectCard = useCallback(card => {
    setSelectedCard(card);
  }, []); // Dependency: setSelectedCard is stable

  // Clear selected card - Wrapped in useCallback
  const clearSelectedCard = useCallback(() => {
    setSelectedCard(null);
  }, []); // Dependency: setSelectedCard is stable

  // Update a card - Wrapped in useCallback
  // CRUD operations
  const { addCard, updateCard, deleteCard } = useCardCrud({
    currentUser,
    setCards,
    setLoading,
    setError,
  });

  return {
    cards,
    loading,
    error,
    selectedCard,
    importCsvData,
    selectCard,
    clearSelectedCard,
    updateCard,
    addCard,
    deleteCard,
    setSelectedCard, // Expose setter if needed externally
    setError, // Expose setter if needed externally
  };
};

export default useCardData;
