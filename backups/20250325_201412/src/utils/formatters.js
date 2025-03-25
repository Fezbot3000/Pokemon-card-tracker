/**
 * Format a number as currency with commas and two decimal places
 * @param {number} value - The number to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value).replace('A$', '$');
}

/**
 * Format a number with commas
 * @param {number} value - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a value based on its type
 * @param {*} value - The value to format
 * @returns {string} Formatted value
 */
export function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    return formatCurrency(value);
  }
  return String(value);
}
  