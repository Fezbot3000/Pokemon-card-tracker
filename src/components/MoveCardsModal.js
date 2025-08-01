import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from '../design-system/molecules/Modal';
import Icon from '../design-system/atoms/Icon';
import ModalButton from '../design-system/atoms/ModalButton';
import CustomDropdown from '../design-system/molecules/CustomDropdown';

const MoveCardsModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCards = [],
  collections = [],
  currentCollection,
  isMoving = false,
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
      closeOnClickOutside={!isMoving}
      footer={
        <div className="flex w-full items-center justify-between">
          <ModalButton variant="secondary" onClick={onClose} disabled={isMoving}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleConfirm}
            disabled={!targetCollection || availableCollections.length === 0 || isMoving}
            leftIcon={isMoving ? <Icon name="sync" className="animate-spin" /> : <Icon name="drive_file_move" />}
            loading={isMoving}
          >
            {isMoving ? 'Moving...' : 'Move'}
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
            <CustomDropdown
              label="Target Collection"
              name="targetCollection"
              value={targetCollection}
              onSelect={setTargetCollection}
              required
              placeholder="Select a collection..."
              options={availableCollections.map(collection => ({
                value: collection,
                label: collection
              }))}
            />
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
  isMoving: PropTypes.bool,
};

export default MoveCardsModal;
