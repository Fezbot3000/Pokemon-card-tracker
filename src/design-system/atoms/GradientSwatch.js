import React from 'react';
import PropTypes from 'prop-types';

/**
 * GradientSwatch Component
 *
 * Displays a gradient color sample with its name and optional description.
 */
const GradientSwatch = ({ gradientValue, name, description }) => {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div
        className="flex h-24 items-center justify-center text-white"
        style={{ background: gradientValue }}
      >
        <span className="px-2 text-center font-mono text-sm">Gradient</span>
      </div>
      <div className="bg-white p-2 dark:bg-gray-800">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {name}
        </p>
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

GradientSwatch.propTypes = {
  gradientValue: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
};

export default GradientSwatch;
