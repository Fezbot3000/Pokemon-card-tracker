import React from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';

/**
 * Button component that supports various visual styles and sizes
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  iconLeft,
  iconRight,
  leftIcon, 
  rightIcon, 
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  isLoading,
  loading, // Support for legacy loading prop
  loadingText = 'Processing...', 
  ...props
}) => {
  // Handle both isLoading and loading props for backward compatibility
  const isLoadingState = isLoading || loading === true;
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
    primary: `bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white hover:opacity-90 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    constructive: `bg-gradient-to-r from-[#10b981] to-[#059669] text-white hover:opacity-90 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    // Secondary button - styled primarily for dark contexts or consistent look
    secondary: `bg-[#000] text-gray-300 border border-gray-700 hover:opacity-90 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    text: `bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white hover:opacity-90 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    destructive: `bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white hover:opacity-90 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    success: `bg-green-500 text-white hover:opacity-90 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    icon: `w-10 h-10 p-0 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  
  // Width control
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Combine all classes
  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`;
  
  // Check if the button has a rounded-full class
  const hasRoundedFull = className.includes('rounded-full');
  
  // Use leftIcon/rightIcon if provided, otherwise fall back to iconLeft/iconRight
  const finalIconLeft = leftIcon || iconLeft;
  const finalIconRight = rightIcon || iconRight;
  
  // Determine icon classes based on variant and size
  const iconSizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  // Adjust icon color based on variant to match text color
  const getIconColor = (variant) => {
    switch (variant) {
      case 'primary':
      case 'constructive':
      case 'success':
      case 'danger':
      case 'destructive':
        return 'white';
      case 'secondary':
        return 'white'; // Secondary has white text on dark background
      default:
        return 'default';
    }
  };
  const iconColor = getIconColor(variant);
  
  // Remove props that shouldn't be passed to the DOM element
  const {
    leftIcon: _leftIcon,
    rightIcon: _rightIcon,
    ...domProps
  } = props;
  
  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || isLoadingState}
      style={hasRoundedFull ? { borderRadius: '9999px' } : undefined}
      {...domProps}
    >
      {isLoadingState ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </>
      ) : (
        <>
          {finalIconLeft && (
            <span className={`${children ? 'mr-2' : ''}`}>
              {React.isValidElement(finalIconLeft) ? React.cloneElement(finalIconLeft, { 
                className: `${iconSizeClass} ${finalIconLeft.props.className || ''}`,
                color: iconColor
              }) : (
                <Icon name={finalIconLeft} className={`${iconSizeClass}`} color={iconColor} data-component-name="Button" />
              )}
            </span>
          )}
          {children}
          {finalIconRight && (
            <span className={`${children ? 'ml-2' : ''}`}>
              {React.isValidElement(finalIconRight) ? React.cloneElement(finalIconRight, { 
                className: `${iconSizeClass} ${finalIconRight.props.className || ''}`,
                color: iconColor
              }) : (
                <Icon name={finalIconRight} className={`${iconSizeClass}`} color={iconColor} data-component-name="Button" />
              )}
            </span>
          )}
        </>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'constructive', 'secondary', 'outline', 'text', 'danger', 'destructive', 'success', 'icon']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  iconLeft: PropTypes.node,
  iconRight: PropTypes.node,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
  isLoading: PropTypes.bool,
  loadingText: PropTypes.string,
};

export default Button;
