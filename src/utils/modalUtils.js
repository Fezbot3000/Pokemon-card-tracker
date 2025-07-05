/**
 * Utility functions for modal components
 * Helps with preventing background scrolling when modals are open
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
      left: document.body.style.left
    };

    // Set body to fixed position
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${originalBodyPosition}px`;
    document.body.style.width = '100%';
    document.body.style.left = '0';
  }

  modalCount++;
};

/**
 * Restores background scrolling when a modal is closed
 * Should be called when a modal is closed
 */
export const restoreBodyScroll = () => {
  modalCount = Math.max(0, modalCount - 1);

  // Only restore when all modals are closed
  if (modalCount === 0 && originalBodyStyle) {
    // Restore original styles
    document.body.style.overflow = originalBodyStyle.overflow;
    document.body.style.position = originalBodyStyle.position;
    document.body.style.top = originalBodyStyle.top;
    document.body.style.width = originalBodyStyle.width;
    document.body.style.left = originalBodyStyle.left;

    // Restore scroll position
    window.scrollTo(0, originalBodyPosition);
  }
};
