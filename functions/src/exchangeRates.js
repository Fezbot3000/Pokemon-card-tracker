const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cors = require('cors')({origin: true});

// Exchange Rate API configuration
const EXCHANGERATE_API_URL = 'https://v6.exchangerate-api.com/v6';

/**
 * Firebase Cloud Function to proxy exchange rate API requests
 * This keeps the API key secure on the server side
 */
exports.getExchangeRates = functions.runWith({
  secrets: ['EXCHANGERATE_API_KEY']
}).https.onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      const apiKey = process.env.EXCHANGERATE_API_KEY;
      
      if (!apiKey) {
        console.error('Exchange Rate API key not found in environment');
        return response.status(500).json({
          error: true,
          message: 'Exchange Rate API key not configured'
        });
      }

      // Make request to the Exchange Rate API
      const apiUrl = `${EXCHANGERATE_API_URL}/${apiKey}/latest/USD`;
      console.log('Fetching exchange rates from Exchange Rate API...');
      
      const exchangeRateResponse = await fetch(apiUrl);
      const data = await exchangeRateResponse.json();

      if (data.result === 'error') {
        console.error('Exchange Rate API error:', data['error-type']);
        return response.status(400).json({
          error: true,
          message: `Exchange Rate API error: ${data['error-type']}`
        });
      }

      return response.status(200).json(data);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      return response.status(500).json({
        error: true,
        message: 'Failed to fetch exchange rates'
      });
    }
  });
});
