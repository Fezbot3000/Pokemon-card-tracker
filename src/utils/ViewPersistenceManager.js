// ViewPersistenceManager.js - Utility to improve page transitions and prevent reloads

class ViewPersistenceManager {
  constructor() {
    // Cache for components that should persist between navigation
    this.cachedViews = new Map();

    // Image cache to prevent reloading images
    this.imageCache = new Map();
  }

  // Add or update a view in the cache
  cacheView(viewKey, viewComponent) {
    this.cachedViews.set(viewKey, viewComponent);
  }

  // Get a cached view
  getCachedView(viewKey) {
    return this.cachedViews.get(viewKey);
  }

  // Check if a view is in the cache
  hasView(viewKey) {
    return this.cachedViews.has(viewKey);
  }

  // Store an image URL in cache
  cacheImage(cardId, imageUrl) {
    if (!imageUrl) return;
    this.imageCache.set(cardId, imageUrl);
  }

  // Get a cached image URL
  getCachedImage(cardId) {
    return this.imageCache.get(cardId);
  }

  // Clear a specific view from cache
  clearView(viewKey) {
    if (this.cachedViews.has(viewKey)) {
      this.cachedViews.delete(viewKey);
    }
  }

  // Clear a specific image from cache
  clearImage(cardId) {
    if (this.imageCache.has(cardId)) {
      this.imageCache.delete(cardId);
    }
  }

  // Clear all caches
  clearAll() {
    this.cachedViews.clear();
    this.imageCache.clear();
  }
}

// Export singleton instance
export default new ViewPersistenceManager();
