import React, { useState } from 'react';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';

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
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Collection</h2>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 mb-2"
          placeholder="Enter collection name"
          value={collectionName}
          onChange={e => setCollectionName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleCreate();
          }}
          autoFocus
        />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="text" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate}>Create</Button>
        </div>
      </div>
    </Modal>
  );
};

export default NewCollectionModal;
