/**
 * Card Search Results Modal
 * 
 * Displays search results from Price Charting API for card discovery
 * Allows users to select a card and apply its details to the add card form
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import Modal from '../design-system/molecules/Modal';
import ModalButton from '../design-system/atoms/ModalButton';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

const CardSearchModal = ({
  isOpen,
  onClose,
  searchResults,
  isLoading,
  error,
  onSelectCard,
  searchQuery
}) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const { formatAmountForDisplay } = useUserPreferences();

  // Handle card selection
  const handleSelectCard = () => {
    if (!selectedCard) {
      toast.error('Please select a card first');
      return;
    }

    onSelectCard(selectedCard);
    toast.success('Card details applied successfully!');
    onClose();
  };

  // Get card display name
  const getCardDisplayName = (card) => {
    if (card.cardDetails.cardName) {
      return card.cardDetails.cardName;
    }
    // Fallback to cleaning the full product name
    return card.name
      .replace(/^Pokemon\s*/i, '')
      .replace(/\b(PSA|BGS|CGC|SGC)\s*\d+(?:\.\d+)?\b/i, '')
      .trim();
  };

  // Get card set display
  const getCardSetDisplay = (card) => {
    const { set, year } = card.cardDetails;
    if (set && year) return `${set} (${year})`;
    if (set) return set;
    if (year) return year.toString();
    return 'Unknown Set';
  };

  // Get condition display
  const getConditionDisplay = (card) => {
    const { condition, gradingCompany, grade } = card.cardDetails;
    if (condition) return condition;
    if (gradingCompany && grade) return `${gradingCompany} ${grade}`;
    return 'Unknown Condition';
  };

  // Create footer with buttons
  const modalFooter = !isLoading && (
    <div className="flex w-full items-center justify-between">
      <ModalButton variant="secondary" onClick={onClose}>
                  Close
      </ModalButton>
      
      {selectedCard && (
        <ModalButton variant="primary" onClick={handleSelectCard}>
          Apply Card Details
        </ModalButton>
      )}
    </div>
  );

  return createPortal(
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Card Search Results"
      size="modal-width-60"
      position="right"
      closeOnClickOutside={false}
      footer={modalFooter}
    >
      <div className="space-y-6">
        {/* Search Query Info */}
        {searchQuery && (
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
              Searching for:
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              "{searchQuery}"
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center">
            <div className="inline-block size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Searching Price Charting database...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Search Results */}
        {!isLoading && !error && searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Found {searchResults.length} cards:
              </h4>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Select a card to apply its details
              </div>
            </div>
            
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {searchResults.map((card, index) => {
                const isSelected = selectedCard === card;
                const cardName = getCardDisplayName(card);
                const setDisplay = getCardSetDisplay(card);
                const conditionDisplay = getConditionDisplay(card);
                const price = card.bestPrice ? card.bestPrice.price : 0;
                
                return (
                  <div
                    key={card.id || index}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedCard(card)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {cardName}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {setDisplay}
                          </p>
                          {conditionDisplay !== 'Unknown Condition' && (
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              {conditionDisplay}
                            </p>
                          )}
                        </div>
                        
                        {/* Card details preview */}
                        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {card.cardDetails.cardName && (
                            <p><strong>Card:</strong> {card.cardDetails.cardName}</p>
                          )}
                          {card.cardDetails.set && (
                            <p><strong>Set:</strong> {card.cardDetails.set}</p>
                          )}
                          {card.cardDetails.year && (
                            <p><strong>Year:</strong> {card.cardDetails.year}</p>
                          )}
                          {card.cardDetails.holofoil && (
                            <p><strong>Type:</strong> Holofoil</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4 text-right">
                        {price > 0 ? (
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatAmountForDisplay(price, 'USD')}
                          </div>
                        ) : (
                          <div className="text-gray-500 dark:text-gray-400">
                            No price data
                          </div>
                        )}
                        
                        {card.bestPrice && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {card.bestPrice.priceType.replace(/-/g, ' ').toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-3 rounded bg-blue-100 p-2 text-xs text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
                        ✓ Selected - Click "Apply Card Details" to populate the form
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Help text */}
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                💡 <strong>Tip:</strong> Select a card to automatically populate the form with its details including name, set, year, condition, and current market value.
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && searchResults.length === 0 && searchQuery && (
          <div className="py-8 text-center">
            <div className="mb-4 text-gray-400">
              <svg className="mx-auto size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              No cards found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No cards found for "{searchQuery}". Try a different search term or check the spelling.
            </p>
          </div>
        )}
      </div>
    </Modal>,
    document.body
  );
};

CardSearchModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  searchResults: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onSelectCard: PropTypes.func.isRequired,
  searchQuery: PropTypes.string
};

export default CardSearchModal;