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
  