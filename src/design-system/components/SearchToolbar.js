import React from 'react';
import PropTypes from 'prop-types';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import Dropdown, { DropdownItem } from '../molecules/Dropdown';
import { baseColors } from '../styles/colors';
import { useTheme } from '../contexts/ThemeContext';

/**
 * SearchToolbar Component
 * 
 * A toolbar for the main dashboard that includes a search input, view selector,
 * sort dropdown, and add card button.
 */
const SearchToolbar = ({
  searchValue = '',
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
  sortOption = 'Current Value',
  sortOptions = ['Current Value', 'Name', 'Date Added', 'Number'],
  onSortChange,
  onAddCard,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isSortDropdownOpen, setIsSortDropdownOpen] = React.useState(false);
  const [previousViewMode, setPreviousViewMode] = React.useState(viewMode);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Handle view mode change with animation
  const handleViewModeChange = (newMode) => {
    if (newMode !== viewMode) {
      setPreviousViewMode(viewMode);
      setIsAnimating(true);
      
      // Call the provided handler
      onViewModeChange?.(newMode);
      
      // Reset animation flag after transition completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Match this with the CSS transition duration
    }
  };

  // Sort dropdown trigger
  const sortDropdownTrigger = (
    <Button 
      variant="text" 
      className="flex items-center gap-1 text-sm sm:text-base w-32 sm:w-56"
      iconRight={<Icon name="expand_more" size="sm" />}
    >
      <span className="truncate">Sort: {sortOption}</span>
    </Button>
  );

  return (
    <div 
      className={`w-full bg-white dark:bg-[#0F0F0F] py-3 px-4 flex items-center gap-3 ${isDarkMode ? 'shadow-sm' : ''} rounded-md border border-[#ffffff33] dark:border-[#ffffff1a] ${className}`}
      {...props}
    >
      {/* Search Input */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="search" size="sm" className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search by name, set, or serial number..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-black border-0 
                   rounded-lg text-gray-900 dark:text-white placeholder-gray-500 
                   dark:placeholder-gray-400 focus:ring-2 focus:ring-[var(--primary-light)]/20 
                   focus:bg-white dark:focus:bg-black"
        />
      </div>

      {/* View Mode Selector */}
      <div className="hidden sm:flex bg-gray-100 dark:bg-black rounded-lg p-1 relative">
        {/* Animated Background Indicator */}
        <div 
          className="absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-[#ef4444] to-[#db2777] transition-transform duration-300 ease-in-out z-0"
          style={{ 
            left: '4px',
            width: '36px',
            height: '36px',
            transform: viewMode === 'list' ? 'translateX(36px)' : 'translateX(0)' 
          }}
        />
        
        {/* Grid View Button */}
        <button
          onClick={() => handleViewModeChange('grid')}
          className={`w-9 h-9 flex items-center justify-center rounded-md z-10 relative transition-colors duration-300 ${
            viewMode === 'grid'
              ? 'text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}
          aria-label="Grid view"
        >
          <Icon name="grid_view" size="sm" color={viewMode === 'grid' ? 'white' : undefined} />
        </button>
        
        {/* List View Button */}
        <button
          onClick={() => handleViewModeChange('list')}
          className={`w-9 h-9 flex items-center justify-center rounded-md z-10 relative transition-colors duration-300 ${
            viewMode === 'list'
              ? 'text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
          }`}
          aria-label="List view"
        >
          <Icon name="view_list" size="sm" color={viewMode === 'list' ? 'white' : undefined} />
        </button>
      </div>

      {/* Sort Dropdown */}
      <Dropdown
        trigger={sortDropdownTrigger}
        isOpen={isSortDropdownOpen}
        onOpenChange={setIsSortDropdownOpen}
        align="right"
        width="sm"
      >
        {sortOptions.map((option) => (
          <DropdownItem
            key={option}
            onClick={() => {
              onSortChange?.(option);
              setIsSortDropdownOpen(false);
            }}
            className={sortOption === option ? 'bg-gray-100 dark:bg-black' : ''}
          >
            {option}
          </DropdownItem>
        ))}
      </Dropdown>

      {/* Add Card Button */}
      <Button
        variant="primary"
        onClick={onAddCard}
        iconLeft={<Icon name="add" size="sm" />}
      >
        Add Card
      </Button>
    </div>
  );
};

SearchToolbar.propTypes = {
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  viewMode: PropTypes.oneOf(['grid', 'list']),
  onViewModeChange: PropTypes.func,
  sortOption: PropTypes.string,
  sortOptions: PropTypes.arrayOf(PropTypes.string),
  onSortChange: PropTypes.func,
  onAddCard: PropTypes.func,
  className: PropTypes.string
};

export default SearchToolbar;
