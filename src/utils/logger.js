/**
 * Logger utility that controls console output based on environment
 * In production, only errors and critical information will be shown
 * In development, all logs will be shown
 */

import LoggingService from '../services/LoggingService';

// Determine environment and desired log level
const isProduction = process.env.NODE_ENV === 'production';
const envLevel = (process.env.REACT_APP_LOG_LEVEL || '').toLowerCase();

// Priority mapping (lower is more verbose)
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const defaultLevel = isProduction ? 'error' : 'warn';
const activeLevel = LEVELS[envLevel] ?? LEVELS[defaultLevel];

// Configure logging visibility based on activeLevel
const config = {
  showDebugLogs: activeLevel <= LEVELS.debug,
  showInfoLogs: activeLevel <= LEVELS.info,
  showWarnLogs: activeLevel <= LEVELS.warn,
  showErrorLogs: activeLevel <= LEVELS.error,
  showCriticalLogs: true,
};

// Note: Console overrides are handled by LoggingService.js
// This wrapper just provides a convenience layer with environment-based filtering

const logger = {
  // Only logs in development mode
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug: (..._args) => {
    if (config.showDebugLogs) {
      LoggingService.debug(..._args);
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
      LoggingService.info('[CRITICAL]', ..._args);
    }
  },

  // Alias for log to make migration easier
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log: (..._args) => {
    if (config.showDebugLogs) {
      LoggingService.debug(..._args);
    }
  },
};

export default logger;
