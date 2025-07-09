import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import { useTheme } from '../contexts/ThemeContext';

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

  const containerClass = `w-full bg-white dark:bg-black py-3 px-4 ${isDarkMode ? 'shadow-sm' : ''} rounded-md border border-gray-200 dark:border-gray-700 ${className}`;

  return (
    <div className={containerClass} {...props}>
      {/* Search Input */}
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon name="search" size="sm" className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-black dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-black"
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
  className: PropTypes.string,
};

export default SimpleSearchBar;
