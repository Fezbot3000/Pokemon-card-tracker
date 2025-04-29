import React, { useState, useEffect, useRef } from 'react';
import CacheManager from '../utils/CacheManager';

/**
 * ViewOptimizer - Component for optimizing view transitions
 * Prevents unmounting of views when switching between tabs
 */
const ViewOptimizer = ({ 
  activeView, 
  views,
  onViewChange
}) => {
  // Track rendered views to avoid remounting
  const [renderedViews, setRenderedViews] = useState([]);
  const viewRefs = useRef({});
  
  // Render a view once it's been activated
  useEffect(() => {
    if (!renderedViews.includes(activeView)) {
      setRenderedViews(prev => [...prev, activeView]);
    }
    
    // Restore scroll position when switching views
    if (viewRefs.current[activeView]) {
      const savedScrollPos = CacheManager.getScrollPosition(activeView) || 0;
      setTimeout(() => {
        if (viewRefs.current[activeView]) {
          viewRefs.current[activeView].scrollTop = savedScrollPos;
        }
      }, 50);
    }
    
    // Save scroll position when leaving view
    return () => {
      if (viewRefs.current[activeView]) {
        CacheManager.saveScrollPosition(
          activeView,
          viewRefs.current[activeView].scrollTop
        );
      }
    };
  }, [activeView, renderedViews]);
  
  // Save ref to view container
  const setViewRef = (view, element) => {
    viewRefs.current[view] = element;
  };
  
  return (
    <div className="view-optimizer-container">
      {Object.keys(views).map(viewName => {
        // Only render views that have been accessed
        const shouldRender = renderedViews.includes(viewName);
        
        if (!shouldRender) return null;
        
        // Get the component for this view
        const ViewComponent = views[viewName];
        
        // Apply styles for active/inactive views
        const style = {
          display: activeView === viewName ? 'block' : 'none',
          height: activeView === viewName ? 'auto' : '0',
          overflow: 'hidden'
        };
        
        return (
          <div 
            key={viewName}
            ref={el => setViewRef(viewName, el)}
            style={style}
            className={`view-container ${viewName}-view`}
          >
            <ViewComponent />
          </div>
        );
      })}
    </div>
  );
};

export default ViewOptimizer;
