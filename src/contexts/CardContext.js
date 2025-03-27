import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import CardRepository from '../repositories/CardRepository';

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
    try {
      // First try to load from localStorage (more persistent)
      let pendingSoldCardIds = [];
      try {
        pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
        console.log(`Loaded ${pendingSoldCardIds.length} sold card IDs from localStorage`);
      } catch (error) {
        console.warn('Failed to load pending sold cards from localStorage:', error);
      }
      
      // Add any from sessionStorage as well (for backwards compatibility)
      try {
        const sessionPendingSoldCardIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
        if (sessionPendingSoldCardIds.length > 0) {
          console.log(`Found ${sessionPendingSoldCardIds.length} sold card IDs in sessionStorage`);
          // Combine unique IDs from both sources
          pendingSoldCardIds = [...new Set([...pendingSoldCardIds, ...sessionPendingSoldCardIds])];
          // Clean up sessionStorage since we're moving to localStorage
          sessionStorage.removeItem('pendingSoldCardIds');
        }
      } catch (error) {
        console.warn('Failed to process pending sold cards from sessionStorage:', error);
      }
      
      // Set the sold card IDs in state
      if (pendingSoldCardIds.length > 0) {
        console.log(`Setting ${pendingSoldCardIds.length} sold card IDs in state`);
        setSoldCardIds(new Set(pendingSoldCardIds));
      }
    } catch (error) {
      console.warn('Failed to process pending sold cards:', error);
    }
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
    
    console.log(`Filtering ${cardsToVerify.length} cards against ${currentSoldCardIds.length} sold card IDs`);
    const filteredCards = cardsToVerify.filter(card => !currentSoldCardIds.includes(card.id));
    
    if (filteredCards.length !== cardsToVerify.length) {
      console.log(`Filtered out ${cardsToVerify.length - filteredCards.length} sold cards`);
    }
    
    return filteredCards;
  }, [soldCardIds]);

  // Load initial data (collections, cards, etc)
  const loadInitialData = useCallback(async (repo) => {
    if (!repo) {
      console.error('Cannot load data: repository is null');
      setLoading(false);
      return { success: false, message: 'Repository is not initialized' };
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log("CardContext: Loading initial data...");
      
      // First, get all collections from the repository
      let collections = [];
      try {
        collections = await repo.getCollections();
        console.log(`CardContext: Loaded ${collections.length} collections`);
      } catch (collectionsError) {
        console.error('Failed to load collections:', collectionsError);
        setError('Failed to load collections');
        collections = [];
      }

      // IMPORTANT: Don't filter out any existing collections
      // Just ensure there are no duplicates with the same name
      const uniqueCollections = [];
      const collectionNames = new Set();
      const collectionIds = new Set();
      
      for (const collection of collections) {
        // Skip any null or undefined collections
        if (!collection || !collection.name) continue;
        
        // Add collection IDs to set for later detection of orphaned cards
        collectionIds.add(collection.id);
        
        // Check if we've already seen this collection name
        if (!collectionNames.has(collection.name.toLowerCase())) {
          collectionNames.add(collection.name.toLowerCase());
          uniqueCollections.push({
            ...collection,
            cardCount: collection.cardCount || 0
          });
        } else {
          console.warn(`Duplicate collection name detected: ${collection.name} - keeping the first one`);
        }
      }
      
      // Add the "All Cards" pseudo-collection only if it doesn't exist already
      const hasAllCards = uniqueCollections.some(c => 
        c.name === 'All Cards' || c.id === 'all-cards'
      );
      
      let fullCollections = uniqueCollections;
      
      if (!hasAllCards) {
        const allCollectionsOption = {
          id: 'all-cards',
          name: 'All Cards',
          cardCount: 0
        };
        // Add All Cards at the beginning
        fullCollections = [allCollectionsOption, ...uniqueCollections];
      }
      
      console.log(`CardContext: Setting ${fullCollections.length} collections (including All Cards)`);
      setCollections(fullCollections);

      // Check if a collection was previously selected in this session
      // Use selectedCollectionId in localStorage first (it's more reliable)
      const storedCollectionId = localStorage.getItem('selectedCollectionId');
      const storedCollectionName = localStorage.getItem('selectedCollection');
      
      console.log(`CardContext: Stored collection ID: ${storedCollectionId}`);
      console.log(`CardContext: Stored collection name: ${storedCollectionName}`);
      
      let selected = null;
      
      // First try to get by ID
      if (storedCollectionId) {
        selected = fullCollections.find(c => c.id === storedCollectionId);
        console.log(`CardContext: Found collection by ID: ${selected?.name || 'none'}`);
      }
      
      // If not found by ID, try by name
      if (!selected && storedCollectionName) {
        selected = fullCollections.find(c => c.name === storedCollectionName);
        console.log(`CardContext: Found collection by name: ${selected?.name || 'none'}`);
      }
      
      // If still not found, default to "All Cards" or first collection
      if (!selected) {
        selected = fullCollections.find(c => c.id === 'all-cards' || c.name === 'All Cards') || 
                 (fullCollections.length > 0 ? fullCollections[0] : null);
        console.log(`CardContext: Defaulting to ${selected?.name || 'no'} collection`);
      }
      
      // Set the selected collection
      if (selected) {
        setSelectedCollection(selected);
        console.log(`CardContext: Selected collection set to: ${selected.name}`);
      } else {
        console.log('CardContext: No collection available to select');
      }

      // Get ALL cards to check for orphaned collections (those referenced by cards but not in collections list)
      let allCardsFromRepo = [];
      
      try {
        // Get all cards regardless of collection
        allCardsFromRepo = await repo.getCardsByCollection(null);
        console.log(`CardContext: Loaded ${allCardsFromRepo.length} total cards across all collections`);
        
        // Check for orphaned collections (cards with collection IDs that don't exist in our collections)
        const orphanedCollectionIds = new Set();
        
        // Find collection IDs in cards that don't exist in our collections
        allCardsFromRepo.forEach(card => {
          if (card.collectionId && 
              card.collectionId !== 'all-cards' && 
              !collectionIds.has(card.collectionId)) {
            orphanedCollectionIds.add(card.collectionId);
          }
        });
        
        // If we found orphaned collections, try to recover them
        if (orphanedCollectionIds.size > 0) {
          console.log(`Found ${orphanedCollectionIds.size} orphaned collections, attempting to recover`);
          
          const orphanedCollectionIdsArray = Array.from(orphanedCollectionIds);
          for (const collectionId of orphanedCollectionIdsArray) {
            try {
              // Get a card from this collection to see what name it might have had
              const sampleCard = allCardsFromRepo.find(card => card.collectionId === collectionId);
              
              // Generate a collection name based on available information
              let collectionName = 'Recovered Collection';
              if (sampleCard && sampleCard.set) {
                collectionName = sampleCard.set;
              }
              
              // Create a new collection with the recovered ID
              const recoveredCollection = {
                id: collectionId,
                name: collectionName,
                cardCount: allCardsFromRepo.filter(card => card.collectionId === collectionId).length,
                description: 'Recovered collection',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              // Save the collection to Firestore
              try {
                await repo.createCollectionWithId(collectionId, recoveredCollection);
                console.log(`Successfully recovered collection ${collectionId} as "${collectionName}"`);
                
                // Add to our collections array
                fullCollections.push(recoveredCollection);
              } catch (saveError) {
                console.error(`Failed to save recovered collection ${collectionId}:`, saveError);
              }
            } catch (recoveryError) {
              console.error(`Error recovering collection ${collectionId}:`, recoveryError);
            }
          }
          
          // Update collections in state
          if (fullCollections.length > uniqueCollections.length) {
            console.log(`Updating collections list with ${fullCollections.length} total collections after recovery`);
            setCollections(fullCollections);
          }
        }
      } catch (allCardsError) {
        console.error('Failed to load all cards:', allCardsError);
      }

      // Get cards from repository based on the selected collection
      let cardsFromRepo = [];
      
      try {
        // With our updated getCardsByCollection method, we can use it for both cases
        cardsFromRepo = await repo.getCardsByCollection(selected.id);
        console.log(`CardContext: Loaded ${cardsFromRepo.length} cards for collection ${selected.name}`);
        
        // Find and remove duplicate cards
        try {
          // Look for potential duplicate cards created during image uploads
          const duplicateGroups = await findDuplicateCards(cardsFromRepo, repo);
          if (duplicateGroups.length > 0) {
            console.log(`Found ${duplicateGroups.length} groups of duplicate cards, cleaning up...`);
            let totalDuplicatesRemoved = 0;
            
            // Process each group of duplicates
            for (const group of duplicateGroups) {
              // Keep the most complete card and remove others
              const [cardToKeep, ...cardsToRemove] = group;
              
              console.log(`Keeping card ${cardToKeep.id} and removing ${cardsToRemove.length} duplicates`);
              
              // Delete duplicates
              for (const duplicate of cardsToRemove) {
                try {
                  await repo.deleteCard(duplicate.id);
                  totalDuplicatesRemoved++;
                } catch (deleteError) {
                  console.error(`Failed to delete duplicate card ${duplicate.id}:`, deleteError);
                }
              }
            }
            
            console.log(`Successfully removed ${totalDuplicatesRemoved} duplicate cards`);
            
            // Reload cards after cleanup
            if (totalDuplicatesRemoved > 0) {
              console.log('Reloading cards after duplicate cleanup');
              cardsFromRepo = await repo.getCardsByCollection(selected.id);
            }
          }
        } catch (duplicateError) {
          console.error('Error checking for duplicate cards:', duplicateError);
        }
        
        // Fix cards with hardcoded collection IDs
        try {
          // Look for cards with hardcoded 'colect1' collection ID
          const cardsWithHardcodedCollection = cardsFromRepo.filter(card => 
            card.collectionId === 'colect1'
          );
          
          if (cardsWithHardcodedCollection.length > 0) {
            console.log(`Found ${cardsWithHardcodedCollection.length} cards with hardcoded collection ID 'colect1'`);
            
            // Find a valid user-created collection (not 'all-cards')
            const targetCollection = fullCollections.find(c => c.id !== 'all-cards') || 
                                    (fullCollections.length > 0 ? fullCollections[0] : null);
            
            if (targetCollection) {
              console.log(`Assigning these cards to collection: ${targetCollection.name}`);
              
              // Update each card with the correct collection ID
              for (const card of cardsWithHardcodedCollection) {
                try {
                  await repo.updateCard(card.id, {
                    collectionId: targetCollection.id
                  });
                  console.log(`Updated card ${card.id} with correct collection ID: ${targetCollection.id}`);
                } catch (updateError) {
                  console.error(`Failed to update collection for card ${card.id}:`, updateError);
                }
              }
              
              // Reload cards after fixing
              console.log('Reloading cards after fixing collection IDs');
              cardsFromRepo = await repo.getCardsByCollection(selected.id);
            }
          }
        } catch (collectionFixError) {
          console.error('Error fixing hardcoded collection IDs:', collectionFixError);
        }
      } catch (cardsError) {
        console.error('Failed to load cards:', cardsError);
        setError('Failed to load cards');
        cardsFromRepo = [];
      }
      
      // Filter out any sold cards at initial load time
      let pendingSoldCardIds = [];
      try {
        // Get from localStorage (primary source)
        pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
        
        // Also check sessionStorage (for backward compatibility)
        const sessionPendingSoldCardIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
        if (sessionPendingSoldCardIds.length > 0) {
          pendingSoldCardIds = [...new Set([...pendingSoldCardIds, ...sessionPendingSoldCardIds])];
        }
        
        if (pendingSoldCardIds.length > 0) {
          const originalCount = cardsFromRepo.length;
          cardsFromRepo = cardsFromRepo.filter(card => !pendingSoldCardIds.includes(card.id));
          console.log(`Initial load: Filtered out ${originalCount - cardsFromRepo.length} sold cards`);
        }
      } catch (e) {
        console.warn('Failed to filter sold cards during initial load:', e);
      }
      
      // Helper function to find duplicate cards
      async function findDuplicateCards(cards, repository) {
        // Group cards by potential identifying features
        const cardsByFeatures = {};
        
        // Look for cards with very similar attributes (likely duplicates)
        for (const card of cards) {
          if (!card.card || !card.player) continue; // Skip cards with missing core data
          
          // Create a key based on core card attributes
          const key = `${card.player?.toLowerCase()}_${card.card?.toLowerCase()}_${card.set?.toLowerCase()}`;
          
          if (!cardsByFeatures[key]) {
            cardsByFeatures[key] = [];
          }
          
          cardsByFeatures[key].push(card);
        }
        
        // Return groups with more than one card (duplicates)
        return Object.values(cardsByFeatures)
          .filter(group => group.length > 1)
          // Sort each group so the most complete card comes first (to keep)
          .map(group => {
            return group.sort((a, b) => {
              // Cards with images are preferred
              if (a.imageUrl && !b.imageUrl) return -1;
              if (!a.imageUrl && b.imageUrl) return 1;
              
              // Cards with more fields filled in are preferred
              const aFields = Object.keys(a).length;
              const bFields = Object.keys(b).length;
              if (aFields !== bFields) return bFields - aFields;
              
              // Newer cards (by ID) are preferred
              return a.id < b.id ? 1 : -1;
            });
          });
      }
      
      // Update card counts in collections
      if (cardsFromRepo.length > 0) {
        try {
          // Count cards by collection
          const countsByCollection = cardsFromRepo.reduce((acc, card) => {
            if (card.collectionId) {
              acc[card.collectionId] = (acc[card.collectionId] || 0) + 1;
            }
            return acc;
          }, {});
          
          // Update collections with counts
          const updatedCollections = fullCollections.map(collection => {
            if (collection.id === 'all-cards') {
              return {
                ...collection,
                cardCount: cardsFromRepo.length
              };
            }
            return {
              ...collection,
              cardCount: countsByCollection[collection.id] || 0
            };
          });
          
          console.log(`CardContext: Updating collections with card counts`);
          setCollections(updatedCollections);
        } catch (countError) {
          console.error('Error updating collection counts:', countError);
        }
      }
      
      setCards(cardsFromRepo);
      
      // Load sold cards
      let soldCardsFromRepo = [];
      try {
        soldCardsFromRepo = await repo.getSoldCards();
        // getSoldCards now directly returns an array
        console.log(`CardContext: Loaded ${soldCardsFromRepo.length} sold cards`);
        
        // Update soldCardIds from Firestore data as well (extra reliability)
        if (soldCardsFromRepo.length > 0) {
          // Extract all originalCardIds from sold cards
          const originalCardIds = soldCardsFromRepo
            .map(card => card.originalCardId)
            .filter(id => id); // Filter out any undefined/null IDs
          
          // Add these to localStorage and state for future filtering
          if (originalCardIds.length > 0) {
            // Update state with sold card IDs from Firestore
            setSoldCardIds(prev => new Set([...prev, ...originalCardIds]));
            
            // Update localStorage
            try {
              const existingIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
              const combinedIds = [...new Set([...existingIds, ...originalCardIds])];
              localStorage.setItem('pendingSoldCardIds', JSON.stringify(combinedIds));
              console.log(`Added ${originalCardIds.length} sold card IDs from Firestore to tracking`);
            } catch (storageError) {
              console.warn('Failed to update localStorage with Firestore sold cards:', storageError);
            }
          }
        }
      } catch (soldCardsError) {
        console.error('Failed to load sold cards:', soldCardsError);
        soldCardsFromRepo = [];
      }
      
      setSoldCards(soldCardsFromRepo);
      
      setLoading(false);
      setSyncStatus('synced');
      
      console.log("CardContext: Initial data load complete");
      
      return { success: true, message: 'Data loaded successfully' };
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'Failed to load initial data');
      setLoading(false);
      setSyncStatus('error');
      
      return { success: false, message: err.message };
    }
  }, []);

  // Subscribe to collection changes
  useEffect(() => {
    let unsubscribe = null;
    let isFirstLoad = true; // Track if this is the first load
    
    const setupSubscription = async () => {
      if (!repository) return;
      
      try {
        // Always clean up any existing subscription first
        if (unsubscribe) {
          console.log('Unsubscribing from previous cards subscription');
          unsubscribe();
          unsubscribe = null;
        }
        
        // Wait a small delay to ensure clean unsubscribe
        await new Promise(resolve => setTimeout(resolve, 100));
      
      if (selectedCollection && selectedCollection.id !== 'all-cards') {
        // Subscribe to a specific collection
        unsubscribe = repository.subscribeToCollection(
          selectedCollection.id,
          (updatedCards) => {
              // Only log significant changes, not every update
              if (isFirstLoad || updatedCards.length !== cards.length) {
            console.log(`Received ${updatedCards.length} cards from collection subscription`);
                isFirstLoad = false;
              }
              
              // Apply double filtering - first from state, then from local/sessionStorage
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
                console.warn('Failed to get pending sold cards from storage', e);
              }
              
              // Final filter step if needed
              if (pendingSoldCardIds.length > 0) {
                const initialCount = filteredCards.length;
                filteredCards = filteredCards.filter(card => !pendingSoldCardIds.includes(card.id));
                
                // If any cards were filtered out, log it
                if (filteredCards.length !== initialCount) {
                  console.log(`Storage filter: Filtered out ${initialCount - filteredCards.length} cards that are pending sale`);
                }
              }
              
              // Always update cards immediately with what we get from Firestore
              setCards(filteredCards);
            setSyncStatus('synced');
          }
        );
      } else {
          // Subscribe to all cards when "All Cards" is selected
        unsubscribe = repository.subscribeToAllCards(
          (updatedCards) => {
              // Only log significant changes, not every update
              if (isFirstLoad || updatedCards.length !== cards.length) {
            console.log(`Received ${updatedCards.length} cards from all-cards subscription`);
                isFirstLoad = false;
              }
              
              // Apply double filtering - first from state, then from local/sessionStorage
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
                console.warn('Failed to get pending sold cards from storage', e);
              }
              
              // Final filter step if needed
              if (pendingSoldCardIds.length > 0) {
                const initialCount = filteredCards.length;
                filteredCards = filteredCards.filter(card => !pendingSoldCardIds.includes(card.id));
                
                // If any cards were filtered out, log it
                if (filteredCards.length !== initialCount) {
                  console.log(`Storage filter: Filtered out ${initialCount - filteredCards.length} cards that are pending sale`);
                }
              }
              
              // Always update cards immediately
              setCards(filteredCards);
            setSyncStatus('synced');
          }
        );
      }
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    };
    
    setupSubscription();
      
      return () => {
        if (unsubscribe) {
        console.log('Unsubscribing from cards collection on cleanup');
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
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
          console.log('Unsubscribing from previous sold cards subscription');
          unsubscribe();
          unsubscribe = null;
        }
        
        // Wait a small delay to ensure clean unsubscribe
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set up sold cards subscription with minimal logging
        unsubscribe = repository.subscribeToSoldCards(
        (updatedSoldCards) => {
            // Only log if there's a significant change
            if (updatedSoldCards.length !== soldCards.length) {
              console.log(`Received ${updatedSoldCards.length} sold cards (was ${soldCards.length})`);
            }
          setSoldCards(updatedSoldCards);
          setSyncStatus('synced');
        }
      );
      } catch (error) {
        console.error('Error setting up sold cards subscription:', error);
      }
    };
    
    setupSoldCardsSubscription();
    
    return () => {
      if (unsubscribe) {
        console.log('Unsubscribing from sold cards on cleanup');
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from sold cards:', error);
        }
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
      console.log('Setting selected collection to new collection:', formattedCollection);
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
        console.log(`No collectionId provided, using selectedCollection: ${selectedCollection.id}`);
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
      await repository.updateCard(cardId, data);
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
      console.log(`Deleting ${cardIds.length} cards`);
      
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
      
      // Store the card ID in both local state and localStorage for redundant tracking
      // Update state
      setSoldCardIds(prev => new Set([...prev, cardId]));
      
      // Update localStorage (primary persistence)
      try {
        const pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
        if (!pendingSoldCardIds.includes(cardId)) {
          pendingSoldCardIds.push(cardId);
          localStorage.setItem('pendingSoldCardIds', JSON.stringify(pendingSoldCardIds));
          console.log(`Added card ID ${cardId} to localStorage pending sold list`);
        }
      } catch (storageError) {
        console.warn('Failed to update localStorage:', storageError);
      }
      
      // Update sessionStorage as well (for backward compatibility)
      try {
        const pendingSoldCardIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
        if (!pendingSoldCardIds.includes(cardId)) {
          pendingSoldCardIds.push(cardId);
          sessionStorage.setItem('pendingSoldCardIds', JSON.stringify(pendingSoldCardIds));
          console.log(`Added card ID ${cardId} to sessionStorage pending sold list`);
        }
      } catch (storageError) {
        console.warn('Failed to update sessionStorage:', storageError);
      }
      
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
        try {
          // Update state
          setSoldCardIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(cardId);
            return newSet;
          });
          
          // Update localStorage
          const pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
          const updatedPendingIds = pendingSoldCardIds.filter(id => id !== cardId);
          localStorage.setItem('pendingSoldCardIds', JSON.stringify(updatedPendingIds));
          
          // Update sessionStorage (backward compatibility)
          const sessionPendingSoldCardIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
          const updatedSessionIds = sessionPendingSoldCardIds.filter(id => id !== cardId);
          sessionStorage.setItem('pendingSoldCardIds', JSON.stringify(updatedSessionIds));
          
          console.log(`Removed card ID ${cardId} from pending sold lists`);
        } catch (storageError) {
          console.warn('Failed to update storage after sale:', storageError);
        }
      
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
            try {
              // Update state
              setSoldCardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
              });
              
              // Update localStorage
              const pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
              const updatedPendingIds = pendingSoldCardIds.filter(id => id !== cardId);
              localStorage.setItem('pendingSoldCardIds', JSON.stringify(updatedPendingIds));
              
              // Update sessionStorage (backward compatibility)
              const sessionPendingSoldCardIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
              const updatedSessionIds = sessionPendingSoldCardIds.filter(id => id !== cardId);
              sessionStorage.setItem('pendingSoldCardIds', JSON.stringify(updatedSessionIds));
              
              console.log(`Removed card ID ${cardId} from pending sold lists after local sale`);
            } catch (storageError) {
              console.warn('Failed to update storage after local sale:', storageError);
            }
            
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
          try {
            // Update state
            setSoldCardIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(cardId);
              return newSet;
            });
            
            // Update localStorage
            const pendingSoldCardIds = JSON.parse(localStorage.getItem('pendingSoldCardIds') || '[]');
            const updatedPendingIds = pendingSoldCardIds.filter(id => id !== cardId);
            localStorage.setItem('pendingSoldCardIds', JSON.stringify(updatedPendingIds));
            
            // Update sessionStorage (backward compatibility)
            const sessionPendingSoldCardIds = JSON.parse(sessionStorage.getItem('pendingSoldCardIds') || '[]');
            const updatedSessionIds = sessionPendingSoldCardIds.filter(id => id !== cardId);
            sessionStorage.setItem('pendingSoldCardIds', JSON.stringify(updatedSessionIds));
            
            console.log(`Removed card ID ${cardId} from pending sold lists due to error`);
          } catch (storageError) {
            console.warn('Failed to update storage:', storageError);
          }
          
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
      console.log(`CardContext: Starting import with mode: ${importMode}`);
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