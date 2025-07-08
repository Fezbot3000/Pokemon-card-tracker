import { useState, useRef } from 'react';
import CacheManager from '../utils/CacheManager';

/**
 * Custom hook for view caching between navigation
 * Prevents unmounting components during tab switches
 */
export const useViewCache = () => {
  const [activeView, setActiveView] = useState('cards');
  const [renderedViews, setRenderedViews] = useState(['cards']);
  const viewsRef = useRef({});
  const scrollPositionsRef = useRef({});

  // Change the active view
  const switchView = viewName => {
    // Save scroll position of current view
    if (viewsRef.current[activeView]) {
      scrollPositionsRef.current[activeView] =
        viewsRef.current[activeView].scrollTop || 0;

      // Also save to persistent cache
      CacheManager.saveScrollPosition(
        activeView,
        scrollPositionsRef.current[activeView]
      );
    }

    // Update active view
    setActiveView(viewName);

    // Track that this view has been rendered
    if (!renderedViews.includes(viewName)) {
      setRenderedViews(prev => [...prev, viewName]);
    }

    // Restore scroll position after a brief delay
    setTimeout(() => {
      if (viewsRef.current[viewName]) {
        const savedPosition =
          scrollPositionsRef.current[viewName] ||
          CacheManager.getScrollPosition(viewName) ||
          0;
        viewsRef.current[viewName].scrollTop = savedPosition;
      }
    }, 50);
  };

  // Register a view container reference
  const registerViewRef = (viewName, element) => {
    viewsRef.current[viewName] = element;
  };

  // Check if a view should be rendered
  const shouldRenderView = viewName => {
    return renderedViews.includes(viewName);
  };

  return {
    activeView,
    switchView,
    registerViewRef,
    shouldRenderView,
    renderedViews,
  };
};
