import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { preventBodyScroll, restoreBodyScroll } from '../../utils/modalUtils';
import './BottomSheet.css';



const BottomSheet = ({ isOpen, onClose, title, children }) => {
  const sheetRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);

  // Handle drag functionality
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setCurrentTranslateY(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY;
    
    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      setCurrentTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If dragged down more than 100px, close the sheet
    if (currentTranslateY > 100) {
      onClose();
    }
    
    // Reset translation
    setCurrentTranslateY(0);
  };

  // Handle animation and body scroll locking
  useEffect(() => {
    if (isOpen) {
      // First make it visible with initial position
      setIsAnimating(true);
      // Lock body scroll when sheet is open using robust modal utilities
      preventBodyScroll();

      // Small delay to ensure the initial position is applied before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      // Hide it with animation
      setIsVisible(false);
      // Restore body scroll when sheet is closed using robust modal utilities
      restoreBodyScroll();
      // Reset drag state when closing
      setCurrentTranslateY(0);
      setIsDragging(false);
    }

    return () => {
      // Cleanup: restore body scroll when component unmounts
      restoreBodyScroll();
    };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    // Backdrop
    <div 
      className="bottom-sheet__backdrop"
      onClick={onClose}
    >
      {/* Sheet Content */}
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isDragging ? 'bottom-sheet--dragging' : ''} ${isVisible ? 'bottom-sheet--visible' : 'bottom-sheet--hidden'}`}
        style={{
          transform: isVisible 
            ? `translateY(${currentTranslateY}px)` 
            : undefined,
          paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`,
        }}
        onTransitionEnd={() => {
          if (!isVisible) setIsAnimating(false);
        }}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the sheet
      >
        {/* Expanded drag area covering top section */}
        <div 
          className="bottom-sheet__drag-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Visual Grabber Handle */}
          <div className="bottom-sheet__grabber"></div>

          {/* Header with Title */}
          {(title || onClose) && (
            <div className="bottom-sheet__header">
              <h3 className="bottom-sheet__title">
                {title}
              </h3>
            </div>
          )}
        </div>

        {/* Content area */}
        {children}
      </div>
    </div>
  );
};

BottomSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default BottomSheet;
