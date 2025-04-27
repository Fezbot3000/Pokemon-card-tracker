import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import CardImage from '../../atoms/CardImage';
import ImageModal from '../../atoms/ImageModal';
import { stripDebugProps } from '../../../utils/stripDebugProps';

/**
 * InvoiceCard Component
 * 
 * A card component displaying a sold Pokemon card with its details
 * and profit/loss amounts. Supports lazy loading of images.
 */
const InvoiceCard = ({
  card,
  getImageUrl,
  lazyLoad = false,
  className = '',
  ...props
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazyLoad);

  // Load image when component becomes visible or when getImageUrl changes
  useEffect(() => {
    if (isVisible && getImageUrl && !imageLoaded) {
      try {
        const url = getImageUrl(card);
        if (url) {
          setImageUrl(url);
          setImageLoaded(true);
        }
      } catch (error) {
        console.error('Error loading image for card:', card.id || card.slabSerial, error);
        setImageLoaded(true); // Mark as loaded to prevent infinite retries
      }
    }
  }, [isVisible, getImageUrl, card, imageLoaded]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazyLoad || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = document.getElementById(`invoice-card-${card.id || card.slabSerial}`);
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

  const profit = (parseFloat(card.finalValueAUD) || 0) - (parseFloat(card.investmentAUD) || 0);
  const paid = parseFloat(card.investmentAUD) || 0;
  const sold = parseFloat(card.finalValueAUD) || 0;

  return (
    <div
      id={`invoice-card-${card.id || card.slabSerial}`}
      className={`flex flex-col bg-white dark:bg-[#1B2131] rounded-md border border-gray-200 dark:border-[#ffffff1a] overflow-hidden ${className}`}
      {...stripDebugProps(props)}
    >
      {/* Card Header with Image and Title */}
      <div className="flex items-center p-2 border-b border-gray-200 dark:border-[#ffffff1a]">
        <button
          onClick={() => imageUrl && setIsModalOpen(true)}
          className="w-12 h-16 flex-shrink-0 hover:opacity-75 transition-opacity rounded overflow-hidden bg-white"
        >
          {isVisible ? (
            <CardImage 
              src={imageUrl} 
              alt={`${card.player || ''} - ${card.card || ''}`}
              width="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
          )}
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
      {imageUrl && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={imageUrl}
          alt={`${card.player || ''} - ${card.card || ''}`}
        />
      )}
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
  /** Additional classes */
  className: PropTypes.string,
};

export default InvoiceCard;
