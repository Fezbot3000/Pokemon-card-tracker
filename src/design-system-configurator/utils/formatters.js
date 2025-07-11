// Currency formatter
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2
  }).format(value);
};

// Number formatter
export const formatNumber = (value) => {
  return new Intl.NumberFormat('en-AU').format(value);
};

// Percentage formatter
export const formatPercentage = (value) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

// Compact number formatter (for large numbers)
export const formatCompactNumber = (value) => {
  return new Intl.NumberFormat('en-AU', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
};

// Date formatter
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
};

// Time formatter
export const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-AU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

// Duration formatter (in minutes)
export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

// File size formatter
export const formatFileSize = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Grade formatter for cards
export const formatGrade = (company, grade) => {
  if (!company || !grade) return '';
  return `${company} ${grade}`;
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Truncate text with ellipsis
export const truncate = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  formatDate,
  formatTime,
  formatDuration,
  formatFileSize,
  formatGrade,
  capitalize,
  truncate
}; 