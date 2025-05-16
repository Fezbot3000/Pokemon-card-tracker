/**
 * Network Error Suppressor
 * 
 * This utility intercepts and silently handles network errors related to
 * Firebase/Firestore connections that might be blocked by browser extensions.
 * It's designed to prevent console errors without affecting functionality.
 */

/**
 * Initialize network error suppression
 * This should be called early in the application lifecycle
 */
export function initNetworkErrorSuppression() {
  // Intercept XMLHttpRequest to handle Firestore errors
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Override XHR open method to track Firestore URLs
  XMLHttpRequest.prototype.open = function(...args) {
    const method = args[0];
    const url = args[1];
    
    // Store the URL to check if it's a Firestore request
    this._isFirestoreRequest = typeof url === 'string' && 
      (url.includes('firestore.googleapis.com') || 
       url.includes('firebase'));
       
    return originalXHROpen.apply(this, args);
  };
  
  // Override XHR send method to intercept errors for Firestore requests
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._isFirestoreRequest) {
      // For Firestore requests, intercept network errors
      const originalOnError = this.onerror;
      
      this.onerror = function(event) {
        // Silently handle the error for Firestore requests
        // This prevents the error from propagating to the console
        event.stopPropagation();
        event.preventDefault();
        
        // Still call the original handler if it exists, but with a modified event
        if (typeof originalOnError === 'function') {
          const modifiedEvent = new Event('error', { bubbles: false, cancelable: false });
          originalOnError.call(this, modifiedEvent);
        }
        
        return true;
      };
    }
    
    return originalXHRSend.apply(this, args);
  };
}

export default initNetworkErrorSuppression;
