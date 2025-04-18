import { useState, useEffect, useCallback } from 'react';
import { parseCSVFile, processImportedData, validateCSVStructure } from '../utils/dataProcessor';
import { getUsdToAudRate } from '../utils/currencyAPI';

const useCardData = () => {
  // State for cards and UI
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(1.5); // Default USD to AUD rate
  
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
    
    // Load cards from localStorage if available
    const savedCards = localStorage.getItem('pokemonCards');
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (error) {
        console.error('Error parsing saved cards:', error);
      }
    }
  }, []);
  
  // Save cards to localStorage whenever they change
  useEffect(() => {
    // Only save if cards array is not empty to avoid overwriting potentially loading data
    // with an empty array on initial mount.
    if (cards.length > 0) { 
      localStorage.setItem('pokemonCards', JSON.stringify(cards));
    } else {
      // If cards becomes empty (e.g., last card deleted), clear localStorage
      const savedCards = localStorage.getItem('pokemonCards');
      if (savedCards && JSON.parse(savedCards).length > 0) { // Avoid clearing if already empty
        localStorage.removeItem('pokemonCards');
      }
    }
  }, [cards]);
  
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
  const updateCard = useCallback((updatedCard) => {
    setCards(prevCards => 
      prevCards.map(card => 
        card.slabSerial === updatedCard.slabSerial ? updatedCard : card
      )
    );
    
    // Update selected card if it's the one that was updated
    // Use functional update for setSelectedCard if depending on previous selected state
    setSelectedCard(prevSelected => 
      prevSelected && prevSelected.slabSerial === updatedCard.slabSerial ? updatedCard : prevSelected
    );
  }, []); // Dependencies: setCards, setSelectedCard are stable setters
  
  // Add a new card - Wrapped in useCallback
  const addCard = useCallback((newCard) => {
    // Check if card already exists using functional update to get latest cards state
    setCards(prevCards => {
       const existingCard = prevCards.find(card => card.slabSerial === newCard.slabSerial);
       if (existingCard) {
         // Throw error inside to prevent state update if card exists
         throw new Error('Card already exists in the database');
       }
       // Add the new card
       return [...prevCards, newCard];
    });
  }, []); // Dependency: setCards is stable
  
  // Delete a card - Wrapped in useCallback
  const deleteCard = useCallback((cardId) => {
    setCards(prevCards => prevCards.filter(card => card.slabSerial !== cardId));
    
    // Clear selected card if it was deleted
    // Use functional update to safely access selected card state
    setSelectedCard(prevSelected => 
       prevSelected && prevSelected.slabSerial === cardId ? null : prevSelected
    );
  }, []); // Dependencies: setCards, setSelectedCard are stable setters
  
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