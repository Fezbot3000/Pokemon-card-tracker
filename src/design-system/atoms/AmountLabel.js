import React from 'react';
import PropTypes from 'prop-types';

/**
 * AmountLabel Component
 *
 * A component for displaying monetary values with appropriate
 * styling for profits (green) and losses (red).
 */
const AmountLabel = ({
  amount,
  type = 'default', // 'default', 'profit', 'loss'
  currency = true,
  currencySymbol = '$',
  className = '',
  size = 'default', // 'sm', 'default', 'lg'
  ...props
}) => {
  // Determine if this is a profit or loss based on the amount if type is not specified
  const computedType =
    type === 'default' ? (amount >= 0 ? 'profit' : 'loss') : type;

  // Format the amount with currency symbol if needed
  const formattedAmount = (() => {
    // Format as currency if needed
    const absoluteAmount = Math.abs(Number(amount));
    const formatted = currency
      ? `${currencySymbol}${absoluteAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : absoluteAmount.toLocaleString();

    // Add minus sign if needed (we handle this separately from the absolute value to ensure consistent positioning)
    return amount < 0 ? `-${formatted}` : formatted;
  })();

  // Size classes
  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
  };

  // Type classes for the text color
  const typeClasses = {
    default: 'text-gray-600 dark:text-gray-400',
    profit: 'text-green-600 dark:text-green-500',
    loss: 'text-red-600 dark:text-red-500',
  };

  return (
    <span
      className={`${sizeClasses[size]} font-medium ${typeClasses[computedType]} ${className}`}
      {...props}
    >
      {formattedAmount}
    </span>
  );
};

AmountLabel.propTypes = {
  /** The monetary amount to display */
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  /** The type of amount (default will determine based on positive/negative value) */
  type: PropTypes.oneOf(['default', 'profit', 'loss']),
  /** Whether to format the amount as currency */
  currency: PropTypes.bool,
  /** Symbol to use for currency formatting */
  currencySymbol: PropTypes.string,
  /** Additional classes */
  className: PropTypes.string,
  /** Size of the text */
  size: PropTypes.oneOf(['sm', 'default', 'lg']),
};

export default AmountLabel;
