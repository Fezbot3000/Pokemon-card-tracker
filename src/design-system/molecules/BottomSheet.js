import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal } from './Modal';
import { useTheme } from '../../contexts/ThemeContext';

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
      className="bg-black/50 fixed inset-0 z-[1000] backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Sheet Content */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-[1001] w-full rounded-t-xl bg-white px-3 pt-3 shadow-xl transition-transform duration-500 ease-out dark:bg-[#0F0F0F]"
        style={{
          maxHeight: '90vh',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: '0.75rem',
        }}
        onTransitionEnd={() => {
          if (!isVisible) setIsAnimating(false);
        }}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the sheet
      >
        {/* Optional Grabber Handle (visual cue) */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700"></div>

        {/* Header with Title and Close Button */}
        {(title || onClose) && (
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="grow text-center text-base font-semibold text-gray-700 dark:text-white">
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
