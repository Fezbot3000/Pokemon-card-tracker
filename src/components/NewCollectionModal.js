import React, { useState } from 'react';
import Modal from '../design-system/molecules/Modal';
import Icon from '../design-system/atoms/Icon';
import ModalButton from './ui/ModalButton';
import FeatureGate from './FeatureGate';
import { useSubscription } from '../hooks/useSubscription';

/**
 * NewCollectionModal Component
 *
 * A modal for creating a new collection. Accepts a name and calls onCreate when submitted.
 * Includes subscription gating for multiple collections feature.
 */
const NewCollectionModal = ({
  isOpen,
  onClose,
  onCreate,
  existingCollections = [],
}) => {
  const [collectionName, setCollectionName] = useState('');
  const [error, setError] = useState('');
  const { hasFeature } = useSubscription();

  const handleCreate = () => {
    const trimmed = collectionName.trim();
    if (!trimmed) {
      setError('Collection name is required.');
      return;
    }
    if (
      existingCollections
        .map(c => c.toLowerCase())
        .includes(trimmed.toLowerCase())
    ) {
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

  // Check if user has access to multiple collections feature
  if (!hasFeature('MULTIPLE_COLLECTIONS')) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create New Collection"
        position="center"
        size="contextual"
        closeOnClickOutside={false}
      >
        <FeatureGate
          feature="MULTIPLE_COLLECTIONS"
          customMessage="Create unlimited collections to organize your cards by set, type, or any way you prefer. This feature is available with Premium."
        />
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Collection"
      position="center"
      size="contextual"
      closeOnClickOutside={false}
      footer={
        <div className="flex w-full items-center justify-between">
          <ModalButton variant="secondary" onClick={handleClose}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleCreate}
            leftIcon={<Icon name="create_new_folder" />}
          >
            Create
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Collection Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="border-gray-200/20 dark:border-gray-700/10 w-full rounded-lg border bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
            placeholder="Enter collection name"
            value={collectionName}
            onChange={e => setCollectionName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
            }}
            autoFocus
          />
          {error && (
            <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
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
