import React from 'react';
import PropTypes from 'prop-types';

/**
 * GradientSwatch Component
 * 
 * Displays a gradient color sample with its name and optional description.
 */
const GradientSwatch = ({ 
  gradientValue, 
  name, 
  description 
}) => {
  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div 
        className="h-24 flex items-center justify-center text-white"
        style={{ background: gradientValue }}
      >
        <span className="font-mono text-sm text-center px-2">Gradient</span>
      </div>
      <div className="p-2 bg-white dark:bg-gray-800">
        <p className="font-medium text-sm text-gray-900 dark:text-white">{name}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
};

GradientSwatch.propTypes = {
  gradientValue: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string
};

export default GradientSwatch;
