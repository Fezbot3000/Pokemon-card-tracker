import React from 'react';
import { Button } from './button';

/**
 * Standardized Modal Button Component
 * Ensures consistent button styling across all modals
 * 
 * Variant Mapping:
 * - 'primary' → 'default' (blue gradient for main actions)
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
        return 'default'; // Blue gradient for main actions
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

export default ModalButton; 