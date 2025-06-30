import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { useTheme } from '../contexts/ThemeContext';
import { stripDebugProps } from '../../utils/stripDebugProps';

/**
 * SimpleSearchBar Component
 * 
 * A simplified search bar that matches the SearchToolbar styling but only includes
 * the search input. Used for Purchase Invoices, Sold Items, and Marketplace pages.
 */
const SimpleSearchBar = ({
  searchValue = '',
  onSearchChange,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const containerClass = `w-full bg-white dark:bg-[#1B2131] py-3 px-4 ${isDarkMode ? 'shadow-sm' : ''} rounded-md border border-[#ffffff33] dark:border-[#ffffff1a] ${className}`;

  return (
    <div 
      className={containerClass} 
      {...stripDebugProps(props)}
    >
      {/* Search Input */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="search" size="sm" className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#000] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[var(--primary-light)]/20 focus:outline-none dark:focus:bg-[#000]"
          data-component-name="SimpleSearchBar"
        />
      </div>
    </div>
  );
};

SimpleSearchBar.propTypes = {
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  placeholder: PropTypes.string,
  className: PropTypes.string
};

export default SimpleSearchBar; 