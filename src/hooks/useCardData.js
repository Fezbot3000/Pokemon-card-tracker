import { useState, useEffect, useCallback } from 'react';
import {
  parseCSVFile,
  validateCSVStructure,
} from '../utils/dataProcessor';
import { useAuth } from '../design-system/contexts/AuthContext';
import { CardRepository } from '../repositories/CardRepository';
import logger from '../utils/logger';
import LoggingService from '../services/LoggingService';

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
        const rate = 1.5; // Default rate
        setExchangeRate(rate);
      } catch (error) {
        logger.error('Error fetching exchange rate:', error);
        // Keep the default rate if fetch fails
      }
    };

    fetchExchangeRate();
  }, []);

  // Listen for forced refresh events (e.g., after move operations)
  useEffect(() => {
    const handleCardDataRefresh = (event) => {
      const { cards: freshCards, reason } = event.detail;
      LoggingService.debug(`[useCardData] Handling forced refresh (${reason}):`, freshCards.length, 'cards');
      setCards(freshCards);
      setLoading(false);
      setError(null);
    };

    window.addEventListener('cardDataRefresh', handleCardDataRefresh);
    
    return () => {
      window.removeEventListener('cardDataRefresh', handleCardDataRefresh);
    };
  }, []);

  // Firestore Listener for Real-time Card Updates
  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      const repository = new CardRepository(currentUser.uid);
      logger.debug(
        `Setting up Firestore listener for user: ${currentUser.uid}`
      );

      // Debounce the updates to reduce console spam
      let updateTimeout = null;
      const processFirestoreUpdate = firestoreCards => {
        // Clear any existing timeout
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }

        // Set a new timeout to batch updates
        updateTimeout = setTimeout(() => {
          logger.debug(`Received card update: ${firestoreCards.length} cards`);
          // Update local state with the processed data
          const updateTime = Date.now();
          LoggingService.debug('🔥 USECARDDATA LISTENER: setCards called with', firestoreCards.length, 'cards');
          
          // INVESTIGATION: Track setCards calls
          if (window.__INSTRUMENT_SET_CARDS__ && window.__CARD_DATA_TRACKER__) {
            window.__CARD_DATA_TRACKER__.setCardsCalls.push({
              timestamp: updateTime,
              cardCount: firestoreCards.length,
              stackTrace: new Error().stack,
              trigger: 'firestore_listener'
            });
            window.__CARD_DATA_TRACKER__.lastCall = updateTime;
          }
          
          setCards(firestoreCards);
          setLoading(false);
          setError(null); // Clear any previous error on successful fetch
        }, 500); // 500ms debounce time
      };

      const unsubscribe = repository.subscribeToAllCards(
        processFirestoreUpdate,
        err => {
          logger.error('Error subscribing to Firestore cards:', err);
          setError('Failed to load cards from cloud.');
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount or user change
      return () => {
        logger.debug(
          `Cleaning up Firestore listener for user: ${currentUser.uid}`
        );
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        unsubscribe();
      };
    } else {
      // No user logged in, clear cards and potentially load from localStorage (optional)
      logger.debug('No user logged in, clearing cards.');
      setCards([]);
      setLoading(false);
      // Optional: Load from localStorage as fallback
      // const savedCards = localStorage.getItem('pokemonCards');
      // if (savedCards) setCards(JSON.parse(savedCards));
    }
  }, [currentUser]); // Fix: Include full currentUser object as dependency

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
  const updateCard = useCallback(
    async updatedCard => {
      // Make async
      // Check for either id or slabSerial as the card identifier
      const cardId = updatedCard?.id || updatedCard?.slabSerial;
      
      // '🔄 USECARDDATA: updateCard called', { cardId, cardName: updatedCard?.cardName });

      if (!updatedCard || !cardId) {
        logger.error(
          'Update card failed: Invalid card data or missing ID.',
          updatedCard
        );
        setError('Failed to update card: Invalid data.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Track if we're already updating this card to prevent loops
        const updateStartTime = Date.now();
        logger.debug(
          `Starting card update for ${cardId} at ${updateStartTime}`
        );

        if (currentUser) {
          const repository = new CardRepository(currentUser.uid);

          // Create a normalized copy of the card with both id properties
          const normalizedCard = {
            ...updatedCard,
            id: cardId, // Ensure id is set
            _lastUpdateTime: updateStartTime, // Add timestamp to track this specific update
          };

          // Make sure slabSerial is included only when it exists
          if (updatedCard.slabSerial) {
            normalizedCard.slabSerial = updatedCard.slabSerial;
          }

          // '🔄 USECARDDATA: Calling repository.updateCard');
          await repository.updateCard(normalizedCard);
          // '✅ USECARDDATA: repository.updateCard completed');
          
          // Update the card in local state immediately (optimistic update)
          // The Firestore listener will handle the real-time sync
          // '🔄 USECARDDATA: Updating local state (optimistic update)');
          setCards(prevCards =>
            prevCards.map(card =>
              card.id === cardId || card.slabSerial === cardId
                ? normalizedCard
                : card
            )
          );
          // '✅ USECARDDATA: Local state updated');
          
          // Track scroll position before and after state update
          const scrollBefore = window.scrollY;
          setTimeout(() => {
            const scrollAfter = window.scrollY;
            if (scrollBefore !== scrollAfter) {
              // '📜 SCROLL POSITION CHANGED!', { 
                before: scrollBefore, 
                after: scrollAfter, 
                diff: scrollAfter - scrollBefore 
              });
            } else {
              // '📜 Scroll position preserved', { position: scrollAfter });
            }
          }, 100);
        } else {
          // Fallback for offline mode
          setCards(prevCards =>
            prevCards.map(card =>
              card.id === cardId || card.slabSerial === cardId
                ? updatedCard
                : card
            )
          );
        }

        setSelectedCard(prevSelected =>
          prevSelected &&
          (prevSelected.id === cardId || prevSelected.slabSerial === cardId)
            ? updatedCard
            : prevSelected
        );
      } catch (err) {
        LoggingService.error(`[useCardData] Error updating card ${cardId}:`, err);
        logger.error('Error updating card:', err);
        setError('Failed to save card update.');
        // Optionally revert optimistic update here if needed
      } finally {
        setLoading(false);
      }
    },
    [currentUser, setCards, setSelectedCard, setLoading, setError]
  ); // Add dependencies

  // Delete a card - Wrapped in useCallback
  const deleteCard = useCallback(
    async cardId => {
      // Make async
      // Extract ID if cardId is an object - handle both id and slabSerial properties
      const id = cardId?.id || cardId?.slabSerial || cardId;

      if (!id || typeof id !== 'string') {
        logger.error('Delete card failed: Invalid card ID.', { cardId, id });
        setError('Failed to delete card: Invalid ID.');
        return;
      }

      // Store card before deleting for potential revert
      const cardToDelete = cards.find(card => card.id === id);

      // Optimistic UI update (remove immediately)
      setCards(prevCards => prevCards.filter(card => card.id !== id));
      setSelectedCard(prevSelected =>
        prevSelected && prevSelected.id === id ? null : prevSelected
      );

      setLoading(true);
      setError(null);

      try {
        if (currentUser) {
          const repository = new CardRepository(currentUser.uid);
          await repository.deleteCard(id);
          logger.debug(`Card ${id} deleted from Firestore.`);
          // Firestore listener should confirm the deletion in the state eventually
        } else {
          // Local storage is already updated by the optimistic removal via setCards
        }
      } catch (err) {
        logger.error('Error deleting card:', err);
        setError('Failed to delete card from cloud.');
        // Revert optimistic update if Firestore delete failed
        if (cardToDelete) {
          setCards(prevCards => [...prevCards, cardToDelete]);
        }
      } finally {
        setLoading(false);
      }
    },
    [currentUser, cards, setCards, setSelectedCard, setLoading, setError]
  ); // Add dependencies

  // Add a new card - Wrapped in useCallback
  const addCard = useCallback(
    async (newCardData, imageFile = null) => {
      // Make async, accept imageFile
      if (!newCardData) {
        logger.error('Add card failed: Invalid card data.');
        setError('Failed to add card: Invalid data.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (currentUser) {
          const repository = new CardRepository(currentUser.uid);

          try {
            // CardRepository.createCard handles adding timestamps and returns the full card object
            const createdCard = await repository.createCard(
              newCardData,
              imageFile
            );
            logger.debug('Card created in Firestore');

            // FORCE IMMEDIATE REFRESH FROM FIREBASE - bypass broken listeners
            logger.debug('Refreshing all cards from Firebase after add');
            const freshCards = await repository.getAllCards();
            setCards(freshCards);

            // DISPATCH REFRESH EVENT for immediate UI update (same as move operation)
            const refreshEvent = new CustomEvent('cardDataRefresh', { 
              detail: { cards: freshCards, reason: 'add_card_operation' } 
            });
            window.dispatchEvent(refreshEvent);
            
            LoggingService.debug('[useCardData] Dispatched card data refresh event after add operation');

            // Return the created card to the caller
            return createdCard;
          } catch (storageError) {
            // If the error is specifically a storage permission error, try again without the image
            if (imageFile && storageError.code === 'storage/unauthorized') {
              logger.warn(
                'Storage permission denied, creating card without image'
              );
              const createdCard = await repository.createCard(
                newCardData,
                null
              );
              logger.debug('Card created in Firestore without image');

              // FORCE IMMEDIATE REFRESH FROM FIREBASE - bypass broken listeners
              logger.debug('Refreshing all cards from Firebase after add (no image)');
              const freshCards = await repository.getAllCards();
              setCards(freshCards);

              // DISPATCH REFRESH EVENT for immediate UI update (same as move operation)
              const refreshEvent = new CustomEvent('cardDataRefresh', { 
                detail: { cards: freshCards, reason: 'add_card_operation_no_image' } 
              });
              window.dispatchEvent(refreshEvent);
              
              LoggingService.debug('[useCardData] Dispatched card data refresh event after add operation (no image)');

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
        logger.error('Error adding card:', err);
        setError('Failed to save new card.');
        // Optionally revert optimistic update here
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, setCards, setLoading, setError]
  ); // Add dependencies

  // Update the exchange rate - Wrapped in useCallback
  const updateExchangeRate = useCallback(newRate => {
    setExchangeRate(newRate);

    // Update all card values to reflect the new exchange rate
    setCards(prevCards =>
      prevCards.map(card => ({
        ...card,
        currentValueAUD: Number(
          ((card.currentValueUSD || 0) * newRate).toFixed(2)
        ),
        potentialProfit: Number(
          (
            (card.currentValueUSD || 0) * newRate -
            (card.investmentAUD || 0)
          ).toFixed(2)
        ),
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
    setError, // Expose setter if needed externally
  };
};

export default useCardData;
