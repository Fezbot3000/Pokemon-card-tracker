import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';
import Modal from '../molecules/Modal';
import BottomSheet from '../molecules/BottomSheet'; // Corrected Import BottomSheet
import { toast } from '../utils/notifications';
import { useSubscription } from '../../hooks/useSubscription';

/**
 * CollectionSelector component
 *
 * A dropdown component for selecting collections in the Pokemon Card Tracker app.
 * Includes subscription gating for multiple collections feature.
 */
const CollectionSelector = ({
  selectedCollection = 'Default Collection',
  collections = [],
  onCollectionChange,
  onAddCollection,
  className = '',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false); // State for BottomSheet
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] =
    useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const dropdownRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const { hasFeature } = useSubscription();

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
    const handleClickOutside = event => {
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

  const handleNewCollectionClick = () => {
    if (!hasFeature('MULTIPLE_COLLECTIONS')) {
      toast.error(
        'Multiple collections are available with Premium. Upgrade to create unlimited collections!'
      );
      return;
    }

    setIsNewCollectionModalOpen(true);
    isMobileView ? setIsBottomSheetOpen(false) : setIsDropdownOpen(false);
  };

  const renderCollectionItems = forMobileSheet => (
    <div className={`py-1 ${forMobileSheet ? 'space-y-2 px-2' : ''}`}>
      {/* New Collection button at the top */}
      <button
        onClick={handleNewCollectionClick}
        className={`block w-full px-4 py-2 text-left text-sm ${
          !hasFeature('MULTIPLE_COLLECTIONS')
            ? 'cursor-not-allowed opacity-50'
            : 'hover:opacity-90'
        } ${
          forMobileSheet
            ? 'rounded-lg border border-gray-200 bg-white py-3 text-center text-gray-700 dark:border-gray-700 dark:bg-[#000] dark:text-gray-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
        disabled={!hasFeature('MULTIPLE_COLLECTIONS')}
      >
        <div
          className={`flex items-center ${forMobileSheet ? 'justify-center' : ''}`}
        >
          <Icon
            name={hasFeature('MULTIPLE_COLLECTIONS') ? 'add' : 'lock'}
            size="sm"
            className="mr-1"
          />
          <span>
            {hasFeature('MULTIPLE_COLLECTIONS')
              ? 'New Collection'
              : 'New Collection (Premium)'}
          </span>
        </div>
      </button>

      <div
        className={`my-1 ${forMobileSheet ? 'border-t-0' : 'border-t border-gray-200 dark:border-gray-700'}`}
      ></div>

      {/* Collection list */}
      {collections.map(collection => (
        <button
          key={collection}
          onClick={() => {
            onCollectionChange?.(collection);
            isMobileView
              ? setIsBottomSheetOpen(false)
              : setIsDropdownOpen(false);
          }}
          className={`block w-full px-4 py-2 text-left text-sm ${
            forMobileSheet
              ? `rounded-lg text-center ${
                  collection === selectedCollection
                    ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] font-semibold text-white'
                    : 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300'
                } py-3 hover:opacity-90`
              : `${collection === selectedCollection ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800 font-medium' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 hover:shadow-sm'}`
          } `}
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
          <button
            onClick={handleTriggerClick} // Use new handler
            className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-700"
            data-component-name="CollectionSelector"
          >
            <span className="mr-2 max-w-[200px] truncate font-medium">
              {selectedCollection}
            </span>
            <Icon
              name={
                isDropdownOpen || isBottomSheetOpen
                  ? 'expand_less'
                  : 'expand_more'
              }
              size="sm"
            />
          </button>
        </div>

        {/* Desktop Dropdown */}
        {!isMobileView && isDropdownOpen && (
          <div className="ring-black/5 absolute right-0 z-50 mt-2 max-h-[60vh] w-56 overflow-y-auto rounded-md bg-white shadow-lg ring-1 dark:bg-[#0F0F0F]">
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
          <div className="flex h-full flex-col">
            <div
              className="scrollbar-hide grow overflow-y-auto"
              style={{ maxHeight: 'calc(85vh - 130px)' }}
            >
              {renderCollectionItems(true)}
            </div>
            <div className="sticky inset-x-0 bottom-0 mt-2 border-t border-gray-700 bg-black pt-2">
              <button
                onClick={() => setIsBottomSheetOpen(false)}
                className="mb-2 block w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-center text-sm font-semibold text-gray-300 hover:opacity-90"
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
        size="contextual"
        position="center"
        closeOnClickOutside={true}
        footer={
          <>
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
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="newCollectionName"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Collection Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="newCollectionName"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400"
              placeholder="Enter collection name"
              autoFocus
            />
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
  className: PropTypes.string,
};

export default CollectionSelector;
