/**
 * Centralized Secret Management
 *
 * This module provides a single source of truth for all API keys and secrets.
 * All secrets are sourced exclusively from environment variables.
 * Missing environment variables will cause the application to fail with clear error messages.
 */

import logger from '../utils/logger';

// Track which secrets are being used
const usageTracker = {
  accessed: {},
  track(secretName) {
    this.accessed[secretName] = (this.accessed[secretName] || 0) + 1;
    return secretName;
  },
  getReport() {
    return {
      accessed: { ...this.accessed },
      timestamp: new Date().toISOString(),
    };
  },
  logReport() {
    logger.info('Secret Usage Report:', this.getReport());
  },
};

// Schedule a usage report after the app has been running
setTimeout(() => {
  usageTracker.logReport();
}, 10000);

/**
 * Validate that a required environment variable is present
 * @param {string} envVar - The environment variable name
 * @param {string} description - Human-readable description of the variable
 * @returns {string} - The environment variable value
 * @throws {Error} - If the environment variable is not set
 */
const requireEnvVar = (envVar, description) => {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${envVar} (${description}). Please check your .env file.`
    );
  }
  return value;
};

/**
 * Get an optional environment variable
 * @param {string} envVar - The environment variable name
 * @returns {string|null} - The environment variable value or null if not set
 */
const getOptionalEnvVar = envVar => {
  return process.env[envVar] || null;
};

/**
 * Get Firebase configuration from environment variables
 */
export const getFirebaseConfig = () => {
  usageTracker.track('firebase.config');
  return {
    apiKey: requireEnvVar('REACT_APP_FIREBASE_API_KEY', 'Firebase API Key'),
    authDomain: requireEnvVar(
      'REACT_APP_FIREBASE_AUTH_DOMAIN',
      'Firebase Auth Domain'
    ),
    projectId: requireEnvVar(
      'REACT_APP_FIREBASE_PROJECT_ID',
      'Firebase Project ID'
    ),
    storageBucket: requireEnvVar(
      'REACT_APP_FIREBASE_STORAGE_BUCKET',
      'Firebase Storage Bucket'
    ),
    messagingSenderId: requireEnvVar(
      'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
      'Firebase Messaging Sender ID'
    ),
    appId: requireEnvVar('REACT_APP_FIREBASE_APP_ID', 'Firebase App ID'),
  };
};

/**
 * Get Google Auth client ID (optional)
 */
export const getGoogleClientId = () => {
  usageTracker.track('googleClientId');
  return getOptionalEnvVar('REACT_APP_FIREBASE_CLIENT_ID');
};

/**
 * Get SendGrid API key
 */
export const getSendGridApiKey = () => {
  usageTracker.track('sendgridApiKey');
  return requireEnvVar('REACT_APP_SENDGRID_API_KEY', 'SendGrid API Key');
};

/**
 * Get Pokemon TCG API key
 */
export const getPokemonTcgApiKey = () => {
  usageTracker.track('pokemonTcgApiKey');
  return requireEnvVar('REACT_APP_POKEMON_TCG_API_KEY', 'Pokemon TCG API Key');
};

/**
 * Get Stripe Publishable Key
 */
export const getStripePublishableKey = () => {
  usageTracker.track('stripePublishableKey');
  return requireEnvVar(
    'REACT_APP_STRIPE_PUBLISHABLE_KEY',
    'Stripe Publishable Key'
  );
};

/**
 * Get Stripe Premium Plan Price ID
 */
export const getStripePremiumPlanPriceId = () => {
  usageTracker.track('stripePremiumPlanPriceId');
  return requireEnvVar(
    'REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID',
    'Stripe Premium Plan Price ID'
  );
};

/**
 * Get Price Charting API Key
 */
export const getPriceChartingApiKey = () => {
  usageTracker.track('priceChartingApiKey');
  return requireEnvVar(
    'REACT_APP_PRICECHARTING_API_KEY',
    'Price Charting API Key'
  );
};

/**
 * Generate a map of config sources for debugging
 */
export const getConfigSources = () => {
  usageTracker.track('configSources');
  const sources = {};

  // All sources are now environment variables
  sources.firebase = {
    apiKey: 'Environment',
    authDomain: 'Environment',
    projectId: 'Environment',
    storageBucket: 'Environment',
    messagingSenderId: 'Environment',
    appId: 'Environment',
  };

  sources.googleClientId = getOptionalEnvVar('REACT_APP_FIREBASE_CLIENT_ID')
    ? 'Environment'
    : 'Not Set (Optional)';
  sources.sendgridApiKey = 'Environment';
  sources.pokemonTcgApiKey = 'Environment';
  sources.stripePublishableKey = 'Environment';
  sources.stripePremiumPlanPriceId = 'Environment';
  sources.priceChartingApiKey = 'Environment';

  return sources;
};

/**
 * Log the usage report and return a full report of all secrets
 * and their usage information
 */
export const getSecretUsageReport = () => {
  usageTracker.track('secretUsageReport');
  const report = usageTracker.getReport();
  logger.info('Secret Usage Report Requested:', report);
  return report;
};
