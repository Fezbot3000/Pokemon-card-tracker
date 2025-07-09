import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
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
    if (isOpen && !showAsStatic) {
      setIsMounted(true);
      setIsAnimatingOut(false);

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
  }, [onClose, position, setIsAnimatingOut, setAnimationClass]);

  // Handle outside clicks to close modal if enabled
  const handleBackdropClick = e => {
    if (
      closeOnClickOutside &&
      modalRef.current &&
      !modalRef.current.contains(e.target)
    ) {
      // Check if there are any higher z-index modals or overlays
      const clickedElement = e.target;
      const allModals = document.querySelectorAll(
        '[role="dialog"], .modal-container, [data-modal]'
      );
      const currentModalZIndex =
        parseInt(getComputedStyle(modalRef.current).zIndex) || zIndex;

      // Check if the clicked element is part of a higher z-index modal
      let isHigherModalClick = false;
      allModals.forEach(modal => {
        if (modal !== modalRef.current && modal.contains(clickedElement)) {
          const modalZIndex = parseInt(getComputedStyle(modal).zIndex) || 0;
          if (modalZIndex > currentModalZIndex) {
            isHigherModalClick = true;
          }
        }
      });

      // Only close if not clicking on a higher z-index modal
      if (!isHigherModalClick) {
        e.stopPropagation();
        handleClose();
      }
    }
  };

  // Prevent scroll events on backdrop from propagating to background
  const handleBackdropScroll = e => {
    // If the scroll is happening on the backdrop (not inside the modal), prevent it
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle wheel events to prevent background scrolling
  const handleBackdropWheel = e => {
    // If the wheel event is happening on the backdrop (not inside the modal), prevent it
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = e => {
      if (isOpen && e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, handleClose]); // Fix: Include handleClose dependency

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

  // Detect PWA mode
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  // Mobile full width override - only for non-contextual modals
  const shouldApplyMobileOverride =
    window.innerWidth < 640 && size !== 'contextual';
  const mobileFullWidth = shouldApplyMobileOverride
    ? isPWA
      ? 'w-screen max-w-none rounded-lg m-0 fixed z-[9999]' // PWA: Let CSS handle positioning
      : 'w-screen max-w-none rounded-lg m-0 fixed top-0 left-0 right-0 bottom-0 z-[9999]' // Browser: Full positioning
    : '';

  // Position variations
  const positionClasses = {
    center: 'flex items-center justify-center',
    right: 'flex items-start justify-end',
  };

  // Build the classes based on theme
  const backdropClasses = `fixed inset-0 ${positionClasses[position]} bg-black/50 backdrop-blur-sm`;

  const modalClasses = forceDarkMode
    ? `bg-black backdrop-blur-sm rounded-lg shadow-xl text-white`
    : `bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-xl`;

  const iosHeaderSafeClass = isIOSDevice() ? 'modal-header-ios-safe' : '';
  const headerClasses = forceDarkMode
    ? `sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-700/50 bg-black backdrop-blur-sm ${iosHeaderSafeClass}`
    : `sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-black backdrop-blur-sm ${iosHeaderSafeClass}`;

  const titleClasses = forceDarkMode
    ? 'text-xl font-medium text-gray-200'
    : 'text-xl font-medium text-gray-800 dark:text-gray-200';

  const closeButtonClasses = forceDarkMode
    ? 'text-2xl text-gray-500 hover:text-gray-300 transition-colors'
    : 'text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors';

  const footerClasses = forceDarkMode
    ? 'sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 pt-4 pb-6 border-t border-gray-700/50 bg-black backdrop-blur-sm'
    : 'sticky bottom-0 z-10 flex items-center justify-between gap-2 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-black backdrop-blur-sm';

  // Force the dark class if needed
  const darkModeClass = forceDarkMode ? 'dark' : '';

  // If modal is static, just render the content without the backdrop and positioning
  if (showAsStatic) {
    return (
      <div
        className={`${maxWidth} w-full overflow-hidden rounded-lg bg-white shadow-xl dark:bg-black`}
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
  return (
    <div
      className={`${backdropClasses} ${darkModeClass} ${isAnimatingOut ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade-in'}`}
      style={{
        zIndex,
      }}
      onClick={handleBackdropClick}
      onWheel={handleBackdropWheel}
      onScroll={handleBackdropScroll}
      onTouchMove={handleBackdropScroll}
    >
      <div
        ref={modalRef}
        className={`${modalClasses} flex flex-col ${animationClass} modal-container ${size === 'contextual' ? 'modal-contextual' : ''} ${
          position === 'right'
            ? window.innerWidth < 640
              ? 'fixed inset-0 z-[9999] m-0 w-screen max-w-none overflow-auto rounded-lg'
              : 'fixed right-0 top-0 z-[9999] mr-0 w-[55%] rounded-l-lg rounded-r-none'
            : mobileFullWidth ||
              (size === 'custom' ? maxWidth : sizeClasses[size] || 'w-[55%]')
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
            {/* Close button removed as requested - using bottom close buttons instead */}
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
  noContentPadding: PropTypes.bool,
};

export default Modal;
