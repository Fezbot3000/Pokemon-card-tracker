import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../design-system';
import PropTypes from 'prop-types';

const MoveCardsModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedCards = [], 
  collections = [],
  currentCollection
}) => {
  const { isDarkMode } = useTheme();
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

  // Manage body overflow and padding to prevent page jumping
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Prevent background scrolling but compensate for scrollbar width
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      // Restore scrolling on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!targetCollection) return;
    onConfirm(targetCollection);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay with blur effect */}
        <div 
          className="fixed inset-0 transition-opacity backdrop-blur-sm"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className={`inline-block align-bottom ${isDarkMode ? 'bg-black' : 'bg-white'} rounded-md text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
             style={{maxWidth: '450px'}}>
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className={`text-lg leading-6 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Move Cards to Another Collection
                </h3>
                <div className="mt-2">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                    Select a collection to move {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} to:
                  </p>
                  
                  {availableCollections.length === 0 ? (
                    <div className={`${isDarkMode ? 'bg-[#1B2131] text-gray-400' : 'bg-gray-100 text-gray-600'} rounded p-4`}>
                      No other collections available. Please create another collection first.
                    </div>
                  ) : (
                    <select
                      value={targetCollection}
                      onChange={(e) => setTargetCollection(e.target.value)}
                      className={`w-full px-3 py-2 rounded-md ${isDarkMode ? 'bg-[#0F0F0F] text-white border-[#ffffff1a]' : 'bg-white text-gray-900 border-gray-300'} border focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]`}
                    >
                      <option value="">Select a collection...</option>
                      {availableCollections.map(collection => (
                        <option key={collection} value={collection}>
                          {collection}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={`${isDarkMode ? 'bg-black' : 'bg-white'} px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}>
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md px-4 py-2 bg-[#60a5fa] text-base font-medium text-white hover:bg-blue-500 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={!targetCollection || availableCollections.length === 0}
            >
              Move
            </button>
            <button
              type="button"
              className={`mt-3 w-full inline-flex justify-center rounded-md px-4 py-2 ${isDarkMode ? 'bg-[#1B2131] text-white hover:bg-[#252B3B]' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'} text-base font-medium focus:outline-none sm:mt-0 sm:w-auto sm:text-sm`}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
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
