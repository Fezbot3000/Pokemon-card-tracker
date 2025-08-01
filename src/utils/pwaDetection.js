/**
 * PWA Detection Utilities
 * 
 * Provides utilities for detecting Progressive Web App mode
 * and handling PWA-specific behaviors.
 */

/**
 * Detects if the app is running in PWA standalone mode
 * @returns {boolean} True if running as PWA, false if in browser
 */
export const isPWAMode = () => {
  if (typeof window === 'undefined') {
    return false; // Server-side rendering
  }

  // Check for display-mode: standalone (most reliable)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for iOS Safari PWA (fallback)
  const isIOSPWA = window.navigator.standalone === true;
  
  return isStandalone || isIOSPWA;
};

/**
 * Get PWA-specific timing values for authentication
 * @returns {object} Timing configuration for PWA vs browser
 */
export const getPWATimingConfig = () => {
  const isPWA = isPWAMode();
  
  return {
    isPWA,
    // Authentication initialization wait time
    authInitDelay: isPWA ? 300 : 150,
    // Loading state minimum display time
    loadingMinTime: isPWA ? 200 : 100,
  };
};

/**
 * Logs PWA detection information for debugging
 */
export const logPWADetection = () => {
  if (typeof window === 'undefined') return;
  
  const isPWA = isPWAMode();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSPWA = window.navigator.standalone === true;
  
  console.log('PWA Detection:', {
    isPWA,
    isStandalone,
    isIOSPWA,
    userAgent: navigator.userAgent,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
  });
};