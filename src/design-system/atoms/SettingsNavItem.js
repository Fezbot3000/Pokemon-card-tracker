import React from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * SettingsNavItem Component
 *
 * A navigation item for the settings sidebar.
 */
const SettingsNavItem = ({
  icon,
  label,
  isActive,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center rounded-lg p-2 text-left transition-colors duration-200 ${
        isActive
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      } ${className}`}
      {...props}
    >
      {icon && (
        <Icon
          name={icon}
          className={`mr-3 transition-colors duration-200 ${
            isActive 
              ? 'text-purple-700 dark:text-purple-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        />
      )}
      <span>{label}</span>
    </button>
  );
};

SettingsNavItem.propTypes = {
  /** Icon name to show */
  icon: PropTypes.string,
  /** Text label */
  label: PropTypes.string.isRequired,
  /** Whether this item is active */
  isActive: PropTypes.bool,
  /** Callback when clicked */
  onClick: PropTypes.func.isRequired,
  /** Additional className */
  className: PropTypes.string,
};

export default SettingsNavItem;
