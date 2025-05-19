const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cors = require('cors')({origin: true});

// Exchange Rate API configuration
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';

/**
 * Firebase Cloud Function to proxy exchange rate API requests
 * This keeps the API key secure on the server side
 */
exports.getExchangeRates = functions.https.onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      // Get the API key from Firebase config
      const apiKey = functions.config().exchangerate?.api_key;
      
      if (!apiKey) {
        console.error('Exchange Rate API key is not configured');
        return response.status(500).json({
          error: true,
          message: 'Exchange Rate API key is not configured'
        });
      }

      // Make request to the Exchange Rate API
      const apiUrl = `${EXCHANGERATE_API_URL}/${apiKey}/latest/USD`;
      console.log(`Fetching exchange rates from: ${EXCHANGERATE_API_URL}/${apiKey.substring(0, 3)}...`);
      
      const exchangeRateResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!exchangeRateResponse.ok) {
        console.error(`Exchange Rate API returned status: ${exchangeRateResponse.status}`);
        return response.status(exchangeRateResponse.status).json({
          error: true,
          message: `Exchange Rate API error: ${exchangeRateResponse.statusText}`
        });
      }

      const data = await exchangeRateResponse.json();
      
      // Return the response from the Exchange Rate API
      return response.status(200).json(data);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return response.status(500).json({
        error: true,
        message: `Internal server error: ${error.message}`
      });
    }
  });
});
