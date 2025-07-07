/**
 * ViewOptimizer - Drop-in enhancement for React component views
 * Intercepts navigation and prevents component unmounting
 */

// Cache storage for components and images
const viewCache = new Map();
const imageCache = new Map();
const scrollPositions = new Map();

// Intercept view changes to prevent unmounting
export function optimizeViewChange(currentView, newView, setState) {
  // Save current scroll position before changing views
  const scrollableElement = document.querySelector('.main-scrollable-content');
  if (scrollableElement) {
    scrollPositions.set(currentView, scrollableElement.scrollTop);
  }

  // Change the view
  setState(newView);

  // Restore scroll position after a brief delay
  setTimeout(() => {
    const scrollableElement = document.querySelector(
      '.main-scrollable-content'
    );
    if (scrollableElement) {
      const savedPosition = scrollPositions.get(newView) || 0;
      scrollableElement.scrollTop = savedPosition;
    }
  }, 50);

  return true;
}

// Cache an image URL to prevent reloading
export function cacheImageUrl(cardId, imageUrl) {
  if (!cardId || !imageUrl) return null;

  // Only cache if not already cached
  if (!imageCache.has(cardId)) {
    imageCache.set(cardId, imageUrl);
  }

  return imageCache.get(cardId);
}

// Get a cached image URL
export function getCachedImage(cardId) {
  return cardId ? imageCache.get(cardId) : null;
}

// Apply to any component that loads images
export function optimizeCardImages(cardId, existingUrl, loadImageFn) {
  // Check cache first
  const cachedUrl = imageCache.get(cardId);
  if (cachedUrl) {
    return cachedUrl;
  }

  // If there's an existing URL, cache it
  if (existingUrl) {
    imageCache.set(cardId, existingUrl);
    return existingUrl;
  }

  // Otherwise, load and cache
  if (loadImageFn) {
    loadImageFn().then(url => {
      if (url) {
        imageCache.set(cardId, url);
      }
    });
  }

  return null;
}

// Add this directly to the main CardList/SoldItems components
export function useOptimizedView(currentView) {
  // Detect rapid view changes
  let lastViewChange = Date.now();

  return {
    // Override the image loading method
    getOptimizedImage: (cardId, fallbackUrl) => {
      return getCachedImage(cardId) || fallbackUrl;
    },

    // Cache a loaded image
    cacheImage: (cardId, imageUrl) => {
      return cacheImageUrl(cardId, imageUrl);
    },

    // Check if we should skip loading
    shouldLoadImages: () => {
      // If view just changed in the last 300ms, don't load images yet
      const now = Date.now();
      const timeSinceViewChange = now - lastViewChange;
      return timeSinceViewChange > 300;
    },

    // Record a view change
    recordViewChange: () => {
      lastViewChange = Date.now();
    },
  };
}

export default {
  optimizeViewChange,
  cacheImageUrl,
  getCachedImage,
  optimizeCardImages,
  useOptimizedView,
};
