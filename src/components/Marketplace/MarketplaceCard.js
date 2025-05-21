import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../design-system/atoms/Icon';

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
  investmentAUD = 0,
  formatUserCurrency,
  ...props
}) => {
  // Use original amounts and currencies from the card object for display
  const displayInvestmentAmount = card.originalInvestmentAmount !== undefined ? card.originalInvestmentAmount : 0;
  // Ensure we have a valid currency code - default to 'AUD' if missing
  const displayInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';
  
  // If children are provided, render them instead of the default card content
  if (children) {
    return (
      <div 
        className={`group relative bg-white dark:bg-[#0F0F0F] rounded-2xl transition-shadow duration-300 cursor-pointer overflow-hidden
                    ${isSelected ? 'border-2 border-purple-500' : 'border border-[#ffffff33] dark:border-[#ffffff1a]'}
                    ${className}`}
        onClick={onClick}
        {...props}
      >
        {/* Listed badge */}
        {card.isListed && (
          <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center">
            <span className="material-icons text-xs mr-0.5">storefront</span>
            <span>Listed</span>
          </div>
        )}
        
        {/* Selection checkbox (only shown when onSelect is provided) */}
        {onSelect && (
          <div className="absolute top-2 right-2 z-10">
            <button
              type="button"
              aria-label={isSelected ? 'Deselect card' : 'Select card'}
              tabIndex={0}
              className={`w-6 h-6 rounded-full flex items-center justify-center focus:outline-none transition-all
                border-2
                bg-white dark:bg-[#18181b]
                ${isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'}
                ${isSelected ? 'ring-2 ring-purple-300' : 'hover:border-purple-400 dark:hover:border-purple-400'}
                shadow
              `}
              onClick={e => {
                e.stopPropagation();
                onSelect(!isSelected);
              }}
            >
              <span
                className={`block w-4 h-4 rounded-full flex items-center justify-center transition-all
                  ${isSelected ? 'bg-white dark:bg-[#23272F]' : 'bg-transparent'}`}
              >
                {isSelected && (
                  <Icon name="check" className="text-purple-600 text-base" />
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
      className={`group relative h-full cursor-pointer bg-white dark:bg-black text-white transition-all overflow-hidden ${
        isSelected
          ? 'border-2 border-purple-500'
          : 'border border-[#ffffff33] dark:border-[#ffffff1a]'
      } rounded-md ${className}`}
      onClick={onClick}
      {...props}
    >
      {/* Selection checkbox (only shown when onSelect is provided) */}
      {onSelect && (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            aria-label={isSelected ? 'Deselect card' : 'Select card'}
            tabIndex={0}
            className={`w-6 h-6 rounded-full flex items-center justify-center focus:outline-none transition-all
              border-2
              bg-white dark:bg-[#18181b]
              ${isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'}
              ${isSelected ? 'ring-2 ring-purple-300' : 'hover:border-purple-400 dark:hover:border-purple-400'}
              shadow
            `}
            onClick={e => {
              e.stopPropagation();
              onSelect(!isSelected);
            }}
          >
            <span
              className={`block w-4 h-4 rounded-full flex items-center justify-center transition-all
                ${isSelected ? 'bg-white dark:bg-[#23272F]' : 'bg-transparent'}`}
            >
              {isSelected && (
                <Icon name="check" className="text-purple-600 text-base" />
              )}
            </span>
          </button>
        </div>
      )}
      
      {/* Card Image */}
      <div className="aspect-[2/3] bg-white dark:bg-[#1B2131] relative overflow-hidden p-2">
        {cardImage ? (
          <ImageWithAnimation 
            src={cardImage} 
            alt={(card.cardName || card.card || card.name || 'Pokemon Card')} 
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Icon name="image" className="text-gray-400 dark:text-gray-600 text-4xl" />
          </div>
        )}
      </div>
      
      {/* Card Details */}
      <div className="p-3 text-center bg-white dark:bg-[#1B2131]">
        <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 truncate">
          {(card.cardName || card.card || card.name || card.player || 'Unnamed Card').toUpperCase()}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {card.set || 'Pokemon Game'}{card.number ? ` · ${card.number}` : ''}
        </p>
      </div>
    </div>
  );
};

// Image component with slide-in animation
const ImageWithAnimation = ({ src, alt }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`w-full h-full object-contain rounded transition-all duration-500 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 transform translate-y-4'}`}
      onLoad={() => setImageLoaded(true)}
    />
  );
};

ImageWithAnimation.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired
};

export default MarketplaceCard;
