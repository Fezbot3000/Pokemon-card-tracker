import React from 'react';
import PropTypes from 'prop-types';
import Button from './Button';

/**
 * Standardized Modal Button Component
 * Ensures consistent button styling across all modals
 * 
 * Variant Mapping:
 * - 'primary' → 'primary' (blue gradient for main actions)
 * - 'secondary' → 'outline' (outline style for cancel/close buttons)
 * - 'danger' → 'destructive' (red gradient for destructive actions)
 * - 'success' → 'success' (green gradient for success actions)
 * - 'outline' → 'outline' (outline style, same as secondary)
 */
const ModalButton = ({ 
  variant = 'secondary', 
  children, 
  onClick, 
  disabled = false,
  className = '',
  ...props 
}) => {
  // Standardize button variants for modals
  const getButtonVariant = (variant) => {
    switch (variant) {
      case 'primary':
        return 'primary'; // Blue gradient for main actions
      case 'secondary':
      case 'outline':
        return 'outline'; // Outline style for cancel/close buttons
      case 'danger':
      case 'destructive':
        return 'destructive'; // Red gradient for destructive actions
      case 'success':
        return 'success'; // Green gradient for success actions
      default:
        return 'outline';
    }
  };

  return (
    <Button
      variant={getButtonVariant(variant)}
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[80px] ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
};

ModalButton.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'outline']),
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ModalButton; 