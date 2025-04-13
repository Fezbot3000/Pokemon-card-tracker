/**
 * Utility functions for modal components
 * Helps with preventing background scrolling on iOS and other devices
 */

// Track modal state
let modalCount = 0;
let originalBodyStyle = null;
let originalBodyPosition = 0;

/**
 * Prevents background scrolling when a modal is open
 * Should be called when a modal is opened
 */
export const preventBodyScroll = () => {
  // Only save original style on first modal open
  if (modalCount === 0) {
    // Save current scroll position
    originalBodyPosition = window.scrollY;

    // Save original body style
    originalBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      height: document.body.style.height,
      left: document.body.style.left
    };

    // Set body to fixed position
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${originalBodyPosition}px`;
    document.body.style.width = '100%';
    document.body.style.left = '0';
    
    // iOS-specific fixes
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.body.style.height = '100%';
      
      // Prevent all non-modal touchmove events
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      
      // Add a special class for iOS scrolling fixes
      document.body.classList.add('ios-modal-open');
      
      // Handle all body elements to prevent interactions
      Array.from(document.body.children).forEach(child => {
        if (!child.classList.contains('modal-content') && 
            !child.classList.contains('settings-modal-content') && 
            !child.classList.contains('card-details-content')) {
          child.style.pointerEvents = 'none';
        }
      });
    }
  }

  modalCount++;
  console.log("Modal opened, count:", modalCount);
};

/**
 * Restores background scrolling when a modal is closed
 * Should be called when a modal is closed
 */
export const restoreBodyScroll = () => {
  modalCount = Math.max(0, modalCount - 1);
  console.log("Modal closed, count:", modalCount);

  // Only restore when all modals are closed
  if (modalCount === 0 && originalBodyStyle) {
    // Restore original styles
    document.body.style.overflow = originalBodyStyle.overflow;
    document.body.style.position = originalBodyStyle.position;
    document.body.style.top = originalBodyStyle.top;
    document.body.style.width = originalBodyStyle.width;
    document.body.style.height = originalBodyStyle.height;
    document.body.style.left = originalBodyStyle.left;

    // Restore scroll position
    window.scrollTo(0, originalBodyPosition);
    
    // Remove iOS-specific handlers
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.removeEventListener('touchmove', preventTouchMove);
      document.body.classList.remove('ios-modal-open');
      
      // Restore pointer events
      Array.from(document.body.children).forEach(child => {
        child.style.pointerEvents = '';
      });
    }
  }
};

// Helper function to prevent touchmove events on iOS
const preventTouchMove = (e) => {
  // Allow scrolling within the modal content
  const isModalContent = e.target.closest('.modal-content') || 
                        e.target.closest('.settings-modal-content') || 
                        e.target.closest('.card-details-content');
  if (!isModalContent) {
    e.preventDefault();
  }
};
