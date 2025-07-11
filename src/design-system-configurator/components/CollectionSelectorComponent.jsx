import React, { useState, useEffect, useRef } from 'react';

const CollectionSelectorComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  selectedCollection,
  setSelectedCollection,
  collections,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCollectionChange = (collection) => {
    // For the configurator, we need to find the actual collection object
    if (typeof collection === 'string') {
      // If it's "All Cards", set to null
      if (collection === 'All Cards') {
        setSelectedCollection(null);
      } else {
        // Find the collection object by name - handle both string and object collections
        const collectionObj = collections.find(c => {
          if (typeof c === 'string') {
            return c === collection;
          } else if (typeof c === 'object' && c !== null) {
            return c.name === collection || c.id === collection;
          }
          return false;
        });
        setSelectedCollection(collectionObj || null);
      }
    } else {
      setSelectedCollection(collection);
    }
    setIsDropdownOpen(false);
  };

  const handleNewCollectionClick = () => {
    if (!data.hasFeature) {
      alert('Multiple collections are available with Premium. Upgrade to create unlimited collections!');
      return;
    }
    setIsNewCollectionModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      // For the configurator, we'll just simulate the creation
      // In a real app, this would call the createCollection function from CardContext
      setNewCollectionName('');
      setIsNewCollectionModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <div className="relative w-1/3 min-w-[300px]" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4`}
            style={{
              ...getSurfaceStyle('secondary'),
              borderColor: colors.border,
              border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`,
              '--tw-ring-color': `${colors.primary}33`,
              ':focus': {
                borderColor: colors.primary
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(255, 255, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              Object.assign(e.target.style, getSurfaceStyle('secondary'));
            }}
          >
            <div className="flex items-center space-x-3">
              <div className={`size-8 rounded-full flex items-center justify-center`}
                   style={{ 
                     backgroundColor: isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`, 
                     color: colors.secondary 
                   }}>
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <span 
                  className={`font-medium`}
                  style={{
                    ...getTypographyStyle('body'),
                    ...getTextColorStyle('primary')
                  }}
                >
                  {selectedCollection?.name || selectedCollection?.id || 'All Cards'}
                </span>
              </div>
            </div>
            <svg 
              className={`size-5 transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              style={getTextColorStyle('secondary')} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className={`absolute z-50 mt-2 w-full rounded-lg border shadow-lg max-h-64 overflow-y-auto`}
                 style={{...getSurfaceStyle('primary'), borderColor: colors.border}}>
              
              {/* New Collection Button */}
              <div 
                className={`px-3 py-2 text-sm font-medium border-b`}
                style={{ 
                  borderColor: colors.border,
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}
              >
                Create Collection
              </div>
              
              <button
                onClick={handleNewCollectionClick}
                className={`w-full px-4 py-3 text-left transition-all duration-200 hover:scale-[1.01] border-b`}
                style={{
                  ...getInteractiveStyle('default'),
                  borderColor: colors.border,
                  ...getTextColorStyle('primary')
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`size-8 rounded-full flex items-center justify-center`}
                       style={{ 
                         backgroundColor: isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`, 
                         color: colors.secondary 
                       }}>
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <div className={`font-medium`}
                         style={{
                           ...getTypographyStyle('body'),
                           ...getTextColorStyle('primary')
                         }}>
                      New Collection
                    </div>
                    <div className={`text-xs`}
                         style={{
                           ...getTypographyStyle('caption'),
                           ...getTextColorStyle('secondary')
                         }}>
                      Create a new collection
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Collections List */}
              <div 
                className={`px-3 py-2 text-sm font-medium border-b`}
                style={{ 
                  borderColor: colors.border,
                  ...getTypographyStyle('label'),
                  ...getTextColorStyle('secondary')
                }}
              >
                Collections
              </div>
              
              {data.collections.map((collection, index) => {
                const isSelected = (selectedCollection?.name || selectedCollection?.id || 'All Cards') === collection;
                return (
                  <button
                    key={index}
                    onClick={() => handleCollectionChange(collection)}
                    className={`w-full px-4 py-3 text-left transition-all duration-200 hover:scale-[1.01] flex items-center justify-between ${
                      isSelected ? 'font-medium' : ''
                    }`}
                    style={{
                      ...(isSelected ? 
                        { backgroundColor: colors.secondary, color: colors.background } : 
                        { ...getInteractiveStyle('default'), ...getTextColorStyle('primary') })
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`size-8 rounded-full flex items-center justify-center`}
                           style={{ 
                             backgroundColor: isSelected ? colors.background : 
                               (isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`), 
                             color: isSelected ? colors.secondary : colors.secondary 
                           }}>
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                        </svg>
                      </div>
                      <div>
                        <div className={`font-medium`}
                             style={{
                               ...getTypographyStyle('body'),
                               color: isSelected ? colors.background : getTextColorStyle('primary').color
                             }}>
                          {collection}
                        </div>
                        <div className={`text-xs`}
                             style={{
                               ...getTypographyStyle('caption'),
                               color: isSelected ? colors.background : getTextColorStyle('secondary').color
                             }}>
                          {collection === 'All Cards' ? 'View all cards' : `Collection · ${Math.floor(Math.random() * 100)} cards`}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className={`p-6 rounded-lg w-96 max-w-md mx-4`}
               style={getSurfaceStyle('primary')}>
            <h3 className={`text-lg font-semibold mb-4`}
                style={{
                  ...getTypographyStyle('heading'),
                  ...getTextColorStyle('primary')
                }}>
              Create New Collection
            </h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 mb-4`}
              style={{
                ...getTypographyStyle('body'),
                ...getSurfaceStyle('secondary'),
                ...getTextColorStyle('primary'),
                borderColor: colors.border,
                border: `${config.components?.buttons?.borderWidth || '0.5px'} solid`,
                '--tw-ring-color': `${colors.primary}33`
              }}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsNewCollectionModalOpen(false)}
                className={`px-4 py-2 rounded-lg border transition-colors`}
                style={{
                  ...getTypographyStyle('button'),
                  ...getTextColorStyle('secondary'),
                  borderColor: colors.border
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className={`px-4 py-2 rounded-lg transition-colors`}
                style={{
                  ...getTypographyStyle('button'),
                  ...getPrimaryButtonStyle()
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CollectionSelectorComponent; 