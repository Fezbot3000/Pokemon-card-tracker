import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button component that supports various visual styles and sizes
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  iconLeft, 
  iconRight, 
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  // Base styles that apply to all buttons
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none';
  
  // Size variations
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };
  
  // Variant variations using color system
  const variantClasses = {
    primary: `bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white hover:opacity-90 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    // Secondary button - styled primarily for dark contexts or consistent look
    secondary: `bg-[#0F0F0F] text-gray-300 border border-gray-700 hover:opacity-90 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    text: `bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-red-500 text-white hover:opacity-90 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    success: `bg-green-500 text-white hover:opacity-90 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    icon: `w-10 h-10 p-0 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  
  // Width control
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Combine all classes
  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`;
  
  // Check if the button has a rounded-full class
  const hasRoundedFull = className.includes('rounded-full');
  
  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={hasRoundedFull ? { borderRadius: '9999px' } : undefined}
      {...props}
    >
      {iconLeft && <span className="mr-2">{iconLeft}</span>}
      {children}
      {iconRight && <span className="ml-2">{iconRight}</span>}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'text', 'danger', 'success', 'icon']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  iconLeft: PropTypes.node,
  iconRight: PropTypes.node,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
};

export default Button;
