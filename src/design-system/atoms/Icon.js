import React from 'react';
import PropTypes from 'prop-types';

/**
 * Icon component for using Material Icons
 *
 * This component makes it easier to use consistent icon styling
 * throughout the application, with support for different sizes and colors.
 */
const Icon = ({
  name,
  size = 'md',
  color = 'default',
  className = '',
  // Destructure 'data-component-name' to prevent it from being spread
  'data-component-name': dataComponentName,
  ...rest // Collect remaining props
}) => {
  // Size variations
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  // Color variations - these map to your tailwind text color classes
  const colorClasses = {
    default: 'text-gray-600 dark:text-gray-300',
    primary: 'text-primary',
    secondary: 'text-gray-400 dark:text-gray-500',
    success: 'text-green-500',
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
    white: 'text-white',
  };

  // Combine the classes
  const iconClasses = `material-icons ${sizeClasses[size]} ${colorClasses[color]} ${className}`;

  return (
    // Spread only the 'rest' of the props, excluding data-component-name
    <span className={iconClasses} {...rest}>
      {name}
    </span>
  );
};

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  color: PropTypes.oneOf([
    'default',
    'primary',
    'secondary',
    'success',
    'danger',
    'warning',
    'info',
    'white',
  ]),
  className: PropTypes.string,
};

export default Icon;
