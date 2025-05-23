/**
 * Production-Ready Logger
 * 
 * This logger is designed to be completely removed in production builds
 * using webpack's DefinePlugin or similar build-time optimizations.
 * 
 * In development: Full logging functionality
 * In production: All logger calls become no-ops and can be tree-shaken
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Create a no-op logger for production
const noOpLogger = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  critical: () => {}
};

// Development logger with full functionality
const devLogger = {
  debug: (...args) => console.log('[DEBUG]', ...args),
  log: (...args) => console.log(...args),
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  critical: (...args) => console.error('[CRITICAL]', ...args)
};

// Export the appropriate logger based on environment
// In production builds, this entire module can be replaced with the no-op version
const logger = isDevelopment ? devLogger : noOpLogger;

export default logger;

/**
 * Usage notes for build-time optimization:
 * 
 * 1. Add to webpack.config.js:
 *    new webpack.DefinePlugin({
 *      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
 *    })
 * 
 * 2. For complete removal in production, use babel-plugin-transform-remove-console
 *    or webpack's TerserPlugin with drop_console option
 * 
 * 3. Consider using a build-time replacement like:
 *    - babel-plugin-dev-expression
 *    - webpack's NormalModuleReplacementPlugin
 */
