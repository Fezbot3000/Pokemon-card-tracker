import React from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon';
import './Button.css';

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
  // Base and size/variant classes (semantic, tokens-backed)
  const baseClasses = 'btn';

  // Size variations
  const sizeClasses = {
    sm: 'btn--sm',
    md: 'btn--md',
    lg: 'btn--lg',
  };

  // Variant variations using color system
  const variantClasses = {
    primary: `btn--primary ${disabled ? 'is-disabled' : ''}`,
    constructive: `btn--constructive ${disabled ? 'is-disabled' : ''}`,
    secondary: `btn--secondary ${disabled ? 'is-disabled' : ''}`,
    outline: `btn--outline ${disabled ? 'is-disabled' : ''}`,
    text: `btn--text ${disabled ? 'is-disabled' : ''}`,
    danger: `btn--danger ${disabled ? 'is-disabled' : ''}`,
    destructive: `btn--destructive ${disabled ? 'is-disabled' : ''}`,
    success: `btn--success ${disabled ? 'is-disabled' : ''}`,
    icon: `btn--icon ${disabled ? 'is-disabled' : ''}`,
  };

  // Width control
  const widthClasses = fullWidth ? 'btn--block' : '';

  // Combine all classes
  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`;

  // Check if the button has a rounded-full class
  const hasRoundedFull = className.includes('rounded-full');

  // Use leftIcon/rightIcon if provided, otherwise fall back to iconLeft/iconRight
  const finalIconLeft = leftIcon || iconLeft;
  const finalIconRight = rightIcon || iconRight;

  // Determine icon classes based on variant and size
  const iconSizeClass = size === 'sm' ? 'btn__icon--sm' : size === 'lg' ? 'btn__icon--lg' : 'btn__icon--md';
  // Adjust icon color based on variant to match text color
  const getIconColor = variant => {
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
    // Remove unused icon parameters
    ...domProps
  } = props || {};

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
          <svg
            className="btn__spinner"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {loadingText}
        </>
      ) : (
        <>
          {finalIconLeft && (
            <span className={`${children ? 'btn__icon--left' : ''}`}>
              {React.isValidElement(finalIconLeft) ? (
                React.cloneElement(finalIconLeft, {
                  className: `${iconSizeClass} ${finalIconLeft.props.className || ''}`,
                  color: iconColor,
                })
              ) : (
                <Icon
                  name={finalIconLeft}
                  className={`${iconSizeClass}`}
                  color={iconColor}
                  data-component-name="Button"
                />
              )}
            </span>
          )}
          {children}
          {finalIconRight && (
            <span className={`${children ? 'btn__icon--right' : ''}`}>
              {React.isValidElement(finalIconRight) ? (
                React.cloneElement(finalIconRight, {
                  className: `${iconSizeClass} ${finalIconRight.props.className || ''}`,
                  color: iconColor,
                })
              ) : (
                <Icon
                  name={finalIconRight}
                  className={`${iconSizeClass}`}
                  color={iconColor}
                  data-component-name="Button"
                />
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
  variant: PropTypes.oneOf([
    'primary',
    'constructive',
    'secondary',
    'outline',
    'text',
    'danger',
    'destructive',
    'success',
    'icon',
  ]),
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
