const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });

// Function to test PSA API token validity
exports.testPsaToken = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Use a known valid cert number for testing
    const certNumber = req.query.certNumber || '10249374'; // Default test cert
    
    // Get PSA API token from environment variables with optional Firebase config fallback
    let psaToken = process.env.PSA_API_TOKEN;
    
    // Try to get token from Firebase functions config as fallback (if available)
    try {
      const config = functions?.config?.();
      if (config?.psa?.api_token) {
        psaToken = config.psa.api_token;
      }
    } catch (e) {
      console.warn('Skipping functions.config() fallback, using process.env instead:', e.message);
    }
    
    if (!psaToken) {
      return res.status(500).json({
        error: 'PSA_TOKEN_NOT_CONFIGURED',
        message: 'PSA API token not configured. Please set using firebase functions:config:set psa.api_token="YOUR_TOKEN"',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test endpoints
    const endpoints = [
      `https://www.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      `https://api.psacard.com/publicapi/cert/${certNumber}`,
      `https://www.psacard.com/cert/${certNumber}/json`
    ];
    
    // Results for each endpoint
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${psaToken}`
          }
        });
        
        results.push({
          endpoint,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        results.push({
          endpoint,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Return test results
    res.status(200).json({
      message: 'PSA API token test completed',
      certNumber,
      results,
      timestamp: new Date().toISOString()
    });
  });
});
