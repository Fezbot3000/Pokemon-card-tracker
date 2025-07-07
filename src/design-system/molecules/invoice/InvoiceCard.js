import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * InvoiceCard Component
 *
 * A simplified card component displaying a sold Pokemon card with its details
 * and profit/loss amounts.
 */
const InvoiceCard = ({
  card,
  getImageUrl,
  lazyLoad = false,
  className = '',
  hideSoldImages = true,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(!lazyLoad);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazyLoad || isVisible) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = document.getElementById(
      `invoice-card-${card.id || card.slabSerial}`
    );
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      observer.disconnect();
    };
  }, [lazyLoad, isVisible, card.id, card.slabSerial]);

  const profit =
    (parseFloat(card.finalValueAUD) || 0) -
    (parseFloat(card.investmentAUD) || 0);
  const paid = parseFloat(card.investmentAUD) || 0;
  const sold = parseFloat(card.finalValueAUD) || 0;

  // Format the card name to be more compact
  const formatCardName = name => {
    if (!name) return 'Unknown Card';

    // Extract PSA grade if present
    const psaMatch = name.match(/PSA\s*(\d+)/i);
    const psaGrade = psaMatch ? psaMatch[1] : '';

    // Remove common prefixes and suffixes
    let cleanName = name
      .replace(/\d{4}\s+Pokemon\s+/i, '')
      .replace(/\s+PSA\s*\d+\s*$/i, '')
      .replace(/\s+#\d+\s+PSA\s*\d+\s*$/i, '')
      .trim();

    // Extract card number if present
    const cardNumberMatch = name.match(/#(\d+)/);
    const cardNumber = cardNumberMatch ? `#${cardNumberMatch[1]}` : '';

    // Combine the important parts
    return `${cleanName} ${cardNumber} ${psaGrade ? `PSA ${psaGrade}` : ''}`.trim();
  };

  return (
    <div
      id={`invoice-card-${card.id || card.slabSerial}`}
      className={`flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white dark:border-[#ffffff1a] dark:bg-[#1B2131] ${className}`}
      {...props}
    >
      {/* Card Title - Optimized format */}
      <div className="border-b border-gray-200 p-3 dark:border-[#ffffff1a]">
        <div
          className="truncate text-sm font-medium text-gray-900 dark:text-white"
          title={card.card}
        >
          {formatCardName(card.card)}
        </div>
      </div>

      {/* Financial Details - Simplified and better aligned */}
      <div className="grid grid-cols-3 p-3">
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            Paid
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            ${paid.toFixed(2)}
          </div>
        </div>
        <div className="flex flex-col items-center border-x border-gray-200 dark:border-[#ffffff1a]">
          <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            Sold
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">
            ${sold.toFixed(2)}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            Profit
          </div>
          <div
            className={`text-xs font-medium ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {profit >= 0 ? '' : '-'}${Math.abs(profit).toFixed(2)}
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
    /** Card ID */
    id: PropTypes.string,
    /** Slab serial number */
    slabSerial: PropTypes.string,
  }).isRequired,
  /** Function to get the card image URL */
  getImageUrl: PropTypes.func,
  /** Whether to lazy load the image */
  lazyLoad: PropTypes.bool,
  /** Whether to hide images on the sold page */
  hideSoldImages: PropTypes.bool,
  /** Additional classes */
  className: PropTypes.string,
};

export default InvoiceCard;
