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
  expandable,
  ...props
}) => {
  return (
    <div className={`mb-6 ${className}`} {...props}>
      {title && (
        <h3 className="mb-1 flex items-center text-base font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      {description && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      <div className="space-y-4">{children}</div>
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
  /** Whether panel is expandable */
  expandable: PropTypes.bool,
};

export default SettingsPanel;
