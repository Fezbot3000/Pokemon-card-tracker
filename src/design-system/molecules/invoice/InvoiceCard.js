import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './InvoiceCard.css';

/**
 * InvoiceCard Component
 *
 * A simplified card component displaying a sold Pokemon card with its details
 * and profit/loss amounts.
 */
const InvoiceCard = ({
  card,
  lazyLoad = false,
  className = '',
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
      className={`invoice-card ${className}`}
      {...props}
    >
      {/* Card Title - Optimized format */}
      <div className="invoice-card__header">
        <div
          className="invoice-card__title"
          title={card.card}
        >
          {formatCardName(card.card)}
        </div>
      </div>

      {/* Financial Details - Simplified and better aligned */}
      <div className="invoice-card__financial">
        <div className="invoice-card__metric">
          <div className="invoice-card__metric-label">
            Paid
          </div>
          <div className="invoice-card__metric-value">
            ${paid.toFixed(2)}
          </div>
        </div>
        <div className="invoice-card__metric invoice-card__metric--bordered">
          <div className="invoice-card__metric-label">
            Sold
          </div>
          <div className="invoice-card__metric-value">
            ${sold.toFixed(2)}
          </div>
        </div>
        <div className="invoice-card__metric">
          <div className="invoice-card__metric-label">
            Profit
          </div>
          <div
            className={`invoice-card__metric-value ${profit >= 0 ? 'invoice-card__metric-value--profit' : 'invoice-card__metric-value--loss'}`}
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
  /** Whether to lazy load the image */
  lazyLoad: PropTypes.bool,
  /** Additional classes */
  className: PropTypes.string,
};

export default InvoiceCard;
