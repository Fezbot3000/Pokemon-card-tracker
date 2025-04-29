import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '../design-system';
import { CardRepository } from '../repositories/CardRepository';
import logger from '../utils/logger';

// Create context for caching data
const DataCacheContext = createContext();

// Custom hook to access cache
export const useDataCache = () => useContext(DataCacheContext);

export const DataCacheProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  // Cache states
  const [cards, setCards] = useState([]);
  const [collections, setCollections] = useState({});
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track subscriptions to avoid redundant listeners
  const subscriptionsRef = useRef({
    cards: null,
    collections: null,
    soldItems: null
  });
  
  // Image cache for preventing reload of images
  const [imageCache, setImageCache] = useState(new Map());
  
  // Track component visibility to avoid remounting
  const [activeView, setActiveView] = useState('cards');
  const [visibleViews, setVisibleViews] = useState({
    cards: true,
    settings: false,
    soldItems: false,
    details: false,
    newCard: false
  });
  
  // Setup data listeners once on initial mount
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    // Initialize repositories
    const repository = new CardRepository(currentUser.uid);
    setLoading(true);
    logger.debug('Setting up persistent data listeners');
    
    // Setup cards listener if not already active
    if (!subscriptionsRef.current.cards) {
      logger.debug('Initializing cards subscription');
      subscriptionsRef.current.cards = repository.subscribeToAllCards(
        (cardsData) => {
          logger.debug(`Received ${cardsData.length} cards from Firestore`);
          setCards(cardsData);
          setLoading(false);
        },
        (err) => {
          logger.error('Error in cards subscription:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    }
    
    // Get collections once initially and setup listener
    repository.getAllCollections()
      .then(collectionsData => {
        const collectionsMap = {};
        collectionsData.forEach(collection => {
          collectionsMap[collection.id] = collection;
        });
        setCollections(collectionsMap);
      })
      .catch(err => {
        logger.error('Error fetching collections:', err);
      });
      
    // Sold items subscription
    if (!subscriptionsRef.current.soldItems) {
      logger.debug('Initializing sold items subscription');
      subscriptionsRef.current.soldItems = repository.subscribeToSoldCards(
        (soldItemsData) => {
          logger.debug(`Received ${soldItemsData.length} sold items from Firestore`);
          setSoldItems(soldItemsData);
        },
        (err) => {
          logger.error('Error in sold items subscription:', err);
        }
      );
    }
    
    // Cleanup subscriptions on unmount or user change
    return () => {
      if (subscriptionsRef.current.cards) {
        subscriptionsRef.current.cards();
        subscriptionsRef.current.cards = null;
      }
      if (subscriptionsRef.current.soldItems) {
        subscriptionsRef.current.soldItems();
        subscriptionsRef.current.soldItems = null;
      }
    };
  }, [currentUser?.uid]);

  // Cache image URL by card ID
  const cacheImage = (cardId, imageUrl) => {
    if (!imageUrl || imageCache.has(cardId)) return;
    
    setImageCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cardId, imageUrl);
      return newCache;
    });
  };

  // Get a cached image for a card
  const getCachedImage = (cardId) => {
    return imageCache.get(cardId);
  };

  // Change which view is active without unmounting others
  const switchView = (viewName) => {
    setActiveView(viewName);
    
    // Update visibility - keep previously visited views mounted but hidden
    setVisibleViews(prev => ({
      ...prev,
      [viewName]: true
    }));
  };

  // Check if a view should be visible
  const isViewVisible = (viewName) => {
    return visibleViews[viewName] && activeView === viewName;
  };

  // Provide cache and functions to consumers
  const contextValue = {
    // Cached data
    cards,
    collections,
    soldItems,
    loading,
    error,
    // Image caching
    cacheImage,
    getCachedImage,
    // View management
    activeView,
    switchView,
    isViewVisible
  };

  return (
    <DataCacheContext.Provider value={contextValue}>
      {children}
    </DataCacheContext.Provider>
  );
};

export default DataCacheProvider;
