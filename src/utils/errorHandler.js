/**
 * Error handler utility to suppress specific console errors and debug logs
 * that are not relevant to the application functionality or would clutter the console.
 */

// List of error messages to suppress
const SUPPRESSED_ERRORS = [
  'Could not establish connection. Receiving end does not exist.',
  'The message port closed before a response was received.',
  'DeviceTrust is not available',
  'Device trust is not available',
  'Unchecked runtime.lastError',
  'Cross-Origin-Opener-Policy policy would block',
  'net::ERR_BLOCKED_BY_CLIENT',
  'net::ERR_QUIC_PROTOCOL_ERROR',
  'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
  'Failed to load resource: net::ERR_QUIC_PROTOCOL_ERROR',
  'Failed to fetch',
  'NetworkError',
  'firestore.googleapis.com',
  'WebChannelConnection RPC',
  'transport errored',
  'USO session',
  'NmLockState',
  'NmOfflineStatus',
  'POST https://firestore.googleapis.com',
  'GET https://firestore.googleapis.com',
  'channel?VER=8&database=projects',
  'Listen/channel?gsessionid',
  'TYPE=terminate',
  'TYPE=xmlhttp'
];

// List of debug messages to suppress
const SUPPRESSED_DEBUG_LOGS = [
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
  'Using environment variables for Firebase configuration',
  'Sending <NmLockState>',
  'Received message <NmLockState>',
  'Sending <NmOfflineStatus>',
  'Received message <NmOfflineStatus>'
];

// Keep track of seen messages to avoid duplicates
const seenMessages = new Set();

/**
 * Initialize error suppression by overriding the console methods
 * to filter out specific messages that are not relevant to the application.
 */
export const initErrorSuppression = () => {
  // Store the original console functions
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;
  const originalConsoleInfo = console.info;

  // Helper function to check if a message should be suppressed
  const shouldSuppressMessage = (message) => {
    // Check for exact duplicates (avoid repeating the same message)
    if (seenMessages.has(message)) {
      return true;
    }
    
    // Check for suppressed errors
    if (SUPPRESSED_ERRORS.some(err => message.includes(err))) {
      return true;
    }
    
    // Check for suppressed debug logs
    if (SUPPRESSED_DEBUG_LOGS.some(log => message.includes(log))) {
      // Add to seen messages to prevent duplicates
      seenMessages.add(message);
      return true;
    }
    
    return false;
  };

  // Override console.error
  console.error = function(...args) {
    const errorMessage = args.join(' ');
    if (!shouldSuppressMessage(errorMessage)) {
      originalConsoleError.apply(console, args);
    }
  };

  // Override console.log
  console.log = function(...args) {
    const logMessage = args.join(' ');
    if (!shouldSuppressMessage(logMessage)) {
      originalConsoleLog.apply(console, args);
    }
  };
  
  // Override console.debug
  console.debug = function(...args) {
    const debugMessage = args.join(' ');
    if (!shouldSuppressMessage(debugMessage)) {
      originalConsoleDebug.apply(console, args);
    }
  };
  
  // Override console.info
  console.info = function(...args) {
    const infoMessage = args.join(' ');
    if (!shouldSuppressMessage(infoMessage)) {
      originalConsoleInfo.apply(console, args);
    }
  };
  
  // Limit the size of seenMessages to prevent memory leaks
  setInterval(() => {
    if (seenMessages.size > 1000) {
      seenMessages.clear();
    }
  }, 60000); // Clear every minute if too large
};
