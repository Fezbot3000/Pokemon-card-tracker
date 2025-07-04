import React from 'react';
import PropTypes from 'prop-types';


/**
 * Card Component
 * 
 * A reusable card component with consistent styling that can be used across the application.
 */
const Card = ({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  selectable = false,
  selected = false,
  onClick,
  ...props
}) => {
  // Base styles for all card variants
  const baseClasses = 'rounded-xl overflow-hidden';
  
  // Different variant styles
  const variantClasses = {
    default: 'bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 shadow-sm',
    flat: 'bg-white dark:bg-[#1B2131] border border-gray-100 dark:border-gray-800/50',
    outlined: 'bg-transparent border border-gray-200 dark:border-gray-700/50',
    elevated: 'bg-white dark:bg-[#1B2131] border border-gray-200 dark:border-gray-700/50 shadow-md',
  };
  
  // Optional hover effect
  const hoverClasses = hoverable ? 'hover:shadow-md transition-shadow duration-200' : '';
  
  // Optional selectable state
  const selectableClasses = selectable 
    ? 'cursor-pointer transition-colors duration-200' +
      (selected ? ' ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0D1117]' : '')
    : '';
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${selectableClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  /** Card content */
  children: PropTypes.node.isRequired,
  /** Additional classes to apply */
  className: PropTypes.string,
  /** Card style variant */
  variant: PropTypes.oneOf(['default', 'flat', 'outlined', 'elevated']),
  /** Whether the card should have a hover effect */
  hoverable: PropTypes.bool,
  /** Whether the card is selectable */
  selectable: PropTypes.bool,
  /** Whether the card is selected (only applies when selectable is true) */
  selected: PropTypes.bool,
  /** Click handler function */
  onClick: PropTypes.func,
};

export default Card;
