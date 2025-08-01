import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';
import Modal from '../molecules/Modal';
import ActionSheet, { ActionSheetItem, ActionSheetDivider } from '../molecules/ActionSheet';
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
  const [isOpen, setIsOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const { hasFeature } = useSubscription();

  const handleNewCollectionClick = () => {
    if (!hasFeature('MULTIPLE_COLLECTIONS')) {
      toast.error(
        'Multiple collections are available with Premium. Upgrade to create unlimited collections!'
      );
      return;
    }

    setIsNewCollectionModalOpen(true);
    setIsOpen(false);
  };

  // Dropdown trigger component - same pattern as filter
  const trigger = (
    <div className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-700">
      <span className="max-w-[200px] truncate font-medium">
        {selectedCollection}
      </span>
      <Icon
        name={isOpen ? 'expand_less' : 'expand_more'}
        size="sm"
      />
    </div>
  );

  return (
    <>
      <ActionSheet
        trigger={trigger}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width="full"
        title="Select Collection"
        className={className}
      >
        {/* New Collection option */}
        <ActionSheetItem
          icon={<Icon name={hasFeature('MULTIPLE_COLLECTIONS') ? 'add' : 'lock'} size="sm" />}
          onClick={handleNewCollectionClick}
          disabled={!hasFeature('MULTIPLE_COLLECTIONS')}
          className={!hasFeature('MULTIPLE_COLLECTIONS') ? 'cursor-not-allowed opacity-50' : ''}
        >
          {hasFeature('MULTIPLE_COLLECTIONS') ? 'New Collection' : 'New Collection (Premium)'}
        </ActionSheetItem>

        <ActionSheetDivider />

        {/* Collections list */}
        {collections.map(collection => (
          <ActionSheetItem
            key={collection}
            onClick={() => {
              onCollectionChange?.(collection);
              setIsOpen(false);
            }}
            className={
              collection === selectedCollection
                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800'
                : 'hover:shadow-sm'
            }
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-medium">{collection}</span>
              {collection === selectedCollection && (
                <svg className="ml-3 size-4 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </ActionSheetItem>
        ))}
      </ActionSheet>

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
