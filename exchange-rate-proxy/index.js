const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const axios = require("axios");

// Ensure you have set the API key in your Firebase environment configuration:
// firebase functions:config:set exchangerate.apikey="YOUR_ACTUAL_API_KEY_HERE"

// Helper to set CORS headers
const setCorsHeaders = (response) => {
  // Replace '*' with your app's specific domain in production for better security
  // e.g., 'https://mycardtracker-c8479.web.app'
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

exports.getExchangeRates = functions.https.onRequest(
  async (request, response) => {
    // Handle preflight OPTIONS requests for CORS
    if (request.method === "OPTIONS") {
      setCorsHeaders(response);
      response.status(204).send("");
      return;
    }

    setCorsHeaders(response);

    const apiKey = functions.config().exchangerate?.apikey;

    if (!apiKey) {
      logger.error(
        "ExchangeRate API key not found in Firebase Functions configuration.",
      );
      response.status(500).json({
        error: true,
        message: "API key configuration error. Please contact support.",
      });
      return;
    }

    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

    try {
      logger.info("Fetching exchange rates from ExchangeRate-API...");
      const apiResponse = await axios.get(apiUrl);

      if (apiResponse.data && apiResponse.data.result === "success") {
        logger.info(
          "Successfully fetched exchange rates.",
          apiResponse.data.conversion_rates,
        );
        response.status(200).json({
          error: false,
          rates: apiResponse.data.conversion_rates,
          last_updated_unix: apiResponse.data.time_last_update_unix,
          next_updated_unix: apiResponse.data.time_next_update_unix,
        });
      } else {
        logger.error(
          "Failed to fetch valid exchange rates from ExchangeRate-API.",
          apiResponse.data,
        );
        response.status(500).json({
          error: true,
          message: "Failed to retrieve valid exchange rates from provider.",
          provider_response: apiResponse.data,
        });
      }
    } catch (error) {
      logger.error(
        "Error calling ExchangeRate-API:",
        error.message,
        {
          statusCode: error.response?.status,
          data: error.response?.data,
        },
      );
      response.status(500).json({
        error: true,
        message: "An error occurred while fetching exchange rates.",
        details: error.message,
      });
    }
  },
);
