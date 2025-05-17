/**
 * Network Interceptor
 * 
 * This utility intercepts network requests and responses to prevent console errors
 * from being shown to users while still allowing proper error handling in the app.
 */

import logger from './logger';

/**
 * Initialize network request interceptors
 */
export const initNetworkInterceptors = () => {
  // Intercept fetch requests
  interceptFetch();
  
  // Intercept XMLHttpRequest
  interceptXHR();
};

/**
 * Intercept fetch requests to handle errors silently
 */
const interceptFetch = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Handle non-2xx responses
      if (!response.ok) {
        // Log the error but don't show it in console
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
        const method = args[1]?.method || 'GET';
        
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          logger.warn(`[Network] ${method} ${url} failed with status ${response.status}`);
        }
      }
      
      return response;
    } catch (error) {
      // Handle network errors silently
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
      
      // Check if it's a Firebase/Firestore request
      const isFirebaseRequest = url.includes('firestore.googleapis.com') || 
                               url.includes('firebase') || 
                               url.includes('googleapis.com');
      
      if (isFirebaseRequest) {
        // Completely suppress Firebase connection errors in console
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[Firebase] Connection issue: ${error.message}`);
        }
      } else {
        // For other requests, log minimally in production
        if (process.env.NODE_ENV === 'development') {
          logger.warn(`[Network] Request to ${url} failed: ${error.message}`);
        }
      }
      
      // Re-throw the error so the application can handle it
      throw error;
    }
  };
};

/**
 * Intercept XMLHttpRequest to handle errors silently
 */
const interceptXHR = () => {
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Override open to track the URL
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  // Override send to handle errors
  XMLHttpRequest.prototype.send = function(...args) {
    // Store original event handlers
    const originalOnError = this.onerror;
    const originalOnLoad = this.onload;
    
    // Override error handler
    this.onerror = function(event) {
      // Check if it's a Firebase/Firestore request
      const isFirebaseRequest = this._url?.includes('firestore.googleapis.com') || 
                               this._url?.includes('firebase') || 
                               this._url?.includes('googleapis.com');
      
      if (isFirebaseRequest) {
        // Suppress Firebase errors in console
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[Firebase XHR] Connection issue for ${this._url}`);
        }
        
        // Prevent the error from propagating to console
        event.stopPropagation();
        event.preventDefault();
      }
      
      // Call original handler if exists
      if (typeof originalOnError === 'function') {
        originalOnError.apply(this, arguments);
      }
    };
    
    // Override load handler to check for error status codes
    this.onload = function(event) {
      if (this.status >= 400) {
        // Handle error status codes
        const isFirebaseRequest = this._url?.includes('firestore.googleapis.com') || 
                                 this._url?.includes('firebase') || 
                                 this._url?.includes('googleapis.com');
        
        if (isFirebaseRequest) {
          // Suppress Firebase errors in console
          if (process.env.NODE_ENV === 'development') {
            logger.debug(`[Firebase XHR] Request failed with status ${this.status} for ${this._url}`);
          }
        } else {
          // For other requests, log minimally
          if (process.env.NODE_ENV === 'development') {
            logger.warn(`[XHR] ${this._method} ${this._url} failed with status ${this.status}`);
          }
        }
      }
      
      // Call original handler if exists
      if (typeof originalOnLoad === 'function') {
        originalOnLoad.apply(this, arguments);
      }
    };
    
    return originalXHRSend.apply(this, args);
  };
};

export default initNetworkInterceptors;
