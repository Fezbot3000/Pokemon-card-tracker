/**
 * Server-side image upload handler
 * This endpoint handles image uploads to Firebase Storage without CORS issues
 */

import { initializeApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import { getFirebaseConfig } from '../config/secrets';
import logger from '../utils/logger';

/**
 * Validates upload path for security
 * @param {string} path - The upload path to validate
 * @param {string} userId - The user ID from request body
 * @param {string} cardId - The card ID from request body
 * @returns {boolean} - True if path is valid and secure
 */
function validateUploadPath(path, userId, cardId) {
  // Define allowed path patterns for different upload types
  const allowedPatterns = [
    // Card images: users/{userId}/cards/{cardId}.{ext}
    /^users\/[a-zA-Z0-9_-]+\/cards\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i,
    // Card images (legacy): images/{userId}/{cardId}.{ext}  
    /^images\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i,
    // User backups: backups/{userId}/{filename}.{ext}
    /^backups\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(json|zip|csv)$/i
  ];

  // Check if path matches any allowed pattern
  const isValidPattern = allowedPatterns.some(pattern => pattern.test(path));
  if (!isValidPattern) {
    logger.warn('Invalid upload path pattern:', { path, userId, cardId });
    return false;
  }

  // Extract userId from path and verify it matches the authenticated user's intended userId
  const pathParts = path.split('/');
  const pathUserId = pathParts[1]; // Second part is always userId in our patterns
  
  if (pathUserId !== userId) {
    logger.warn('Path userId mismatch:', { 
      pathUserId, 
      requestUserId: userId, 
      path 
    });
    return false;
  }

  // For card images, validate cardId matches
  if (path.includes('/cards/')) {
    const pathCardId = pathParts[3]?.split('.')[0]; // Remove file extension
    if (pathCardId !== cardId) {
      logger.warn('Path cardId mismatch:', { 
        pathCardId, 
        requestCardId: cardId, 
        path 
      });
      return false;
    }
  }

  // Additional security: prevent directory traversal attempts
  if (path.includes('..') || path.includes('./') || path.includes('//')) {
    logger.warn('Directory traversal attempt detected:', { path, userId });
    return false;
  }

  // Validate file extension is allowed
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.json', '.zip', '.csv'];
  const fileExtension = path.substring(path.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    logger.warn('Unauthorized file extension:', { path, extension: fileExtension });
    return false;
  }

  return true;
}

// Initialize Firebase with the app's configuration
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

/**
 * Handle image upload requests
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData, path, userId, cardId, timestamp } = req.body;

    if (!imageData || !path || !userId || !cardId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // SECURITY: Validate and sanitize the upload path
    if (!validateUploadPath(path, userId, cardId)) {
      return res.status(400).json({ 
        error: 'Invalid file path format or unauthorized access attempt' 
      });
    }

    // Extract the base64 data from the data URL
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Create a reference to the storage location (now validated)
    const storageRef = ref(storage, path);

    // Set metadata
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        cardId,
        timestamp: timestamp || new Date().toISOString(),
      },
    };

    // Upload the string
    const snapshot = await uploadString(
      storageRef,
      base64Data,
      'base64',
      metadata
    );

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Return success response
    return res.status(200).json({
      success: true,
      downloadURL,
      path,
    });
  } catch (error) {
    logger.error('Error in upload-image API:', error);
    return res.status(500).json({
      error: 'Failed to upload image',
      message: error.message,
    });
  }
}
