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
  colors,
  onNewCollectionCreated,
  onDeleteCollection,
  cards = []
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
    console.log('CollectionSelector: Collection selected:', collection);
    console.log('CollectionSelector: Available collections:', collections);
    
    // For the configurator, we need to find the actual collection object
    if (typeof collection === 'string') {
      // If it's "All Cards", set to null
      if (collection === 'All Cards') {
        console.log('CollectionSelector: Setting to All Cards (null)');
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
        console.log('CollectionSelector: Found collection object:', collectionObj);
        setSelectedCollection(collectionObj || collection);
      }
    } else {
      console.log('CollectionSelector: Setting collection object directly:', collection);
      setSelectedCollection(collection);
    }
    setIsDropdownOpen(false);
  };

  const handleNewCollectionClick = () => {
    // In configurator, allow all functionality for testing
    // In production, this would check subscription status
    setIsNewCollectionModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleCreateCollection = async () => {
    const trimmedName = newCollectionName.trim();
    
    if (!trimmedName) {
      alert('Please enter a collection name');
      return;
    }
    
    // Check if collection already exists
    const existingCollection = collections.find(c => 
      (typeof c === 'string' ? c : c.name) === trimmedName
    );
    
    if (existingCollection) {
      alert('A collection with this name already exists');
      return;
    }
    
    try {
      console.log('CollectionSelector: Creating collection:', trimmedName);
      console.log('CollectionSelector: Current collections before create:', collections);
      
      // Use the real CardContext createCollection function
      if (onNewCollectionCreated) {
        const result = await onNewCollectionCreated(trimmedName);
        console.log('CollectionSelector: Collection created successfully:', result);
      }
      
      // Clear the form and close modal
      setNewCollectionName('');
      setIsNewCollectionModalOpen(false);
    } catch (error) {
      console.error('CollectionSelector: Error creating collection:', error);
      alert('Failed to create collection. Please try again.');
    }
  };

  const handleDeleteCollection = async (collectionId, collectionName) => {
    if (window.confirm(`Are you sure you want to delete the collection "${collectionName}"? This action cannot be undone.`)) {
      try {
        if (onDeleteCollection) {
          await onDeleteCollection(collectionId);
        }
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('Failed to delete collection. Please try again.');
      }
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
              border: `${config.components?.buttons?.borderWidth || '0.5px'} solid ${colors.border}`,
              '--tw-ring-color': `${colors.primary}33`
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isDarkMode ? 
                `${colors.surfaceSecondary}80` : 
                `${colors.surfaceSecondary}CC`;
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
            <div className={`absolute z-50 mt-2 w-full rounded-lg border shadow-lg`}
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
              
              {/* All Cards option */}
              <button
                onClick={() => handleCollectionChange('All Cards')}
                className={`w-full px-4 py-3 text-left transition-all duration-200 hover:scale-[1.01] flex items-center justify-between ${
                  (selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' ? 'font-medium' : ''
                }`}
                style={{
                  ...((selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' ? 
                    { backgroundColor: colors.secondary, color: colors.background } : 
                    { ...getInteractiveStyle('default'), ...getTextColorStyle('primary') })
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`size-8 rounded-full flex items-center justify-center`}
                       style={{ 
                         backgroundColor: (selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' ? colors.background : 
                           (isDarkMode ? `${colors.secondary}40` : `${colors.secondary}1A`), 
                         color: (selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' ? colors.secondary : colors.secondary 
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
                           color: (selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' ? colors.background : getTextColorStyle('primary').color
                         }}>
                      All Cards
                    </div>
                    <div className={`text-xs`}
                         style={{
                           ...getTypographyStyle('caption'),
                           color: (selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' ? colors.background : getTextColorStyle('secondary').color
                         }}>
                      View all cards · {cards.length} cards
                    </div>
                  </div>
                </div>
                {(selectedCollection?.name || selectedCollection?.id || 'All Cards') === 'All Cards' && (
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Real collections from CardContext */}
              {collections.map((collection, index) => {
                const collectionName = collection.name || collection.id || collection;
                const collectionId = collection.id || collection;
                const isSelected = (selectedCollection?.name || selectedCollection?.id || 'All Cards') === collectionName;
                const cardCount = collection.cardCount || cards.filter(card => card.collection === collectionName || card.collectionId === collectionId).length;
                
                return (
                  <div
                    key={collection.id || index}
                    className={`group w-full flex items-center transition-all duration-200 hover:scale-[1.01] ${
                      isSelected ? 'font-medium' : ''
                    }`}
                    style={{
                      ...(isSelected ? 
                        { backgroundColor: colors.secondary, color: colors.background } : 
                        { ...getInteractiveStyle('default'), ...getTextColorStyle('primary') })
                    }}
                  >
                    {/* Main collection selection button */}
                    <button
                      onClick={() => handleCollectionChange(collection)}
                      className="flex-1 px-4 py-3 text-left flex items-center space-x-3"
                    >
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
                          {collectionName}
                        </div>
                        <div className={`text-xs`}
                             style={{
                               ...getTypographyStyle('caption'),
                               color: isSelected ? colors.background : getTextColorStyle('secondary').color
                             }}>
                          Collection · {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                        </div>
                      </div>
                    </button>
                    
                    {/* Right side buttons */}
                    <div className="flex items-center space-x-2 px-4">
                      {isSelected && (
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {/* Delete button - only show for user-created collections */}
                      {!collection.isSystem && onDeleteCollection && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCollection(collectionId, collectionName);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded hover:bg-red-500 hover:text-white"
                          style={{ color: isSelected ? colors.background : (colors.error || '#ef4444') }}
                        >
                          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ 
            backgroundColor: `${colors.overlay || colors.background}80` 
          }}
          onClick={() => {
            setIsNewCollectionModalOpen(false);
            setNewCollectionName('');
          }}
        >
          <div 
            className={`p-6 rounded-lg w-96 max-w-md mx-4`}
            style={getSurfaceStyle('primary')}
            onClick={(e) => e.stopPropagation()}
          >
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateCollection();
                } else if (e.key === 'Escape') {
                  setIsNewCollectionModalOpen(false);
                  setNewCollectionName('');
                }
              }}
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
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsNewCollectionModalOpen(false);
                  setNewCollectionName('');
                }}
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