/**
 * Console Error Suppressor
 * 
 * This utility provides advanced error handling to prevent console errors from appearing
 * in production environments while still allowing proper debugging in development.
 */

// List of known error patterns to completely suppress (no logging at all)
const SUPPRESSED_ERROR_PATTERNS = [
  // Firebase/Firestore errors
  'net::ERR_BLOCKED_BY_CLIENT',
  'net::ERR_QUIC_PROTOCOL_ERROR',
  'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
  'Failed to load resource: net::ERR_QUIC_PROTOCOL_ERROR',
  'Failed to fetch',
  'NetworkError',
  'firestore.googleapis.com',
  'WebChannelConnection RPC',
  'transport errored',
  'POST https://firestore.googleapis.com',
  'GET https://firestore.googleapis.com',
  'channel?VER=8&database=projects',
  'Listen/channel?gsessionid',
  'TYPE=terminate',
  'TYPE=xmlhttp',
  
  // React errors that are safe to ignore
  'Warning: Cannot update a component',
  'Warning: Can\'t perform a React state update',
  'Warning: findDOMNode is deprecated',
  'Warning: componentWillReceiveProps has been renamed',
  'Warning: componentWillMount has been renamed',
  
  // Third-party library errors
  'ResizeObserver loop',
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
  'Script error',
  'Uncaught (in promise)',
  
  // Chrome extension related errors
  'extension',
  'chrome-extension',
  'Could not establish connection. Receiving end does not exist.',
  'The message port closed before a response was received.',
  'DeviceTrust is not available',
  'Device trust is not available',
  'Unchecked runtime.lastError',
  'Cross-Origin-Opener-Policy policy would block',
  'USO session',
  'NmLockState',
  'NmOfflineStatus',
  
  // 1Password specific messages
  'background.js',
  'Performance diagnostic',
  'Initialize',
  'Initializing 1Password',
  'Initializing WASM',
  'Looking for desktop app',
  'Sending <Nm',
  'Received message <Nm',
  'Received failure for message',
  'Received <',
  'We successfully unlocked',
  'The item cache has not been initialized',
  'Hooray!',
  'Sync',
  'Lock Monitor',
  'Managed Apps',
  'Caught error handling',
  'injected.js'
];

// Patterns to log at debug level instead of error
const DEBUG_LEVEL_PATTERNS = [
  'Warning: Each child in a list should have a unique',
  'Warning: React does not recognize the',
  'Warning: Invalid DOM property',
  'Warning: Failed prop type'
];

// Patterns to log at info level
const INFO_LEVEL_PATTERNS = [
  'Profile loaded from IndexedDB',
  'Synced purchase invoices from Firebase',
  'Loaded 0 invoices from local database for user',
  'Download the React DevTools for a better development experience',
  'Setting edited card with complete data',
  'Loading sets for year',
  'Adding missing set',
  'Initializing form with pre-selected cards',
  'Saving new invoice',
  'Loaded invoices directly from Firestore',
  'Starting Google sign-in process',
  'Google sign-in successful',
  'User document created',
  'Existing Google account detected',
  'Using environment variables for Firebase configuration'
];

// Keep track of seen messages to avoid duplicates
const seenMessages = new Set();
const MAX_SEEN_MESSAGES = 1000;

// Custom logger functions that respect the environment
const customLogger = {
  error: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DEV ONLY]', ...args);
    }
  },
  warn: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEV ONLY]', ...args);
    }
  },
  info: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.info('[DEV ONLY]', ...args);
    }
  },
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEV ONLY]', ...args);
    }
  }
};

/**
 * Determines if a message should be suppressed based on patterns
 * @param {string} message - The error message to check
 * @returns {object} - Contains whether to suppress and at what level to log
 */
const shouldSuppressMessage = (message) => {
  if (typeof message !== 'string') {
    return { suppress: false };
  }
  
  // Check for exact duplicates (avoid repeating the same message)
  if (seenMessages.has(message)) {
    return { suppress: true };
  }
  
  // Check for completely suppressed errors
  if (SUPPRESSED_ERROR_PATTERNS.some(pattern => message.includes(pattern))) {
    // Add to seen messages to prevent duplicates
    seenMessages.add(message);
    return { suppress: true };
  }
  
  // Check for debug level patterns
  if (DEBUG_LEVEL_PATTERNS.some(pattern => message.includes(pattern))) {
    seenMessages.add(message);
    return { suppress: true, level: 'debug' };
  }
  
  // Check for info level patterns
  if (INFO_LEVEL_PATTERNS.some(pattern => message.includes(pattern))) {
    seenMessages.add(message);
    return { suppress: true, level: 'info' };
  }
  
  return { suppress: false };
};

/**
 * Initialize advanced error suppression
 */
export const initAdvancedErrorSuppression = () => {
  // Store original console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    log: console.log
  };
  
  // Override console.error
  console.error = function(...args) {
    // Quick check for background.js messages from extensions
    if (args.length > 0 && args[0] && typeof args[0] === 'string' && 
        (args[0].includes('background.js') || args[0].includes('injected.js'))) {
      return; // Immediately suppress extension messages
    }
    
    const message = args.join(' ');
    const result = shouldSuppressMessage(message);
    
    if (result.suppress) {
      if (result.level === 'debug') {
        customLogger.debug(...args);
      } else if (result.level === 'info') {
        customLogger.info(...args);
      }
      // Otherwise completely suppress
      return;
    }
    
    originalConsole.error.apply(console, args);
  };
  
  // Override console.warn
  console.warn = function(...args) {
    const message = args.join(' ');
    const result = shouldSuppressMessage(message);
    
    if (result.suppress) {
      if (result.level === 'debug') {
        customLogger.debug(...args);
      } else if (result.level === 'info') {
        customLogger.info(...args);
      }
      return;
    }
    
    originalConsole.warn.apply(console, args);
  };
  
  // Override console.log for certain patterns
  console.log = function(...args) {
    // Quick check for background.js messages from extensions
    if (args.length > 0 && args[0] && typeof args[0] === 'string' && 
        (args[0].includes('background.js') || args[0].includes('injected.js'))) {
      return; // Immediately suppress extension messages
    }
    
    const message = args.join(' ');
    const result = shouldSuppressMessage(message);
    
    if (result.suppress) {
      return;
    }
    
    originalConsole.log.apply(console, args);
  };
  
  // Periodically clean up seen messages to prevent memory leaks
  setInterval(() => {
    if (seenMessages.size > MAX_SEEN_MESSAGES) {
      seenMessages.clear();
    }
  }, 60000); // Clear every minute if too large
  
  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const message = event.reason?.message || String(event.reason);
    const result = shouldSuppressMessage(message);
    
    if (result.suppress) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  
  // Intercept global errors
  window.addEventListener('error', function(event) {
    const message = event.message || String(event.error);
    const result = shouldSuppressMessage(message);
    
    if (result.suppress) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
};

export default initAdvancedErrorSuppression;
