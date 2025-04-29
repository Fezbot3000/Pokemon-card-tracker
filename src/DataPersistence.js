import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CardRepository } from './repositories/CardRepository';
import logger from './utils/logger';

// Context for persisting data between navigation
const DataPersistenceContext = createContext();

// Custom hook to access the persistent data
export const usePersistentData = () => useContext(DataPersistenceContext);

export const DataPersistenceProvider = ({ children }) => {
  // Shared data across components
  const [cards, setCards] = useState([]);
  const [collections, setCollections] = useState({});
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  
  // Refs to track active subscriptions
  const subscriptionsRef = useRef({});
  const repositoryRef = useRef(null);
  
  // Cache for images to prevent reloading
  const imageCache = useRef(new Map());
  
  // Method to initialize data with a user
  const initializeData = (userId) => {
    if (!userId) {
      setLoading(false);
      return null;
    }
    
    // Create repository instance
    repositoryRef.current = new CardRepository(userId);
    
    // Setup card subscription only once
    if (!subscriptionsRef.current.cards) {
      logger.debug(`Setting up persistent card subscription for user ${userId}`);
      
      subscriptionsRef.current.cards = repositoryRef.current.subscribeToAllCards(
        (cardsData) => {
          logger.debug(`Received ${cardsData.length} cards from Firestore`);
          setCards(cardsData);
          setLoading(false);
        },
        (err) => {
          logger.error('Error in cards subscription:', err);
          setError('Failed to load cards from cloud storage');
          setLoading(false);
        }
      );
    }
    
    // Get collections
    if (!subscriptionsRef.current.collections) {
      fetchCollections(userId);
    }
    
    // Setup sold items subscription
    if (!subscriptionsRef.current.soldItems) {
      logger.debug('Setting up persistent sold items subscription');
      
      subscriptionsRef.current.soldItems = repositoryRef.current.subscribeToSoldCards(
        (soldItemsData) => {
          logger.debug(`Received ${soldItemsData.length} sold items from Firestore`);
          setSoldItems(soldItemsData);
        },
        (err) => {
          logger.error('Error in sold items subscription:', err);
        }
      );
    }
    
    return () => cleanupSubscriptions();
  };
  
  // Fetch collections (one-time or refresh)
  const fetchCollections = (userId) => {
    if (!userId || !repositoryRef.current) return;
    
    repositoryRef.current.getAllCollections()
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
  };
  
  // Cleanup subscriptions
  const cleanupSubscriptions = () => {
    Object.values(subscriptionsRef.current).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    subscriptionsRef.current = {};
  };
  
  // Cache an image to prevent reloading
  const cacheImage = (cardId, imageUrl) => {
    if (!imageUrl) return;
    imageCache.current.set(cardId, imageUrl);
  };
  
  // Get a cached image
  const getCachedImage = (cardId) => {
    return imageCache.current.get(cardId);
  };

  // Return context value
  const contextValue = {
    // Data
    cards,
    collections,
    soldItems,
    loading,
    error,
    selectedCard,
    selectedCollection,
    
    // Methods
    setSelectedCard,
    setSelectedCollection,
    initializeData,
    fetchCollections,
    cleanupSubscriptions,
    
    // Image caching
    cacheImage,
    getCachedImage
  };

  return (
    <DataPersistenceContext.Provider value={contextValue}>
      {children}
    </DataPersistenceContext.Provider>
  );
};

export default DataPersistenceProvider;
