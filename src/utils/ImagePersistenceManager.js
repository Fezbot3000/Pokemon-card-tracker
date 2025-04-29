// ImagePersistenceManager.js - Utility for managing persistent image caching

/**
 * ImagePersistenceManager - A specialized utility for maintaining image persistence
 * across navigation and view changes in the Pokemon Card Tracker app.
 */
class ImagePersistenceManager {
  constructor() {
    // Image cache (cardId -> imageUrl)
    this.imageCache = new Map();
    
    // Track which images are being loaded to prevent duplicate requests
    this.loadingImages = new Set();
    
    // Flag to track if cache is initialized
    this.initialized = false;
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
    
    this.initialized = true;
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
    this.imageCache.clear();
    this.loadingImages.clear();
    this.initialized = false;
  }
  
  // Check if cache is initialized with data
  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
export default new ImagePersistenceManager();
