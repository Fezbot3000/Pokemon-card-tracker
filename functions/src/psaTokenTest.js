const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });

// Function to test PSA API token validity
exports.testPsaToken = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Use a known valid cert number for testing
    const certNumber = req.query.certNumber || '10249374'; // Default test cert
    
    // Get PSA API token from environment variable
    const psaToken = functions.config().psa?.api_token || '';
    
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
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const startTime = Date.now();
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${psaToken}`
          }
        });
        const endTime = Date.now();
        
        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { parseError: e.message, text: responseText.substring(0, 500) };
        }
        
        results.push({
          endpoint,
          status: response.status,
          statusText: response.statusText,
          responseTime: endTime - startTime,
          headers: Object.fromEntries([...response.headers.entries()]),
          data: responseData,
          success: response.ok
        });
      } catch (error) {
        results.push({
          endpoint,
          error: error.message,
          success: false
        });
      }
    }
    
    // Check token expiration by looking for specific error messages
    const isTokenExpired = results.some(r => 
      (r.status === 401 || r.status === 403) && 
      (r.data?.message?.includes('expired') || 
       r.data?.error?.includes('expired') ||
       r.data?.text?.includes('expired'))
    );
    
    // Return comprehensive results
    res.status(200).json({
      timestamp: new Date().toISOString(),
      tokenStatus: {
        isLikelyValid: results.some(r => r.success),
        isLikelyExpired: isTokenExpired,
        recommendation: isTokenExpired ? 'Token needs to be renewed' : 
                       (results.some(r => r.success) ? 'Token appears valid' : 'Token may be invalid or PSA API is down')
      },
      certNumber,
      tokenFirstChars: psaToken.substring(0, 20) + '...',
      endpointResults: results,
      summary: {
        totalEndpoints: endpoints.length,
        successfulEndpoints: results.filter(r => r.success).length,
        failedEndpoints: results.filter(r => !r.success).length
      }
    });
  });
});
