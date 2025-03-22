// Simple currency conversion utility
// In a production app, you would use a real API like https://exchangeratesapi.io/

/**
 * Get the current USD to AUD exchange rate
 * @returns {Promise<number>} The exchange rate
 */
export const getUsdToAudRate = async () => {
  try {
    // In a real application, you would fetch from an API like:
    // const response = await fetch('https://api.exchangeratesapi.io/latest?base=USD&symbols=AUD');
    // const data = await response.json();
    // return data.rates.AUD;
    
    // For this demo, we'll return a hardcoded rate
    // This simulates an API response
    return 1.5; // Example rate: 1 USD = 1.5 AUD
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return 1.5; // Fallback to default rate if API fails
  }
};

/**
 * Convert USD to AUD
 * @param {number} usdAmount - Amount in USD
 * @param {number} exchangeRate - Current exchange rate
 * @returns {number} Amount in AUD
 */
export const convertUsdToAud = (usdAmount, exchangeRate) => {
  return usdAmount * exchangeRate;
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, AUD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'AUD') => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};