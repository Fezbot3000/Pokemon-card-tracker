import React, { useEffect, useState, useRef } from 'react';
import ViewPersistenceManager from '../utils/ViewPersistenceManager';
import logger from '../utils/logger';

/**
 * PersistentViewContainer - Prevents components from unmounting during navigation
 * This avoids unnecessary data fetching and image reloading
 */
const PersistentViewContainer = ({
  viewKey,
  isActive,
  children,
  forceRefresh = false,
}) => {
  const [content, setContent] = useState(null);
  const initialized = useRef(false);
  const previousActive = useRef(isActive);

  // On initial mount and when children change
  useEffect(() => {
    // Only initialize if this is the currently visible view or if we need to cache
    if (isActive || !initialized.current || forceRefresh) {
      logger.debug(`Initializing view: ${viewKey}, active: ${isActive}`);
      setContent(children);
      initialized.current = true;

      // Cache the view for future use
      ViewPersistenceManager.cacheView(viewKey, children);
    }

    // Track when view becomes active again after being inactive
    if (isActive && !previousActive.current) {
      logger.debug(`View ${viewKey} became active again`);
    }

    previousActive.current = isActive;
  }, [viewKey, isActive, children, forceRefresh]);

  // Apply CSS classes based on active state
  const containerStyle = {
    display: isActive ? 'block' : 'none',
    height: isActive ? 'auto' : '0',
    overflow: 'hidden',
    // Add transition for smoother view changes
    transition: 'height 0.2s ease-out',
  };

  return (
    <div style={containerStyle} className="persistent-view-container">
      {content}
    </div>
  );
};

export default PersistentViewContainer;
