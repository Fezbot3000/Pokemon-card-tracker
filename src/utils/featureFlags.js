/**
 * Feature Flags System
 *
 * This module provides a centralized way to manage feature flags throughout the application.
 * Feature flags allow for incremental rollout of features and easy rollback if issues occur.
 *
 * Current flags:
 * - enableFirestoreSync: Controls whether data is written to Firestore (shadow writes)
 * - enableFirestoreReads: Controls whether data is read from Firestore when online
 * - enableRealtimeListeners: Controls whether real-time listeners are active
 * - enableBackgroundMigration: Controls automatic background migration to Firestore
 * - enableCardValueUpdates: Controls whether card value updates feature is enabled
 */

import logger from './logger';

// Default flag values (all disabled by default)
const defaultFlags = {
  enableFirestoreSync: true, // Controls shadow writes to Firestore
  enableFirestoreReads: true, // Controls reading from Firestore when online
  enableRealtimeListeners: false, // Controls real-time Firestore listeners
  enableBackgroundMigration: false, // Controls background migration to Firestore
  enableCardValueUpdates: false, // Controls card value updating feature (disabled)
  isDeveloperMode: false, // Special mode for developer testing
};

// Try to load saved flags from localStorage
let savedFlags = {};
try {
  const savedFlagsString = localStorage.getItem('appFeatureFlags');
  if (savedFlagsString) {
    savedFlags = JSON.parse(savedFlagsString);
  }
} catch (error) {
  logger.error('Error loading feature flags from localStorage:', error, { context: { file: 'featureFlags', purpose: 'localStorage' } });
}

// Merge default flags with any saved flags
const featureFlags = {
  ...defaultFlags,
  ...savedFlags,
};

/**
 * Environment-based flag overrides
 * This allows for configuration via environment variables in different environments
 */
if (process.env.REACT_APP_ENABLE_FIRESTORE_SYNC === 'true') {
  featureFlags.enableFirestoreSync = true;
}

if (process.env.REACT_APP_ENABLE_FIRESTORE_READS === 'true') {
  featureFlags.enableFirestoreReads = true;
}

if (process.env.REACT_APP_ENABLE_REALTIME_LISTENERS === 'true') {
  featureFlags.enableRealtimeListeners = true;
}

if (process.env.REACT_APP_ENABLE_BACKGROUND_MIGRATION === 'true') {
  featureFlags.enableBackgroundMigration = true;
}

if (process.env.NODE_ENV === 'development') {
  featureFlags.isDeveloperMode = true;
}

/**
 * Updates a feature flag and saves the updated flags to localStorage
 * @param {string} flagName - The name of the flag to update
 * @param {boolean} value - The new value for the flag
 * @returns {boolean} - Whether the update was successful
 */
export function updateFeatureFlag(flagName, value) {
  if (flagName in featureFlags) {
    featureFlags[flagName] = value;

    // Save to localStorage
    try {
      localStorage.setItem('appFeatureFlags', JSON.stringify(featureFlags));
      return true;
    } catch (error) {
      logger.error('Error saving feature flags to localStorage:', error, { context: { file: 'featureFlags', purpose: 'localStorage' } });
      return false;
    }
  }
  return false;
}

/**
 * Resets all feature flags to their default values
 */
export function resetFeatureFlags() {
  Object.keys(defaultFlags).forEach(key => {
    featureFlags[key] = defaultFlags[key];
  });

  // Save to localStorage
  try {
    localStorage.setItem('appFeatureFlags', JSON.stringify(featureFlags));
  } catch (error) {
    logger.error('Error saving feature flags to localStorage:', error, { context: { file: 'featureFlags', purpose: 'localStorage' } });
  }
}

/**
 * Gets all feature flags as an object
 * @returns {Object} - All feature flags
 */
export function getAllFeatureFlags() {
  return { ...featureFlags }; // Return a copy to prevent direct mutation
}

export default featureFlags;
