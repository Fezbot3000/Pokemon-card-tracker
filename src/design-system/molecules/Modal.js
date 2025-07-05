import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';

import '../styles/animations.css';

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
  closeOnClickOutside = false,
  position = 'center',
  className = '',
  forceDarkMode = false,
  showOverlay = true,
  showAsStatic = false,
  maxWidth = 'max-w-2xl',
  ariaLabel,
  zIndex = 50,
  noContentPadding = false,
  ...props
}) => {
  const modalRef = useRef(null);
  const scrollPosRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  
  // Preserve scroll position and prevent background scrolling
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    
    if (isOpen) {
      setIsMounted(true);
      setIsAnimatingOut(false);
      
      // Apply the appropriate animation class based on position
      if (position === 'right') {
        setAnimationClass('animate-modal-slide-in-right');
      } else {
        setAnimationClass('animate-modal-scale-in');
      }
      
      // Only prevent background scroll if modal is open and not static
      if (!showAsStatic) {
        // Store current scroll position when modal opens - do this FIRST
        scrollPosRef.current = {
          x: window.scrollX,
          y: window.scrollY
        };
        
        // Use requestAnimationFrame to delay DOM modifications until after the current frame
        requestAnimationFrame(() => {
          if (isMobile) {
            // Mobile-specific approach: fixed position with negative top
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${scrollPosRef.current.y}px`;
            document.body.style.overflow = 'hidden';
          } else {
            // Desktop approach: just add the modal-open class
            document.body.classList.add('modal-open');
          }
        });
      }
    }
    
    return () => {
      if (isOpen) {
        if (isMobile && !showAsStatic) {
          // Mobile cleanup: restore position and scroll
          const scrollY = parseInt(document.body.style.top || '0') * -1;
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.top = '';
          document.body.style.overflow = '';
          window.scrollTo(0, scrollY || scrollPosRef.current?.y || 0);
        } else {
          // Desktop cleanup: just remove the class
          document.body.classList.remove('modal-open');
        }
      }
    };
  }, [isOpen, position, showAsStatic]);

  // Add iOS viewport height fix - always call this hook regardless of conditions
  useEffect(() => {
    // Fix for iOS viewport height issues
    const setIOSHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Add CSS variables for iOS safe areas if they don't exist in the stylesheet
      if (!document.querySelector('.safe-area-css-vars')) {
        const style = document.createElement('style');
        style.className = 'safe-area-css-vars';
        style.innerHTML = `
          .pt-safe {
            padding-top: env(safe-area-inset-top, 0px) !important;
          }
          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          }
          .modal-ios-fix {
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        `;
        document.head.appendChild(style);
      }
    };
    
    setIOSHeight();
    window.addEventListener('resize', setIOSHeight);
    
    return () => {
      window.removeEventListener('resize', setIOSHeight);
    };
  }, []);

  // Custom close handler with animation
  const handleClose = () => {
    if (!onClose) return;
    
    // Start exit animation
    setIsAnimatingOut(true);
    
    // Apply the appropriate exit animation class based on position
    if (position === 'right') {
      setAnimationClass('animate-modal-exit-right');
    } else {
      setAnimationClass('animate-modal-exit');
    }
    
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 200); // Match this with the animation duration
  };
  
  // Handle outside clicks to close modal if enabled
  const handleBackdropClick = (e) => {
    if (closeOnClickOutside && modalRef.current && !modalRef.current.contains(e.target)) {
      e.stopPropagation();
      handleClose();
    }
  };
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (isOpen && e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);
  
  // Return null if modal is not open
  if (!isOpen) return null;
  
  // Size variations
  const sizeClasses = {
    sm: 'max-w-sm', // ~384px
    md: 'max-w-md', // ~448px
    lg: 'max-w-lg', // ~512px
    xl: 'max-w-xl', // ~576px
    '2xl': 'max-w-2xl', // ~672px
    '3xl': 'max-w-3xl', // ~768px
    '4xl': 'max-w-4xl', // ~896px
    '5xl': 'max-w-5xl', // ~1024px
    'modal-width': 'w-[55%]', // exactly 55% width
    full: 'w-full max-w-full',
  };
  
  // Mobile full width override - but keep rounded corners
  const mobileFullWidth = window.innerWidth < 640 ? 'w-screen max-w-none h-screen min-h-screen rounded-lg m-0 fixed top-0 left-0 right-0 bottom-0 z-[9999]' : '';
  
  // Position variations
  const positionClasses = {
    center: 'flex items-center justify-center',
    right: 'flex items-start justify-end'
  };
  
  // Build the classes based on theme
  const backdropClasses = `fixed inset-0 ${positionClasses[position]} backdrop-blur-sm h-screen min-h-screen`;
  
  const modalClasses = forceDarkMode 
    ? `bg-[#0F0F0F]/95 backdrop-blur-sm rounded-lg shadow-xl text-white` 
    : `bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm rounded-lg shadow-xl`;
    
  const headerClasses = forceDarkMode
    ? 'sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-700/50 bg-[#0F0F0F]/95 backdrop-blur-sm'
    : 'sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm';
    
  const titleClasses = forceDarkMode
    ? 'text-xl font-medium text-gray-200'
    : 'text-xl font-medium text-gray-800 dark:text-gray-200';
    
  const closeButtonClasses = forceDarkMode
    ? 'text-2xl text-gray-500 hover:text-gray-300 transition-colors'
    : 'text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors';
    
  const footerClasses = forceDarkMode
    ? 'sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 pt-4 pb-[env(safe-area-inset-bottom,24px)] border-t border-gray-700/50 bg-[#0F0F0F]/95 backdrop-blur-sm'
    : 'sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 pt-4 pb-[env(safe-area-inset-bottom,24px)] border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm';
  
  // Force the dark class if needed
  const darkModeClass = forceDarkMode ? 'dark' : '';
  
  // If modal is static, just render the content without the backdrop and positioning
  if (showAsStatic) {
    return (
      <div className={`${maxWidth} w-full bg-white dark:bg-[#0F0F0F] rounded-lg shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              aria-label="Close"
            >
              <Icon name="close" size="md" />
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800 px-6 pt-4 pb-6">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Regular modal with backdrop and positioning
  return (
    <div 
      className={`${backdropClasses} ${darkModeClass} ${isAnimatingOut ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade-in'}`}
      style={{ 
        zIndex,
        height: '100vh',
        minHeight: '100vh', 
        maxHeight: '100vh'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={`${modalClasses} flex flex-col ${animationClass} ${
          position === 'right' 
            ? (window.innerWidth < 640 
                ? 'w-screen max-w-none h-screen min-h-screen rounded-lg m-0 fixed top-0 left-0 right-0 bottom-0 z-[9999] overflow-auto' 
                : 'w-[55%] h-screen min-h-screen rounded-l-lg rounded-r-none mr-0 fixed top-0 right-0 z-[9999]')
            : (mobileFullWidth || (size === 'custom' ? maxWidth : sizeClasses[size] || 'w-[55%]'))
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={ariaLabel}
        style={{
          height: window.innerWidth < 640 ? '100vh' : undefined,
          maxHeight: window.innerWidth < 640 ? '100vh' : undefined
        }}
        {...props}
      >
        {/* Modal Header - Sticky */}
        {title && (
          <div 
            className={headerClasses}
            style={{
              paddingTop: window.innerWidth < 640 ? 'calc(1rem + env(safe-area-inset-top, 0px))' : undefined
            }}
          >
            <h2 id="modal-title" className={titleClasses}>{title}</h2>
            <button 
              onClick={handleClose}
              className={closeButtonClasses}
              aria-label="Close modal"
              type="button"
            >
              <span className="material-icons text-xl">close</span>
            </button>
          </div>
        )}

        {/* Modal Content - Scrollable */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide ${noContentPadding ? 'px-6' : 'px-6 py-6'} modal-content`}>
          {children}
        </div>

        {/* Modal Footer - Sticky, only shown if footer content is provided */}
        {footer && (
          <div className={footerClasses}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  title: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.string,
  closeOnClickOutside: PropTypes.bool,
  position: PropTypes.oneOf(['center', 'right']),
  className: PropTypes.string,
  forceDarkMode: PropTypes.bool,
  showOverlay: PropTypes.bool,
  showAsStatic: PropTypes.bool,
  maxWidth: PropTypes.string,
  ariaLabel: PropTypes.string,
  zIndex: PropTypes.number,
  noContentPadding: PropTypes.bool
};

export default Modal;
