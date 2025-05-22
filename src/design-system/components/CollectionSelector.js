import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';
import Modal from '../molecules/Modal';
import BottomSheet from '../molecules/BottomSheet'; // Corrected Import BottomSheet
import { toast } from '../utils/notifications';

/**
 * CollectionSelector component
 * 
 * A dropdown component for selecting collections in the Pokemon Card Tracker app.
 */
const CollectionSelector = ({
  selectedCollection = 'Default Collection',
  collections = [],
  onCollectionChange,
  onAddCollection,
  className = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false); // State for BottomSheet
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const dropdownRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640); // Tailwind 'sm' breakpoint
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Close dropdown/bottomsheet when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isDropdownOpen) setIsDropdownOpen(false);
        // Note: BottomSheet handles its own outside click via backdrop
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleTriggerClick = () => {
    if (isMobileView) {
      setIsBottomSheetOpen(true);
    } else {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  const renderCollectionItems = (forMobileSheet) => (
    <div className={`py-1 ${forMobileSheet ? 'px-2 space-y-2' : ''}`}>
      {/* New Collection button at the top */}
      <button
        onClick={() => {
          setIsNewCollectionModalOpen(true);
          isMobileView ? setIsBottomSheetOpen(false) : setIsDropdownOpen(false);
        }}
        className={`block w-full text-left px-4 py-2 text-sm 
          ${forMobileSheet 
            ? 'text-center rounded-lg bg-white dark:bg-[#000] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:opacity-90 py-3'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`
        }
      >
        <div className={`flex items-center ${forMobileSheet ? 'justify-center' : ''}`}>
          <Icon name="add" size="sm" className="mr-1" />
          <span>+ New Collection</span>
        </div>
      </button>
      
      <div 
        className={`my-1 ${forMobileSheet ? 'border-t-0' : 'border-t border-gray-200 dark:border-gray-700'}`}
      ></div>
      
      {/* Collection list */}
      {collections.map((collection) => (
        <button
          key={collection}
          onClick={() => {
            onCollectionChange?.(collection);
            isMobileView ? setIsBottomSheetOpen(false) : setIsDropdownOpen(false);
          }}
          className={`block w-full text-left px-4 py-2 text-sm 
            ${forMobileSheet 
              ? `text-center rounded-lg ${collection === selectedCollection 
                  ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white font-semibold' 
                  : 'bg-white dark:bg-[#000] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'} 
                hover:opacity-90 py-3`
              : `${collection === selectedCollection ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          `}
        >
          {collection}
        </button>
      ))}
      {/* Cancel button moved outside of this component */}
    </div>
  );

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mr-2">Collection:</h2>
          <button 
            onClick={handleTriggerClick} // Use new handler
            className="flex items-center bg-white dark:bg-[#000000] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            data-component-name="CollectionSelector"
          >
            <span className="mr-2 font-medium truncate max-w-[200px]">
              {selectedCollection}
            </span>
            <Icon 
              name={(isDropdownOpen || isBottomSheetOpen) ? 'expand_less' : 'expand_more'} 
              size="sm" 
            />
          </button>
        </div>
        
        {/* Desktop Dropdown */}
        {!isMobileView && isDropdownOpen && (
          <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 max-h-[60vh] overflow-y-auto">
            {renderCollectionItems(false)}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      {isMobileView && (
        <BottomSheet 
          isOpen={isBottomSheetOpen} 
          onClose={() => setIsBottomSheetOpen(false)} 
          title="Select Collection"
        >
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(85vh - 130px)' }}>
              {renderCollectionItems(true)}
            </div>
            <div className="sticky bottom-0 left-0 right-0 pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e2130]">
              <button
                onClick={() => setIsBottomSheetOpen(false)}
                className="block w-full text-center px-4 py-3 text-sm rounded-lg bg-[#000] text-gray-300 border border-gray-700 hover:opacity-90 font-semibold mb-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* New Collection Modal */}
      <Modal
        isOpen={isNewCollectionModalOpen}
        onClose={() => setIsNewCollectionModalOpen(false)}
        title="Create New Collection"
      >
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="newCollectionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Collection Name
            </label>
            <input
              type="text"
              id="newCollectionName"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white"
              placeholder="Enter collection name"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setIsNewCollectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (newCollectionName.trim() && onAddCollection) {
                  onAddCollection(newCollectionName.trim());
                  setNewCollectionName('');
                  setIsNewCollectionModalOpen(false);
                  toast.success('Collection created successfully!');
                }
              }}
              disabled={!newCollectionName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

CollectionSelector.propTypes = {
  selectedCollection: PropTypes.string,
  collections: PropTypes.array,
  onCollectionChange: PropTypes.func,
  onAddCollection: PropTypes.func,
  className: PropTypes.string
};

export default CollectionSelector;
