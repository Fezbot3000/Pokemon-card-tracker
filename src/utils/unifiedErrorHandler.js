/**
 * Unified Error Handler
 *
 * Consolidates all error suppression logic into a single, configurable system.
 * This replaces errorHandler.js, consoleErrorSuppressor.js, networkErrorSuppressor.js,
 * and networkInterceptor.js with a cleaner, more maintainable solution.
 */

// Configuration object for different error handling strategies
const ERROR_CONFIG = {
  // Environment check
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Error patterns to completely suppress
  suppressedPatterns: [
    // Firebase/Firestore connection errors
    'firestore.googleapis.com',
    'firebase',
    'googleapis.com',
    'WebChannelConnection RPC',
    'transport errored',
    'net::ERR_BLOCKED_BY_CLIENT',
    'net::ERR_QUIC_PROTOCOL_ERROR',
    'Failed to fetch',
    'NetworkError',
    'channel?VER=8&database=projects',
    'Listen/channel?gsessionid',
    'TYPE=terminate',
    'TYPE=xmlhttp',

    // Chrome extension errors
    'extension',
    'chrome-extension',
    'Could not establish connection',
    'The message port closed before a response was received',
    'DeviceTrust is not available',
    'Unchecked runtime.lastError',
    'Cross-Origin-Opener-Policy',

    // React development warnings (suppress in production)
    ...(process.env.NODE_ENV === 'production'
      ? [
          'Warning: Cannot update a component',
          "Warning: Can't perform a React state update",
          'Warning: findDOMNode is deprecated',
          'Warning: componentWillReceiveProps',
          'Warning: componentWillMount',
          'Warning: Each child in a list should have a unique',
          'Warning: React does not recognize the',
          'Warning: Invalid DOM property',
          'Warning: Failed prop type',
        ]
      : []),

    // Other third-party errors
    'ResizeObserver loop',
    'Script error',
    'Uncaught (in promise)',
    'USO session',
    'NmLockState',
    'NmOfflineStatus',
    'Download the React DevTools',
  ],

  // Patterns that should be logged at debug level only
  debugPatterns: [
    'Profile loaded from IndexedDB',
    'Synced purchase invoices',
    'Setting edited card',
    'Loading sets for year',
    'Initializing form',
    'Google sign-in',
    'User document created',
    'Using environment variables for Firebase configuration',
  ],
};

// Track seen messages to avoid duplicates
const seenMessages = new Set();
const MAX_SEEN_MESSAGES = 1000;

/**
 * Check if a message should be suppressed
 */
function shouldSuppressMessage(message) {
  if (typeof message !== 'string') return false;

  // Check if we've seen this exact message before
  if (seenMessages.has(message)) return true;

  // Check against suppressed patterns
  const shouldSuppress = ERROR_CONFIG.suppressedPatterns.some(pattern =>
    message.includes(pattern)
  );

  if (shouldSuppress) {
    seenMessages.add(message);
  }

  return shouldSuppress;
}

/**
 * Check if a message should be logged at debug level
 */
function isDebugMessage(message) {
  if (typeof message !== 'string') return false;

  return ERROR_CONFIG.debugPatterns.some(pattern => message.includes(pattern));
}

/**
 * Initialize the unified error handler
 */
export function initUnifiedErrorHandler() {
  // Store original console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log,
    info: console.info,
    debug: console.debug,
  };

  // Override console.error
  console.error = function (...args) {
    const message = args.join(' ');

    if (shouldSuppressMessage(message)) {
      return; // Completely suppress
    }

    if (ERROR_CONFIG.isProduction) {
      // In production, only show critical errors
      return;
    }

    originalConsole.error.apply(console, args);
  };

  // Override console.warn
  console.warn = function (...args) {
    const message = args.join(' ');

    if (shouldSuppressMessage(message)) {
      return;
    }

    if (ERROR_CONFIG.isProduction) {
      return; // Suppress warnings in production
    }

    originalConsole.warn.apply(console, args);
  };

  // Override console.log
  console.log = function (...args) {
    const message = args.join(' ');

    if (shouldSuppressMessage(message) || isDebugMessage(message)) {
      return;
    }

    if (ERROR_CONFIG.isProduction) {
      return; // Suppress logs in production
    }

    originalConsole.log.apply(console, args);
  };

  // Override console.info and console.debug
  console.info = function (...args) {
    const message = args.join(' ');

    if (shouldSuppressMessage(message) || isDebugMessage(message)) {
      return;
    }

    if (ERROR_CONFIG.isProduction) {
      return;
    }

    originalConsole.info.apply(console, args);
  };

  console.debug = ERROR_CONFIG.isProduction ? () => {} : originalConsole.debug;

  // Intercept global errors
  window.addEventListener('error', function (event) {
    const message = event.message || String(event.error);

    if (shouldSuppressMessage(message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    const message = event.reason?.message || String(event.reason);

    if (shouldSuppressMessage(message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      return await originalFetch.apply(this, args);
    } catch (error) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

      // Suppress Firebase/Firestore connection errors
      if (
        url.includes('firestore.googleapis.com') ||
        url.includes('firebase') ||
        url.includes('googleapis.com')
      ) {
        // Silently fail for Firebase requests
      }

      throw error; // Re-throw for app to handle
    }
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const originalOnError = this.onerror;

    this.onerror = function (event) {
      // Check if it's a Firebase request
      if (
        this._url?.includes('firestore.googleapis.com') ||
        this._url?.includes('firebase') ||
        this._url?.includes('googleapis.com')
      ) {
        event.stopPropagation();
        event.preventDefault();
      }

      if (typeof originalOnError === 'function') {
        originalOnError.apply(this, arguments);
      }
    };

    return originalXHRSend.apply(this, args);
  };

  // Clean up seen messages periodically
  setInterval(() => {
    if (seenMessages.size > MAX_SEEN_MESSAGES) {
      seenMessages.clear();
    }
  }, 60000); // Every minute
}

export default initUnifiedErrorHandler;
