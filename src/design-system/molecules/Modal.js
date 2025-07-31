import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';

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
  showAsStatic = false,
  maxWidth = 'max-w-2xl',
  ariaLabel,
  noContentPadding = false,
  zIndex, // Add zIndex as optional prop
  ...props
}) => {
  const modalRef = useRef(null);
  const scrollPosRef = useRef(null);

  const [animationClass, setAnimationClass] = useState('');

  // Preserve scroll position and prevent background scrolling
  useEffect(() => {
    if (isOpen && !showAsStatic) {

      // Apply the appropriate animation class based on position
      if (position === 'right') {
        setAnimationClass('animate-modal-slide-in-right');
      } else {
        setAnimationClass('animate-modal-scale-in');
      }

      // Store current scroll position when modal opens
      scrollPosRef.current = {
        x: window.scrollX,
        y: window.scrollY,
      };

      // Use requestAnimationFrame to delay DOM modifications until after the current frame
      requestAnimationFrame(() => {
        // Set the top offset for all devices to maintain scroll position
        document.body.style.top = `-${scrollPosRef.current.y}px`;
        // Add modal-open class which applies position: fixed via CSS
        document.body.classList.add('modal-open');
      });

      // Cleanup function
      return () => {
        // Get the scroll position from the negative top value
        const scrollY = parseInt(document.body.style.top || '0') * -1;
        // Remove modal-open class to restore normal scrolling
        document.body.classList.remove('modal-open');
        // Clear the top style
        document.body.style.top = '';
        // Restore scroll position
        window.scrollTo(0, scrollY || scrollPosRef.current?.y || 0);
      };
    } else if (!isOpen) {
      // If modal was just closed, make sure to clean up
      const scrollY = parseInt(document.body.style.top || '0') * -1;
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      if (scrollPosRef.current) {
        window.scrollTo(0, scrollY || scrollPosRef.current.y || 0);
      }
    }
  }, [isOpen, position, showAsStatic]);

  // Custom close handler with animation
  const handleClose = useCallback(() => {
    if (!onClose) return;

    // Start exit animation

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
  }, [onClose, position, setAnimationClass]);





  // Handle escape key to close modal - only for topmost modal
  useEffect(() => {
    const handleEscapeKey = e => {
      if (isOpen && e.key === 'Escape') {
        // Only respond to escape if this is likely the topmost modal
        const currentZIndex = size === 'modal-width-60' ? 50001 : 50000;
        const allModals = document.querySelectorAll('[role="dialog"]');
        let isTopmost = true;
        
        // Check if any modal has a higher z-index
        allModals.forEach(modal => {
          const modalZIndex = parseInt(window.getComputedStyle(modal.parentElement).zIndex || '0');
          if (modalZIndex > currentZIndex) {
            isTopmost = false;
          }
        });
        
        if (isTopmost) {
          handleClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, handleClose, size]); // Include size dependency

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (closeOnClickOutside && onClose && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnClickOutside, onClose]);

  // Return null if modal is not open
  if (!isOpen) return null;

  // Z-index management for modal layering
  const getModalZIndex = () => {
    if (size === 'modal-width-60') return 'z-[50001]'; // Second layer - highest z-index
    if (size === 'modal-width-70') return 'z-[50000]'; // First layer - high z-index
    return zIndex ? `z-[${zIndex}]` : 'z-[50000]';     // Default to high z-index
  };

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
    'modal-width-60': 'w-3/5', // exactly 60% width - for second-layer modals
    'modal-width-70': 'w-[70%]', // exactly 70% width - for first-layer modals
    full: 'w-full max-w-full',
    contextual: 'w-full max-w-md', // Contextual modals - consistent width, auto height
  };

  // iOS device detection
  const isIOSDevice = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  };

  // Apply iOS-specific classes
  const iosClasses = isIOSDevice() ? 'modal-footer-ios-fix' : '';
  const contentClasses = isIOSDevice()
    ? 'modal-content-with-absolute-footer'
    : '';

  // Mobile full width override - only for non-contextual modals
  const shouldApplyMobileOverride =
    window.innerWidth < 640 && size !== 'contextual';
  const mobileFullWidth = shouldApplyMobileOverride
    ? 'w-screen max-w-none rounded-lg m-0 fixed top-0 left-0 right-0 bottom-0 z-[50000]' // Fixed: PWA and Browser get same positioning
    : '';





  const modalClasses = forceDarkMode
    ? `bg-black backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800/20 text-white`
    : `bg-white dark:bg-[#0F0F0F] backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/20 dark:border-gray-700/20`;

  const iosHeaderSafeClass = isIOSDevice() ? 'modal-header-ios-safe' : '';
  const headerClasses = forceDarkMode
    ? `sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b-[0.5px] border-gray-700 bg-black backdrop-blur-sm rounded-t-xl ${iosHeaderSafeClass}`
    : `sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b-[0.5px] border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F] backdrop-blur-sm rounded-t-xl ${iosHeaderSafeClass}`;

  const titleClasses = forceDarkMode
    ? 'text-xl font-medium text-gray-200'
    : 'text-xl font-medium text-gray-800 dark:text-gray-200';

  // Close button classes removed as they were unused

  const footerClasses = forceDarkMode
    ? 'sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 pt-4 pb-6 border-t-[0.5px] border-gray-700 bg-black backdrop-blur-sm rounded-b-xl'
    : 'sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 pt-4 pb-6 border-t-[0.5px] border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F] backdrop-blur-sm rounded-b-xl';



  // If modal is static, just render the content without the backdrop and positioning
  if (showAsStatic) {
    return (
      <div
        className={`${maxWidth} w-full overflow-hidden rounded-lg bg-white shadow-xl dark:bg-[#0F0F0F]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none dark:hover:text-gray-300"
              aria-label="Close"
            >
              <Icon name="close" size="md" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-6 pb-6 pt-4 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Regular modal with backdrop and positioning
  return createPortal(
    <div 
      className={`fixed inset-0 flex min-h-screen w-full items-center ${position === 'right' ? 'justify-end' : 'justify-center'} bg-black/40 backdrop-blur-sm ${getModalZIndex()}`}
      onClick={handleBackdropClick}
    >
      {/* Desktop margin container */}
      <div className={`size-full sm:p-4 md:p-6 flex ${position === 'right' ? 'justify-end items-stretch' : 'items-center justify-center'}`}>
      <div
        ref={modalRef}
        className={`${modalClasses} flex flex-col ${animationClass} modal-container ${size === 'contextual' ? 'modal-contextual' : ''} ${
          position === 'right'
            ? `w-screen h-screen sm:w-[70%] sm:h-full sm:rounded-lg max-w-none overflow-hidden rounded-lg ${getModalZIndex()}`
            : mobileFullWidth ||
              (size === 'custom' ? maxWidth : sizeClasses[size] || (size === 'modal-width-70' ? 'w-[70%]' : size === 'modal-width-60' ? 'w-3/5' : 'w-[55%]'))
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={ariaLabel}
        {...props}
      >
        {/* Modal Header - Sticky */}
        {title && (
          <div className={headerClasses}>
            <h2 id="modal-title" className={titleClasses}>
              {title}
            </h2>
            {onClose && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none dark:hover:text-gray-300 transition-colors duration-200"
                aria-label="Close"
              >
                <Icon name="close" size="md" />
              </button>
            )}
          </div>
        )}

        {/* Modal Content - Scrollable */}
        <div
          className={`scrollbar-hide flex-1 overflow-y-auto ${noContentPadding ? 'px-6' : 'p-6'} modal-content modal-body ${contentClasses}`}
        >
          {children}
        </div>

        {/* Modal Footer - Sticky, only shown if footer content is provided */}
        {footer && (
          <div className={`${footerClasses} ${iosClasses}`}>{footer}</div>
        )}
      </div>
      </div>
    </div>,
    document.body
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
  showAsStatic: PropTypes.bool,
  maxWidth: PropTypes.string,
  ariaLabel: PropTypes.string,
  noContentPadding: PropTypes.bool,
  zIndex: PropTypes.string, // Add zIndex to propTypes
};

export default Modal;
