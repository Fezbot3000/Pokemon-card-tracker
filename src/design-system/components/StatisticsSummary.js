import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { colors } from '../tokens';
import { useTheme } from '../contexts/ThemeContext';
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

  return (
    <div 
      className={`w-full bg-white dark:bg-[#1B2131] rounded-md ${isDarkMode ? 'shadow-sm' : ''} overflow-hidden border border-[#ffffff33] dark:border-[#ffffff1a] mb-2 sm:mb-3 ${className}`}
      {...stripDebugProps(props)}
    >
      <div className="rounded-md p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {statistics.map((stat, index) => {
            let valueToRender = stat.formattedValue || stat.value;
            const isMonetaryStat = ['PAID', 'VALUE', 'PROFIT'].includes(stat.label.toUpperCase());
            let displayValue = String(valueToRender); // Ensure displayValue is a string initially

            if (isMonetaryStat) {
              // Remove currency symbols and commas for reliable parsing
              const rawValueString = String(valueToRender).replace(/[$,]/g, ''); 
              const num = parseFloat(rawValueString);

              if (!isNaN(num)) {
                // Format the absolute, truncated number
                const absNumFormatted = Math.abs(Math.trunc(num)).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
                
                if (num < 0) {
                  displayValue = '-$' + absNumFormatted;
                } else {
                  displayValue = '$' + absNumFormatted;
                }
              } else {
                // Fallback for non-numeric values that are still monetary (e.g. "N/A")
                // Prepend '$' if not already present and not clearly an error/placeholder that shouldn't have it
                if (!displayValue.includes('$') && displayValue.match(/^[a-zA-Z0-9\s.-]+$/)) { // Avoid adding $ to empty or very odd strings
                    displayValue = '$' + displayValue;
                }
              }
            }

            return (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-4 py-6 sm:p-6 sm:py-8 border-none"
              >
                <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
                  {stat.label}
                </div>
                <div className={`font-medium flex items-center gap-1 whitespace-nowrap max-w-full
                  ${stat.isProfit && stat.value > 0 ? 'text-green-500' : ''}
                  ${stat.isProfit && stat.value < 0 ? 'text-red-500' : ''}
                  ${!stat.isProfit ? 'text-gray-900 dark:text-white' : ''}`}
                  style={{
                    fontSize: 'clamp(1.125rem, calc(0.75rem + 2.5vw), 2.25rem)',
                    wordBreak: 'break-word',
                    textOverflow: 'clip',
                  }}
                >
                  {stat.icon && (
                    <span className="text-gray-500 dark:text-gray-400">
                      <Icon name={stat.icon} size="sm" />
                    </span>
                  )}
                  {/* Render the processed displayValue */}
                  {displayValue}
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
      formattedValue: PropTypes.string,
      isProfit: PropTypes.bool,
      icon: PropTypes.string
    })
  ).isRequired,
  className: PropTypes.string
};

export default StatisticsSummary;
