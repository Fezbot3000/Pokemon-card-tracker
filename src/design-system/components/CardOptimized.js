import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { baseColors } from '../styles/colors';
import { colors, shadows, borders } from '../tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useLazyImage } from '../../hooks/useLazyImage';

/**
 * Optimized Card Component with lazy loading and memoization
 *
 * A card displaying a Pokemon card with its image and financial details.
 * Used for displaying items in both grid and list views throughout the application.
 */
const CardOptimized = memo(
  ({
    card = {},
    cardImage,
    onClick,
    isSelected = false,
    onSelect,
    className = '',
    children,
    investmentAUD = 0,
    currentValueAUD = 0,
    formatUserCurrency,
    ...props
  }) => {
    // Get theme information
    const { isDarkMode } = useTheme();

    // Use lazy loading for the card image
    const { imageSrc, imageRef, isLoaded } = useLazyImage(
      cardImage || card.imageUrl || card.image || '/placeholder.png'
    );

    // Use original amounts and currencies from the card object for display
    const displayInvestmentAmount =
      card.originalInvestmentAmount !== undefined
        ? card.originalInvestmentAmount
        : 0;
    const displayInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';

    const displayValueAmount =
      card.originalCurrentValueAmount !== undefined
        ? card.originalCurrentValueAmount
        : 0;
    const displayValueCurrency = card.originalCurrentValueCurrency || 'AUD';

    // Calculate profit using passed props (assumed to be in AUD)
    const profit = currentValueAUD - investmentAUD;
    const isProfitable = profit >= 0;

    // If children are provided, render them instead of the default card content
    if (children) {
      return (
        <div
          className={`group relative rounded-2xl bg-white dark:bg-[#0F0F0F] ${isDarkMode ? 'shadow-sm hover:shadow-md' : ''} cursor-pointer overflow-hidden transition-shadow duration-300 ${isSelected ? 'border-2 border-purple-500' : 'border border-gray-200 dark:border-gray-700'} ${className}`}
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

    // Default card content
    return (
      <div
        className={`group relative rounded-2xl bg-white dark:bg-[#0F0F0F] ${isDarkMode ? 'shadow-sm hover:shadow-md' : ''} cursor-pointer overflow-hidden transition-shadow duration-300 ${isSelected ? 'border-2 border-purple-500' : 'border border-gray-200 dark:border-gray-700'} ${className}`}
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
        {/* Selection checkbox */}
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

        <div className="flex h-full flex-col">
          {/* Image section with lazy loading */}
          <div
            className="relative flex h-48 items-center justify-center bg-gray-50 p-4 dark:bg-[#18181b]"
            ref={imageRef}
          >
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-44 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            )}
            <img
              src={imageSrc}
              alt={card.card || card.name || 'Pokemon card'}
              className={`size-full rounded object-contain transition-all duration-500 ${
                isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              loading="lazy"
            />
          </div>

          {/* Card details */}
          <div className="flex flex-1 flex-col p-3">
            <h3 className="card-title mb-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
              {card.card || card.name || 'Unknown Card'}
            </h3>

            {/* Financial details */}
            <div className="mt-auto">
              <div className="grid grid-cols-3 gap-1 text-center">
                {/* Investment */}
                <div className="py-1 text-center">
                  <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">
                    Investment
                  </div>
                  <div className="financial-detail-value text-sm font-medium">
                    {formatUserCurrency
                      ? formatUserCurrency(
                          displayInvestmentAmount,
                          displayInvestmentCurrency
                        )
                      : `$${(displayInvestmentAmount || 0).toFixed(2)}`}
                  </div>
                </div>
                {/* Value */}
                <div className="py-1 text-center">
                  <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">
                    Value
                  </div>
                  <div className="financial-detail-value text-sm font-medium">
                    {formatUserCurrency
                      ? formatUserCurrency(
                          displayValueAmount,
                          displayValueCurrency
                        )
                      : `$${(displayValueAmount || 0).toFixed(2)}`}
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
                      ? formatUserCurrency(profit, 'AUD')
                      : `${isProfitable ? '+' : '-'}$${Math.abs(profit).toFixed(2)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if these specific props change
    return (
      prevProps.card === nextProps.card &&
      prevProps.cardImage === nextProps.cardImage &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.investmentAUD === nextProps.investmentAUD &&
      prevProps.currentValueAUD === nextProps.currentValueAUD &&
      prevProps.formatUserCurrency === nextProps.formatUserCurrency
    );
  }
);

// Sub-components for when Card is used as a container
CardOptimized.Header = ({ children, className = '', ...props }) => (
  <div
    className={`border-b border-gray-100 p-4 font-medium text-gray-900 dark:border-gray-800 dark:text-white ${className}`}
    {...props}
  >
    {children}
  </div>
);

CardOptimized.Body = ({ children, className = '', ...props }) => (
  <div
    className={`p-4 text-gray-700 dark:text-gray-300 ${className}`}
    {...props}
  >
    {children}
  </div>
);

CardOptimized.Footer = ({ children, className = '', ...props }) => (
  <div
    className={`border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 ${className}`}
    {...props}
  >
    {children}
  </div>
);

CardOptimized.propTypes = {
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
};

CardOptimized.Header.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

CardOptimized.Body.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

CardOptimized.Footer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

CardOptimized.displayName = 'CardOptimized';

export default CardOptimized;
