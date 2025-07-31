/**
 * Enterprise-Grade Logging Service
 * 
 * Provides structured, contextual logging with multiple levels, formatting,
 * and production-safe output. Replaces all console statements throughout
 * the application with proper logging architecture.
 * 
 * Features:
 * - Structured logging with context
 * - Environment-aware output
 * - Performance monitoring
 * - Error tracking integration
 * - Remote logging capabilities (future)
 */

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Logging levels with numeric values for filtering
const LOG_LEVELS = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5
};

// Default configuration based on environment
const getDefaultConfig = () => ({
  level: isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
  enableConsole: !isProduction,
  enableRemote: isProduction,
  enablePerformance: isDevelopment,
  enableStackTrace: isDevelopment,
  maxLogSize: 1000, // Maximum number of logs to keep in memory
  formatOutput: true,
  includeTimestamp: true,
  includeContext: true
});

class LoggingService {
  constructor(config = {}) {
    this.config = { ...getDefaultConfig(), ...config };
    this.logs = [];
    this.performance = new Map();
    this.context = {};
    
    // Initialize performance monitoring
    if (this.config.enablePerformance) {
      this.initializePerformanceMonitoring();
    }
    
    // Override console methods to filter external noise and prevent accidental logging
    this.overrideConsole();
  }

  /**
   * Set global context that will be included in all log entries
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Add context for a single log entry
   */
  withContext(context) {
    return {
      trace: (message, ...args) => this.trace(message, ...args, { context }),
      debug: (message, ...args) => this.debug(message, ...args, { context }),
      info: (message, ...args) => this.info(message, ...args, { context }),
      warn: (message, ...args) => this.warn(message, ...args, { context }),
      error: (message, ...args) => this.error(message, ...args, { context }),
      fatal: (message, ...args) => this.fatal(message, ...args, { context })
    };
  }

  /**
   * TRACE level - Very detailed information, typically only of interest when diagnosing problems
   */
  trace(message, ...args) {
    this._log(LOG_LEVELS.TRACE, 'TRACE', message, args);
  }

  /**
   * DEBUG level - Information useful for debugging
   */
  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, 'DEBUG', message, args);
  }

  /**
   * INFO level - General information about application flow
   */
  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, 'INFO', message, args);
  }

  /**
   * WARN level - Potentially harmful situations
   */
  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, 'WARN', message, args);
  }

  /**
   * ERROR level - Error events that might still allow the application to continue
   */
  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, 'ERROR', message, args);
  }

  /**
   * FATAL level - Very severe error events that will presumably lead the application to abort
   */
  fatal(message, ...args) {
    this._log(LOG_LEVELS.FATAL, 'FATAL', message, args);
  }

  /**
   * Performance monitoring methods
   */
  startTimer(label) {
    if (!this.config.enablePerformance) return;
    
    this.performance.set(label, {
      start: performance.now(),
      label
    });
  }

  endTimer(label) {
    if (!this.config.enablePerformance) return;

    const timer = this.performance.get(label);
    if (!timer) {
      this.warn(`Timer '${label}' was not started`);
      return;
    }
    
    const duration = performance.now() - timer.start;
    this.performance.delete(label);
    this.debug(`Performance: ${label} completed in ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure execution time of a function
   */
  async measureAsync(label, fn) {
    if (!this.config.enablePerformance) {
      return await fn();
    }
    
    this.startTimer(label);
    try {
      const result = await fn();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      this.error(`Performance measurement failed for '${label}':`, error);
      throw error;
    }
  }

  /**
   * Core logging method
   */
  _log(level, levelName, message, args) {
    // Check if this log level should be output
    if (level < this.config.level) {
      return;
    }

    // Extract options from args if present
    const lastArg = args[args.length - 1];
    const options = lastArg && typeof lastArg === 'object' && lastArg.context ? lastArg : {};
    const logArgs = options.context ? args.slice(0, -1) : args;

    // Create log entry
    const logEntry = this._createLogEntry(level, levelName, message, logArgs, options);
    
    // Store log entry
    this._storeLog(logEntry);
    
    // Output to console if enabled
    if (this.config.enableConsole) {
      this._outputToConsole(logEntry);
    }

    // Send to remote logging if enabled
    if (this.config.enableRemote) {
      this._sendToRemote(logEntry);
    }
  }

  /**
   * Create structured log entry
   */
  _createLogEntry(level, levelName, message, args, options = {}) {
    const timestamp = new Date().toISOString();
    const context = { ...this.context, ...options.context };
    
    // Get stack trace for errors and if enabled
    let stackTrace = null;
    if (this.config.enableStackTrace && (level >= LOG_LEVELS.ERROR || options.includeStack)) {
      stackTrace = new Error().stack;
    }

    return {
      timestamp,
      level,
      levelName,
      message,
      args,
      context,
      stackTrace
    };
  }

  /**
   * Store log entry in memory
   */
  _storeLog(logEntry) {
    this.logs.push(logEntry);
    
    // Keep logs within size limit
    if (this.logs.length > this.config.maxLogSize) {
      this.logs.shift();
    }
  }

  /**
   * Output to console with formatting
   */
  _outputToConsole(logEntry) {
    // Only output to console in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const { levelName, message, args, context } = logEntry;
    
    // Format the output
    const formattedMessage = this.config.formatOutput 
      ? this._formatMessage(logEntry)
      : message;

    // Choose console method based on level
    const consoleMethod = this._getConsoleMethod(levelName);
    
    if (Object.keys(context).length > 0) {
      consoleMethod(formattedMessage, ...args, context);
    } else {
      consoleMethod(formattedMessage, ...args);
    }
  }

  /**
   * Format log message with timestamp and context
   */
  _formatMessage(logEntry) {
    const { levelName, message, timestamp, context } = logEntry;
    
    let formatted = '';
    
    if (this.config.includeTimestamp) {
      formatted += `[${timestamp}] `;
    }
    
    formatted += `${levelName}: ${message}`;
    
    if (this.config.includeContext && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    return formatted;
  }

  /**
   * Get appropriate console method for log level
   */
  _getConsoleMethod(levelName) {
    // eslint-disable-next-line no-console
    switch (levelName) {
      case 'TRACE':
      case 'DEBUG':
        // eslint-disable-next-line no-console
        return console.debug;
      case 'INFO':
        // eslint-disable-next-line no-console
        return console.info;
      case 'WARN':
        // eslint-disable-next-line no-console
        return console.warn;
      case 'ERROR':
      case 'FATAL':
        // eslint-disable-next-line no-console
        return console.error;
      default:
        // eslint-disable-next-line no-console
        return console.log;
    }
  }

  /**
   * Send log to remote logging service (placeholder for future implementation)
   */
  _sendToRemote() {
    // Future implementation for remote logging
    // Could integrate with services like LogRocket, Sentry, or custom logging endpoints
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    if (typeof window !== 'undefined' && window.performance) {
      // Monitor page load performance
      window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        this.info(`Page load completed in ${loadTime}ms`);
      });
    }
  }

  /**
   * Override console methods in production
   * Note: This method is deprecated and should not be used.
   * Use ESLint rules instead to prevent console statements.
   */
  overrideConsole() {
    // Store original console methods for filtered logging
    /* eslint-disable no-console */
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    /* eslint-enable no-console */

    // External noise patterns to filter
    const externalNoisePatterns = [
      'background.js',
      'webchannel_blob',
      'NmLockState', 
      '@firebase/firestore: Firestore',
      'WebChannelConnection RPC',
      'Missing or insufficient permissions'
    ];

    const shouldFilterMessage = (message) => {
      if (!message) return false;
      return externalNoisePatterns.some(pattern => message.includes(pattern));
    };

    if (process.env.NODE_ENV === 'production') {
      // In production, suppress all console logs
      const noop = () => {};
      // eslint-disable-next-line no-console
      console.log = noop;
      // eslint-disable-next-line no-console
      console.debug = noop;
      // eslint-disable-next-line no-console
      console.info = noop;
      // eslint-disable-next-line no-console
      console.warn = noop;
      // eslint-disable-next-line no-console
      console.error = noop;
    } else {
      // In development, filter external noise but keep app logs
      // eslint-disable-next-line no-console
      console.warn = function (...args) {
        const message = args.join(' ');
        if (shouldFilterMessage(message)) {
          return; // Don't log external noise
        }
        originalConsole.warn.apply(console, args);
      };

      // eslint-disable-next-line no-console
      console.error = function (...args) {
        const message = args.join(' ');
        if (shouldFilterMessage(message)) {
          return; // Don't log external noise
        }
        originalConsole.error.apply(console, args);
      };
    }
  }

  /**
   * Get all stored logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs for analysis
   */
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      logs: this.getLogs(),
      config: this.config
    };
  }
}

// Create singleton instance
const logger = new LoggingService();

// Export both the instance and the class
export { LoggingService, logger };
export default logger; 