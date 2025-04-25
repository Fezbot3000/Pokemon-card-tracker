/**
 * Logger utility that controls console output based on environment
 * In production, only errors and critical information will be shown
 * In development, all logs will be shown
 */

// Determine if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Force silence certain logs even in development mode
// This can be set to true when preparing for production
const forceSilence = true;

// Configure logging levels
// Set to true to show that type of log, false to hide
const config = {
  showDebugLogs: !isProduction && !forceSilence,   // Hide debug logs in production and when forceSilence is true
  showInfoLogs: !isProduction && !forceSilence,    // Hide info logs in production and when forceSilence is true
  showWarnLogs: !forceSilence,                    // Show warnings unless forceSilence is true
  showErrorLogs: true,                            // Always show errors
  showCriticalLogs: true,                         // Always show critical logs
};

// Silence ALL console logs except errors in production by overriding console methods
if (isProduction) {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Override console methods in production
  console.log = function(...args) {
    // Do nothing in production (silence logs)
  };
  
  console.info = function(...args) {
    // Do nothing in production (silence info)
  };
  
  console.debug = function(...args) {
    // Do nothing in production (silence debug)
  };
  
  // Keep warnings and errors functional
  console.warn = function(...args) {
    originalConsole.warn.apply(console, args);
  };
  
  console.error = function(...args) {
    originalConsole.error.apply(console, args);
  };
}

const logger = {
  // Only logs in development mode
  debug: (...args) => {
    if (config.showDebugLogs) {
      console.log(...args);
    }
  },
  
  // Shows in both dev and production, use sparingly
  info: (...args) => {
    if (config.showInfoLogs) {
      console.info(...args);
    }
  },
  
  // Important warnings, shown in both environments
  warn: (...args) => {
    if (config.showWarnLogs) {
      console.warn(...args);
    }
  },
  
  // Errors are always shown
  error: (...args) => {
    if (config.showErrorLogs) {
      console.error(...args);
    }
  },
  
  // Critical information that should be shown even in production
  critical: (...args) => {
    if (config.showCriticalLogs) {
      console.log('[CRITICAL]', ...args);
    }
  },
  
  // Alias for log to make migration easier
  log: (...args) => {
    if (config.showDebugLogs) {
      console.log(...args);
    }
  }
};

export default logger;
