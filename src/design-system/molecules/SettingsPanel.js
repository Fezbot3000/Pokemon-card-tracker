import React from 'react';
import PropTypes from 'prop-types';
import { stripDebugProps } from '../../utils/stripDebugProps';

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
    <div className={`mb-6 ${className}`} {...stripDebugProps(props)}>
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
  /** Whether panel is expandable */
  expandable: PropTypes.bool,
};

export default SettingsPanel;
