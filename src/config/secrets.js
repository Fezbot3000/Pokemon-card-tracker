/**
 * Centralized Secret Management
 * 
 * This module provides a single source of truth for all API keys and secrets.
 * Priority order for secrets:
 * 1. Environment variables (REACT_APP_*)
 * 2. Local development secrets (from local-config.js, not committed to git)
 * 3. Fallback values (as a last resort)
 */

// Import local development secrets (these will be undefined in production)
import * as localConfig from './local-config';
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
      timestamp: new Date().toISOString()
    };
  },
  logReport() {
    logger.info('Secret Usage Report:', this.getReport());
  }
};

// Schedule a usage report after the app has been running
setTimeout(() => {
  usageTracker.logReport();
}, 10000); // Log after 10 seconds

/**
 * Get Firebase configuration with proper fallbacks
 */
export const getFirebaseConfig = () => {
  usageTracker.track('firebase.config');
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDIxG9wMoOm0xO72YCAs4RO9YVrGjRcvLQ",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "mycardtracker-c8479.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "mycardtracker-c8479",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "mycardtracker-c8479.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "726820232287",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:726820232287:web:fc27495f506950a78dcfea"
  };
};

/**
 * Get Google Auth client ID
 */
export const getGoogleClientId = () => {
  usageTracker.track('googleClientId');
  return process.env.REACT_APP_FIREBASE_CLIENT_ID || 
    "726820232287-qcmvs1a9u5g5vf5rjb5uf8c7m7i7qdnv.apps.googleusercontent.com";
};

/**
 * Get PriceCharting API key
 */
export const getPriceChartingApiKey = () => {
  usageTracker.track('priceChartingApiKey');
  return process.env.REACT_APP_PRICECHARTING_API_KEY || 
    localConfig.PRICECHARTING_API_KEY || 
    null;
};

/**
 * Generate a map of config sources for debugging
 */
export const getConfigSources = () => {
  usageTracker.track('configSources');
  const sources = {};
  
  // Firebase config sources
  sources.firebase = {
    apiKey: !!process.env.REACT_APP_FIREBASE_API_KEY ? 'Environment' : 'Fallback',
    authDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'Environment' : 'Fallback',
    projectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'Environment' : 'Fallback',
    storageBucket: !!process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? 'Environment' : 'Fallback',
    messagingSenderId: !!process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? 'Environment' : 'Fallback',
    appId: !!process.env.REACT_APP_FIREBASE_APP_ID ? 'Environment' : 'Fallback'
  };
  
  // Additional API keys
  sources.googleClientId = !!process.env.REACT_APP_FIREBASE_CLIENT_ID ? 'Environment' : 'Fallback';
  sources.priceChartingApiKey = process.env.REACT_APP_PRICECHARTING_API_KEY ? 'Environment' : 
                               localConfig.PRICECHARTING_API_KEY ? 'LocalConfig' : 'None';
                               
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
