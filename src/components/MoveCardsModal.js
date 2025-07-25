import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from '../design-system/molecules/Modal';
import Icon from '../design-system/atoms/Icon';
import ModalButton from './ui/ModalButton';

const MoveCardsModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCards = [],
  collections = [],
  currentCollection,
}) => {
  const [targetCollection, setTargetCollection] = useState('');

  // Create a completely filtered list removing current collection, All Cards, and any variation of Sold
  const availableCollections = useMemo(() => {
    return collections.filter(collection => {
      // Normalize to lowercase for case-insensitive comparison
      const lowerCollection = collection.toLowerCase();

      // Check for any variation of "sold"
      const isSoldCollection =
        lowerCollection === 'sold' ||
        lowerCollection.includes('sold') ||
        lowerCollection.endsWith('sold');

      return (
        collection !== currentCollection &&
        collection !== 'All Cards' &&
        !isSoldCollection
      );
    });
  }, [collections, currentCollection]);

  // Reset target collection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetCollection('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!targetCollection) return;
    onConfirm(targetCollection);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move Cards to Another Collection"
      position="center"
      size="contextual"
      closeOnClickOutside={true}
      footer={
        <div className="flex w-full items-center justify-between">
          <ModalButton variant="secondary" onClick={onClose}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleConfirm}
            disabled={!targetCollection || availableCollections.length === 0}
            leftIcon={<Icon name="drive_file_move" />}
          >
            Move
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select a collection to move {selectedCards.length} card
          {selectedCards.length !== 1 ? 's' : ''} to:
        </p>

        {availableCollections.length === 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-center">
              <Icon
                name="warning"
                className="mr-2 text-yellow-600 dark:text-yellow-400"
              />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No other collections available. Please create another collection
                first.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Collection <span className="text-red-500">*</span>
            </label>
            <select
              value={targetCollection}
              onChange={e => setTargetCollection(e.target.value)}
              className="border-gray-200/20 dark:border-gray-700/10 w-full rounded-lg border bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400"
            >
              <option value="">Select a collection...</option>
              {availableCollections.map(collection => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
};

MoveCardsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  selectedCards: PropTypes.array,
  collections: PropTypes.array,
  currentCollection: PropTypes.string,
};

export default MoveCardsModal;
