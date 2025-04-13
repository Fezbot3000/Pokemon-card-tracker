export function formatCurrency(value) {
    return `$${Number(value).toFixed(2)}`;
  }
  
export function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    // Format as currency with dollar sign, but without the 'A' prefix
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'symbol'
    }).format(value);
    
    // Replace the 'A$' with just '$'
    return formatted.replace('A$', '$');
  }
  return String(value);
}
  
/**
 * Format number with k/M suffix for large values
 * @param {number} value - The number to format
 * @param {boolean} includeDecimals - Whether to include decimals for formatted values
 * @returns {string} Formatted number with suffix
 */
export const formatCompactNumber = (value, includeDecimals = false) => {
  if (!value && value !== 0) return '';
  
  const num = parseFloat(value);
  
  if (isNaN(num)) return '';
  
  // Format with suffixes
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
 * @returns {string} Formatted string
 */
export const formatCondensed = (value, showDollarSignForSmall = true, decimalPlaces = 2) => {
  if (value === undefined || value === null) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
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