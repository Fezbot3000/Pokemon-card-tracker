import { useState, useEffect, useCallback } from 'react';
import { parseCSVFile, processImportedData, validateCSVStructure } from '../utils/dataProcessor';
import { getUsdToAudRate } from '../utils/currencyAPI';
import { useAuth } from '../design-system/contexts/AuthContext';
import { CardRepository } from '../repositories/CardRepository';

const useCardData = () => {
  // State for cards and UI
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(1.5); // Default USD to AUD rate
  const { currentUser } = useAuth();

  // Fetch exchange rate on mount
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const rate = await getUsdToAudRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Keep the default rate if fetch fails
      }
    };

    fetchExchangeRate();

    // Initial data load logic moved to Firestore listener effect
    // // Load cards from localStorage if available (Fallback logic removed for now)
    // const savedCards = localStorage.getItem('pokemonCards');
    // if (savedCards) {
    //   try {
    //     setCards(JSON.parse(savedCards));
    //   } catch (error) {
    //     console.error('Error parsing saved cards:', error);
    //   }
    // }
    // setLoading(false); // Loading state managed by Firestore listener
  }, []);

  // Firestore Listener for Real-time Card Updates
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      const repository = new CardRepository(currentUser.uid);
      console.log(`Setting up Firestore listener for user: ${currentUser.uid}`);

      const unsubscribe = repository.subscribeToAllCards((firestoreCards) => {
        console.log('Received card update from Firestore:', firestoreCards);
        setCards(firestoreCards);
        setLoading(false);
        setError(null); // Clear any previous error on successful fetch
      }, (err) => { // Add error handling for the subscription
        console.error("Error subscribing to Firestore cards:", err);
        setError("Failed to load cards from cloud.");
        setLoading(false);
      });

      // Cleanup subscription on unmount or user change
      return () => {
        console.log(`Cleaning up Firestore listener for user: ${currentUser.uid}`);
        unsubscribe();
      };
    } else {
      // No user logged in, clear cards and potentially load from localStorage (optional)
      console.log('No user logged in, clearing cards.');
      setCards([]);
      setLoading(false);
      // Optional: Load from localStorage as fallback
      // const savedCards = localStorage.getItem('pokemonCards');
      // if (savedCards) setCards(JSON.parse(savedCards));
    }
  }, [currentUser?.uid]); // Rerun effect only when user ID changes

  // Save cards to localStorage whenever they change (Conditional - only if no user)
  useEffect(() => {
    // Only save to localStorage if there's no logged-in user
    if (!currentUser) { 
      if (cards.length > 0) { 
        localStorage.setItem('pokemonCards', JSON.stringify(cards));
      } else { 
        const savedCards = localStorage.getItem('pokemonCards');
        if (savedCards && JSON.parse(savedCards).length > 0) { 
          localStorage.removeItem('pokemonCards');
        }
      }
    }
  }, [cards, currentUser]); // Depend on currentUser as well

  // Import CSV data - Wrapped in useCallback
  const importCsvData = useCallback(async (file, importMode = 'priceUpdate') => {
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
        data: parsedData
      };
    } catch (error) {
      setError(error.message);
      return {
        success: false,
        message: error.message
      };
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies: parseCSVFile, validateCSVStructure are static imports, setLoading, setError are stable setters

  // Select a card to view details - Wrapped in useCallback
  const selectCard = useCallback((card) => {
    setSelectedCard(card);
  }, []); // Dependency: setSelectedCard is stable

  // Clear selected card - Wrapped in useCallback
  const clearSelectedCard = useCallback(() => {
    setSelectedCard(null);
  }, []); // Dependency: setSelectedCard is stable

  // Update a card - Wrapped in useCallback
  const updateCard = useCallback(async (updatedCard) => { // Make async
    if (!updatedCard || !updatedCard.id) { // Use .id for Firestore documents
      console.error("Update card failed: Invalid card data or missing ID.");
      setError("Failed to update card: Invalid data.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentUser) {
        const repository = new CardRepository(currentUser.uid);
        // Prepare data for Firestore (remove id, handle timestamps if needed by repo)
        const { id, ...dataToUpdate } = updatedCard;
        await repository.updateCard(id, dataToUpdate);
        console.log(`Card ${id} updated in Firestore.`);
      }

      // Optimistic UI update (or update after successful Firestore operation)
      setCards(prevCards => 
        prevCards.map(card => 
          card.id === updatedCard.id ? updatedCard : card // Match by Firestore ID
        )
      );

      setSelectedCard(prevSelected => 
        prevSelected && prevSelected.id === updatedCard.id ? updatedCard : prevSelected
      );

    } catch (err) {
      console.error("Error updating card:", err);
      setError("Failed to save card update.");
      // Optionally revert optimistic update here if needed
    } finally {
      setLoading(false);
    }
  }, [currentUser, setCards, setSelectedCard, setLoading, setError]); // Add dependencies

  // Add a new card - Wrapped in useCallback
  const addCard = useCallback(async (newCardData, imageFile = null) => { // Make async, accept imageFile
    if (!newCardData) { 
      console.error("Add card failed: Invalid card data.");
      setError("Failed to add card: Invalid data.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentUser) {
        const repository = new CardRepository(currentUser.uid);
        
        try {
          // CardRepository.createCard handles adding timestamps and returns the full card object
          const createdCard = await repository.createCard(newCardData, imageFile);
          console.log('Card created in Firestore:', createdCard);
          
          // Return the created card to the caller
          return createdCard;
        } catch (storageError) {
          // If the error is specifically a storage permission error, try again without the image
          if (imageFile && storageError.code === 'storage/unauthorized') {
            console.warn('Storage permission denied, creating card without image');
            const createdCard = await repository.createCard(newCardData, null);
            console.log('Card created in Firestore without image:', createdCard);
            
            // Return the created card to the caller
            return createdCard;
          } else {
            // Rethrow other errors to be caught by the outer catch block
            throw storageError;
          }
        }
      } else {
        // Handle local storage case (needs a way to generate a unique ID)
        const localCard = { ...newCardData, id: Date.now().toString() }; // Simple local ID
        setCards(prevCards => [...prevCards, localCard]);
        return localCard;
      }
    } catch (err) {
      console.error("Error adding card:", err);
      setError("Failed to save new card.");
      // Optionally revert optimistic update here
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, setCards, setLoading, setError]); // Add dependencies

  // Delete a card - Wrapped in useCallback
  const deleteCard = useCallback(async (cardId) => { // Make async
    if (!cardId) {
      console.error("Delete card failed: Invalid card ID.");
      setError("Failed to delete card: Invalid ID.");
      return;
    }

    // Store card before deleting for potential revert
    const cardToDelete = cards.find(card => card.id === cardId);

    // Optimistic UI update (remove immediately)
    setCards(prevCards => prevCards.filter(card => card.id !== cardId));
    setSelectedCard(prevSelected => 
       prevSelected && prevSelected.id === cardId ? null : prevSelected
    );

    setLoading(true);
    setError(null);

    try {
      if (currentUser) {
        const repository = new CardRepository(currentUser.uid);
        await repository.deleteCard(cardId);
        console.log(`Card ${cardId} deleted from Firestore.`);
        // Firestore listener should confirm the deletion in the state eventually
      } else {
        // Local storage is already updated by the optimistic removal via setCards
      }

    } catch (err) {
      console.error("Error deleting card:", err);
      setError("Failed to delete card from cloud.");
      // Revert optimistic update if Firestore delete failed
      if (cardToDelete) {
        setCards(prevCards => [...prevCards, cardToDelete]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, cards, setCards, setSelectedCard, setLoading, setError]); // Add dependencies

  // Update the exchange rate - Wrapped in useCallback
  const updateExchangeRate = useCallback((newRate) => {
    setExchangeRate(newRate);

    // Update all card values to reflect the new exchange rate
    setCards(prevCards => 
      prevCards.map(card => ({
        ...card,
        currentValueAUD: Number(((card.currentValueUSD || 0) * newRate).toFixed(2)),
        potentialProfit: Number(((card.currentValueUSD || 0) * newRate - (card.investmentAUD || 0)).toFixed(2))
      }))
    );
  }, []); // Dependencies: setCards, setExchangeRate are stable setters

  return {
    cards,
    loading,
    error,
    selectedCard,
    exchangeRate,
    importCsvData,
    selectCard,
    clearSelectedCard,
    updateCard,
    addCard,
    deleteCard,
    updateExchangeRate,
    setSelectedCard, // Expose setter if needed externally
    setError // Expose setter if needed externally
  };
};

export default useCardData;