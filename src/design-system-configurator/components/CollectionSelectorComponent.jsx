import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useSubscription } from '../../hooks/useSubscription';
import { useCards } from '../../contexts/CardContext';
import LoggingService from '../../services/LoggingService';

const CollectionSelectorComponent = ({
  // Production API - exactly match the original CollectionSelector
  collections = [],
  selectedCollection = 'All Cards',
  onCollectionChange,
  onAddCollection,
  
  // Design system props for styling (will be removed when this becomes full production)
  config = {},
  colors = {},
  getTypographyStyle = () => ({}),
  getTextColorStyle = () => ({}),
  getSurfaceStyle = () => ({}),
  getInteractiveStyle = () => ({}),
  getPrimaryButtonStyle = () => ({}),
  isDarkMode = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const dropdownRef = useRef(null);
  
  // Real production services
  let hasFeature, createCollection, deleteCollection;
  
  try {
    // Use real subscription service with fallback
    const subscription = useSubscription();
    hasFeature = subscription?.hasFeature || (() => true);
  } catch (error) {
    LoggingService.warn('Subscription service not available, allowing all features:', error);
    hasFeature = () => true;
  }
  
  try {
    // Use real CardContext services with fallback
    const cardContext = useCards();
    createCollection = cardContext?.createCollection;
    deleteCollection = cardContext?.deleteCollection;
  } catch (error) {
    LoggingService.warn('CardContext not available:', error);
    createCollection = null;
    deleteCollection = null;
  }

  // Close dropdown when clicking outside - exactly match production
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle collection selection - exactly match production
  const handleCollectionSelect = (collection) => {
    if (typeof onCollectionChange === 'function') {
      onCollectionChange(collection);
      setIsDropdownOpen(false);
    }
  };

  // Handle new collection click - exactly match production with subscription gating
  const handleNewCollectionClick = () => {
    if (!hasFeature('MULTIPLE_COLLECTIONS')) {
      toast.error(
        'Multiple collections are available with Premium. Upgrade to create unlimited collections!'
      );
      return;
    }

    setIsNewCollectionModalOpen(true);
    setIsDropdownOpen(false);
  };

  // Handle create collection - use real CardContext or fallback to prop
  const handleCreateCollection = async () => {
    const trimmedName = newCollectionName.trim();
    
    if (!trimmedName) {
      toast.error('Please enter a collection name');
      return;
    }

    // Check if collection already exists - exactly match production
    // Extract names from collections to check for duplicates
    const existingNames = collections.map(collection => 
      typeof collection === 'string' ? collection : (collection?.name || collection?.id || '')
    );
    
    if (existingNames.includes(trimmedName)) {
      toast.error('A collection with this name already exists');
      return;
    }

    try {
      // Try to use real CardContext createCollection first
      if (createCollection) {
        const result = await createCollection(trimmedName);
        LoggingService.info('Collection created via CardContext:', result);
        toast.success('Collection created successfully!');
      } else if (onAddCollection) {
        // Fallback to prop-based creation for configurator
        onAddCollection(trimmedName);
        toast.success('Collection created successfully!');
      } else {
        throw new Error('No collection creation method available');
      }

      // Clear form and close modal - exactly match production
      setNewCollectionName('');
      setIsNewCollectionModalOpen(false);
    } catch (error) {
      LoggingService.error('Error creating collection:', error);
      toast.error('Failed to create collection. Please try again.');
    }
  };

  // Handle enter key in collection name input - exactly match production
  const handleNewCollectionKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateCollection();
    } else if (e.key === 'Escape') {
      setNewCollectionName('');
      setIsNewCollectionModalOpen(false);
    }
  };

  // Memoize filtered and sorted collections to prevent infinite re-renders
  const processedCollections = useMemo(() => {
    // Debug logging to understand collections structure
    LoggingService.debug('CollectionSelectorComponent - Raw collections:', collections);
    
    // Extract collection names from Firebase objects and filter out "All Cards"
    const collectionNames = collections
      .map(collection => {
        // Extract the human-readable name from Firebase collection objects
        if (typeof collection === 'string') {
          return collection;
        }
        
        // Firebase collection objects have { id, name, cardCount, ... }
        // Priority: name > id > fallback
        let collectionName = '';
        
        if (collection?.name && collection.name.trim()) {
          collectionName = collection.name.trim();
        } else if (collection?.id) {
          // If no name, check if ID looks like a Firebase document ID (long random string)
          // If so, try to create a fallback name
          const isFirebaseId = /^[A-Za-z0-9]{20,}$/.test(collection.id);
          if (isFirebaseId) {
            collectionName = `Collection ${collection.id.substring(0, 8)}...`;
            LoggingService.warn('Collection missing name, using fallback:', { 
              id: collection.id, 
              fallbackName: collectionName,
              collection: collection 
            });
          } else {
            collectionName = collection.id;
          }
        } else {
          collectionName = String(collection || '');
        }
        
        return collectionName;
      })
      .filter(name => name && name !== 'All Cards') // Filter out empty names and "All Cards"
      .sort((a, b) => a.localeCompare(b)); // Sort alphabetically

    LoggingService.debug('CollectionSelectorComponent - Processed collection names:', collectionNames);
    return collectionNames;
  }, [collections]);

  return (
    <>
      <div className="w-full">
        <div className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
          Collections
        </div>
        
        <div className="relative" ref={dropdownRef}>
          {/* Dropdown trigger - iOS optimized touch target (minimum 44px height) */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#000000] dark:text-gray-300 dark:hover:bg-gray-700 w-full justify-between min-h-[44px]"
          >
            <div className="flex items-center">
              <span className="material-icons mr-2 text-lg">folder</span>
              <span className="flex-1 truncate max-w-[200px] font-medium">{selectedCollection}</span>
            </div>
            <span className="material-icons text-lg">
              {isDropdownOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
          </button>

          {/* Dropdown menu - iOS optimized */}
          {isDropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 max-h-[60vh] overflow-y-auto rounded-md bg-white shadow-lg ring-1 ring-black/5 dark:bg-[#000]">
              <div className="py-1">
                {/* All Cards option - iOS optimized touch target */}
                <button
                  onClick={() => handleCollectionSelect('All Cards')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center justify-between min-h-[44px]"
                >
                  <div className="flex items-center">
                    <span className="material-icons mr-2 text-lg">style</span>
                    <span>All Cards</span>
                  </div>
                  {selectedCollection === 'All Cards' && (
                    <span className="material-icons text-lg">check</span>
                  )}
                </button>

                <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>

                {/* Collections list - iOS optimized with safe string rendering */}
                {processedCollections.map(collectionName => {
                  // processedCollections now contains only string names, not objects
                  return (
                    <button
                      key={collectionName}
                      onClick={() => handleCollectionSelect(collectionName)}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center justify-between min-h-[44px]"
                    >
                      <div className="flex items-center">
                        <span className="material-icons mr-2 text-lg">folder</span>
                        <span className="truncate">{collectionName}</span>
                      </div>
                      {selectedCollection === collectionName && (
                        <span className="material-icons text-lg">check</span>
                      )}
                    </button>
                  );
                })}

                <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>

                {/* Add Collection option - iOS optimized touch target */}
                <button
                  onClick={handleNewCollectionClick}
                  className={`w-full px-4 py-3 text-left text-sm min-h-[44px] ${
                    !hasFeature('MULTIPLE_COLLECTIONS')
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  } text-primary flex items-center justify-between`}
                  disabled={!hasFeature('MULTIPLE_COLLECTIONS')}
                >
                  <div className="flex items-center">
                    <span className="material-icons mr-2 text-lg">
                      {hasFeature('MULTIPLE_COLLECTIONS') ? 'add' : 'lock'}
                    </span>
                    <span>
                      {hasFeature('MULTIPLE_COLLECTIONS')
                        ? 'New Collection'
                        : 'New Collection (Premium)'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Collection Modal - iOS optimized */}
      {isNewCollectionModalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)' 
          }}
          onClick={() => {
            setIsNewCollectionModalOpen(false);
            setNewCollectionName('');
          }}
        >
          <div 
            className="bg-white dark:bg-[#1B2131] p-6 rounded-lg w-96 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Create New Collection
            </h3>
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={handleNewCollectionKeyDown}
              placeholder="Collection name"
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#000] text-gray-900 dark:text-gray-100 mb-4 min-h-[44px]"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsNewCollectionModalOpen(false);
                  setNewCollectionName('');
                }}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
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