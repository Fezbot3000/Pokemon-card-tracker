import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { colors } from '../tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import logger from '../../utils/logger';
import { stripDebugProps } from '../../utils/stripDebugProps';

/**
 * StatisticsSummary Component
 * 
 * A unified statistics summary bar that displays 4 key metrics in a single container
 * with dividers between sections, used on both the main cards page and sold items page.
 */
const StatisticsSummary = ({ 
  statistics = [], 
  className = '',
  ...props 
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { formatAmountForDisplay, preferredCurrency } = useUserPreferences();

  return (
    <div 
      className={`w-full bg-white dark:bg-[#1B2131] rounded-md ${isDarkMode ? 'shadow-sm' : ''} overflow-hidden border border-[#ffffff33] dark:border-[#ffffff1a] mb-2 sm:mb-3 ${className}`}
      {...stripDebugProps(props)}
    >
      <div className="rounded-md p-2 sm:p-4 md:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0">
          {statistics.map((stat, index) => {
            let displayValue;
            const isMonetaryStat = stat.isMonetary !== undefined ? stat.isMonetary : ['PAID', 'VALUE', 'PROFIT'].includes(stat.label.toUpperCase());

            if (isMonetaryStat) {
              const originalCurrency = stat.originalCurrencyCode || 'USD'; // Assume USD if not specified
              if (typeof stat.value === 'number' && !isNaN(stat.value)) {
                try {
                  displayValue = formatAmountForDisplay(stat.value, originalCurrency);
                } catch (e) {
                  logger.error(`Error formatting ${stat.label} in StatisticsSummary:`, e);
                  displayValue = `${preferredCurrency.symbol || '$'} Error`; // Fallback
                }
              } else {
                // Handle cases where value might be a pre-formatted string or non-numeric (e.g., "N/A")
                // If it's already a string, display as is, assuming it might be intentionally non-numeric.
                displayValue = String(stat.value);
                // Attempt to prefix with symbol if it looks like a number but isn't, and doesn't have one.
                if (typeof stat.value === 'string' && !isNaN(parseFloat(stat.value.replace(/[^0-9.-]+/g, ""))) && !displayValue.startsWith(preferredCurrency.symbol || '$')) {
                    // displayValue = (preferredCurrency.symbol || '$') + displayValue; // This might be too aggressive
                }
              }
            } else {
              displayValue = String(stat.value); // For non-monetary stats like 'CARDS'
            }

            return (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 py-3 sm:py-4 md:py-6 border-none"
              >
                <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
                  {stat.label}
                </div>
                <div className={`font-medium flex items-center gap-1 whitespace-nowrap overflow-hidden
                  ${stat.isProfit && stat.value > 0 ? 'text-green-500' : ''}
                  ${stat.isProfit && stat.value < 0 ? 'text-red-500' : ''}
                  ${!stat.isProfit ? 'text-gray-900 dark:text-white' : ''}`}
                  style={{
                    fontSize: 'clamp(0.875rem, calc(0.75rem + 1.2vw), 1.5rem)',
                    maxWidth: '100%',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {stat.icon && (
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <Icon name={stat.icon} size="sm" />
                    </span>
                  )}
                  {/* Render the processed displayValue */}
                  <span className="overflow-hidden text-ellipsis">
                    {displayValue}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

StatisticsSummary.propTypes = {
  statistics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      // formattedValue: PropTypes.string, // No longer primary, but can be kept for non-monetary overrides
      isProfit: PropTypes.bool,
      isMonetary: PropTypes.bool, // Added: explicit flag for monetary values
      originalCurrencyCode: PropTypes.string, // Added: currency of the raw 'value'
      icon: PropTypes.string
    })
  ).isRequired,
  className: PropTypes.string
};

export default StatisticsSummary;
