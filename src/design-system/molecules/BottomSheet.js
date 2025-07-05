import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';

const BottomSheet = ({ isOpen, onClose, title, children }) => {
  const sheetRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Handle animation and body scroll locking
  useEffect(() => {
    if (isOpen) {
      // First make it visible with initial position
      setIsAnimating(true);
      // Lock body scroll when sheet is open
      document.body.style.overflow = 'hidden';
      
      // Small delay to ensure the initial position is applied before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      // Hide it with animation
      setIsVisible(false);
      // Restore body scroll when sheet is closed
      document.body.style.overflow = '';
    }
    
    return () => {
      // Cleanup: restore body scroll when component unmounts
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen && !isAnimating) return null;

  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Sheet Content */}
      <div 
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-[#0F0F0F] rounded-t-xl shadow-xl transform transition-transform duration-500 ease-out pt-3 px-3 z-[1001]"
        style={{ 
          maxHeight: '90vh',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: '0.75rem'
        }}
        onTransitionEnd={() => {
          if (!isVisible) setIsAnimating(false);
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the sheet
      >
        {/* Optional Grabber Handle (visual cue) */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3"></div>

        {/* Header with Title and Close Button */}
        {(title || onClose) && (
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-base font-semibold text-gray-700 dark:text-white text-center flex-grow">
              {title}
            </h3>
          </div>
        )}
        
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
