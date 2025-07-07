/**
 * Firebase Storage URL Fix
 *
 * This module applies a direct fix to the Firebase Storage URL issue
 * by monkey-patching the Firebase Storage SDK.
 */

import {
  getStorage,
  ref,
  getDownloadURL as originalGetDownloadURL,
} from 'firebase/storage';
import logger from '../utils/logger';

/**
 * Apply the storage URL fix
 * This should be called as early as possible in the application
 */
export function applyStorageFix() {
  try {
    // Create a patched version of getDownloadURL
    const patchedGetDownloadURL = async function (reference) {
      try {
        // Call the original function
        const url = await originalGetDownloadURL(reference);

        // Fix the URL
        if (url && url.includes('appspot.com')) {
          const fixedUrl = url.replace(
            'mycardtracker-c8479.appspot.com',
            'mycardtracker-c8479.firebasestorage.app'
          );
          logger.debug(
            `Fixed Storage URL: ${url.substring(0, 30)}... -> ${fixedUrl.substring(0, 30)}...`
          );
          return fixedUrl;
        }

        return url;
      } catch (error) {
        logger.error('Error in patched getDownloadURL:', error);
        throw error;
      }
    };

    // Override the original getDownloadURL function
    // Note: This is a bit hacky, but it's the most reliable way to patch the Firebase SDK
    // eslint-disable-next-line no-import-assign
    Object.defineProperty(require('firebase/storage'), 'getDownloadURL', {
      value: patchedGetDownloadURL,
      writable: true,
    });

    logger.info('Applied Firebase Storage URL fix');
    return true;
  } catch (error) {
    logger.error('Failed to apply Firebase Storage URL fix:', error);
    return false;
  }
}

export default applyStorageFix;
