import React from 'react';
import PropTypes from 'prop-types';
import CardImage from '../../atoms/CardImage';
import AmountLabel from '../../atoms/AmountLabel';

/**
 * InvoiceCard Component
 * 
 * A card component displaying a sold Pokemon card with its details
 * and profit/loss amounts.
 */
const InvoiceCard = ({
  card,
  getImageUrl,
  className = '',
  ...props
}) => {
  const imageUrl = getImageUrl ? getImageUrl(card) : null;
  const profit = parseFloat(card.finalProfitAUD) || 0;
  const isProfitable = profit >= 0;

  return (
    <div
      className={`bg-white dark:bg-[#1B2131] rounded-md p-3 flex items-center gap-4 ${className}`}
      {...props}
    >
      {/* Card Image */}
      <CardImage 
        src={imageUrl} 
        alt={`${card.player || ''} - ${card.card || ''}`}
      />

      {/* Card Details - Responsive layout with aligned amounts */}
      <div className="flex-1 min-w-0">
        {/* Card name and player */}
        <div className="mb-2">
          <h4 
            className="text-sm font-medium text-gray-900 dark:text-white truncate" 
            title={card.card}
          >
            {card.card}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {card.player}
          </p>
        </div>

        {/* Financial details */}
        <div className="flex flex-col space-y-1">
          {/* Profit */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">Profit:</div>
            <div className={`text-xs font-medium ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
              {isProfitable ? '' : '-'}${Math.abs(profit).toFixed(2)}
            </div>
          </div>
          
          {/* Purchase price */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">Paid:</div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
              ${parseFloat(card.investmentAUD || 0).toFixed(2)}
            </div>
          </div>
          
          {/* Sale price */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">Sold:</div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
              ${parseFloat(card.finalValueAUD || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

InvoiceCard.propTypes = {
  /** Card data object */
  card: PropTypes.shape({
    /** Card name */
    card: PropTypes.string,
    /** Player name */
    player: PropTypes.string,
    /** Purchase price in AUD */
    investmentAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /** Sale price in AUD */
    finalValueAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /** Profit in AUD */
    finalProfitAUD: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  /** Function to get the card image URL */
  getImageUrl: PropTypes.func,
  /** Additional classes */
  className: PropTypes.string,
};

export default InvoiceCard;
