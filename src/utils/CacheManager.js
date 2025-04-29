// CacheManager.js - Singleton utility for managing application data caching

/**
 * CacheManager - A centralized cache manager to prevent unnecessary reloads
 * while preserving real-time data updates. Uses a combination of:
 * 1. Memory caching for rapid access to data across components
 * 2. Component state persistence to prevent view rebuilding
 * 3. Image caching to avoid repeated image downloads
 */
class CacheManager {
  constructor() {
    // Data caches
    this.cardData = null;
    this.collections = null;
    this.soldItems = null;
    
    // Image cache (cardId -> imageUrl)
    this.imageCache = new Map();
    
    // Track which images are being loaded to prevent duplicate requests
    this.loadingImages = new Set();
    
    // View states to maintain between navigations
    this.viewStates = {
      cardList: null,
      soldItems: null,
      settings: null,
      scrollPositions: {}
    };
    
    // Flag to track if cache is initialized
    this.initialized = false;
  }
  
  // Cache card data
  setCardData(data) {
    this.cardData = data;
    this.initialized = true;
  }
  
  // Get cached card data
  getCardData() {
    return this.cardData;
  }
  
  // Cache collections data
  setCollections(data) {
    this.collections = data;
  }
  
  // Get cached collections
  getCollections() {
    return this.collections;
  }
  
  // Cache sold items
  setSoldItems(data) {
    this.soldItems = data;
  }
  
  // Get cached sold items
  getSoldItems() {
    return this.soldItems;
  }
  
  // Save view state
  saveViewState(viewName, state) {
    this.viewStates[viewName] = state;
  }
  
  // Get saved view state
  getViewState(viewName) {
    return this.viewStates[viewName];
  }
  
  // Save scroll position for a view
  saveScrollPosition(viewName, position) {
    this.viewStates.scrollPositions[viewName] = position;
  }
  
  // Get saved scroll position
  getScrollPosition(viewName) {
    return this.viewStates.scrollPositions[viewName] || 0;
  }
  
  // Cache image URL
  cacheImage(cardId, imageUrl) {
    if (!imageUrl || !cardId) return;
    
    // Always update the cache with the latest URL
    this.imageCache.set(cardId, imageUrl);
    
    // Remove from loading set if it was being loaded
    if (this.loadingImages.has(cardId)) {
      this.loadingImages.delete(cardId);
    }
  }
  
  // Get cached image URL
  getCachedImage(cardId) {
    return this.imageCache.get(cardId);
  }
  
  // Check if image is being loaded
  isImageLoading(cardId) {
    return this.loadingImages.has(cardId);
  }
  
  // Mark image as loading to prevent duplicate requests
  markImageAsLoading(cardId) {
    if (cardId) {
      this.loadingImages.add(cardId);
    }
  }
  
  // Preload images for a collection of cards
  preloadImages(cards, db) {
    if (!cards || !Array.isArray(cards) || !db) return;
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    let currentIndex = 0;
    
    const loadNextBatch = () => {
      const batch = cards.slice(currentIndex, currentIndex + batchSize);
      currentIndex += batchSize;
      
      if (batch.length === 0) return;
      
      batch.forEach(card => {
        if (!card || !card.id) return;
        
        // Skip if already cached or loading
        if (this.imageCache.has(card.id) || this.loadingImages.has(card.id)) return;
        
        // Mark as loading
        this.markImageAsLoading(card.id);
        
        // Load from database
        db.getCardImage(card.id)
          .then(cardImage => {
            if (cardImage) {
              const objectUrl = URL.createObjectURL(cardImage);
              this.cacheImage(card.id, objectUrl);
            } else if (card.imageUrl) {
              this.cacheImage(card.id, card.imageUrl);
            }
          })
          .catch(error => {
            console.error(`Error preloading image for card ${card.id}:`, error);
            // Remove from loading set
            this.loadingImages.delete(card.id);
          });
      });
      
      // Load next batch after a delay
      if (currentIndex < cards.length) {
        setTimeout(loadNextBatch, 200);
      }
    };
    
    // Start loading
    loadNextBatch();
  }
  
  // Check if all images in a collection are cached
  areAllImagesCached(cards) {
    if (!cards || !Array.isArray(cards)) return true;
    
    return cards.every(card => 
      !card || !card.id || this.imageCache.has(card.id)
    );
  }
  
  // Clear image from cache
  clearImage(cardId) {
    this.imageCache.delete(cardId);
    this.loadingImages.delete(cardId);
  }
  
  // Clear all cached data
  clearCache() {
    this.cardData = null;
    this.collections = null;
    this.soldItems = null;
    this.imageCache.clear();
    this.loadingImages.clear();
    this.viewStates = {
      cardList: null,
      soldItems: null,
      settings: null,
      scrollPositions: {}
    };
    this.initialized = false;
  }
  
  // Check if cache is initialized with data
  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
export default new CacheManager();
