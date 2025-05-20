const functions = require('firebase-functions');
const admin = require('firebase-admin');
const psaDatabase = require('./psaDatabase');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });
const { psaLookupHttp } = require('./psaLookupHttp');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export PSA database functions
exports.cleanupPSADatabase = psaDatabase.cleanupPSADatabase;
exports.getPSADatabaseStats = psaDatabase.getPSADatabaseStats;

// Export the HTTP PSA lookup function
exports.psaLookupHttp = psaLookupHttp;

// Add the psaLookup function that the frontend is expecting
exports.psaLookup = functions.https.onCall(async (data, context) => {
  // This is the function that the frontend is calling
  // Simply forward to the psaLookupWithCache function
  return exports.psaLookupWithCache(data, context);
});

// Add HTTP version of PSA lookup for direct API access
exports.psaLookupHttp = functions.https.onRequest((request, response) => {
  // Set CORS headers for preflight requests
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  // Process the request using CORS middleware
  return cors(request, response, async () => {
    try {
      // Extract cert number from request
      const certNumber = request.query.certNumber || (request.body && request.body.certNumber);
      
      if (!certNumber) {
        return response.status(400).json({
          success: false,
          error: 'MISSING_CERT_NUMBER',
          message: 'Certification number is required'
        });
      }
      
      // Call the same logic as the callable function
      const result = await exports.psaLookupWithCache({ certNumber }, { auth: { uid: 'http-api-user' } });
      return response.json(result);
    } catch (error) {
      console.error('Error in HTTP PSA lookup:', error);
      return response.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: error.message
      });
    }
  });
});

// Cloud Function to store card images in Firebase Storage
exports.storeCardImage = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { userId, cardId, imageBase64, isReplacement = false } = data;
  
  if (!userId || !cardId || !imageBase64) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameters: userId, cardId, or imageBase64'
    );
  }
  
  // Verify that the authenticated user matches the requested userId
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only upload images for your own user ID'
    );
  }
  
  try {
    // Get a reference to the Firebase Storage bucket
    const bucket = admin.storage().bucket();
    
    // Define the path where the image will be stored
    const imagePath = `images/${userId}/${cardId}.jpeg`;
    
    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Create a file in the bucket
    const file = bucket.file(imagePath);
    
    // Check if the file exists and if we should replace it
    if (!isReplacement) {
      try {
        const [exists] = await file.exists();
        if (exists) {
          console.log(`File ${imagePath} already exists and isReplacement is false`);
          
          // Get the download URL for the existing file
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Far future expiration
          });
          
          return {
            success: true,
            downloadUrl: url,
            message: 'File already exists, returning existing URL'
          };
        }
      } catch (existsError) {
        console.error('Error checking if file exists:', existsError);
        // Continue with upload if we can't check existence
      }
    }
    
    // Upload the file
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          userId: userId,
          cardId: cardId,
          uploadTimestamp: Date.now().toString(),
          isReplacement: isReplacement.toString()
        }
      }
    });
    
    console.log(`Successfully uploaded image to ${imagePath}`);
    
    // Get a download URL for the file
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future expiration
    });
    
    return {
      success: true,
      downloadUrl: url,
      path: imagePath
    };
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Add a function to handle PSA lookups with caching
// Using onCall with CORS support
exports.psaLookupWithCache = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { certNumber, forceRefresh } = data;
  
  if (!certNumber) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Certification number is required'
    );
  }
  
  try {
    const db = admin.firestore();
    const PSA_COLLECTION = 'psa_cards';
    
    // Check if we have this card in our database already
    const docRef = db.collection(PSA_COLLECTION).doc(certNumber);
    const docSnap = await docRef.get();
    
    // If we have the card and it's not too old, return it
    if (!forceRefresh && docSnap.exists) {
      const data = docSnap.data();
      
      // Check if data is fresh (less than 30 days old)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (data.timestamp && (Date.now() - data.timestamp) < thirtyDaysInMs) {
        console.log(`Serving PSA data from database for cert #${certNumber}`);
        
        // Update access count
        await docRef.update({
          accessCount: admin.firestore.FieldValue.increment(1),
          lastAccessed: Date.now()
        });
        
        return {
          success: true,
          fromCache: true,
          data: data.cardData
        };
      }
    }
    
    // If we don't have the card or it's too old, fetch from PSA API
    console.log(`Fetching fresh PSA data for cert #${certNumber}`);
    
    // Get PSA API token from environment variable
    const psaToken = functions.config().psa?.api_token || '';
    
    if (!psaToken) {
      console.error('PSA API token not configured. Please set using firebase functions:config:set psa.api_token="YOUR_TOKEN"');
      return {
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'PSA API is not properly configured. Please contact support.'
      };
    }
    
    // Try multiple PSA API endpoints in case some are down or rate-limited
    const endpoints = [
      `https://www.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      `https://api.psacard.com/publicapi/cert/${certNumber}`,
      `https://www.psacard.com/cert/${certNumber}/json`
    ];
    
    let psaData = null;
    let errors = [];
    
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying PSA endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${psaToken}`
          }
        });
        
        // Always proceed with the response, even if it's not OK (ignore rate limiting)
        if (!response.ok) {
          const errorMsg = `PSA API returned error: ${response.status} ${response.statusText}`;
          console.warn(errorMsg);
          errors.push(`${endpoint}: ${errorMsg}`);
          
          // If this is a rate limit error (429), try to proceed anyway
          if (response.status === 429) {
            console.log('Ignoring rate limit (429) and attempting to proceed anyway');
          } else {
            continue; // Only skip for non-rate-limit errors
          }
        }
        
        const responseText = await response.text();
        
        try {
          psaData = JSON.parse(responseText);
          console.log('Successfully fetched PSA data');
          
          // Store in Firestore cache
          await docRef.set({
            cardData: psaData,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now()
          });
          
          return {
            success: true,
            fromCache: false,
            data: psaData
          };
        } catch (parseError) {
          console.error('Failed to parse PSA API response as JSON:', parseError);
          errors.push(`${endpoint}: Failed to parse response as JSON`);
          continue; // Try next endpoint
        }
      } catch (fetchError) {
        console.error(`Error fetching from ${endpoint}:`, fetchError);
        errors.push(`${endpoint}: ${fetchError.message}`);
        continue; // Try next endpoint
      }
    }
    
    // If we get here, all endpoints failed
    const errorMessage = `All PSA API endpoints failed: ${errors.join('; ')}`;
    console.error(errorMessage);
    
    // Return error instead of mock data
    return {
      success: false,
      error: 'API_ERROR',
      message: errorMessage
    };
  } catch (error) {
    console.error('Error in PSA lookup with cache:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
