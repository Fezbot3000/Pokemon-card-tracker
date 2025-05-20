const functions = require('firebase-functions');
const cors = require('cors')({origin: true});

/**
 * Firebase Cloud Function to provide exchange rates
 * This is a static implementation that returns fixed exchange rates
 * instead of calling an external API
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
      console.log('Returning static exchange rates');
      
      // Static exchange rates data (last updated May 2025)
      // These are fixed values to avoid external API dependency
      const mockExchangeRateData = {
        "result": "success",
        "documentation": "https://www.exchangerate-api.com/docs",
        "terms_of_use": "https://www.exchangerate-api.com/terms",
        "time_last_update_unix": 1715961600,
        "time_last_update_utc": "Sun, 19 May 2025 00:00:00 +0000",
        "time_next_update_unix": 1716048000,
        "time_next_update_utc": "Mon, 20 May 2025 00:00:00 +0000",
        "base_code": "USD",
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

      return response.status(200).json(mockExchangeRateData);
    } catch (error) {
      console.error('Error providing exchange rates:', error);
      return response.status(500).json({
        error: true,
        message: 'Failed to provide exchange rates'
      });
    }
  });
});
