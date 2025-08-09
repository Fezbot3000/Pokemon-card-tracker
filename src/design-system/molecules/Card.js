import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

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
  const cardClass = [
    'card',
    `card--${variant}`,
    hoverable && 'card--hoverable',
    selectable && 'card--selectable',
    selected && 'card--selected',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
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
