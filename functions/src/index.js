const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { HttpsError } = functions.https;
const psaDatabase = require('./psaDatabase');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });
const { psaLookupHttp } = require('./psaLookupHttp');
const emailFunctions = require('./emailFunctions');
const testEmail = require('./testEmail');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export email functions
exports.sendWelcomeEmail = emailFunctions.sendWelcomeEmail;
exports.sendMarketplaceMessageNotification = emailFunctions.sendMarketplaceMessageNotification;
exports.sendListingSoldNotification = emailFunctions.sendListingSoldNotification;
exports.sendCustomEmail = emailFunctions.sendCustomEmail;

// Export test email function
exports.testEmail = testEmail.testEmail;

// Export PSA database functions
exports.cleanupPSADatabase = psaDatabase.cleanupPSADatabase;
exports.getPSADatabaseStats = psaDatabase.getPSADatabaseStats;

// Export the HTTP PSA lookup function
exports.psaLookupHttp = psaLookupHttp;

// PSA Lookup Function - implements 3-layer cache system
exports.psaLookup = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { certNumber, forceRefresh } = data;
  
  if (!certNumber) {
    throw new HttpsError(
      'invalid-argument',
      'Certification number is required'
    );
  }
  
  try {
    const db = admin.firestore();
    const PSA_COLLECTION = 'psa_cards';
    
    // Layer 2: Check Firebase cache (if not forcing refresh)
    if (!forceRefresh) {
      const docRef = db.collection(PSA_COLLECTION).doc(certNumber);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const cachedData = docSnap.data();
        
        // Check if data is fresh (less than 30 days old)
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (cachedData.timestamp && (Date.now() - cachedData.timestamp) < thirtyDaysInMs) {
    
          
          // Update access tracking
          await docRef.update({
            accessCount: admin.firestore.FieldValue.increment(1),
            lastAccessed: Date.now()
          });
          
          return {
            success: true,
            fromCache: true,
            data: cachedData.cardData
          };
        } else {
          console.log(`PSA cache expired for cert #${certNumber}, fetching fresh data`);
        }
      }
    }
    
    // Layer 3: Fetch from PSA API
    console.log(`Fetching fresh PSA data for cert #${certNumber}`);
    
    // Get PSA API token from Firebase Functions config - no fallback
    const psaToken = functions.config().psa?.api_token;
    
    if (!psaToken) {
      console.error('PSA API token not configured. Please set using firebase functions:config:set psa.api_token="YOUR_TOKEN"');
      return {
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'PSA API is not properly configured. Please contact support.'
      };
    }
    
    // Try multiple PSA API endpoints for reliability
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
            'Authorization': `Bearer ${psaToken}`,
            'User-Agent': 'Pokemon-Card-Tracker/1.0'
          },
          timeout: 10000 // 10 second timeout
        });
        
        if (!response.ok) {
          const errorMsg = `PSA API returned error: ${response.status} ${response.statusText}`;
          console.warn(errorMsg);
          errors.push(`${endpoint}: ${errorMsg}`);
          continue; // Try next endpoint
        }
        
        const responseText = await response.text();
        console.log(`PSA API response from ${endpoint}:`, responseText.substring(0, 200) + '...');
        
        // Try to parse JSON response
        try {
          psaData = JSON.parse(responseText);
          console.log(`Successfully parsed PSA data from ${endpoint}`);
          break; // Success! Exit the loop
        } catch (parseError) {
          console.warn(`Failed to parse JSON from ${endpoint}:`, parseError.message);
          errors.push(`${endpoint}: Invalid JSON response`);
          continue; // Try next endpoint
        }
        
      } catch (fetchError) {
        const errorMsg = `Network error: ${fetchError.message}`;
        console.warn(`Failed to fetch from ${endpoint}:`, errorMsg);
        errors.push(`${endpoint}: ${errorMsg}`);
        continue; // Try next endpoint
      }
    }
    
    // Check if we got valid PSA data
    if (!psaData) {
      console.error('All PSA API endpoints failed:', errors);
      return {
        success: false,
        error: 'API_ERROR',
        message: 'Unable to fetch PSA data from any endpoint. Please try again later.',
        details: errors
      };
    }
    
    // Validate PSA data structure
    if (!psaData || typeof psaData !== 'object') {
      console.error('Invalid PSA data structure:', psaData);
      return {
        success: false,
        error: 'INVALID_DATA',
        message: 'PSA API returned invalid data format.'
      };
    }
    
    // Save successful result to Firebase cache
    try {
      const docRef = db.collection(PSA_COLLECTION).doc(certNumber);
      await docRef.set({
        certificationNumber: certNumber,
        cardData: psaData,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        cacheExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
      });
      
      console.log(`Cached PSA data for cert #${certNumber}`);
    } catch (cacheError) {
      console.warn('Failed to cache PSA data:', cacheError);
      // Don't fail the request if caching fails
    }
    
    return {
      success: true,
      fromCache: false,
      data: psaData
    };
    
  } catch (error) {
    console.error('Error in psaLookup function:', error);
    
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: `Internal server error: ${error.message}`
    };
  }
});

// Cloud Function to store card images in Firebase Storage
exports.storeCardImage = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { userId, cardId, imageBase64, isReplacement = false } = data;
  
  if (!userId || !cardId || !imageBase64) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required parameters: userId, cardId, or imageBase64'
    );
  }
  
  // Verify that the authenticated user matches the requested userId
  if (context.auth.uid !== userId) {
    throw new HttpsError(
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
    throw new HttpsError('internal', error.message);
  }
});

// Add a function to handle PSA lookups with caching
// Using onCall with CORS support
exports.psaLookupWithCache = functions.https.onCall(async (data, context) => {
  // Call the same logic as the callable function
  const result = await exports.psaLookup(data, context);
  return result;
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
      const result = await exports.psaLookup({ certNumber }, { auth: { uid: 'http-api-user' } });
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

// Pokemon TCG Lookup Function - fetches card pricing data
exports.pokemonTcgLookup = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { cardName, setName, cardNumber } = data;
  
  if (!cardName) {
    throw new HttpsError(
      'invalid-argument',
      'Card name is required'
    );
  }
  
  try {
    // Get Pokemon TCG API key from Firebase Functions config - no fallback
    const apiKey = functions.config().pokemon_tcg?.api_key;
    
    if (!apiKey) {
      console.error('Pokemon TCG API key not configured. Please set using firebase functions:config:set pokemon_tcg.api_key="YOUR_KEY"');
      return {
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'Pokemon TCG API is not properly configured. Please contact support.'
      };
    }
    
    // Build search query
    let searchQuery = `name:"${cardName}"`;
    if (setName) {
      searchQuery += ` set.name:"${setName}"`;
    }
    if (cardNumber) {
      searchQuery += ` number:${cardNumber}`;
    }
    
    console.log(`Searching Pokemon TCG API with query: ${searchQuery}`);
    
    // Call Pokemon TCG API
    const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Pokemon-Card-Tracker/1.0'
      }
    });
    
    if (!response.ok) {
      const errorMsg = `Pokemon TCG API returned error: ${response.status} ${response.statusText}`;
      console.error(errorMsg);
      return {
        success: false,
        error: 'API_ERROR',
        message: errorMsg
      };
    }
    
    const responseData = await response.json();
    console.log(`Pokemon TCG API response:`, JSON.stringify(responseData, null, 2));
    
    if (!responseData.data || responseData.data.length === 0) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'No cards found matching the search criteria'
      };
    }
    
    // Return the first matching card with pricing data
    const card = responseData.data[0];
    const pricingData = {
      cardId: card.id,
      name: card.name,
      set: card.set?.name || 'Unknown',
      number: card.number,
      rarity: card.rarity,
      tcgplayer: card.tcgplayer || null,
      cardmarket: card.cardmarket || null,
      images: card.images || null,
      updatedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      data: pricingData
    };
    
  } catch (error) {
    console.error('Error fetching Pokemon TCG data:', error);
    return {
      success: false,
      error: 'API_ERROR',
      message: `Failed to fetch Pokemon TCG data: ${error.message}`
    };
  }
});
