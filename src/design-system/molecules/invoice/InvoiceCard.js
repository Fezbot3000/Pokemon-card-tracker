import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CardImage from '../../atoms/CardImage';
import ImageModal from '../../atoms/ImageModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageUrl = getImageUrl ? getImageUrl(card) : '';
  const profit = (parseFloat(card.finalValueAUD) || 0) - (parseFloat(card.investmentAUD) || 0);
  const paid = parseFloat(card.investmentAUD) || 0;
  const sold = parseFloat(card.finalValueAUD) || 0;

  return (
    <div
      className={`flex flex-col bg-white dark:bg-[#1B2131] rounded-md border border-gray-200 dark:border-[#ffffff1a] overflow-hidden ${className}`}
      {...props}
    >
      {/* Card Header with Image and Title */}
      <div className="flex items-center p-2 border-b border-gray-200 dark:border-[#ffffff1a]">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-16 flex-shrink-0 hover:opacity-75 transition-opacity rounded overflow-hidden bg-white"
        >
          <CardImage 
            src={imageUrl} 
            alt={`${card.player || ''} - ${card.card || ''}`}
            width="w-full h-full"
          />
        </button>
        <div className="ml-2 flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
            {card.card}
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="grid grid-cols-3 p-2 gap-2">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid</div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            ${paid.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sold</div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            ${sold.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit</div>
          <div className={`text-xs font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {profit >= 0 ? '' : '-'}${Math.abs(profit).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageUrl}
        alt={`${card.player || ''} - ${card.card || ''}`}
      />
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
  }).isRequired,
  /** Function to get the card image URL */
  getImageUrl: PropTypes.func,
  /** Additional classes */
  className: PropTypes.string,
};

export default InvoiceCard;
