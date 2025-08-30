import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import './Modal.css';

// Global modal stack to track open modals
const modalStack = [];

// Helper function to recursively replace onClose handlers with animated versions
const replaceOnCloseInChildren = (children, originalOnClose, animatedOnClose) => {
  return React.Children.map(children, child => {
    if (!React.isValidElement(child)) {
      return child;
    }

    // Check if this element has onClick that matches onClose
    let newProps = { ...child.props };
    if (child.props.onClick === originalOnClose) {
      newProps.onClick = animatedOnClose;
    }

    // Recursively process children
    if (child.props.children) {
      newProps.children = replaceOnCloseInChildren(
        child.props.children, 
        originalOnClose, 
        animatedOnClose
      );
    }

    return React.cloneElement(child, newProps);
  });
};

/**
 * Modal component
 *
 * A reusable modal dialog component for displaying content over the existing UI.
 */
const Modal = ({
  isOpen,
  onClose,
  onBeforeClose, // New prop to intercept close attempts
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
  const modalIdRef = useRef(null);
  const justOpenedRef = useRef(false);

  const [animationClass, setAnimationClass] = useState('');

  // Ensure the enter animation class is applied before the first paint when opening
  useLayoutEffect(() => {
    if (isOpen && !showAsStatic) {
      if (position === 'right') {
        setAnimationClass('animate-modal-slide-in-right');
      } else {
        setAnimationClass('animate-modal-scale-in');
      }
    }
  }, [isOpen, position, showAsStatic]);

  // Preserve scroll position and prevent background scrolling
  useEffect(() => {
    if (isOpen && !showAsStatic) {

      // Apply the appropriate animation class based on position
      if (position === 'right') {
        setAnimationClass('animate-modal-slide-in-right');
      } else {
        setAnimationClass('animate-modal-scale-in');
      }

      // Check if scroll position is already being managed by another modal
      const isScrollAlreadyManaged = document.body.classList.contains('modal-open');

      // Store current scroll position when modal opens
      scrollPosRef.current = {
        x: window.scrollX,
        y: window.scrollY,
      };

      // Use requestAnimationFrame to delay DOM modifications until after the current frame
      requestAnimationFrame(() => {
        // Only manage scroll position if it's not already being managed
        if (!isScrollAlreadyManaged) {
          // Set the top offset to maintain scroll position when body becomes fixed
          document.body.style.top = `-${scrollPosRef.current.y}px`;
          // Add modal-open class which applies position: fixed via CSS
          document.body.classList.add('modal-open');
        }

      });

      // Cleanup function
      return () => {
        // Only restore scroll position if this modal was managing it
        if (!isScrollAlreadyManaged) {
          // Check if there are still other modals open after this one closes
          const remainingModals = document.querySelectorAll('[role="dialog"]');
          const isLastModal = remainingModals.length <= 1; // <= 1 because this modal is still in DOM

          if (isLastModal) {
            // Get the scroll position from the negative top value
            const scrollY = parseInt(document.body.style.top || '0') * -1;

            
            // Remove modal-open class to restore normal scrolling
            document.body.classList.remove('modal-open');
            // Clear the top style
            document.body.style.top = '';
            // Restore scroll position
            window.scrollTo(0, scrollY || scrollPosRef.current?.y || 0);
          }
        }

      };
    } else if (!isOpen) {
      // If modal was just closed, make sure to clean up only if no other modals are open
      const otherModals = document.querySelectorAll('[role="dialog"]');
      if (otherModals.length === 0) {
        const scrollY = parseInt(document.body.style.top || '0') * -1;
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        if (scrollPosRef.current) {
          window.scrollTo(0, scrollY || scrollPosRef.current.y || 0);
        }
      }
      // Reset animation class so a stale exit class doesn't flash on next open
      setAnimationClass('');
    }
  }, [isOpen, position, showAsStatic]);

  // Track the first 300ms after opening to ignore accidental backdrop clicks
  useEffect(() => {
    if (!isOpen) return;
    justOpenedRef.current = true;
    const t = setTimeout(() => {
      justOpenedRef.current = false;
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen]);

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

  // Animated close handler that should be used by all close methods
  const handleAnimatedClose = useCallback(() => {
    // If onBeforeClose is provided, call it and let it decide whether to close
    if (onBeforeClose) {
      onBeforeClose(() => handleClose());
    } else {
      // No interceptor, close normally
      handleClose();
    }
  }, [handleClose, onBeforeClose]);

  // Create a wrapped onClose that always uses animation
  // This ensures all close methods (buttons, escape, backdrop) use the same animation
  const animatedOnClose = useCallback(() => {
    handleAnimatedClose();
  }, [handleAnimatedClose]);





  // Add modal to stack when it opens
  useEffect(() => {
    if (isOpen && !showAsStatic) {
      // Generate a unique ID for this modal instance
      modalIdRef.current = `modal-${Date.now()}-${Math.random()}`;
      modalStack.push({
        id: modalIdRef.current,
        close: handleAnimatedClose
      });
    }
    
    return () => {
      // Remove from stack when closing
      if (modalIdRef.current) {
        const index = modalStack.findIndex(m => m.id === modalIdRef.current);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
      }
    };
  }, [isOpen, showAsStatic, handleAnimatedClose]);

  // Handle escape key - only the topmost modal should respond
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = e => {
      if (e.key === 'Escape') {
        // Check if this modal is the topmost (last in the stack)
        if (modalStack.length > 0 && modalStack[modalStack.length - 1].id === modalIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleAnimatedClose();
        }
      }
    };

    // Use capture phase to ensure we get the event first
    document.addEventListener('keydown', handleEscapeKey, true);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey, true);
    };
  }, [isOpen, handleAnimatedClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    // Check if click is on backdrop itself OR on margin container that should close modal
    const isBackdropClick = e.target === e.currentTarget;
    const isMarginContainerClick = e.target.classList.contains('size-full') && 
                                  e.target.classList.contains('sm:p-4') &&
                                  e.target.classList.contains('md:p-6');
    
    if (closeOnClickOutside && onClose && (isBackdropClick || isMarginContainerClick)) {
      // Guard against the opening click immediately closing the modal
      if (justOpenedRef.current) return;
      handleAnimatedClose();
    }
  }, [closeOnClickOutside, onClose, handleAnimatedClose]);

  // Return null if modal is not open
  if (!isOpen) return null;

  // Z-index management for modal layering
  const getModalZIndex = () => {
    if (size === 'modal-width-50') return 'z-[50002]'; // Third layer - highest z-index
    if (size === 'modal-width-60') return 'z-[50001]'; // Second layer - high z-index
    if (size === 'modal-width-70') return 'z-[50000]'; // First layer - base z-index
    return zIndex ? `z-[${zIndex}]` : 'z-[50000]';     // Default to base z-index
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
    'modal-width-50': 'w-[50%]', // exactly 50% width - for third-layer modals
    'modal-width-60': 'w-3/5', // exactly 60% width - for second-layer modals
    'modal-width-70': 'w-[70%]', // exactly 70% width - for first-layer modals
    full: 'w-full max-w-full',
    contextual: 'w-full max-w-md', // Contextual modals - consistent width, auto height
  };

  // iOS detection removed

  // Mobile full width override - only for non-contextual modals
  const shouldApplyMobileOverride =
    window.innerWidth < 640 && size !== 'contextual';
  const mobileFullWidth = shouldApplyMobileOverride
    ? 'w-screen h-screen max-w-none max-h-none rounded-lg ios-modal-radius m-0 fixed inset-0 z-[50000]' // Full height mobile modal with inset-0
    : '';





  const modalClasses = forceDarkMode
    ? `bg-black backdrop-blur-sm rounded-xl ios-modal-radius shadow-2xl border border-gray-800/20 text-white`
    : `bg-white dark:bg-[#0F0F0F] backdrop-blur-sm rounded-xl ios-modal-radius shadow-2xl border border-gray-200/20 dark:border-gray-700/20`;

  const headerClasses = forceDarkMode
    ? `sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b-[0.5px] border-gray-700 bg-black backdrop-blur-sm rounded-t-xl`
    : `sticky top-0 z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b-[0.5px] border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F] backdrop-blur-sm rounded-t-xl`;

  const titleClasses = forceDarkMode
    ? 'text-xl text-gray-200'
    : 'text-xl text-gray-800 dark:text-gray-200';

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
        <div className="border-b border-gray-200 px-6 pb-4 pt-6 dark:border-gray-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-6 pb-6 pt-4 dark:border-gray-800">
            {React.Children.map(footer, child => {
              // Recursively replace onClose with animatedOnClose for any child components
              return replaceOnCloseInChildren(child, onClose, animatedOnClose);
            })}
          </div>
        )}
      </div>
    );
  }

  // Regular modal with backdrop and positioning
  return createPortal(
    <div 
      className={`fixed inset-0 flex size-full items-center ${position === 'right' ? 'justify-end' : 'justify-center'} bg-black/40 backdrop-blur-sm ${getModalZIndex()}`}
      onClick={handleBackdropClick}
    >
      {/* Desktop margin container */}
      <div 
        className={`flex size-full md:p-6 sm:p-4 ${position === 'right' ? 'items-stretch justify-end' : size === 'contextual' ? 'items-center justify-center' : 'items-stretch justify-center'}`}
        onClick={(e) => {
          // Only stop propagation if the click is on modal content,
          // allow clicks on margin container to bubble to backdrop
          if (e.target === e.currentTarget) {
            // This is a click on empty margin space - let it bubble to backdrop
            return;
          }
          // This is a click on modal content - stop it from bubbling
          e.stopPropagation();
        }}
      >
      <div
        ref={modalRef}
        className={`${modalClasses} flex flex-col ${animationClass} modal-container ${size === 'contextual' ? 'modal-contextual' : ''} ${
          position === 'right'
            ? `h-screen w-screen ${
                size === 'modal-width-50' 
                  ? 'sm:w-1/2'
                  : size === 'modal-width-60'
                  ? 'sm:w-3/5'
                  : size === 'modal-width-70'
                  ? 'sm:w-[70vw]'
                  : 'sm:w-[70vw]'
              } max-w-none overflow-hidden rounded-lg sm:h-full sm:rounded-lg ${getModalZIndex()}`
            : mobileFullWidth ||
              (size === 'custom' ? maxWidth : sizeClasses[size] || (size === 'modal-width-70' ? 'w-[70%]' : size === 'modal-width-60' ? 'w-3/5' : 'w-[55%]'))
        } ${className}`}

        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={ariaLabel}
        onClick={e => e.stopPropagation()} // Prevent backdrop clicks when clicking on modal content
        {...props}
      >
        {/* Modal Header - Sticky */}
        {title && (
          <div className={headerClasses}>
            <h2 id="modal-title" className="modal__title" style={{ fontSize: '1.25rem', fontWeight: '600', color: forceDarkMode ? '#e5e7eb' : undefined }}>
              {title}
            </h2>
          </div>
        )}

        {/* Modal Content - Scrollable */}
        <div
          className={`scrollbar-hide ${size === 'contextual' ? 'shrink-0' : 'flex-1'} overflow-y-auto ${noContentPadding ? 'px-6' : 'p-6'} modal-content modal-body`}
        >
          {children}
        </div>

        {/* Modal Footer - Sticky, only shown if footer content is provided */}
        {footer && (
          <div className={footerClasses}>
            {React.Children.map(footer, child => {
              // Recursively replace onClose with animatedOnClose for any child components
              return replaceOnCloseInChildren(child, onClose, animatedOnClose);
            })}
          </div>
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
  onBeforeClose: PropTypes.func, // Function called before closing to intercept close attempts
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
