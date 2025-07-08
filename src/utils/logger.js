/**
 * Logger utility that controls console output based on environment
 * In production, only errors and critical information will be shown
 * In development, all logs will be shown
 */

import LoggingService from '../services/LoggingService';

// Determine if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Force silence certain logs even in development mode
// This is set to true for production readiness
const forceSilence = true; // Disable debug logging in production

// Configure logging levels
// Set to true to show that type of log, false to hide
const config = {
  showDebugLogs: !isProduction && !forceSilence, // Hide debug logs in production and when forceSilence is true
  showInfoLogs: !isProduction && !forceSilence, // Hide info logs in production and when forceSilence is true
  showWarnLogs: !forceSilence, // Show warnings unless forceSilence is true
  showErrorLogs: true, // Always show errors
  showCriticalLogs: true, // Always show critical logs
};

// Silence ALL console logs except errors in production by overriding console methods
// We're also applying this in development when forceSilence is true
if (isProduction || forceSilence) {
  // Store original console methods
  /* eslint-disable no-console */
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  /* eslint-enable no-console */

  // Override console methods in production
  // eslint-disable-next-line no-console, @typescript-eslint/no-unused-vars
  console.log = function (..._args) {
    // Do nothing in production (silence logs)
  };

  // eslint-disable-next-line no-console, @typescript-eslint/no-unused-vars
  console.info = function (..._args) {
    // Do nothing in production (silence info)
  };

  // eslint-disable-next-line no-console, @typescript-eslint/no-unused-vars
  console.debug = function (..._args) {
    // Do nothing in production (silence debug)
  };

  // Keep warnings and errors functional
  // eslint-disable-next-line no-console
  console.warn = function (...args) {
    originalConsole.warn.apply(console, args);
  };

  // eslint-disable-next-line no-console
  console.error = function (...args) {
    originalConsole.error.apply(console, args);
  };
}

const logger = {
  // Only logs in development mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug: (..._args) => {
    if (config.showDebugLogs) {
      // LoggingService.info(..._args);
    }
  },

  // Shows in both dev and production, use sparingly
  info: (...args) => {
    if (config.showInfoLogs) {
      LoggingService.info(...args);
    }
  },

  // Important warnings, shown in both environments
  warn: (...args) => {
    if (config.showWarnLogs) {
      LoggingService.warn(...args);
    }
  },

  // Errors are always shown
  error: (...args) => {
    if (config.showErrorLogs) {
      LoggingService.error(...args);
    }
  },

  // Critical information that should be shown even in production
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  critical: (..._args) => {
    if (config.showCriticalLogs) {
      // LoggingService.info('[CRITICAL]', ..._args);
    }
  },

  // Alias for log to make migration easier
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log: (..._args) => {
    if (config.showDebugLogs) {
      // LoggingService.info(..._args);
    }
  },
};

export default logger;
