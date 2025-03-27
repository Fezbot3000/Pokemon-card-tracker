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
  