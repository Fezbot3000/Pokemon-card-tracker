import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../design-system/atoms/Icon';
import LoggingService from '../../services/LoggingService';

/**
 * MarketplaceCard Component
 *
 * A simplified version of the Card component specifically for marketplace listings
 * that doesn't display the value field.
 */
const MarketplaceCard = ({
  card = {},
  cardImage,
  onClick,
  isSelected = false,
  onSelect,
  className = '',
  children,
  // Extract non-DOM props to prevent them from being spread to DOM elements
  investmentAUD,
  formatUserCurrency,
  ...props
}) => {
  // If children are provided, render them instead of the default card content
  if (children) {
    return (
      <div
        className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white transition-shadow duration-300 dark:bg-[#0F0F0F] ${isSelected ? 'border-2 border-purple-500' : 'border border-gray-200 dark:border-gray-700'} ${className}`}
        onClick={onClick}
        {...props}
      >
        {/* Listed badge */}
        {card.isListed && (
          <div className="absolute left-2 top-2 z-10 flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
            <span className="material-icons mr-0.5 text-xs">storefront</span>
            <span>Listed</span>
          </div>
        )}

        {/* Selection checkbox (only shown when onSelect is provided) */}
        {onSelect && (
          <div className="absolute right-2 top-2 z-10">
            <button
              type="button"
              aria-label={isSelected ? 'Deselect card' : 'Select card'}
              tabIndex={0}
              className={`flex size-4 items-center justify-center rounded-full border-2 bg-white transition-all focus:outline-none dark:bg-[#18181b] ${isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'} ${isSelected ? 'ring-2 ring-purple-300' : 'hover:border-purple-400 dark:hover:border-purple-400'} shadow`}
              onClick={e => {
                e.stopPropagation();
                onSelect(!isSelected);
              }}
            >
              <span
                className={`flex size-3 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-white dark:bg-[#23272F]' : 'bg-transparent'}`}
              >
                {isSelected && (
                  <Icon name="check" className="text-base text-purple-600" />
                )}
              </span>
            </button>
          </div>
        )}

        {children}
      </div>
    );
  }

  return (
    <div
      className={`group relative h-full cursor-pointer overflow-hidden bg-white text-white transition-all dark:bg-black ${
        isSelected
          ? 'border-2 border-purple-500'
          : 'border border-gray-200 dark:border-gray-700'
      } rounded-md ${className}`}
      onClick={onClick}
      {...props}
    >
      {/* Selection checkbox (only shown when onSelect is provided) */}
      {onSelect && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            aria-label={isSelected ? 'Deselect card' : 'Select card'}
            tabIndex={0}
            className={`flex size-4 items-center justify-center rounded-full border-2 bg-white transition-all focus:outline-none dark:bg-[#18181b] ${isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'} ${isSelected ? 'ring-2 ring-purple-300' : 'hover:border-purple-400 dark:hover:border-purple-400'} shadow`}
            onClick={e => {
              e.stopPropagation();
              onSelect(!isSelected);
            }}
          >
            <span
              className={`flex size-3 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-white dark:bg-[#23272F]' : 'bg-transparent'}`}
            >
              {isSelected && (
                <Icon name="check" className="text-base text-purple-600" />
              )}
            </span>
          </button>
        </div>
      )}

      {/* Card Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-white p-2 dark:bg-[#1B2131]">
        {cardImage ? (
          <ImageWithAnimation
            src={cardImage}
            alt={card.cardName || card.card || card.name || 'Pokemon Card'}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon
              name="image"
              className="text-4xl text-gray-400 dark:text-gray-600"
            />
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="bg-white p-3 text-center dark:bg-[#1B2131]">
        <h3 className="mb-1 truncate text-lg font-medium text-gray-900 dark:text-white">
          {(
            card.cardName ||
            card.card ||
            card.name ||
            card.player ||
            'Unnamed Card'
          ).toUpperCase()}
        </h3>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
          {card.set || 'Pokemon Game'}
          {card.number ? ` · ${card.number}` : ''}
        </p>
      </div>
    </div>
  );
};

// Image component with slide-in animation
const ImageWithAnimation = ({ src, alt }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Normalize the src value to ensure it's a valid string URL
  const getSafeImageSrc = imageData => {
    // If null or undefined, return null
    if (imageData == null) return null;

    // If it's already a string, return it
    if (typeof imageData === 'string') {
      return imageData;
    }

    // If it's a File or Blob object
    if (imageData instanceof Blob && window.URL) {
      return window.URL.createObjectURL(imageData);
    }

    // If it's an object with a URL property
    if (typeof imageData === 'object') {
      // Check for common URL properties
      if (imageData.url) return imageData.url;
      if (imageData.src) return imageData.src;
      if (imageData.uri) return imageData.uri;
      if (imageData.href) return imageData.href;
      if (imageData.downloadURL) return imageData.downloadURL;

      // If it has a toString method, try that
      if (typeof imageData.toString === 'function') {
        const stringValue = imageData.toString();
        if (stringValue !== '[object Object]') {
          return stringValue;
        }
      }
    }

    // If we can't extract a URL, return null
    LoggingService.warn('Unable to extract valid image URL from:', imageData);
    return null;
  };

  const safeImageSrc = getSafeImageSrc(src);

  if (!safeImageSrc) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icon
          name="image"
          className="text-4xl text-gray-400 dark:text-gray-600"
        />
      </div>
    );
  }

  return (
    <img
      src={safeImageSrc}
      alt={alt}
      className={`size-full rounded object-contain transition-all duration-500 ${imageLoaded ? 'scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}`}
      onLoad={() => setImageLoaded(true)}
      onError={e => {
        LoggingService.warn('Image failed to load:', alt);
        e.target.onerror = null; // Prevent infinite error loops
        e.target.src = ''; // Clear the src
      }}
    />
  );
};

ImageWithAnimation.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
};

export default MarketplaceCard;
