/**
 * ViewStateManager - App-wide state persistence between navigation
 * Prevents unmounting and reloading during tab switches
 */

// Track component instances
window.__viewStates = window.__viewStates || {
  cache: new Map(),
  images: new Map(),
  scrollPositions: new Map(),
  viewStack: []
};

const cache = window.__viewStates;

// Export a function that can be directly attached to the existing components
export function optimizeNavigation() {
  // Apply DOM observer to detect view changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // Find any newly added card images
        Array.from(mutation.addedNodes)
          .filter(node => node.nodeType === 1) // Element nodes only
          .forEach(node => {
            const imgs = node.querySelectorAll('img');
            imgs.forEach(img => {
              const cardId = img.closest('[data-card-id]')?.dataset.cardId;
              if (cardId && img.src) {
                cache.images.set(cardId, img.src);
              }
              
              // Observe load events to capture images
              img.addEventListener('load', () => {
                const cardId = img.closest('[data-card-id]')?.dataset.cardId;
                if (cardId && img.src) {
                  cache.images.set(cardId, img.src);
                }
              });
            });
          });
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  return {
    // Track view changes
    trackView: (viewName) => {
      cache.viewStack.push(viewName);
    },
    
    // Get cached image
    getImage: (cardId) => {
      return cache.images.get(cardId);
    },
    
    // Cache image
    cacheImage: (cardId, src) => {
      cache.images.set(cardId, src);
    },
    
    // Save scroll position
    saveScrollPosition: (viewName, position) => {
      cache.scrollPositions.set(viewName, position);
    },
    
    // Restore scroll position
    restoreScrollPosition: (viewName) => {
      return cache.scrollPositions.get(viewName) || 0;
    }
  };
}

// Auto-initialize
const manager = optimizeNavigation();
export default manager;
