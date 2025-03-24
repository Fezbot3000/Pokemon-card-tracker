export function formatCurrency(value) {
    return `$${Number(value).toFixed(2)}`;
  }
  
export function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    // Format as currency with dollar sign
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  return String(value);
}
  