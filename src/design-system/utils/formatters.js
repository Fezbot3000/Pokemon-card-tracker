/**
 * Formatter utilities for the design system
 *
 * These utilities help format values consistently across the component library
 */
 import { formatCurrency as baseFormatCurrency, formatCurrencyK as baseFormatCurrencyK, formatNumber as baseFormatNumber } from '../../utils/formatters';
 import { formatDate as baseFormatDate } from '../../utils/dateUtils';
/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} currency - The currency code (default: 'AUD')
 * @param {string} locale - The locale to use for formatting (default: 'en-AU')
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (value, currency = 'AUD', locale = 'en-AU') => {
  return baseFormatCurrency(value, currency, locale);
};

/**
 * Format a number as currency with K/M/B suffixes for thousands/millions/billions
 * @param {number} value - The value to format
 * @param {string} currency - The currency code (default: 'AUD')
 * @param {string} locale - The locale to use for formatting (default: 'en-AU')
 * @returns {string} The formatted currency string with appropriate suffix
 */
export const formatCurrencyK = (value, currency = 'AUD', locale = 'en-AU') => {
  return baseFormatCurrencyK(value, currency, locale);
};

/**
 * Format a date
 * @param {Date|string} date - The date to format
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @param {Object} options - The options to use for formatting
 * @returns {string} The formatted date string
 */
export const formatDate = (date, locale = 'en-US', options = {}) => {
  return baseFormatDate(date, locale, options);
};

/**
 * Format a number with commas
 * @param {number} value - The value to format
 * @param {number} decimals - The number of decimal places (default: 0)
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted number string
 */
export const formatNumber = (value, decimals = 0, locale = 'en-US') => {
  return baseFormatNumber(value, decimals, locale);
};
