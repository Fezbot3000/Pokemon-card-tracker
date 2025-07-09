import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from '../design-system';
import { CardRepository } from '../repositories/CardRepository';
import db from '../services/firestore/dbAdapter';
import LoggingService from '../services/LoggingService';

const CardContext = createContext();

export function CardProvider({ children }) {
  const { currentUser } = useAuth();
  const [repository, setRepository] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [cards, setCards] = useState([]);
  const [soldCards, setSoldCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
  const [soldCardIds, setSoldCardIds] = useState(new Set()); // Track sold card IDs in state

  // Load sold card IDs on mount
  useEffect(() => {
    const loadSoldCardIds = async () => {
      try {
        const soldCards = await db.getSoldCards();
        if (soldCards && soldCards.length > 0) {
          const soldCardIds = new Set(
            soldCards.map(card => card.originalCardId || card.id)
          );
          setSoldCardIds(soldCardIds);
        }
      } catch (error) {
        LoggingService.warn('Failed to load sold card IDs from IndexedDB:', error);
      }
    };

    loadSoldCardIds();
  }, []);

  // Load initial data (collections, cards, etc)
  const loadInitialData = useCallback(
    async repo => {
      if (!repo) {
        LoggingService.error('No repository provided to loadInitialData');
        return { success: false, message: 'No repository available' };
      }

      try {
        setLoading(true);
        setError(null);
        setSyncStatus('syncing');

        // Load collections
        let collectionsFromRepo = [];
        try {
          collectionsFromRepo = await repo.getAllCollections();
        } catch (collectionsError) {
          LoggingService.error('Failed to load collections:', collectionsError);
          collectionsFromRepo = [];
        }

        // Load cards
        let cardsFromRepo = [];
        try {
          cardsFromRepo = await repo.getAllCards();
        } catch (cardsError) {
          LoggingService.error('Failed to load cards:', cardsError);
          cardsFromRepo = [];
        }

        // Filter out any sold cards at initial load time
        try {
          const soldCards = await db.getSoldCards();
          if (soldCards && soldCards.length > 0) {
            const soldCardIds = new Set(
              soldCards.map(card => card.originalCardId || card.id)
            );
            cardsFromRepo = cardsFromRepo.filter(
              card => !soldCardIds.has(card.id)
            );
          }
        } catch (e) {
          LoggingService.warn('Failed to filter sold cards during initial load:', e);
        }

        // Load sold cards
        let soldCardsFromRepo = [];
        try {
          soldCardsFromRepo = await db.getSoldCards();
        } catch (soldCardsError) {
          LoggingService.error('Failed to load sold cards:', soldCardsError);
          soldCardsFromRepo = [];
        }

        // Set the state with loaded/created data
        setCollections(collectionsFromRepo);
        setCards(cardsFromRepo);
        setSoldCards(soldCardsFromRepo);

        // Set initial selected collection if we have collections
        if (collectionsFromRepo.length > 0 && !selectedCollection) {
          setSelectedCollection(collectionsFromRepo[0]);
        }

        setLoading(false);
        setSyncStatus('synced');

        return { success: true, message: 'Data loaded successfully' };
      } catch (error) {
        LoggingService.error('Error in loadInitialData:', error);
        setError(error.message);
        setLoading(false);
        setSyncStatus('error');
        return { success: false, message: error.message };
      }
    },
    [selectedCollection]
  );

  // Initialize repository when user changes
  useEffect(() => {
    let mounted = true;

    const initializeRepository = async () => {
      if (currentUser) {
        const repo = new CardRepository(currentUser.uid);
        setRepository(repo);

        if (mounted) {
          await loadInitialData(repo);
        }
      }
    };

    initializeRepository();

    return () => {
      mounted = false;
    };
  }, [currentUser, loadInitialData]);

  // Helper function to verify cards against the sold card list
  const verifyCardsAgainstSoldList = useCallback(
    cardsToVerify => {
      const currentSoldCardIds = Array.from(soldCardIds);

      if (currentSoldCardIds.length === 0) {
        return cardsToVerify; // No sold cards to filter
      }

      const filteredCards = cardsToVerify.filter(
        card => !currentSoldCardIds.includes(card.id)
      );

      return filteredCards;
    },
    [soldCardIds]
  );



  // Subscribe to collection changes
  useEffect(() => {
    let unsubscribe = null;

    const setupSubscription = async () => {
      if (!repository) return;

      try {
        // Always clean up any existing subscription first
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        // Wait a small delay to ensure clean unsubscribe
        await new Promise(resolve => setTimeout(resolve, 100));

        if (selectedCollection && selectedCollection.id !== 'all-cards') {
          // Subscribe to a specific collection
          unsubscribe = repository.subscribeToCollection(
            selectedCollection.id,
            updatedCards => {
              let filteredCards = verifyCardsAgainstSoldList(updatedCards);

              // Secondary filter from localStorage/sessionStorage for redundancy
              let pendingSoldCardIds = [];
              try {
                // First from localStorage (primary)
                pendingSoldCardIds = JSON.parse(
                  localStorage.getItem('pendingSoldCardIds') || '[]'
                );

                // Then add any from sessionStorage (backward compatibility)
                const sessionStorageIds = JSON.parse(
                  sessionStorage.getItem('pendingSoldCardIds') || '[]'
                );
                if (sessionStorageIds.length > 0) {
                  pendingSoldCardIds = [
                    ...new Set([...pendingSoldCardIds, ...sessionStorageIds]),
                  ];
                }
              } catch (e) {
                LoggingService.warn(
                  'Failed to get pending sold cards from storage',
                  e
                );
              }

              // Final filter step if needed
              if (pendingSoldCardIds.length > 0) {
                filteredCards = filteredCards.filter(
                  card => !pendingSoldCardIds.includes(card.id)
                );
              }

              // Always update cards immediately with what we get from Firestore
              setCards(filteredCards);
              setSyncStatus('synced');
            }
          );
        } else {
          // Subscribe to all cards when "All Cards" is selected
          unsubscribe = repository.subscribeToAllCards(updatedCards => {
            let filteredCards = verifyCardsAgainstSoldList(updatedCards);

            // Secondary filter from localStorage/sessionStorage for redundancy
            let pendingSoldCardIds = [];
            try {
              // First from localStorage (primary)
              pendingSoldCardIds = JSON.parse(
                localStorage.getItem('pendingSoldCardIds') || '[]'
              );

              // Then add any from sessionStorage (backward compatibility)
              const sessionStorageIds = JSON.parse(
                sessionStorage.getItem('pendingSoldCardIds') || '[]'
              );
              if (sessionStorageIds.length > 0) {
                pendingSoldCardIds = [
                  ...new Set([...pendingSoldCardIds, ...sessionStorageIds]),
                ];
              }
            } catch (e) {
              LoggingService.warn('Failed to get pending sold cards from storage', e);
            }

            // Final filter step if needed
            if (pendingSoldCardIds.length > 0) {
              filteredCards = filteredCards.filter(
                card => !pendingSoldCardIds.includes(card.id)
              );
            }

            // Always update cards immediately
            setCards(filteredCards);
            setSyncStatus('synced');
          });
        }
      } catch (error) {
        LoggingService.error('Error setting up subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [repository, selectedCollection, verifyCardsAgainstSoldList]); // Added verifyCardsAgainstSoldList dependency

  // Subscribe to sold cards changes
  useEffect(() => {
    let unsubscribe = null;

    const setupSoldCardsSubscription = async () => {
      if (!repository) return;

      try {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        // Wait a small delay to ensure clean unsubscribe
        await new Promise(resolve => setTimeout(resolve, 100));

        // Set up sold cards subscription with minimal logging
        unsubscribe = repository.subscribeToSoldCards(updatedSoldCards => {
          setSoldCards(updatedSoldCards);
          setSyncStatus('synced');
        });
      } catch (error) {
        LoggingService.error('Error setting up sold cards subscription:', error);
      }
    };

    setupSoldCardsSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [repository, soldCards.length]);

  // Collection operations
  const createCollection = useCallback(
    async name => {
      if (!repository) throw new Error('Repository not initialized');

      try {
        setSyncStatus('syncing');
        const newCollection = await repository.createCollection(name);

        // Format the collection data
        const formattedCollection = {
          id: newCollection.id,
          name: newCollection.name || '',
          cardCount: newCollection.cardCount || 0,
          description: newCollection.description || '',
          createdAt: newCollection.createdAt || new Date(),
          updatedAt: newCollection.updatedAt || new Date(),
        };

        setCollections(prev => [...prev, formattedCollection]);

        // Immediately select the new collection
        setSelectedCollection(formattedCollection);

        setSyncStatus('synced');
        return formattedCollection;
      } catch (err) {
        LoggingService.error('Error creating collection:', err);
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  const updateCollection = useCallback(
    async (collectionId, data) => {
      try {
        setSyncStatus('syncing');
        await repository.updateCollection(collectionId, data);
        setCollections(prev =>
          prev.map(coll =>
            coll.id === collectionId ? { ...coll, ...data } : coll
          )
        );
      } catch (err) {
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  const deleteCollection = useCallback(
    async collectionId => {
      try {
        setSyncStatus('syncing');
        await repository.deleteCollection(collectionId);
        setCollections(prev => prev.filter(coll => coll.id !== collectionId));
        if (selectedCollection?.id === collectionId) {
          setSelectedCollection(collections[0] || null);
        }
      } catch (err) {
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository, selectedCollection, collections]
  );

  // Card operations
  const createCard = useCallback(
    async (cardData, imageFile) => {
      try {
        setSyncStatus('syncing');

        // Ensure we have a valid collectionId
        if (!cardData.collectionId && selectedCollection?.id) {
          cardData.collectionId = selectedCollection.id;
        }

        if (!cardData.collectionId) {
          throw new Error('Collection ID is required');
        }

        // Create the card
        const newCard = await repository.createCard(cardData, imageFile);

        // Update cards array
        setCards(prev => [...prev, newCard]);

        // Update collection card count
        const collection = collections.find(
          c => c.id === cardData.collectionId
        );
        if (collection) {
          await repository.updateCollection(collection.id, {
            ...collection,
            cardCount: (collection.cardCount || 0) + 1,
          });
        }

        setSyncStatus('synced');
        return newCard;
      } catch (err) {
        LoggingService.error('Error creating card:', err);
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository, collections, selectedCollection]
  );

  const updateCard = useCallback(
    async (cardId, data) => {
      try {
        setSyncStatus('syncing');
        // Combine cardId and data into a single payload object
        await repository.updateCard({ id: cardId, ...data });
        setCards(prev =>
          prev.map(card => (card.id === cardId ? { ...card, ...data } : card))
        );
      } catch (err) {
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  const deleteCard = useCallback(
    async cardId => {
      try {
        setSyncStatus('syncing');
        await repository.deleteCard(cardId);
        setCards(prev => prev.filter(card => card.id !== cardId));
        setSyncStatus('synced');
      } catch (err) {
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  // Add support for deleting multiple cards at once
  const deleteCards = useCallback(
    async cardIds => {
      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return { success: true, count: 0 };
      }

      try {
        setSyncStatus('syncing');

        // Use the repository's batch delete function
        const result = await repository.deleteCards(cardIds);

        // Update the local state to remove deleted cards
        setCards(prev => prev.filter(card => !cardIds.includes(card.id)));

        setSyncStatus('synced');
        return result;
      } catch (err) {
        LoggingService.error('Error deleting multiple cards:', err);
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  const markCardAsSold = useCallback(
    async (cardId, soldData) => {
      try {
        setSyncStatus('syncing');

        // Ensure we have valid data before proceeding
        if (!cardId) {
          LoggingService.error('No card ID provided to markCardAsSold');
          throw new Error('Card ID is required');
        }

        // Normalize and validate sold price
        let soldPrice = 0;
        if (soldData && soldData.soldPrice !== undefined) {
          if (typeof soldData.soldPrice === 'string') {
            soldPrice = parseFloat(soldData.soldPrice);
          } else if (typeof soldData.soldPrice === 'number') {
            soldPrice = soldData.soldPrice;
          }

          if (isNaN(soldPrice)) {
            soldPrice = 0;
          }
        }

        // Update the sold data with normalized price
        const normalizedSoldData = {
          ...soldData,
          soldPrice: soldPrice,
        };

        // Find the card to be marked as sold for local state update
        const cardToMark = cards.find(card => card.id === cardId);
        if (!cardToMark) {
          LoggingService.warn(
            `Card with ID ${cardId} not found in local state, will try to proceed anyway`
          );
        }

        // Store the card ID in state to prevent it from appearing in the UI
        setSoldCardIds(prev => new Set([...prev, cardId]));

        // Immediately update local state to remove the card
        // This prevents the user from seeing it while the operation processes
        setCards(prev => prev.filter(card => card.id !== cardId));

        // First try the direct approach - use createSoldCardDirectly
        // This is more reliable than the standard markCardAsSold method
        try {
          // Create a complete sold card object with all necessary data
          const completeCardData = {
            // Use data from the card if available, otherwise use minimal data
            ...(cardToMark || {}),
            // Ensure these fields are set correctly
            id: cardId,
            originalCardId: cardId,
            soldPrice: soldPrice,
            finalValueAUD: soldPrice,
            profit: soldPrice - (cardToMark?.investmentAUD || 0),
            finalProfitAUD: soldPrice - (cardToMark?.investmentAUD || 0),
            buyer: normalizedSoldData.buyer || 'Unknown',
            dateSold:
              normalizedSoldData.dateSold ||
              new Date().toISOString().split('T')[0],
            invoiceId:
              normalizedSoldData.invoiceId || `INV-DIRECT-${Date.now()}`,
          };

          // Use the direct method to create the sold card
          const savedSoldCard =
            await repository.createSoldCardDirectly(completeCardData);

          // Update sold cards state
          setSoldCards(prev => [savedSoldCard, ...prev]);

          // Update collection count if we have collection info
          if (completeCardData.collectionId) {
            setCollections(prev => {
              return prev.map(collection => {
                if (collection.id === completeCardData.collectionId) {
                  return {
                    ...collection,
                    cardCount: Math.max((collection.cardCount || 0) - 1, 0),
                  };
                }
                return collection;
              });
            });
          }

          // Remove from pending list after successful sale
          setSoldCardIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardId);
            return newSet;
          });

          setSyncStatus('synced');
          return savedSoldCard;
        } catch (directError) {
          LoggingService.error(
            'Direct method failed, falling back to standard method:',
            directError
          );

          // If direct method fails, try the standard method as a fallback
          try {
            // Call the repository function with the normalized data
            const soldCard = await repository.markCardAsSold(
              cardId,
              normalizedSoldData
            );

            // Update sold cards state
            setSoldCards(prev => [soldCard, ...prev]);

            // Also update collection cardCount if needed
            if (cardToMark && cardToMark.collectionId) {
              setCollections(prev => {
                return prev.map(collection => {
                  if (collection.id === cardToMark.collectionId) {
                    return {
                      ...collection,
                      cardCount: Math.max((collection.cardCount || 0) - 1, 0),
                    };
                  }
                  return collection;
                });
              });
            }

            // Remove from pending list after successful sale
            setSoldCardIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(cardId);
              return newSet;
            });

            setSyncStatus('synced');
            return soldCard;
          } catch (standardError) {
            LoggingService.error('Both methods failed to sell card:', standardError);

            // If both methods fail, restore the card to the local state
            if (cardToMark) {
              setCards(prev => [...prev, cardToMark]);
            }

            // Remove from pending list
            setSoldCardIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(cardId);
              return newSet;
            });

            // Throw a more helpful error
            throw new Error(`Failed to sell card: ${standardError.message}`);
          }
        }
      } catch (err) {
        LoggingService.error('Error in markCardAsSold:', err);
        setError(err.message);
        setSyncStatus('error');
        throw err;
      } finally {
        // Ensure we reset sync status even if there's an error
        setTimeout(() => {
          setSyncStatus('idle');
        }, 2000);
      }
    },
    [repository, cards]
  );

  const importCards = useCallback(
    async (file, collectionId, importMode) => {
      try {
        setSyncStatus('syncing');
        await repository.importCards(
          file,
          collectionId,
          importMode
        );
        setSyncStatus('synced');
        // Cards will be updated via the subscription
        return { success: true };
      } catch (err) {
        LoggingService.error('Error in CardContext.importCards:', err);
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  const exportCards = useCallback(
    async collectionId => {
      try {
        setSyncStatus('syncing');
        await repository.exportCards(collectionId);
        // Cards will be updated via the subscription
      } catch (err) {
        setError(err.message);
        setSyncStatus('error');
        throw err;
      }
    },
    [repository]
  );

  // Provide context value
  const contextValue = {
    repository,
    collections,
    selectedCollection,
    setSelectedCollection,
    cards,
    soldCards,
    loading,
    error,
    syncStatus,
    createCollection,
    updateCollection,
    deleteCollection,
    createCard,
    updateCard,
    deleteCard,
    deleteCards,
    markCardAsSold,
    importCards,
    exportCards,
  };

  return (
    <CardContext.Provider value={contextValue}>{children}</CardContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCards must be used within a CardProvider');
  }
  return context;
}
