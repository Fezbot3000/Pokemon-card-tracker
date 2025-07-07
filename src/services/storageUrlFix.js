/**
 * Firebase Storage URL Fix
 *
 * This module provides a fix for the Firebase Storage URL issue
 * where the SDK is still using the old .appspot.com domain
 * instead of the new .firebasestorage.app domain.
 */

import logger from '../utils/logger';

/**
 * Fix Firebase Storage URLs to use the correct domain
 * @param {string} url - The original Firebase Storage URL
 * @returns {string} - The fixed URL with the correct domain
 */
export function fixStorageUrl(url) {
  if (!url) return url;

  try {
    // Check if this is a Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) {
      // Extract the bucket name from the URL
      const bucketRegex = /\/b\/([^/]+)\/o\//;
      const match = url.match(bucketRegex);

      if (match && match[1]) {
        const bucketName = match[1];

        // If the bucket uses the old .appspot.com domain, replace it
        if (bucketName.includes('.appspot.com')) {
          const projectId = bucketName.split('.')[0];
          const newBucketName = `${projectId}.firebasestorage.app`;

          // Replace the bucket name in the URL
          const fixedUrl = url.replace(bucketName, newBucketName);

          logger.debug(
            `Fixed Storage URL: ${url.substring(0, 50)}... -> ${fixedUrl.substring(0, 50)}...`
          );
          return fixedUrl;
        }
      }
    }

    // If not a Firebase Storage URL or already using the correct domain, return as is
    return url;
  } catch (error) {
    logger.error('Error fixing Storage URL:', error);
    return url; // Return the original URL in case of error
  }
}

export default fixStorageUrl;
