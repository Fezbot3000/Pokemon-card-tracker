import React, { useState } from 'react';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';

/**
 * NewCollectionModal Component
 * 
 * A modal for creating a new collection. Accepts a name and calls onCreate when submitted.
 */
const NewCollectionModal = ({ isOpen, onClose, onCreate, existingCollections = [] }) => {
  const [collectionName, setCollectionName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    const trimmed = collectionName.trim();
    if (!trimmed) {
      setError('Collection name is required.');
      return;
    }
    if (existingCollections.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError('A collection with this name already exists.');
      return;
    }
    setError('');
    onCreate(trimmed);
    setCollectionName('');
  };

  const handleClose = () => {
    setCollectionName('');
    setError('');
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Create New Collection"
      position="center"
      size="lg"
      closeOnClickOutside={false}
      footer={
        <div className="flex justify-between w-full">
          <Button 
            variant="secondary" 
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreate}
            leftIcon={<Icon name="create_new_folder" />}
          >
            Create
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Collection Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)] placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Enter collection name"
            value={collectionName}
            onChange={e => setCollectionName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
            }}
            autoFocus
          />
          {error && (
            <div className="mt-2 flex items-center text-red-600 dark:text-red-400 text-sm">
              <Icon name="error" className="mr-1 text-sm" />
              {error}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewCollectionModal;
