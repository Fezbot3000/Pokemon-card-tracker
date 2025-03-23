export function formatCurrency(value) {
    return `$${Number(value).toFixed(2)}`;
  }
  
export function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}
  