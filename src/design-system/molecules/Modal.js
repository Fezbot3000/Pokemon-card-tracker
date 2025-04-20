import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import { stripDebugProps } from '../../utils/stripDebugProps';

/**
 * Modal component
 * 
 * A reusable modal dialog component for displaying content over the existing UI.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnClickOutside = false, // Set closeOnClickOutside to false by default
  position = 'center',
  className = '',
  forceDarkMode = false,
  showOverlay = true,
  showAsStatic = false,
  maxWidth = 'max-w-2xl',
  ariaLabel, // Extract ariaLabel here
  ...props
}) => {
  const modalRef = useRef(null);
  const scrollPosRef = useRef(null);
  const [animationState, setAnimationState] = useState('closed');
  
  // Utility: Defensive cleanup for modal overlays and .modal-open
  function forceModalCleanup() {
    document.body.classList.remove('modal-open');
    // Remove any lingering modal overlays
    document.querySelectorAll('.fixed.inset-0.z-50').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  // Preserve scroll position and prevent background scrolling
  useEffect(() => {
    // Only prevent background scroll and restore scroll position
    if (isOpen && !showAsStatic) {
      scrollPosRef.current = {
        x: window.scrollX,
        y: window.scrollY
      };
      document.body.classList.add('modal-open');
      console.log('[Modal] Opened, .modal-open added to <body>');
      return () => {
        document.body.classList.remove('modal-open');
        if (scrollPosRef.current) {
          window.scrollTo(scrollPosRef.current.x, scrollPosRef.current.y);
        }
        console.log('[Modal] Closed, .modal-open removed from <body>');
      };
    }
  }, [isOpen, showAsStatic]);

  // Defensive: Always cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
      forceModalCleanup();
      console.log('[Modal] Unmounted, .modal-open forcibly removed and overlays cleaned up');
    };
  }, []);

  // Handle animation cleanup
  useEffect(() => {
    if (!isOpen && animationState === 'open') {
      setAnimationState('closing');
      const timer = setTimeout(() => {
        setAnimationState('closed');
        console.log('[Modal] Animation closed, modal is now unmounted');
      }, 200);
      return () => clearTimeout(timer);
    } else if (isOpen && animationState === 'closed') {
      setAnimationState('open');
      console.log('[Modal] Animation open, modal is now mounted');
    }
  }, [isOpen, animationState]);
  
  // Return null if modal is closed
  if (animationState === 'closed') return null;
  
  // Size variations
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full',
  };

  // Mobile full width override
  const mobileFullWidth = window.innerWidth < 640 ? 'w-screen max-w-none h-screen min-h-screen rounded-none m-0 fixed top-0 left-0 right-0 bottom-0 z-[9999]' : '';

  // Position variations
  const positionClasses = {
    center: 'flex items-center justify-center',
    right: 'flex items-start justify-end'
  };
  
  // Get animation class based on position and state
  const getAnimationClass = () => {
    if (animationState === 'closing') {
      return position === 'right' ? 'animate-modal-exit-right' : 'animate-modal-exit';
    }
    return position === 'right' ? 'animate-modal-slide-in-right' : 'animate-modal-scale-in';
  };
  
  // Get backdrop animation class
  const getBackdropAnimationClass = () => {
    return animationState === 'closing' ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade-in';
  };
  
  // Build the classes based on theme
  const backdropClasses = `fixed inset-0 z-50 ${positionClasses[position]} bg-black/50 backdrop-blur-sm ${getBackdropAnimationClass()}`;
  
  const modalClasses = forceDarkMode 
    ? `bg-[#0F0F0F]/95 backdrop-blur-sm rounded-md shadow-xl text-white ${getAnimationClass()}` 
    : `bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm rounded-md shadow-xl ${getAnimationClass()}`;
    
  const headerClasses = forceDarkMode
    ? 'sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-700/50 bg-[#0F0F0F]/95 backdrop-blur-sm'
    : 'sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm';
    
  const titleClasses = forceDarkMode
    ? 'text-xl font-medium text-gray-200'
    : 'text-xl font-medium text-gray-800 dark:text-gray-200';
    
  const closeButtonClasses = forceDarkMode
    ? 'text-2xl text-gray-500 hover:text-gray-300 transition-colors'
    : 'text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors';
    
  const footerClasses = forceDarkMode
    ? 'sticky bottom-0 z-10 flex items-center justify-end gap-2 p-6 border-t border-gray-700/50 bg-[#0F0F0F]/95 backdrop-blur-sm'
    : 'sticky bottom-0 z-10 flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm';
  
  // Force the dark class if needed
  const darkModeClass = forceDarkMode ? 'dark' : '';
  
  // If modal is static, just render the content without the backdrop and positioning
  if (showAsStatic) {
    return (
      <div className={`${maxWidth} w-full bg-white dark:bg-[#0F0F0F] rounded-lg shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              aria-label="Close"
            >
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
        
        {/* Content */}
        <div>
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex justify-center gap-2 p-6 border-t border-gray-200 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Regular modal with backdrop and positioning
  return (
    <div className={`${backdropClasses} ${darkModeClass}`}>
      <div 
        ref={modalRef}
        className={`${modalClasses} ${window.innerWidth < 640 ? '' : 'w-full mx-4'} flex flex-col ${position === 'right' ? (window.innerWidth < 640 ? 'w-screen max-w-none h-screen min-h-screen rounded-none m-0 fixed top-0 left-0 right-0 bottom-0 z-[9999]' : 'h-full rounded-l-md rounded-r-none max-w-2xl mr-0') : (mobileFullWidth || sizeClasses[size])} ${className}`}
        aria-label={ariaLabel} // Apply as aria-label
        {...stripDebugProps(props)} // props now excludes ariaLabel
      >
        {/* Modal Header - Sticky */}
        {title && (
          <div className={headerClasses}>
            <h2 className={titleClasses}>{title}</h2>
            <button 
              className={closeButtonClasses}
              onClick={onClose}
              aria-label="Close"
            >
              <span className="material-icons text-xl">close</span>
            </button>
          </div>
        )}
        
        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto scrollbar-hide pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
        
        {/* Modal Footer - Sticky */}
        {footer && (
          <div className="sticky bottom-0 z-10 flex items-center justify-end border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm">
            <div className="w-full px-6 py-3">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', 'full']),
  closeOnClickOutside: PropTypes.bool,
  position: PropTypes.oneOf(['center', 'right']),
  className: PropTypes.string,
  forceDarkMode: PropTypes.bool,
  showOverlay: PropTypes.bool,
  showAsStatic: PropTypes.bool,
  maxWidth: PropTypes.string,
  ariaLabel: PropTypes.string, // Add propType for ariaLabel
};

export default Modal;
