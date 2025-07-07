import React, { useEffect, useState, useRef } from 'react';
import CacheManager from '../utils/CacheManager';
import logger from '../utils/logger';

/**
 * OptimizedView - Container component that prevents unmounting during navigation
 *
 * This component wraps child views and preserves their state and scroll position
 * during navigation, improving performance by preventing unnecessary re-renders.
 */
const OptimizedView = ({
  viewName, // Unique identifier for this view
  isActive, // Whether this view is currently active
  children, // The components to render
  saveScrollPosition = true, // Whether to track scroll position
  forceRefresh = false, // Whether to force a refresh of the view
}) => {
  // Ref to track if the view has been previously rendered
  const hasRendered = useRef(false);
  const viewRef = useRef(null);
  const [viewContent, setViewContent] = useState(null);

  // On initial mount or when children change
  useEffect(() => {
    // Only update content if view is active or hasn't been rendered yet
    if (isActive || !hasRendered.current || forceRefresh) {
      setViewContent(children);
      hasRendered.current = true;

      // Log rendering status
      logger.debug(
        `OptimizedView: Rendering ${viewName}, active:${isActive}, forceRefresh:${forceRefresh}`
      );
    }
  }, [viewName, isActive, children, forceRefresh]);

  // Restore scroll position when view becomes active
  useEffect(() => {
    if (isActive && viewRef.current && saveScrollPosition) {
      const savedPosition = CacheManager.getScrollPosition(viewName);

      // Use a small timeout to ensure the DOM is ready
      setTimeout(() => {
        if (viewRef.current) {
          viewRef.current.scrollTop = savedPosition;
          logger.debug(
            `OptimizedView: Restored scroll position for ${viewName}: ${savedPosition}px`
          );
        }
      }, 50);
    }
  }, [isActive, viewName, saveScrollPosition]);

  // Save scroll position when view becomes inactive
  useEffect(() => {
    if (!isActive && viewRef.current && saveScrollPosition) {
      const currentPosition = viewRef.current.scrollTop;
      CacheManager.saveScrollPosition(viewName, currentPosition);
      logger.debug(
        `OptimizedView: Saved scroll position for ${viewName}: ${currentPosition}px`
      );
    }
  }, [isActive, viewName, saveScrollPosition]);

  // Style for container - hidden when inactive but still in DOM
  const containerStyle = {
    display: isActive ? 'block' : 'none',
    height: isActive ? 'auto' : '0',
    overflow: 'hidden',
    width: '100%',
  };

  return (
    <div
      style={containerStyle}
      className={`optimized-view ${viewName}-view`}
      ref={viewRef}
    >
      {viewContent}
    </div>
  );
};

export default OptimizedView;
