/**
 * Network Interceptor
 * 
 * This utility provides targeted interception of Firebase-related network requests
 * to prevent console errors while avoiding interference with browser extensions.
 * 
 * IMPORTANT: This implementation specifically avoids global interception patterns
 * that could interfere with browser extensions like 1Password.
 */

import logger from './logger';

/**
 * Initialize network request interceptors
 */
export const initNetworkInterceptors = () => {
  // Only intercept Firebase-specific requests
  interceptFirebaseRequests();
};

/**
 * Intercept only Firebase-related fetch requests to handle errors silently
 * This approach avoids interfering with browser extensions like 1Password
 */
const interceptFirebaseRequests = () => {
  // We'll use a more targeted approach that doesn't override global fetch
  // Instead, we'll create a Firebase-specific fetch wrapper to use in our app
  
  // Export a function that can be used for Firebase requests
  window.firebaseFetch = async function(url, options = {}) {
    try {
      const response = await fetch(url, options);
      
      // Handle non-2xx responses for Firebase requests
      if (!response.ok) {
        // Log the error but don't show it in console
        const method = options.method || 'GET';
        
        // Only log detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          logger.warn(`[Firebase] ${method} ${url} failed with status ${response.status}`);
        }
      }
      
      return response;
    } catch (error) {
      // Handle Firebase network errors silently
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[Firebase] Connection issue: ${error.message}`);
      }
      
      // Re-throw the error so the application can handle it
      throw error;
    }
  };
  
  // Add a console filter for Firebase-related errors
  addConsoleFilter();
};

/**
 * Add a console filter that only affects Firebase-related errors
 * This is a safer approach than overriding XMLHttpRequest globally
 */
const addConsoleFilter = () => {
  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Create a function to check if a message is Firebase-related
  const isFirebaseMessage = (args) => {
    if (!args || args.length === 0) return false;
    
    const message = args.join ? args.join(' ') : String(args);
    return (
      message.includes('firestore.googleapis.com') ||
      message.includes('firebase') ||
      message.includes('googleapis.com') ||
      message.includes('FirebaseError') ||
      message.includes('WebChannelConnection')
    );
  };
  
  // Override console.error only for Firebase-related messages
  console.error = function(...args) {
    if (isFirebaseMessage(args)) {
      // Log to our custom logger instead of console
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Firebase Error Suppressed]', ...args);
      }
      return;
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args);
  };
  
  // Override console.warn only for Firebase-related messages
  console.warn = function(...args) {
    if (isFirebaseMessage(args)) {
      // Log to our custom logger instead of console
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Firebase Warning Suppressed]', ...args);
      }
      return;
    }
    
    // Pass through all other warnings
    originalConsoleWarn.apply(console, args);
  };
};

// Create a Firebase-specific XMLHttpRequest for use in the app
window.FirebaseXHR = class FirebaseXHR extends XMLHttpRequest {
  constructor() {
    super();
    this.addEventListener('error', (event) => {
      // Suppress Firebase errors in console
      if (this._url?.includes('firestore.googleapis.com') || 
          this._url?.includes('firebase') || 
          this._url?.includes('googleapis.com')) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`[Firebase XHR] Connection issue for ${this._url}`);
        }
        // Don't prevent default here to allow normal error handling
      }
    });
  }
  
  open(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return super.open(method, url, ...rest);
  }
};

export default initNetworkInterceptors;
