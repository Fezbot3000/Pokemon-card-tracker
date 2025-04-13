// Simple currency conversion utility
// In a production app, you would use a real API like https://exchangeratesapi.io/

import { formatCompactNumber } from './formatters';

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
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {boolean} useCompact - Whether to use compact format for large numbers
 * @param {string} prefix - Optional prefix for negative numbers
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, useCompact = false, prefix = '') => {
  if (amount === null || amount === undefined) return '$0.00';
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '$0.00';
  
  // Use compact formatting for large numbers if requested
  if (useCompact && Math.abs(numAmount) >= 1000) {
    const compactValue = formatCompactNumber(Math.abs(numAmount), true);
    return numAmount < 0 ? `-$${compactValue}` : `$${compactValue}`;
  }
  
  // Standard formatting
  const formattedNumber = Math.abs(numAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return numAmount < 0 ? `-$${formattedNumber}` : `$${formattedNumber}`;
};