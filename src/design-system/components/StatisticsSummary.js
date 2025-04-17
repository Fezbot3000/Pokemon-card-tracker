import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { colors } from '../tokens';
import { useTheme } from '../contexts/ThemeContext';

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
      className={`w-full bg-white dark:bg-[#0F0F0F] rounded-md ${isDarkMode ? 'shadow-sm' : ''} overflow-hidden border border-[#ffffff33] dark:border-[#ffffff1a] mb-2 sm:mb-3 ${className}`}
      {...props}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {statistics.map((stat, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center p-4 py-6 sm:p-6 sm:py-8 border-none"
          >
            <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
              {stat.label}
            </div>
            <div className={`text-xl sm:text-3xl md:text-4xl font-medium flex items-center gap-1 
              ${stat.isProfit && stat.value > 0 ? 'text-green-500' : ''}
              ${stat.isProfit && stat.value < 0 ? 'text-red-500' : ''}
              ${!stat.isProfit ? 'text-gray-900 dark:text-white' : ''}`}
            >
              {stat.icon && (
                <span className="text-gray-500 dark:text-gray-400">
                  <Icon name={stat.icon} size="sm" />
                </span>
              )}
              {stat.formattedValue || stat.value}
            </div>
          </div>
        ))}
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
