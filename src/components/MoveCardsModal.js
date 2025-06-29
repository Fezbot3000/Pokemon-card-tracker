import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';

const MoveCardsModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedCards = [], 
  collections = [],
  currentCollection
}) => {
  const [targetCollection, setTargetCollection] = useState('');
  
  // Create a completely filtered list removing current collection, All Cards, and any variation of Sold
  const availableCollections = useMemo(() => {
    return collections.filter(collection => {
      // Normalize to lowercase for case-insensitive comparison
      const lowerCollection = collection.toLowerCase();
      
      // Check for any variation of "sold"
      const isSoldCollection = lowerCollection === 'sold' || 
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
      size="lg"
      closeOnClickOutside={false}
      footer={
        <div className="flex justify-between w-full">
          <Button 
            variant="secondary" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirm}
            disabled={!targetCollection || availableCollections.length === 0}
            leftIcon={<Icon name="drive_file_move" />}
          >
            Move
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select a collection to move {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} to:
        </p>
        
        {availableCollections.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center">
              <Icon name="warning" className="text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No other collections available. Please create another collection first.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Collection <span className="text-red-500">*</span>
            </label>
            <select
              value={targetCollection}
              onChange={(e) => setTargetCollection(e.target.value)}
              className="w-full px-3 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-lg bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]/20 focus:border-[var(--primary-default)] placeholder-gray-500 dark:placeholder-gray-400"
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
  currentCollection: PropTypes.string
};

export default MoveCardsModal;
