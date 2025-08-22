import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '../atoms/Icon';
import Button from '../atoms/Button';
import Modal from '../molecules/Modal';
import CustomDropdown from '../molecules/CustomDropdown';
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
  };



  return (
    <>
      <CustomDropdown
        value={selectedCollection}
        options={[
          { value: 'new', label: hasFeature('MULTIPLE_COLLECTIONS') ? '+ New Collection' : '+ New Collection (Premium)' },
          ...collections.map(collection => ({
            value: collection,
            label: collection
          }))
        ]}
        onSelect={(selectedValue) => {
          if (selectedValue === 'new') {
            handleNewCollectionClick();
          } else {
            onCollectionChange?.(selectedValue);
          }
        }}
        placeholder="Select Collection"
        fullWidth={true}
        className={`${className} rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-300 dark:hover:bg-gray-700`}
        size="md"
        showSearch={false}
      />

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
