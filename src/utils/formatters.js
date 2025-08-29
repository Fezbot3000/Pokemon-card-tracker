export function formatCurrency(value, currency = 'AUD', locale = 'en-AU') {
  if (value === null || value === undefined) return '';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

export function formatValue(value, currency = 'AUD', locale = 'en-AU') {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(value);
  }
  return String(value);
}

/**
 * Format number with k/M suffix for large values
 * @param {number} value - The number to format
 * @param {boolean} includeDecimals - Whether to include decimals for formatted values
 * @param {boolean} useFullNumbers - Whether to display full numbers without abbreviations
 * @returns {string} Formatted number with suffix
 */
export const formatCompactNumber = (
  value,
  includeDecimals = false,
  useFullNumbers = true
) => {
  if (!value && value !== 0) return '';

  const num = parseFloat(value);

  if (isNaN(num)) return '';

  // If useFullNumbers is true, display the full number with commas
  if (useFullNumbers) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    });
  }

  // Format with suffixes if not using full numbers
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(includeDecimals ? 1 : 0) + 'M';
  }

  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(includeDecimals ? 1 : 0) + 'k';
  }

  // Regular formatting for smaller numbers
  return num.toFixed(includeDecimals ? 2 : 0);
};

/**
 * Format a number to a condensed representation (e.g., 1.2k, 5.3M)
 *
 * @param {number} value - The number to format
 * @param {boolean} showDollarSignForSmall - Whether to show dollar sign for values under 1000
 * @param {number} decimalPlaces - Number of decimal places
 * @param {boolean} useFullNumbers - Whether to display full numbers without abbreviations
 * @returns {string} Formatted string
 */
export const formatCondensed = (
  value,
  showDollarSignForSmall = true,
  decimalPlaces = 2,
  useFullNumbers = true
) => {
  if (value === undefined || value === null) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // If useFullNumbers is true, display the full number with commas
  if (useFullNumbers) {
    const formattedValue = absValue.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    return showDollarSignForSmall && absValue < 1000
      ? sign + '$' + formattedValue
      : sign + formattedValue;
  }

  // Otherwise use the condensed format with suffixes
  if (absValue >= 1000000000) {
    // Billions
    return sign + (absValue / 1000000000).toFixed(decimalPlaces) + 'B';
  } else if (absValue >= 1000000) {
    // Millions
    return sign + (absValue / 1000000).toFixed(decimalPlaces) + 'M';
  } else if (absValue >= 1000) {
    // Thousands
    return sign + (absValue / 1000).toFixed(decimalPlaces) + 'k';
  } else {
    // Regular value
    return showDollarSignForSmall
      ? sign + '$' + absValue.toFixed(decimalPlaces)
      : sign + absValue.toFixed(decimalPlaces);
  }
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
    return (
      formatCurrency(value / 1000000000, currency, locale).replace(/\.00$/, '') +
      'B'
    );
  }

  if (absValue >= 1000000) {
    return (
      formatCurrency(value / 1000000, currency, locale).replace(/\.00$/, '') +
      'M'
    );
  }

  if (absValue >= 1000) {
    return (
      formatCurrency(value / 1000, currency, locale).replace(/\.00$/, '') + 'K'
    );
  }

  return formatCurrency(value, currency, locale);
};
