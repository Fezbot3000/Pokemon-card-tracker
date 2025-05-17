import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import CardRepository from '../repositories/CardRepository';
import db from '../services/db';
import subscriptionManager from '../utils/subscriptionManager';
import logger from '../utils/logger';

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
          const soldCardIds = new Set(soldCards.map(card => card.originalCardId || card.id));
          setSoldCardIds(soldCardIds);
        }
      } catch (error) {
        console.warn('Failed to load sold card IDs from IndexedDB:', error);
      }
    };

    loadSoldCardIds();
  }, []);

  // Initialize repository when user changes
  useEffect(() => {
    let mounted = true;
    
    const initializeRepository = async () => {
      try {
        if (currentUser) {
          const repo = new CardRepository(currentUser.uid);
          setRepository(repo);
          
          if (mounted) {
            await loadInitialData(repo);
          }
        }
      } catch (error) {
        console.error('Error initializing repository:', error);
        setError('Failed to initialize app data. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    initializeRepository();
    
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Helper function to verify cards against the sold card list
  const verifyCardsAgainstSoldList = useCallback((cardsToVerify) => {
    // This verifies cards aren't in our local list of sold card IDs
    const currentSoldCardIds = Array.from(soldCardIds);
    
    if (currentSoldCardIds.length === 0) {
      return cardsToVerify; // No sold cards to filter
    }
    
    const filteredCards = cardsToVerify.filter(card => !currentSoldCardIds.includes(card.id));
    
    return filteredCards;
  }, [soldCardIds]);

  // Load initial data (collections, cards, etc)
  const loadInitialData = useCallback(async (repo) => {
    if (!repo) {
      console.error('No repository provided to loadInitialData');
      return { success: false, message: 'No repository available' };
    }

    try {
      setLoading(true);
      setError(null);
      setSyncStatus('syncing');

      // Load collections
      let collectionsFromRepo = [];
      try {
        collectionsFromRepo = await repo.getCollections();
      } catch (collectionsError) {
        console.error('Failed to load collections:', collectionsError);
        collectionsFromRepo = [];
      }

      // Load cards
      let cardsFromRepo = [];
      try {
        cardsFromRepo = await repo.getCards();
      } catch (cardsError) {
        console.error('Failed to load cards:', cardsError);
        cardsFromRepo = [];
      }

      // Filter out any sold cards at initial load time
      try {
        const soldCards = await db.getSoldCards();
        if (soldCards && soldCards.length > 0) {
          const soldCardIds = new Set(soldCards.map(card => card.originalCardId || card.id));
          const originalCount = cardsFromRepo.length;
          cardsFromRepo = cardsFromRepo.filter(card => !soldCardIds.has(card.id));
        }
      } catch (e) {
        console.warn('Failed to filter sold cards during initial load:', e);
      }

      // Load sold cards
      let soldCardsFromRepo = [];
      try {
        soldCardsFromRepo = await db.getSoldCards();
      } catch (soldCardsError) {
        console.error('Failed to load sold cards:', soldCardsError);
        soldCardsFromRepo = [];
      }
      
      setSoldCards(soldCardsFromRepo);
      
      setLoading(false);
      setSyncStatus('synced');
      
      return { success: true, message: 'Data loaded successfully' };
    } catch (error) {
      console.error('Error in loadInitialData:', error);
      setError(error.message);
      setLoading(false);
      setSyncStatus('error');
      return { success: false, message: error.message };
    }
  }, []);

  // Subscribe to collection changes
  useEffect(() => {
    let subscriptionId = null;
    let isFirstLoad = true; // Track if this is the first load
    
    const setupSubscription = async () => {
      if (!repository) return;
      
      try {
        // Always clean up any existing subscription first
        if (subscriptionId) {
          subscriptionManager.unregister(subscriptionId);
          subscriptionId = null;
        }
        
        // Wait a small delay to ensure clean unsubscribe
        await new Promise(resolve => setTimeout(resolve, 100));
      
        if (selectedCollection && selectedCollection.id !== 'all-cards') {
          // Subscribe to a specific collection
          const unsubscribe = repository.subscribeToCollection(
            selectedCollection.id,
            (updatedCards) => {
              let filteredCards = verifyCardsAgainstSoldList(updatedCards);
              
              // Secondary filter from localStorage/sessionStorage for redundancy
              let pendingSoldCardIds = [];
              try {
                // First from localStorage (primary)
                pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
                
                // Then add any from sessionStorage (backward compatibility)
                const sessionStorageIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
                if (sessionStorageIds.length > 0) {
                  pendingSoldCardIds = [...new Set([...pendingSoldCardIds, ...sessionStorageIds])];
                }
              } catch (e) {
                logger.warn('Failed to get pending sold cards from storage', e);
              }
              
              // Final filter step if needed
              if (pendingSoldCardIds.length > 0) {
                const initialCount = filteredCards.length;
                filteredCards = filteredCards.filter(card => !pendingSoldCardIds.includes(card.id));
              }
              
              // Always update cards immediately with what we get from Firestore
              setCards(filteredCards);
              setSyncStatus('synced');
            }
          );
          
          // Register the subscription with the manager
          subscriptionId = subscriptionManager.register(
            unsubscribe, 
            `collection-${selectedCollection.id}`
          );
        } else {
          // Subscribe to all cards when "All Cards" is selected
          const unsubscribe = repository.subscribeToAllCards(
            (updatedCards) => {
              let filteredCards = verifyCardsAgainstSoldList(updatedCards);
              
              // Secondary filter from localStorage/sessionStorage for redundancy
              let pendingSoldCardIds = [];
              try {
                // First from localStorage (primary)
                pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
                
                // Then add any from sessionStorage (backward compatibility)
                const sessionStorageIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
                if (sessionStorageIds.length > 0) {
                  pendingSoldCardIds = [...new Set([...pendingSoldCardIds, ...sessionStorageIds])];
                }
              } catch (e) {
                logger.warn('Failed to get pending sold cards from storage', e);
              }
              
              // Final filter step if needed
              if (pendingSoldCardIds.length > 0) {
                const initialCount = filteredCards.length;
                filteredCards = filteredCards.filter(card => !pendingSoldCardIds.includes(card.id));
              }
              
              // Always update cards immediately
              setCards(filteredCards);
              setSyncStatus('synced');
            }
          );
          
          // Register the subscription with the manager
          subscriptionId = subscriptionManager.register(
            unsubscribe, 
            'all-cards'
          );
        }
      } catch (error) {
        logger.error('Error setting up subscription:', error);
      }
    };
    
    setupSubscription();
      
    return () => {
      if (subscriptionId) {
        subscriptionManager.unregister(subscriptionId);
      }
    };
  }, [repository, selectedCollection, verifyCardsAgainstSoldList]); // Added verifyCardsAgainstSoldList dependency

  // Subscribe to sold cards changes
  useEffect(() => {
    let subscriptionId = null;
    
    const setupSoldCardsSubscription = async () => {
      if (!repository) return;
      
      try {
        if (subscriptionId) {
          subscriptionManager.unregister(subscriptionId);
          subscriptionId = null;
        }
        
        // Wait a small delay to ensure clean unsubscribe
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set up sold cards subscription with minimal logging
        const unsubscribe = repository.subscribeToSoldCards(
          (updatedSoldCards) => {
            setSoldCards(updatedSoldCards);
            setSyncStatus('synced');
          }
        );
        
        // Register the subscription with the manager
        subscriptionId = subscriptionManager.register(
          unsubscribe, 
          'sold-cards'
        );
      } catch (error) {
        logger.error('Error setting up sold cards subscription:', error);
      }
    };
    
    setupSoldCardsSubscription();
    
    return () => {
      if (subscriptionId) {
        subscriptionManager.unregister(subscriptionId);
      }
    };
  }, [repository, soldCards.length]);

  // Collection operations
  const createCollection = useCallback(async (name) => {
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
        updatedAt: newCollection.updatedAt || new Date()
      };
      
      setCollections(prev => [...prev, formattedCollection]);
      
      // Immediately select the new collection
      setSelectedCollection(formattedCollection);
      
      setSyncStatus('synced');
      return formattedCollection;
    } catch (err) {
      console.error('Error creating collection:', err);
      setError(err.message);
      setSyncStatus('error');
      throw err;
    }
  }, [repository]);

  const updateCollection = useCallback(async (collectionId, data) => {
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
  }, [repository]);

  const deleteCollection = useCallback(async (collectionId) => {
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
  }, [repository, selectedCollection, collections]);

  // Card operations
  const createCard = useCallback(async (cardData, imageFile) => {
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
      const collection = collections.find(c => c.id === cardData.collectionId);
      if (collection) {
        await repository.updateCollection(collection.id, {
          ...collection,
          cardCount: (collection.cardCount || 0) + 1
        });
      }
      
      setSyncStatus('synced');
      return newCard;
    } catch (err) {
      console.error('Error creating card:', err);
      setError(err.message);
      setSyncStatus('error');
      throw err;
    }
  }, [repository, collections, selectedCollection]);

  const updateCard = useCallback(async (cardId, data) => {
    try {
      setSyncStatus('syncing');
      // Combine cardId and data into a single payload object
      await repository.updateCard({ id: cardId, ...data });
      setCards(prev => 
        prev.map(card => 
          card.id === cardId ? { ...card, ...data } : card
        )
      );
    } catch (err) {
      setError(err.message);
      setSyncStatus('error');
      throw err;
    }
  }, [repository]);

  const deleteCard = useCallback(async (cardId) => {
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
  }, [repository]);

  // Add support for deleting multiple cards at once
  const deleteCards = useCallback(async (cardIds) => {
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
      console.error('Error deleting multiple cards:', err);
      setError(err.message);
      setSyncStatus('error');
      throw err;
    }
  }, [repository]);

  const markCardAsSold = useCallback(async (cardId, soldData) => {
    try {
      setSyncStatus('syncing');
      
      // Ensure we have valid data before proceeding
      if (!cardId) {
        throw new Error('Card ID is required');
      }
      
      if (!soldData || typeof soldData.soldPrice !== 'number' || isNaN(soldData.soldPrice)) {
        throw new Error('Valid sold price is required');
      }
      
      // Find the card to be marked as sold for local state update
      const cardToMark = cards.find(card => card.id === cardId);
      if (!cardToMark) {
        throw new Error(`Card with ID ${cardId} not found in local state`);
      }
      
      // Store the card ID in state
      setSoldCardIds(prev => new Set([...prev, cardId]));
      
      // Immediately update local state to remove the card
      // This prevents the user from seeing it while the operation processes
      setCards(prev => prev.filter(card => card.id !== cardId));
      
      try {
        // Call the repository function
        const soldCard = await repository.markCardAsSold(cardId, soldData);
        
        // Update sold cards state
        setSoldCards(prev => [soldCard, ...prev]);
        
        // Also update collection cardCount if needed
        if (cardToMark.collectionId) {
          setCollections(prev => {
            return prev.map(collection => {
              if (collection.id === cardToMark.collectionId) {
                return {
                  ...collection,
                  cardCount: Math.max((collection.cardCount || 0) - 1, 0)
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
      } catch (repoError) {
        // If card not found in Firestore but exists in local state,
        // try to create a sold card from the local state data
        if (repoError.message && repoError.message.includes('Card not found') && cardToMark) {
          console.log('Card not found in Firestore but exists in local state, using local data');
          
          // Create a sold card from local data
          const localSoldCard = {
            ...cardToMark,
            originalCardId: cardId,
            soldDate: new Date(),
            soldPrice: soldData.soldPrice,
            finalValueAUD: soldData.soldPrice,
            profit: soldData.soldPrice - (cardToMark.investmentAUD || 0),
            finalProfitAUD: soldData.soldPrice - (cardToMark.investmentAUD || 0),
            buyer: soldData.buyer || 'Unknown',
            dateSold: soldData.dateSold || new Date().toISOString().split('T')[0],
            invoiceId: soldData.invoiceId || `INV-LOCAL-${Date.now()}`
          };
          
          // Try to save the sold card directly
          try {
            const savedSoldCard = await repository.createSoldCardDirectly(localSoldCard);
            
            // Update sold cards state
            setSoldCards(prev => [savedSoldCard, ...prev]);
            
            // Update collection count
            if (cardToMark.collectionId) {
              setCollections(prev => {
                return prev.map(collection => {
                  if (collection.id === cardToMark.collectionId) {
                    return {
                      ...collection,
                      cardCount: Math.max((collection.cardCount || 0) - 1, 0)
                    };
                  }
                  return collection;
                });
              });
            }
            
            // Remove from pending list after successful local sale
            setSoldCardIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(cardId);
              return newSet;
            });
            
            setSyncStatus('synced');
            return savedSoldCard;
          } catch (saveError) {
            console.error('Error saving local sold card:', saveError);
            throw saveError;
          }
        } else {
          // If any other error, restore the card to the local state
          setCards(prev => [...prev, cardToMark]);
          
          // Remove from pending list
          setSoldCardIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardId);
            return newSet;
          });
          
          // Rethrow the original error
          throw repoError;
        }
      }
    } catch (err) {
      console.error('Error marking card as sold:', err);
      setError(err.message);
      setSyncStatus('error');
      throw err;
    } finally {
      // Ensure we reset sync status even if there's an error
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    }
  }, [repository, cards]);

  // Import/Export operations
  const importCards = useCallback(async (file, collectionId, importMode = 'priceUpdate') => {
    try {
      setSyncStatus('syncing');
      const result = await repository.importCards(file, collectionId, importMode);
      // Cards will be updated via the subscription
      return { success: true };
    } catch (err) {
      console.error("Error in CardContext.importCards:", err);
      setError(err.message);
      setSyncStatus('error');
      throw err;
    }
  }, [repository]);

  const exportCards = useCallback(async (collectionId) => {
    try {
      setSyncStatus('syncing');
      await repository.exportCards(collectionId);
      // Cards will be updated via the subscription
    } catch (err) {
      setError(err.message);
      setSyncStatus('error');
      throw err;
    }
  }, [repository]);

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
    exportCards
  };

  return (
    <CardContext.Provider value={contextValue}>
      {children}
    </CardContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCards must be used within a CardProvider');
  }
  return context;
} 