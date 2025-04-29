import React from 'react';
import { toast } from 'react-hot-toast';

// Track the current active toast ID
let activeToastId = null;

/**
 * Centralized PSA notification management
 * This provides consistent, user-friendly messaging for PSA-related operations
 */
const PSANotifications = {
  /**
   * Show a notification for PSA lookup results
   * @param {string} errorType - Type of error or 'success'
   * @param {Object} options - Additional options
   */
  showLookupNotification: (errorType, options = {}) => {
    // Log the full error details for debugging
    if (errorType !== 'success' && options.details) {
      console.error(`PSA error (${errorType}):`, options.details);
    }
    
    // Dismiss any existing toast
    if (activeToastId) {
      toast.dismiss(activeToastId);
    }
    
    // Get the appropriate message
    const message = PSANotifications.getLookupMessage(errorType);
    
    // Show a single toast with neutral styling
    activeToastId = toast(message, {
      duration: 3000,
      style: {
        background: 'var(--toast-bg, #1e293b)',
        color: 'var(--toast-text, white)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #ddd',
      },
      icon: null, // No icon
      id: 'psa-notification' // Use a consistent ID to prevent multiple toasts
    });
  },
  
  /**
   * Get a user-friendly message for display in UI components
   * @param {string} errorType - Type of error or 'success'
   * @returns {string} User-friendly message
   */
  getLookupMessage: (errorType) => {
    switch (errorType) {
      case 'success':
        return 'PSA information found';
        
      case 'RATE_LIMITED':
        return 'PSA lookup temporarily unavailable';
        
      case 'NOT_FOUND':
      case 'NO_DATA':
        return 'No PSA information found';
        
      case 'PARSE_ERROR':
        return 'Unable to process PSA information';
        
      case 'FETCH_ERROR':
      default:
        return 'Unable to complete PSA lookup';
    }
  },
  
  /**
   * Show a notification for PSA data application
   * @param {boolean} success - Whether the application was successful
   * @param {Error} error - Error object if application failed
   */
  showApplyNotification: (success, error = null) => {
    // Dismiss any existing toast
    if (activeToastId) {
      toast.dismiss(activeToastId);
    }
    
    if (success) {
      activeToastId = toast('PSA information applied', {
        duration: 3000,
        style: {
          background: 'var(--toast-bg, #1e293b)',
          color: 'var(--toast-text, white)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #ddd',
        },
        icon: null, // No icon
      id: 'psa-notification' // Use a consistent ID to prevent multiple toasts
      });
    } else {
      console.error('Error applying PSA data:', error);
      
      activeToastId = toast('Unable to apply PSA information', {
        duration: 3000,
        style: {
          background: 'var(--toast-bg, #1e293b)',
          color: 'var(--toast-text, white)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #ddd',
        },
        icon: null, // No icon
      id: 'psa-notification' // Use a consistent ID to prevent multiple toasts
      });
    }
  },
  
  /**
   * Show a loading notification for PSA operations
   */
  showLoadingNotification: () => {
    // Dismiss any existing toast
    if (activeToastId) {
      toast.dismiss(activeToastId);
    }
    
    activeToastId = toast('Looking up PSA information...', {
      duration: 5000,
      style: {
        background: 'var(--toast-bg, #1e293b)',
        color: 'var(--toast-text, white)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #ddd',
      },
      icon: null, // No icon
      id: 'psa-notification' // Use a consistent ID to prevent multiple toasts
    });
  }
};

export default PSANotifications;

