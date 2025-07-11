import React, { useState, useEffect } from 'react';
import AddCardModalComponent from './AddCardModalComponent';
import { useCards } from '../../contexts/CardContext';

const SearchBarComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  realCards,
  cardsLoading,
  selectedCollection,
  setSelectedCollection,
  collections,
  searchValue,
  setSearchValue,
  selectedFilters,
  setSelectedFilters,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getBorderColorStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors,
  onNewCollectionCreated
  }) => {
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  
  // Get real card creation function from CardContext
  const { createCard, loading: cardContextLoading, error: cardContextError } = useCards();
  
  // Filter dropdowns state
  const [activeDropdown, setActiveDropdown] = useState(null);

  const filterOptions = data.filterOptions || {
    category: [
      { value: '', label: 'All Categories' },
      { value: 'pokemon', label: 'Pokemon' },
      { value: 'magicTheGathering', label: 'Magic: The Gathering' },
      { value: 'yugioh', label: 'Yu-Gi-Oh' },
      { value: 'digimon', label: 'Digimon' },
      { value: 'sports', label: 'Sports Cards' },
      { value: 'other', label: 'Other' }
    ],
    gradingCompany: [
      { value: '', label: 'All Grading Companies' },
      { value: 'PSA', label: 'PSA' },
      { value: 'BGS', label: 'BGS' },
      { value: 'BECKETT', label: 'Beckett' },
      { value: 'SGC', label: 'SGC' },
      { value: 'CGC', label: 'CGC' },
      { value: 'CSG', label: 'CSG' },
      { value: 'RAW', label: 'Ungraded' }
    ],
    grade: [
      { value: '', label: 'All Grades' },
      { value: '10', label: 'PSA 10' },
      { value: '9', label: 'PSA 9' },
      { value: '8', label: 'PSA 8' },
      { value: '7', label: 'PSA 7' },
      { value: '6', label: 'PSA 6' },
      { value: '5', label: 'PSA 5' }
    ],
    sortBy: [
      { value: 'value-high', label: 'Value (High to Low)' },
      { value: 'value-low', label: 'Value (Low to High)' },
      { value: 'profit-high', label: 'Profit (High to Low)' },
      { value: 'profit-low', label: 'Profit (Low to High)' },
      { value: 'name', label: 'Name (A-Z)' },
      { value: 'date-new', label: 'Date Added (Newest)' },
      { value: 'date-old', label: 'Date Added (Oldest)' }
    ]
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
      sortBy: 'value-high'
    });
    setSearchValue('');
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
              border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}`,
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
                border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}`,
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
                  { backgroundColor: colors.secondary, border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.secondary}`, color: colors.background } : 
                  { ...getSurfaceStyle('secondary'), ...getTextColorStyle('secondary'), border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}` }
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
               style={{...getSurfaceStyle('primary'), border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}`}}>
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
          onNewCollectionCreated={onNewCollectionCreated}
          onSave={async (cardData, imageFiles, collection) => {
            try {
              // Check if CardContext is available
              if (!createCard) {
                throw new Error('Card creation service not available. Please refresh the page and try again.');
              }
              
              // Prepare the card data for saving
              const cardToSave = {
                ...cardData,
                collection: collection,
                collectionId: collection,
                // Ensure we have all required fields
                name: cardData.cardName || cardData.name,
                hasImage: imageFiles && imageFiles.length > 0,
                hasMultipleImages: imageFiles && imageFiles.length > 1,
                imageCount: imageFiles ? imageFiles.length : 0,
                dateAdded: new Date().toISOString(),
                createdAt: new Date().toISOString()
              };

              // Use the CardContext createCard function with image files
              const savedCard = await createCard(cardToSave, imageFiles);
              
              console.log('Card saved successfully in configurator:', savedCard);
              return savedCard;
            } catch (error) {
              console.error('Error saving card in configurator:', error);
              
              // Provide more specific error messages
              if (error.message.includes('not available')) {
                throw new Error('Card creation service not available. Please refresh the page and try again.');
              } else if (error.message.includes('serial number') || error.message.includes('already exists')) {
                throw new Error('A card with this serial number already exists in your collection.');
              } else if (error.message.includes('collection')) {
                throw new Error('Please select a valid collection for this card.');
              } else {
                throw new Error(`Failed to save card: ${error.message}`);
              }
            }
          }}
        />
    </>
  );
};

export default SearchBarComponent; 