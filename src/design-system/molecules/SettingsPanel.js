import React from 'react';
import PropTypes from 'prop-types';

/**
 * SettingsPanel Component
 * 
 * A container for settings content that provides consistent styling.
 */
const SettingsPanel = ({ 
  title,
  description,
  children,
  className = '',
  ...props 
}) => {
  return (
    <div className={`p-5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm mb-6 ${className}`} {...props}>
      {title && (
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1 flex items-center">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

SettingsPanel.propTypes = {
  /** Panel title */
  title: PropTypes.string,
  /** Description text below the title */
  description: PropTypes.string,
  /** Panel content */
  children: PropTypes.node,
  /** Additional className */
  className: PropTypes.string,
};

export default SettingsPanel;
