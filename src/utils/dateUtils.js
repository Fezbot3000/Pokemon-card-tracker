/**
 * Date utility functions for the Pokemon Card Tracker application
 */

/**
 * Format a date string to YYYY-MM-DD format
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date string or empty string if invalid
 */
export const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

/**
 * Get the current date in YYYY-MM-DD format
 * @returns {string} - Current date in YYYY-MM-DD format
 */
export const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Format a date for display in the UI (e.g., "Jan 15, 2023")
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date string for display
 */
export const formatDateForDisplay = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
