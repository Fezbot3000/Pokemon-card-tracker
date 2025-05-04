/**
 * Ad Block Detector
 * 
 * This utility has been disabled as per user request.
 */

import logger from './logger';

/**
 * Detects if an ad blocker or privacy extension is likely active
 * @returns {Promise<boolean>} Always returns false (detection disabled)
 */
export const detectAdBlocker = async () => {
  return false; // Detection disabled
};

/**
 * Apply workarounds for ad blockers
 * @param {boolean} adBlockerDetected Whether an ad blocker was detected
 */
export const applyAdBlockWorkarounds = (adBlockerDetected) => {
  // Functionality disabled
  logger.debug('Ad blocker detection has been disabled');
};

export default {
  detectAdBlocker,
  applyAdBlockWorkarounds
};
