/**
 * Notification utilities for the design system
 * 
 * These utilities provide toast notifications and other alert mechanisms
 * for use throughout the component library.
 */

// Simple notification system that can be replaced with a more robust solution
let notificationListeners = [];

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info, warning)
 * @param {number} duration - How long to show the notification in ms
 */
export const toast = (message, type = 'info', duration = 3000) => {
  // Notify all listeners
  notificationListeners.forEach(listener => {
    listener({ message, type, duration });
  });
  
  // Log to console as a fallback
  switch (type) {
    case 'success':
      // console.log(`%c✓ ${message}`, 'color: green');
      break;
    case 'error':
      console.error(`✗ ${message}`);
      break;
    case 'warning':
      console.warn(`⚠ ${message}`);
      break;
    default:
      console.info(`ℹ ${message}`);
  }
  
  return {
    message,
    type,
    duration,
    id: Date.now()
  };
};

// Convenience methods
toast.success = (message, duration) => toast(message, 'success', duration);
toast.error = (message, duration) => toast(message, 'error', duration);
toast.warning = (message, duration) => toast(message, 'warning', duration);
toast.info = (message, duration) => toast(message, 'info', duration);

/**
 * Subscribe to toast notifications
 * @param {Function} listener - Function to call when a notification is shown
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (listener) => {
  notificationListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    notificationListeners = notificationListeners.filter(l => l !== listener);
  };
};

export default toast;
