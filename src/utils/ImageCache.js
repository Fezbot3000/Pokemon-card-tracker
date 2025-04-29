// ImageCache.js - Utility to cache card images and prevent unnecessary reloading

class ImageCache {
  constructor() {
    this.cache = new Map();
    this.placeholderUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5OTk5Ij5Mb2FkaW5nIGltYWdlLi4uPC90ZXh0Pjwvc3ZnPg==';
    
    // Setup event listeners
    this.setupListeners();
  }

  // Get an image URL from cache or return placeholder
  get(cardId) {
    if (!cardId) return this.placeholderUrl;
    return this.cache.get(cardId) || this.placeholderUrl;
  }

  // Add or update image in cache
  set(cardId, imageUrl) {
    if (!cardId || !imageUrl) return;
    
    // If it's a blob URL, fetch and convert to base64 for better persistence
    if (imageUrl.startsWith('blob:')) {
      this.convertBlobToBase64(imageUrl)
        .then(base64Url => {
          this.cache.set(cardId, base64Url);
        })
        .catch(err => {
          console.error('Error converting blob to base64:', err);
          // Store the blob URL as a fallback
          this.cache.set(cardId, imageUrl);
        });
    } else {
      // Store the URL directly
      this.cache.set(cardId, imageUrl);
    }
  }

  // Convert blob URL to base64 for better persistence
  async convertBlobToBase64(blobUrl) {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          const reader = new FileReader();
          reader.onloadend = function() {
            resolve(reader.result);
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
        xhr.open('GET', blobUrl);
        xhr.responseType = 'blob';
        xhr.send();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Check if an image is cached
  has(cardId) {
    return this.cache.has(cardId);
  }

  // Remove an image from cache
  remove(cardId) {
    this.cache.delete(cardId);
  }

  // Clear entire cache
  clear() {
    this.cache.clear();
  }

  // Setup event listeners for cache management
  setupListeners() {
    // Listen for card deletion events
    window.addEventListener('card-deleted', (event) => {
      if (event.detail && event.detail.cardId) {
        this.remove(event.detail.cardId);
      }
    });

    // Listen for image cleanup events
    window.addEventListener('card-images-cleanup', (event) => {
      if (event.detail && Array.isArray(event.detail.cardIds)) {
        event.detail.cardIds.forEach(cardId => {
          this.remove(cardId);
        });
      }
    });
  }
}

// Export singleton instance
export default new ImageCache();
