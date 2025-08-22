import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';
import CustomDropdown from '../molecules/CustomDropdown';


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
  sortDirection = 'asc',
  onSortDirectionChange,
  onAddCard,
  className = '',
  ...props
}) => {

  // const isDarkMode = theme === 'dark';
  const [currentSortDirection, setCurrentSortDirection] =
    React.useState(sortDirection);

  // Sync state if prop changes
  React.useEffect(() => {
    setCurrentSortDirection(sortDirection);
  }, [sortDirection]);

  // Toggle sort direction function
  const toggleSortDirection = e => {
    if (e) e.stopPropagation();
    const newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    setCurrentSortDirection(newDirection);
    // Update local storage directly for immediate feedback & persistence
    localStorage.setItem('cardListSortDirection', newDirection);
    // Call the parent component's handler if provided
    if (typeof onSortDirectionChange === 'function') {
      onSortDirectionChange(newDirection);
    }
  };

  const toolbarClass = `search-toolbar w-full bg-white dark:bg-[#0F0F0F] py-3 px-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-sm rounded-md border border-gray-200 dark:border-gray-700 ${className}`;

  // Helper function to check if we're on mobile
  // const isMobile = window.innerWidth < 640;

  return (
    <div className={toolbarClass} {...props}>
      {/* Search Input */}
      <div className="relative w-full sm:flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon name="search" size="sm" className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange?.(e.target.value)}
          placeholder="Search by name, set, or serial number..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-black"
        />
      </div>

      {/* Controls Group (View Mode, Sort, Add Card) */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
        {/* View Mode Selector */}
        <div className="view-selector relative flex rounded-lg bg-gray-100 p-1 dark:bg-[#0F0F0F]">
          {/* Animated Background Indicator */}
          <div
            className="absolute inset-y-1 z-0 rounded-md bg-gradient-to-r from-[#ef4444] to-[#db2777] transition-transform duration-300 ease-in-out"
            style={{
              left: '4px',
              width: '36px',
              height: '36px',
              transform: `translateX(${viewMode === 'grid' ? '0px' : '36px'})`,
            }}
          />
          {/* Grid View Button */}
          <button
            className={`relative z-10 flex size-9 items-center justify-center rounded-md transition-colors duration-300 ${
              viewMode === 'grid'
                ? 'text-white'
                : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => onViewModeChange?.('grid')}
            aria-label="Grid view"
          >
            <span
              className={`material-icons text-sm ${viewMode === 'grid' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              grid_view
            </span>
          </button>
          {/* List View Button */}
          <button
            className={`relative z-10 flex size-9 items-center justify-center rounded-md transition-colors duration-300 ${
              viewMode === 'list'
                ? 'text-white'
                : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => onViewModeChange?.('list')}
            aria-label="List view"
          >
            <span
              className={`material-icons text-sm ${viewMode === 'list' ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              view_list
            </span>
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1">
          {/* Sort Dropdown */}
          <CustomDropdown
            value={sortOption}
            options={sortOptions.map(option => ({
              value: option,
              label: option
            }))}
            onSelect={(selectedValue) => {
              onSortChange?.(selectedValue);
            }}
            placeholder="Sort By"
            fullWidth={false}
            className="rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-[#111] min-w-[140px]"
            size="md"
            showSearch={false}
          />
          
          {/* Sort Direction Button */}
          <button
            type="button"
            onClick={toggleSortDirection}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-[#111]"
            title={`Sort ${currentSortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <Icon
              name={
                currentSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'
              }
              size="sm"
              className="text-gray-600 dark:text-gray-300"
            />
            <span className="sr-only">
              Sort {currentSortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </span>
          </button>
        </div>

        {/* Add Card Button */}
        <Button
          variant="primary"
          onClick={onAddCard}
          iconLeft={<Icon name="add" size="sm" />}
          className="hidden bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] dark:text-white sm:inline-flex"
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
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  onSortDirectionChange: PropTypes.func,
  onAddCard: PropTypes.func,
  className: PropTypes.string,
};

export default SearchToolbar;
