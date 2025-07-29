import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';
import Dropdown, { DropdownItem } from '../molecules/Dropdown';


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
  const [isSortDropdownOpen, setIsSortDropdownOpen] = React.useState(false);
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

  // Sort dropdown trigger
  const sortDropdownTrigger = (
    <div
      className="dropdown-trigger inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-[#111]"
      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
      data-component-name="SearchToolbar"
    >
      <div className="flex items-center">
        <Icon
          name="filter_list"
          size="sm"
          className="text-gray-600 dark:text-gray-300"
        />
        {/* Arrow Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation(); // Prevent dropdown opening
            toggleSortDirection(e);
          }}
          className="ml-1 cursor-pointer border-0 bg-transparent p-0"
        >
          <Icon
            name={
              currentSortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'
            }
            size="sm"
            className="text-gray-600 dark:text-gray-300"
          />
        </button>
      </div>
      {/* Screen reader text */}
      <span className="sr-only">
        {sortOption} (
        {currentSortDirection === 'asc' ? 'ascending' : 'descending'})
      </span>
    </div>
  );

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

        {/* Sort Dropdown */}
        <Dropdown
          trigger={sortDropdownTrigger}
          isOpen={isSortDropdownOpen}
          onOpenChange={setIsSortDropdownOpen}
          align="right"
          width="sm"
          title="Sort By"
          useMobileSheet={true}
          className="z-50"
        >
          {sortOptions.map(option => (
            <DropdownItem
              key={option}
              onClick={() => {
                onSortChange?.(option);
                setIsSortDropdownOpen(false);
              }}
              className={
                sortOption === option 
                  ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800' 
                  : 'hover:shadow-sm'
              }
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">{option}</span>
                {sortOption === option && (
                  <svg className="ml-3 size-4 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </DropdownItem>
          ))}
        </Dropdown>

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
