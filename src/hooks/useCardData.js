import { useState, useEffect } from 'react';
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
    if (cards.length > 0) {
      localStorage.setItem('pokemonCards', JSON.stringify(cards));
    }
  }, [cards]);
  
  // Import CSV data
  const importCsvData = async (file, importMode = 'priceUpdate') => {
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
  };
  
  // Select a card to view details
  const selectCard = (card) => {
    console.log("selectCard called with:", card);
    if (!card) {
      console.error("Attempted to select a null/undefined card");
      return;
    }
    
    // Create a deep copy to ensure state changes
    const cardCopy = JSON.parse(JSON.stringify(card));
    console.log("Setting selected card to:", cardCopy);
    
    // Set the selected card
    setSelectedCard(cardCopy);
  };
  
  // Clear selected card
  const clearSelectedCard = () => {
    console.log("Clearing selected card");
    setSelectedCard(null);
  };
  
  // Update a card
  const updateCard = (updatedCard) => {
    setCards(prevCards => 
      prevCards.map(card => 
        card.slabSerial === updatedCard.slabSerial ? updatedCard : card
      )
    );
    
    // Update selected card if it's the one that was updated
    if (selectedCard && selectedCard.slabSerial === updatedCard.slabSerial) {
      setSelectedCard(updatedCard);
    }
  };
  
  // Add a new card
  const addCard = (newCard) => {
    // Generate a temporary ID if none provided
    const cardWithId = {
      ...newCard,
      slabSerial: newCard.slabSerial || `temp-${Date.now()}`
    };
    
    setCards(prevCards => [...prevCards, cardWithId]);
  };
  
  // Delete a card
  const deleteCard = (cardId) => {
    setCards(prevCards => prevCards.filter(card => card.slabSerial !== cardId));
    
    // Clear selected card if it was deleted
    if (selectedCard && selectedCard.slabSerial === cardId) {
      clearSelectedCard();
    }
  };
  
  // Update the exchange rate
  const updateExchangeRate = (newRate) => {
    setExchangeRate(newRate);
    
    // Update all card values to reflect the new exchange rate
    setCards(prevCards => 
      prevCards.map(card => ({
        ...card,
        currentValueAUD: Number(((card.currentValueUSD || 0) * newRate).toFixed(2)),
        potentialProfit: Number(((card.currentValueUSD || 0) * newRate - (card.investmentAUD || 0)).toFixed(2))
      }))
    );
  };
  
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
    setSelectedCard,
    setError
  };
};

export default useCardData;