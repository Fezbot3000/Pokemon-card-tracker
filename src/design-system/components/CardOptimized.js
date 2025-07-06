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
const CardOptimized = memo(({ 
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
  const displayInvestmentAmount = card.originalInvestmentAmount !== undefined ? card.originalInvestmentAmount : 0;
  const displayInvestmentCurrency = card.originalInvestmentCurrency || 'AUD';

  const displayValueAmount = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
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
              className={`w-2 h-2 rounded-full flex items-center justify-center focus:outline-none transition-all
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
          className={`block w-3 h-3 rounded-full flex items-center justify-center transition-all
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

  // Default card content
  return (
    <div 
      className={`group relative bg-white dark:bg-[#0F0F0F] rounded-2xl ${isDarkMode ? 'shadow-sm hover:shadow-md' : ''} 
                  transition-shadow duration-300 cursor-pointer overflow-hidden
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
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 right-2 z-10">
                  <button
          type="button"
          aria-label={isSelected ? 'Deselect card' : 'Select card'}
          tabIndex={0}
          className={`w-2 h-2 rounded-full flex items-center justify-center focus:outline-none transition-all
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
              className={`block w-3 h-3 rounded-full flex items-center justify-center transition-all
                ${isSelected ? 'bg-white dark:bg-[#23272F]' : 'bg-transparent'}`}
            >
              {isSelected && (
                <Icon name="check" className="text-purple-600 text-base" />
              )}
            </span>
          </button>
        </div>
      )}
      
      <div className="flex flex-col h-full">
        {/* Image section with lazy loading */}
        <div className="relative h-48 bg-gray-50 dark:bg-[#18181b] p-4 flex items-center justify-center" ref={imageRef}>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-32 h-44"></div>
            </div>
          )}
          <img 
            src={imageSrc} 
            alt={card.card || card.name || 'Pokemon card'} 
            className={`w-full h-full object-contain rounded transition-all duration-500 ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            loading="lazy"
          />
        </div>
        
        {/* Card details */}
        <div className="flex-1 p-3 flex flex-col">
          <h3 className="card-title font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
            {card.card || card.name || 'Unknown Card'}
          </h3>
          
          {/* Financial details */}
          <div className="mt-auto">
            <div className="grid grid-cols-3 gap-1 text-center">
              {/* Investment */}
              <div className="text-center py-1">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">Investment</div>
                <div className="financial-detail-value text-sm font-medium">
                  {formatUserCurrency ? 
                    formatUserCurrency(displayInvestmentAmount, displayInvestmentCurrency) :
                    `$${(displayInvestmentAmount || 0).toFixed(2)}`
                  }
                </div>
              </div>
              {/* Value */}
              <div className="text-center py-1">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">Value</div>
                <div className="financial-detail-value text-sm font-medium">
                  {formatUserCurrency ? 
                    formatUserCurrency(displayValueAmount, displayValueCurrency) :
                    `$${(displayValueAmount || 0).toFixed(2)}`
                  }
                </div>
              </div>
              {/* Profit */}
              <div className="text-center py-1">
                <div className="financial-detail-label text-xs text-gray-500 dark:text-gray-400">Profit</div>
                <div className={`text-sm font-medium ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                  {formatUserCurrency ? 
                    formatUserCurrency(profit, 'AUD') :
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
}, (prevProps, nextProps) => {
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
});

// Sub-components for when Card is used as a container
CardOptimized.Header = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-b border-gray-100 dark:border-gray-800 font-medium text-gray-900 dark:text-white ${className}`} {...props}>
    {children}
  </div>
);

CardOptimized.Body = ({ children, className = '', ...props }) => (
  <div className={`p-4 text-gray-700 dark:text-gray-300 ${className}`} {...props}>
    {children}
  </div>
);

CardOptimized.Footer = ({ children, className = '', ...props }) => (
  <div className={`p-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400 ${className}`} {...props}>
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
  className: PropTypes.string
};

CardOptimized.Body.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

CardOptimized.Footer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

CardOptimized.displayName = 'CardOptimized';

export default CardOptimized;
