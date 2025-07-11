import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
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
  // Destructure these props to prevent them from being spread to the div
  // preferredCurrency,
  // originalCurrencyCode,
  // Don't spread remaining props to avoid passing invalid DOM attributes
}) => {
  // Get theme information
  const { isDarkMode } = useTheme();

  // Use original amounts and currencies from the card object for display
  const displayInvestmentAmount =
    card.originalInvestmentAmount !== undefined
      ? card.originalInvestmentAmount
      : 0;
  // Ensure we have a valid currency code - default to 'AUD' if missing
  const displayInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';

  const displayValueAmount =
    card.originalCurrentValueAmount !== undefined
      ? card.originalCurrentValueAmount
      : 0;
  // Ensure we have a valid currency code - default to 'AUD' if missing
  const displayValueCurrency = card.originalCurrentValueCurrency || 'AUD';

  // Calculate profit using passed props (assumed to be in AUD)
  const profit = currentValueAUD - investmentAUD;
  const isProfitable = profit >= 0;

  // If children are provided, render them instead of the default card content
  if (children) {
    return (
      <div
        className={`group relative rounded-2xl bg-white dark:bg-[#0F0F0F] ${isDarkMode ? 'shadow-sm hover:shadow-md' : ''} cursor-pointer overflow-hidden transition-shadow duration-300 ${isSelected ? 'border-0.5 border-purple-500' : 'border-0.5 border-gray-200 dark:border-gray-700'} ${className}`}
        onClick={onClick}
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
              className={`flex size-4 items-center justify-center rounded-full border-0.5 bg-white transition-all focus:outline-none dark:bg-[#18181b] ${isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'} ${isSelected ? 'ring-2 ring-purple-300' : 'hover:border-purple-400 dark:hover:border-purple-400'} shadow`}
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

  // MODIFIED CONSOLE LOG: (removed for cleanup)

  return (
    <div
      className={`group relative h-full cursor-pointer overflow-hidden bg-white text-white transition-all dark:bg-black ${
        isSelected
          ? 'border-0.5 border-purple-500'
          : 'border-0.5 border-gray-200 dark:border-gray-700'
      } rounded-md ${className}`}
      onClick={onClick}
    >
      {/* Selection checkbox (only shown when onSelect is provided) */}
      {onSelect && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            aria-label={isSelected ? 'Deselect card' : 'Select card'}
            tabIndex={0}
            className={`flex size-4 items-center justify-center rounded-full border-0.5 bg-white transition-all focus:outline-none dark:bg-[#18181b] ${isSelected ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'} ${isSelected ? 'ring-2 ring-purple-300' : 'hover:border-purple-400 dark:hover:border-purple-400'} shadow`}
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
      <div className="relative aspect-[2/3] overflow-hidden bg-white p-2 dark:bg-black">
        {cardImage ? (
          <ImageWithAnimation
            src={cardImage}
            alt={card.name || 'Pokemon Card'}
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
      <div className="bg-white p-3 text-center dark:bg-black">
        <h3 className="mb-1 truncate text-lg font-medium text-gray-900 dark:text-white">
          {(
            card.cardName ||
            card.card ||
            card.name ||
            card.player ||
            'Unnamed Card'
          ).toUpperCase()}
        </h3>
        <p className="mb-1 truncate text-sm text-gray-500 dark:text-gray-400">
          {card.set || 'Pokemon Game'}
          {card.number ? ` · ${card.number}` : ''}
        </p>

        {/* Financial Details - Consolidated Box */}
        <div className="flex flex-col">
          {/* Consolidated Financial Details */}
                        <div className="financial-detail-box rounded-md border-0.5 border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-black">
            <div className="flex flex-col">
              {/* Paid */}
              <div className="py-1 text-center">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">
                  Paid
                </div>
                <div className="financial-detail-value text-sm font-medium">
                  {
                    formatUserCurrency
                      ? (() => {
                          // Always use formatUserCurrency with a valid currency code
                          const formatted = formatUserCurrency(
                            displayInvestmentAmount,
                            displayInvestmentCurrency
                          );

                          return formatted;
                        })()
                      : `$${(displayInvestmentAmount || 0).toFixed(2)}` // Only use fallback if formatUserCurrency is undefined
                  }
                </div>
              </div>
              {/* Value */}
              <div className="py-1 text-center">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">
                  Value
                </div>
                <div className="financial-detail-value text-sm font-medium">
                  {
                    formatUserCurrency
                      ? (() => {
                          // Always use formatUserCurrency with a valid currency code
                          const formatted = formatUserCurrency(
                            displayValueAmount,
                            displayValueCurrency
                          );

                          return formatted;
                        })()
                      : `$${(displayValueAmount || 0).toFixed(2)}` // Only use fallback if formatUserCurrency is undefined
                  }
                </div>
              </div>
              {/* Profit */}
              <div className="py-1 text-center">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">
                  Profit
                </div>
                <div
                  className={`text-sm font-medium ${isProfitable ? 'text-green-500' : 'text-red-500'}`}
                >
                  {formatUserCurrency
                    ? formatUserCurrency(profit, 'AUD') // Profit is assumed to be in AUD, so specify 'AUD' as source currency
                    : `${isProfitable ? '+' : '-'}$${Math.abs(profit).toFixed(2)}`}
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
  <div
    className={`border-b-0.5 border-gray-100 p-4 font-medium text-gray-900 dark:border-gray-800 dark:text-white ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.Body = ({ children, className = '', ...props }) => (
  <div
    className={`p-4 text-gray-700 dark:text-gray-300 ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
  <div
    className={`border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 ${className}`}
    {...props}
  >
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
  className: PropTypes.string,
};

Card.Body.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

Card.Footer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

// Image component with slide-in animation
const ImageWithAnimation = ({ src, alt }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      className={`size-full rounded object-contain transition-all duration-500 ${imageLoaded ? 'scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}`}
      onLoad={() => setImageLoaded(true)}
    />
  );
};

ImageWithAnimation.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
};

export default Card;
