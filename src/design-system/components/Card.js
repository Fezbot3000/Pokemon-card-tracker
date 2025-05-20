import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { baseColors } from '../styles/colors';
import { colors, shadows, borders } from '../tokens';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Card Component
 * 
 * A card displaying a Pokemon card with its image and financial details.
 * Used for displaying items in both grid and list views throughout the application.
 */
const Card = ({ 
  card = {}, 
  cardImage, 
  onClick, 
  isSelected = false,
  onSelect,
  className = '',
  children,
  // investmentAUD and currentValueAUD are now primarily for profit calculation,
  // assuming they are reliably passed as AUD-converted values.
  investmentAUD = 0, 
  currentValueAUD = 0, 
  formatUserCurrency, 
  // preferredCurrency, // Potentially unused if formatUserCurrency handles all logic
  // originalCurrencyCode, // Potentially unused if card object's specific currencies are used
  ...props
}) => {
  // Get theme information
  const { isDarkMode } = useTheme();

  // Use original amounts and currencies from the card object for display
  const displayInvestmentAmount = card.originalInvestmentAmount !== undefined ? card.originalInvestmentAmount : 0;
  // Ensure we have a valid currency code - default to 'AUD' if missing
  const displayInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';

  const displayValueAmount = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
  // Ensure we have a valid currency code - default to 'AUD' if missing
  const displayValueCurrency = card.originalCurrentValueCurrency || 'AUD';
  
  // Calculate profit using passed props (assumed to be in AUD)
  const profit = currentValueAUD - investmentAUD;
  const isProfitable = profit >= 0;

  // If children are provided, render them instead of the default card content
  if (children) {
    return (
      <div 
        className={`group relative bg-white dark:bg-[#0F0F0F] rounded-2xl ${isDarkMode ? 'shadow-sm hover:shadow-md' : ''} 
                    transition-shadow duration-300 cursor-pointer overflow-hidden
                    ${isSelected ? 'border-2 border-purple-500' : 'border border-[#ffffff33] dark:border-[#ffffff1a]'}
                    ${className}`}
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
        
        {children}
      </div>
    );
  }

  // MODIFIED CONSOLE LOG:
  if (formatUserCurrency && card.card) { // Log if formatUserCurrency is present and it's a proper card item
    console.log('Card.js PROPS RECEIVED:', {
      cardName: card.card,
      investmentAUD,
      currentValueAUD,
      preferredCurrencyObj: card.preferredCurrency, // Renamed for clarity
      originalCurrencyCode: card.originalCurrencyCode,
      hasFormatUserCurrency: !!formatUserCurrency,
      // formatUserCurrencyFunctionBody: formatUserCurrency ? formatUserCurrency.toString() : 'undefined'
    });
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
            alt={card.name || 'Pokemon Card'} 
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">
          {card.set || 'Pokemon Game'}{card.number ? ` · ${card.number}` : ''}
        </p>
        
        {/* Financial Details - Consolidated Box */}
        <div className="flex flex-col">
          {/* Consolidated Financial Details */}
          <div className="financial-detail-box p-3 rounded-md bg-white dark:bg-[#252B3B] border border-[#ffffff33] dark:border-[#ffffff1a]">
            <div className="flex flex-col">
              {/* Paid */}
              <div className="text-center py-1">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">Paid</div>
                <div className="financial-detail-value text-sm font-medium">
                  {formatUserCurrency ? 
                    (() => {
                      // Always use formatUserCurrency with a valid currency code
                      const formatted = formatUserCurrency(displayInvestmentAmount, displayInvestmentCurrency);
                      console.log('Card.js - Rendering Paid:', {
                        cardName: card.card || card.name,
                        displayInvestmentAmount,
                        displayInvestmentCurrency,
                        isFormatUserCurrencyTruthy: !!formatUserCurrency,
                        formattedValue: formatted
                      });
                      return formatted;
                    })() :
                    `$${(displayInvestmentAmount || 0).toFixed(2)}` // Only use fallback if formatUserCurrency is undefined
                  }
                </div>
              </div>
              {/* Value */}
              <div className="text-center py-1">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">Value</div>
                <div className="financial-detail-value text-sm font-medium">
                  {formatUserCurrency ? 
                    (() => {
                      // Always use formatUserCurrency with a valid currency code
                      const formatted = formatUserCurrency(displayValueAmount, displayValueCurrency);
                      console.log('Card.js - Rendering Value:', {
                        cardName: card.card || card.name,
                        displayValueAmount,
                        displayValueCurrency,
                        isFormatUserCurrencyTruthy: !!formatUserCurrency,
                        formattedValue: formatted
                      });
                      return formatted;
                    })() :
                    `$${(displayValueAmount || 0).toFixed(2)}` // Only use fallback if formatUserCurrency is undefined
                  }
                </div>
              </div>
              {/* Profit */}
              <div className="text-center py-1">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">Profit</div>
                <div className={`text-sm font-medium ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUserCurrency ? 
                    formatUserCurrency(profit, 'AUD') : // Profit is assumed to be in AUD, so specify 'AUD' as source currency
                    `${isProfitable ? '+' : '-'}$${Math.abs(profit).toFixed(2)}`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components for when Card is used as a container
Card.Header = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-b border-gray-100 dark:border-gray-800 font-medium text-gray-900 dark:text-white ${className}`} {...props}>
    {children}
  </div>
);

Card.Body = ({ children, className = '', ...props }) => (
  <div className={`p-4 text-gray-700 dark:text-gray-300 ${className}`} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400 ${className}`} {...props}>
    {children}
  </div>
);

Card.propTypes = {
  card: PropTypes.object,
  cardImage: PropTypes.string,
  onClick: PropTypes.func,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
  investmentAUD: PropTypes.number,
  currentValueAUD: PropTypes.number,
  formatUserCurrency: PropTypes.func,
  // preferredCurrency: PropTypes.object,
  // originalCurrencyCode: PropTypes.string
};

Card.Header.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Card.Body.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Card.Footer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
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

export default Card;
