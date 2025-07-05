/**
 * Formatter utilities for the design system
 * 
 * These utilities help format values consistently across the component library
 */

/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} currency - The currency code (default: 'AUD')
 * @param {string} locale - The locale to use for formatting (default: 'en-AU')
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (value, currency = 'AUD', locale = 'en-AU') => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a number as currency with K/M/B suffixes for thousands/millions/billions
 * @param {number} value - The value to format
 * @param {string} currency - The currency code (default: 'AUD')
 * @param {string} locale - The locale to use for formatting (default: 'en-AU')
 * @returns {string} The formatted currency string with appropriate suffix
 */
export const formatCurrencyK = (value, currency = 'AUD', locale = 'en-AU') => {
  if (value === null || value === undefined) return '';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    return formatCurrency(value / 1000000000, currency, locale).replace(/\.00$/, '') + 'B';
  }
  
  if (absValue >= 1000000) {
    return formatCurrency(value / 1000000, currency, locale).replace(/\.00$/, '') + 'M';
  }
  
  if (absValue >= 1000) {
    return formatCurrency(value / 1000, currency, locale).replace(/\.00$/, '') + 'K';
  }
  
  return formatCurrency(value, currency, locale);
};

/**
 * Format a date
 * @param {Date|string} date - The date to format
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @param {Object} options - The options to use for formatting
 * @returns {string} The formatted date string
 */
export const formatDate = (date, locale = 'en-US', options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format a number with commas
 * @param {number} value - The value to format
 * @param {number} decimals - The number of decimal places (default: 0)
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted number string
 */
export const formatNumber = (value, decimals = 0, locale = 'en-US') => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
