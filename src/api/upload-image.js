/**
 * Server-side image upload handler
 * This endpoint handles image uploads to Firebase Storage without CORS issues
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getFirebaseConfig } from '../config/secrets';
import logger from '../utils/logger';

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

    // Extract the base64 data from the data URL
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    // Create a reference to the storage location
    const storageRef = ref(storage, path);

    // Set metadata
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        cardId,
        timestamp: timestamp || new Date().toISOString()
      }
    };

    // Upload the string
    const snapshot = await uploadString(storageRef, base64Data, 'base64', metadata);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Return success response
    return res.status(200).json({
      success: true,
      downloadURL,
      path
    });
  } catch (error) {
    logger.error('Error in upload-image API:', error);
    return res.status(500).json({
      error: 'Failed to upload image',
      message: error.message
    });
  }
}
