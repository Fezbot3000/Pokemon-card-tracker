const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });

// HTTP version of the PSA lookup function with explicit CORS handling
exports.psaLookupHttp = functions.https.onRequest((req, res) => {
  // Enable CORS using the cors middleware
  return cors(req, res, async () => {
    try {
      // Allow both GET and POST requests
      const certNumber = req.method === 'POST' ? req.body.certNumber : req.query.certNumber;
      const forceRefresh = req.method === 'POST' ? req.body.forceRefresh : req.query.forceRefresh === 'true';
      
      if (!certNumber) {
        res.status(400).json({
          success: false,
          error: 'Certification number is required'
        });
        return;
      }

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
          
          res.status(200).json({
            success: true,
            fromCache: true,
            data: data.cardData
          });
          return;
        }
      }
      
      // If we don't have the card or it's too old, fetch from PSA API
      console.log(`Fetching fresh PSA data for cert #${certNumber}`);
      
      // Get PSA API token from environment variable
      const psaToken = functions.config().psa?.api_token || '';
      
      if (!psaToken) {
        console.error('PSA API token not configured. Please set using firebase functions:config:set psa.api_token="YOUR_TOKEN"');
        res.status(500).json({
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'PSA API is not properly configured. Please contact support.'
        });
        return;
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
            
            res.status(200).json({
              success: true,
              fromCache: false,
              data: psaData
            });
            return;
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
      
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    } catch (error) {
      console.error('Error in PSA lookup HTTP function:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});
