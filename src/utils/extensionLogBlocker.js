/**
 * Extension Log Blocker
 * 
 * This utility specifically targets and blocks console logs from browser extensions
 * like 1Password that might pollute the console during development.
 * 
 * It uses a more aggressive approach than our standard error handling to ensure
 * extension logs don't appear in the console.
 */

import logger from './logger';

/**
 * Initialize the extension log blocker
 */
export const initExtensionLogBlocker = () => {
  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;

  // Create a function to check if a message is from a browser extension
  const isExtensionMessage = (args) => {
    if (!args || args.length === 0) return false;
    
    // Convert args to string for checking
    const message = args.join ? args.join(' ') : String(args);
    
    // Check for 1Password specific patterns
    return (
      // Check for specific file references
      message.includes('background.js:') ||
      message.includes('injected.js:') ||
      
      // Check for 1Password specific message patterns
      message.includes('1Password') ||
      message.includes('[BackgroundStorage]') ||
      message.includes('Performance diagnostic:') ||
      message.includes('WASM: Initializing') ||
      message.includes('Unchecked runtime.lastError') ||
      message.includes('DeviceHandler:') ||
      message.includes('Device trust') ||
      message.includes('NmRequestAccounts') ||
      message.includes('NmLockState') ||
      message.includes('NmOfflineStatus') ||
      message.includes('message port closed') ||
      message.includes('Could not establish connection')
    );
  };

  // Override console methods to filter out extension messages
  console.log = function(...args) {
    if (isExtensionMessage(args)) {
      // Completely suppress extension logs
      return;
    }
    
    // Pass through all other logs
    originalConsoleLog.apply(console, args);
  };

  console.error = function(...args) {
    if (isExtensionMessage(args)) {
      // Completely suppress extension errors
      return;
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args);
  };

  console.warn = function(...args) {
    if (isExtensionMessage(args)) {
      // Completely suppress extension warnings
      return;
    }
    
    // Pass through all other warnings
    originalConsoleWarn.apply(console, args);
  };

  console.info = function(...args) {
    if (isExtensionMessage(args)) {
      // Completely suppress extension info messages
      return;
    }
    
    // Pass through all other info messages
    originalConsoleInfo.apply(console, args);
  };

  console.debug = function(...args) {
    if (isExtensionMessage(args)) {
      // Completely suppress extension debug messages
      return;
    }
    
    // Pass through all other debug messages
    originalConsoleDebug.apply(console, args);
  };

  // Add a special handler for runtime.lastError messages that often come from extensions
  const originalWindowOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (
      message && typeof message === 'string' && 
      (message.includes('runtime.lastError') || 
       message.includes('message port closed') ||
       (source && source.includes('background.js')))
    ) {
      // Suppress extension errors
      return true; // Prevents the error from propagating
    }
    
    // Pass through all other errors
    if (originalWindowOnError) {
      return originalWindowOnError.apply(this, arguments);
    }
    return false;
  };

  logger.debug('Extension log blocker initialized');
};

export default initExtensionLogBlocker;
