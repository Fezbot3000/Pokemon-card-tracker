// Simple currency conversion utility
// In a production app, you would use a real API like https://exchangeratesapi.io/

import { formatCompactNumber } from './formatters';

/**
 * Get the current USD to AUD exchange rate
 * @returns {Promise<number>} The exchange rate
 */
export const getUsdToAudRate = async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    
    if (!data || !data.rates || !data.rates.AUD) {
      console.error('Invalid response from exchange rate API:', data);
      throw new Error('Failed to get exchange rate');
    }
    
    return data.rates.AUD;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Fallback to a recent average rate if API fails
    return 1.52;
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
 * Format a currency value
 * @param {number} value - The value to format
 * @param {boolean} [showAUD=false] - Whether to show AUD symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, showAUD = false) => {
  if (value === null || value === undefined) return 'N/A';
  
  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  const formatted = formatter.format(value);
  return showAUD ? formatted : formatted.replace('A$', '$');
};