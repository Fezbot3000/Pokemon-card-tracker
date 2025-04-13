import { toast } from 'react-hot-toast';
import React from 'react';
import Icon from '../atoms/Icon';

/**
 * Toast notification service for the design system
 * Provides a consistent API for showing toast notifications
 */
const toastService = {
  /**
   * Show a success toast message
   * @param {string} message - The message to display
   * @param {object} options - Additional options to pass to react-hot-toast
   * @returns {string} Toast ID
   */
  success: (message, options = {}) => {
    return toast.success(message, {
      icon: <Icon name="check_circle" color="white" />,
      className: 'design-system-toast success-toast',
      ...options
    });
  },

  /**
   * Show an error toast message
   * @param {string} message - The message to display
   * @param {object} options - Additional options to pass to react-hot-toast
   * @returns {string} Toast ID
   */
  error: (message, options = {}) => {
    return toast.error(message, {
      icon: <Icon name="error" color="white" />,
      className: 'design-system-toast error-toast',
      style: {
        background: '#E53935',
        ...options.style
      },
      ...options
    });
  },

  /**
   * Show an info toast message
   * @param {string} message - The message to display
   * @param {object} options - Additional options to pass to react-hot-toast
   * @returns {string} Toast ID
   */
  info: (message, options = {}) => {
    return toast(message, {
      icon: <Icon name="info" color="white" />,
      className: 'design-system-toast info-toast',
      ...options
    });
  },

  /**
   * Show a warning toast message
   * @param {string} message - The message to display
   * @param {object} options - Additional options to pass to react-hot-toast
   * @returns {string} Toast ID
   */
  warning: (message, options = {}) => {
    return toast(message, {
      icon: <Icon name="warning" color="white" />,
      className: 'design-system-toast warning-toast',
      style: {
        background: '#FF9800',
        ...options.style
      },
      ...options
    });
  },

  /**
   * Show a loading toast message
   * @param {string} message - The message to display
   * @param {object} options - Additional options to pass to react-hot-toast
   * @returns {string} Toast ID that can be used to update or dismiss the toast
   */
  loading: (message, options = {}) => {
    return toast.loading(message, {
      className: 'design-system-toast loading-toast',
      ...options
    });
  },

  /**
   * Update an existing toast
   * @param {string} toastId - ID of toast to update
   * @param {string} message - New message
   * @param {object} options - New options
   */
  update: (toastId, message, options = {}) => {
    return toast.update(toastId, {
      render: message,
      ...options
    });
  },

  /**
   * Dismiss a specific toast
   * @param {string} toastId - ID of toast to dismiss
   */
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  }
};

// Also export the raw toast function for advanced usage
export { toast };

// Export the toast service as the default export
export default toastService;
