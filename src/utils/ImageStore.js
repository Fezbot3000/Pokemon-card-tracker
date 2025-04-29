/**
 * ImageStore - Persistent image caching to prevent reloads
 * This is a client-side cache for card images to prevent unnecessary reloads
 */

// In-memory cache that persists between navigation
const imageCache = new Map();

// DOM nodes that have loaded images
const loadedNodes = new Set();

// Store an image URL in the cache
export function cacheImage(cardId, imageUrl) {
  if (!cardId || !imageUrl) return;
  imageCache.set(cardId, imageUrl);
}

// Get an image from the cache
export function getCachedImage(cardId) {
  return imageCache.get(cardId);
}

// Check if an image is already cached
export function hasImage(cardId) {
  return imageCache.has(cardId);
}

// Apply to an image element to prevent reloads
export function optimizeImageLoading(imgElement, cardId) {
  if (!imgElement || !cardId) return;
  
  // Add to DOM nodes tracking
  loadedNodes.add(imgElement);
  
  // Override the src with cached version if available
  const cachedSrc = imageCache.get(cardId);
  if (cachedSrc && imgElement.src !== cachedSrc) {
    imgElement.src = cachedSrc;
  }
  
  // Intercept future src changes
  const originalSrcSetter = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype, 'src'
  ).set;
  
  // Use a proxy to intercept src changes
  Object.defineProperty(imgElement, 'src', {
    set(newSrc) {
      // Cache the new src
      if (newSrc && newSrc !== 'null') {
        imageCache.set(cardId, newSrc);
      }
      originalSrcSetter.call(this, newSrc);
    },
    get() {
      return this.getAttribute('src');
    }
  });
}

// Apply to the card container level
export function optimizeCardsContainer(containerElement) {
  if (!containerElement) return;
  
  // Find all card images within the container
  const cardImages = containerElement.querySelectorAll('.card-image');
  
  cardImages.forEach(img => {
    // Extract card ID from parent container
    const cardContainer = img.closest('[data-card-id]');
    if (cardContainer) {
      const cardId = cardContainer.dataset.cardId;
      if (cardId) {
        optimizeImageLoading(img, cardId);
      }
    }
  });
}

// Expose image cache for direct access
export const imageStore = imageCache;

export default {
  cacheImage,
  getCachedImage,
  hasImage,
  optimizeImageLoading,
  optimizeCardsContainer,
  imageStore
};
