import React, { useState, useEffect } from 'react';
import AddCardModalComponent from './AddCardModalComponent';

const SearchBarComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  realCards,
  cardsLoading,
  selectedCollection,
  setSelectedCollection,
  collections,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getBorderColorStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors
  }) => {
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  
  // Filter dropdowns state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    gradingCompany: '',
    grade: '',
    sortBy: 'value'
  });

  const filterOptions = data.filterOptions || {
    category: [{ value: '', label: 'All Categories' }],
    gradingCompany: [{ value: '', label: 'All Grading Companies' }],
    grade: [{ value: '', label: 'All Grades' }],
    sortBy: [{ value: 'value', label: 'Sort by Value (High to Low)' }]
  };

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setActiveDropdown(null);
  };

  const clearFilters = () => {
    setSelectedFilters({
      category: '',
      gradingCompany: '',
      grade: '',
      sortBy: 'value'
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.filter-dropdown')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const CustomDropdown = ({ label, filterType, options, value }) => {
    const isOpen = activeDropdown === filterType;
    const selectedOption = options.find(opt => opt.value === value);
    
    return (
      <div className="flex flex-col space-y-2 w-full filter-dropdown">
        <label className={`text-sm font-medium`}
               style={{
                 ...getTypographyStyle('label'),
                 ...getTextColorStyle('secondary')
               }}>
          {label}
        </label>
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(isOpen ? null : filterType)}
            className={`w-full px-3 py-2 text-left rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 text-sm`}
            style={{
              ...getSurfaceStyle('secondary'),
              ...getInteractiveStyle('default'),
              ...getTypographyStyle('button'),
              ...getTextColorStyle('primary'),
              border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`,
              borderColor: colors.border,
              '--tw-ring-color': `${colors.primary}33`
            }}
          >
            <div className="flex items-center justify-between">
              <span style={value ? {} : getTextColorStyle('secondary')}>
                {selectedOption?.label || 'Select...'}
              </span>
              <svg 
                className={`size-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                style={getTextColorStyle('secondary')} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {isOpen && (
            <div className={`absolute z-50 mt-1 w-full rounded-lg border shadow-lg max-h-64 overflow-y-auto min-w-max`}
                 style={{...getSurfaceStyle('primary'), borderColor: colors.border}}>
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleFilterChange(filterType, option.value)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors duration-200 flex items-center justify-between`}
                  style={{
                    ...getTypographyStyle('button'),
                    ...(option.value === value 
                      ? { backgroundColor: colors.secondary, color: colors.background } 
                      : { ...getInteractiveStyle('default'), ...getTextColorStyle('primary') })
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <>
      <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-4 md:space-y-0 md:space-x-4 relative">
          {/* Search Input */}
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className={`size-5 transition-colors`} 
                   style={getTextColorStyle('secondary')} 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={data.placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className={`w-full h-12 pl-12 pr-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4`}
              style={{
                ...getTypographyStyle('body'),
                ...getSurfaceStyle('secondary'),
                ...getTextColorStyle('primary'),
                border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`,
                borderColor: colors.border,
                '--tw-ring-color': `${colors.primary}33`
              }}
            />
          </div>
          
          {/* Controls Container */}
          <div className="flex items-center space-x-3">
            {/* Filter Button */}
            {data.showFilter && (
              <button
                onClick={() => setShowFilterOptions(!showFilterOptions)}
                className={`h-12 px-3 rounded-lg transition-all duration-200 flex items-center justify-center`}
                style={showFilterOptions ? 
                  { backgroundColor: colors.secondary, borderColor: colors.secondary, color: colors.background, border: `${config.components?.buttons?.borderWidth || '0.5px'} solid` } : 
                  { ...getSurfaceStyle('secondary'), ...getTextColorStyle('secondary'), border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`, borderColor: colors.border }
                }
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            )}
            
            {/* Add Button */}
            {data.showAddButton && (
              <button
                onClick={() => setShowAddCardModal(true)}
                className={`h-12 flex items-center justify-center hover:scale-105 px-4 rounded-lg transition-all duration-200`}
                style={{ 
                  ...getTypographyStyle('button'),
                  ...getPrimaryButtonStyle()
                }}
              >
                <div className="flex items-center space-x-2">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span style={{ textTransform: getTypographyStyle('button').textTransform }}>{data.addButtonText}</span>
                </div>
              </button>
            )}
          </div>
        </div>
        
        {/* Filter Options */}
        {showFilterOptions && (
          <div className={`mt-4 p-6 rounded-lg`}
               style={{...getSurfaceStyle('primary'), borderColor: colors.border, border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-medium`}
                  style={getTextColorStyle('primary')}>
                Advanced Filters
              </h3>
              <button
                onClick={clearFilters}
                className={`text-sm px-3 py-1 rounded-md border transition-colors duration-200`}
                style={{
                  ...getTypographyStyle('button'),
                  ...getTextColorStyle('secondary'),
                  ...getBorderColorStyle('secondary')
                }}
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <CustomDropdown 
                label="Category" 
                filterType="category"
                options={filterOptions.category}
                value={selectedFilters.category}
              />
              <CustomDropdown 
                label="Grading Company" 
                filterType="gradingCompany"
                options={filterOptions.gradingCompany}
                value={selectedFilters.gradingCompany}
              />
              <CustomDropdown 
                label="Grade" 
                filterType="grade"
                options={filterOptions.grade}
                value={selectedFilters.grade}
              />
              <CustomDropdown 
                label="Sort By" 
                filterType="sortBy"
                options={filterOptions.sortBy}
                value={selectedFilters.sortBy}
              />
            </div>
            
            {/* Active Filters Display */}
            {Object.values(selectedFilters).some(filter => filter !== '' && filter !== 'value') && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                <p className={`text-sm mb-2`} style={getTextColorStyle('secondary')}>
                  Active Filters:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedFilters).map(([key, value]) => {
                    if (!value || value === 'value') return null;
                    const option = filterOptions[key]?.find(opt => opt.value === value);
                    return (
                      <span
                        key={key}
                        className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 border`}
                        style={{
                          backgroundColor: colors.secondary,
                          color: colors.background,
                          borderColor: colors.secondary
                        }}
                      >
                        <span>{option?.label || value}</span>
                        <button
                          onClick={() => handleFilterChange(key, key === 'sortBy' ? 'value' : '')}
                          className="hover:opacity-70"
                        >
                          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Add Card Modal */}
        <AddCardModalComponent
          data={data}
          config={config}
          isDarkMode={isDarkMode}
          realCards={realCards}
          cardsLoading={cardsLoading}
          selectedCollection={selectedCollection}
          setSelectedCollection={setSelectedCollection}
          collections={collections}
          getTypographyStyle={getTypographyStyle}
          getTextColorStyle={getTextColorStyle}
          getBackgroundColorStyle={getBackgroundColorStyle}
          getSurfaceStyle={getSurfaceStyle}
          getInteractiveStyle={getInteractiveStyle}
          getPrimaryButtonStyle={getPrimaryButtonStyle}
          primaryStyle={primaryStyle}
          colors={colors}
          isOpen={showAddCardModal}
          onClose={() => setShowAddCardModal(false)}
          onSave={(cardData, imageFile, collection) => {
            // For configurator, we'll just simulate the save
            console.log('Adding card:', cardData);
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(true);
              }, 1000);
            });
          }}
        />
    </>
  );
};

export default SearchBarComponent; 