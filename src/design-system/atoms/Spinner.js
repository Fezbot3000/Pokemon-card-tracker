import React from 'react';
import PropTypes from 'prop-types';

/**
 * Spinner
 *
 * Simple loading spinner with size and color variants, consistent with DS.
 */
const sizeMap = {
  small: 'h-4 w-4 border-2',
  medium: 'h-6 w-6 border-4',
  large: 'h-12 w-12 border-4',
};

const colorMap = {
  primary: 'border-t-blue-600',
  neutral: 'border-t-gray-600',
  success: 'border-t-green-600',
  danger: 'border-t-red-600',
  warning: 'border-t-yellow-600',
};

const Spinner = ({ size = 'medium', variant = 'primary', className = '' }) => {
  const sizeClasses = sizeMap[size] || sizeMap.medium;
  const colorClasses = colorMap[variant] || colorMap.primary;
  return (
    <div
      className={`inline-block animate-spin rounded-full border-gray-300 border-t-4 ${colorClasses} ${sizeClasses} dark:border-gray-700 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    />
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['primary', 'neutral', 'success', 'danger', 'warning']),
  className: PropTypes.string,
};

export default Spinner;
