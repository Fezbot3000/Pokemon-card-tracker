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
      className="w-full sm:w-56 flex items-center gap-1 text-sm sm:text-base"
      iconRight={<Icon name="expand_more" size="sm" />}
    >
      <span className="truncate">Sort: {sortOption}</span>
    </Button>
  );

  return (
    <div 
      className={`w-full bg-white dark:bg-[#1B2131] py-3 px-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${isDarkMode ? 'shadow-sm' : ''} rounded-md border border-[#ffffff33] dark:border-[#ffffff1a] ${className}`}
      {...props}
    >
      {/* Search Input */}
      <div className="relative w-full sm:flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon name="search" size="sm" className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search by name, set, or serial number..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#252B3B] border-0 
                   rounded-lg text-gray-900 dark:text-white placeholder-gray-500 
                   dark:placeholder-gray-400 focus:ring-2 focus:ring-[var(--primary-light)]/20 
                   focus:bg-white dark:focus:bg-[#252B3B]"
        />
      </div>

      {/* Controls Group (View Mode, Sort, Add Card) */}
      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
        {/* View Mode Selector */}
        <div className="flex bg-gray-100 dark:bg-[#252B3B] rounded-lg p-1 relative">
          {/* Animated Background Indicator */}
          <div 
            className="absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-[#ef4444] to-[#db2777] transition-transform duration-300 ease-in-out z-0"
            style={{
              left: '4px',
              width: '36px',
              height: '36px',
              transform: `translateX(${viewMode === 'grid' ? '0px' : '36px'})`
            }}
          />
          {/* Grid View Button */}
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-md z-10 relative transition-colors duration-300 ${
              viewMode === 'grid' ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
            }`}
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid view"
          >
            <span className={`material-icons text-sm ${viewMode === 'grid' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              grid_view
            </span>
          </button>
          {/* List View Button */}
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-md z-10 relative transition-colors duration-300 ${
              viewMode === 'list' ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
            }`}
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
          >
            <span className={`material-icons text-sm ${viewMode === 'list' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              view_list
            </span>
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
          className="hidden sm:inline-flex"
        >
          Add Card
        </Button>
      </div>
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
