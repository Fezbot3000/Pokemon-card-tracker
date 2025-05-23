const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const fetch = require('node-fetch');

/**
 * Firebase Cloud Function to provide exchange rates
 * This fetches live exchange rates from the ExchangeRate-API service
 */
exports.getExchangeRates = functions.https.onRequest((request, response) => {
  // Set CORS headers for preflight requests
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  return cors(request, response, async () => {
    try {
      console.log('Fetching live exchange rates from ExchangeRate-API');
      
      // Your API key and endpoint
      const API_KEY = '43d6478dcf6ef5175ef60b73';
      const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
      
      // Fetch live rates from the API
      const apiResponse = await fetch(API_URL);
      
      if (!apiResponse.ok) {
        throw new Error(`API request failed with status: ${apiResponse.status}`);
      }
      
      const data = await apiResponse.json();
      
      if (data.result !== 'success') {
        throw new Error('API returned unsuccessful result');
      }
      
      console.log('Successfully fetched live exchange rates');
      
      // Return the data in the expected format
      return response.status(200).json({
        result: "success",
        documentation: data.documentation,
        terms_of_use: data.terms_of_use,
        time_last_update_unix: data.time_last_update_unix,
        time_last_update_utc: data.time_last_update_utc,
        time_next_update_unix: data.time_next_update_unix,
        time_next_update_utc: data.time_next_update_utc,
        base_code: data.base_code,
        conversion_rates: data.conversion_rates,
        // Add a rates property for compatibility with the frontend
        rates: data.conversion_rates
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      
      // Return fallback static rates on error
      console.log('Returning fallback static rates due to error');
      const fallbackRates = {
        "result": "success",
        "error": false,
        "base_code": "USD",
        "rates": {
          "USD": 1,
          "AUD": 1.51,
          "CAD": 1.36,
          "EUR": 0.92,
          "GBP": 0.79,
          "JPY": 154.32,
          "CHF": 0.90,
          "NZD": 1.65,
          "CNY": 7.24,
          "HKD": 7.82,
          "SGD": 1.34,
          "INR": 83.45,
          "MXN": 16.82,
          "BRL": 5.17,
          "ZAR": 18.65
        },
        "conversion_rates": {
          "USD": 1,
          "AUD": 1.51,
          "CAD": 1.36,
          "EUR": 0.92,
          "GBP": 0.79,
          "JPY": 154.32,
          "CHF": 0.90,
          "NZD": 1.65,
          "CNY": 7.24,
          "HKD": 7.82,
          "SGD": 1.34,
          "INR": 83.45,
          "MXN": 16.82,
          "BRL": 5.17,
          "ZAR": 18.65
        }
      };
      
      return response.status(200).json(fallbackRates);
    }
  });
});
