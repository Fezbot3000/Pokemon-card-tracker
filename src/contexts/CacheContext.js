import React, {
  createContext,
  useContext,
  useState,
  useRef,
} from 'react';

// Create context for storing cached data across navigation
const CacheContext = createContext();

// Custom hook to use the cache context
export const useCache = () => useContext(CacheContext);

export const CacheProvider = ({ children }) => {
  // State for cached data
  const [cardData, setCardData] = useState(null);
  const [collections, setCollections] = useState(null);
  const [soldItems, setSoldItems] = useState(null);
  const [imageCache, setImageCache] = useState(new Map());

  // Track if data is initialized
  const [isInitialized, setIsInitialized] = useState(false);

  // Keep track of mounted components to avoid unmounting during navigation
  const viewsRef = useRef({
    cards: null,
    settings: null,
    soldItems: null,
    details: null,
    newCard: null,
  });

  // Register a component to be preserved
  const registerView = (viewName, element) => {
    viewsRef.current[viewName] = element;
  };

  // Get a preserved view
  const getView = viewName => {
    return viewsRef.current[viewName];
  };

  // Cache card images to prevent reloading
  const cacheImage = (cardId, imageUrl) => {
    if (!imageUrl || imageCache.has(cardId)) return;

    setImageCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cardId, imageUrl);
      return newCache;
    });
  };

  // Get a cached image
  const getCachedImage = cardId => {
    return imageCache.get(cardId);
  };

  // Clear specific image cache
  const clearImageCache = cardId => {
    setImageCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(cardId);
      return newCache;
    });
  };

  // Value provided to consumers
  const value = {
    // Cache data
    cardData,
    setCardData,
    collections,
    setCollections,
    soldItems,
    setSoldItems,
    isInitialized,
    setIsInitialized,
    // Image cache functions
    cacheImage,
    getCachedImage,
    clearImageCache,
    // View persistence
    registerView,
    getView,
  };

  return (
    <CacheContext.Provider value={value}>{children}</CacheContext.Provider>
  );
};

export default CacheProvider;
