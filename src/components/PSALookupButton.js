import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import PSADetailModal from './PSADetailModal';
import { useSubscription } from '../hooks/useSubscription';
import { toast } from 'react-hot-toast';

/**
 * PSA Lookup Button Component
 * Allows users to search for a card by PSA certification number
 */
const PSALookupButton = ({
  currentCardData,
  onCardUpdate,
  iconOnly = false,
  buttonText = 'Search PSA',
  onLoadingChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { hasFeature } = useSubscription();

  // Update certNumber when currentCardData changes
  useEffect(() => {
    if (currentCardData && currentCardData.slabSerial) {
      setCertNumber(currentCardData.slabSerial);
    }
  }, [currentCardData]);

  // Notify parent about loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  // Handle PSA lookup button click
  const handleLookupClick = () => {
    // Check subscription access first
    if (!hasFeature('PSA_SEARCH')) {
      toast.error(
        'PSA search is available with Premium. Upgrade to access this feature!'
      );
      return;
    }

    // If we already have a serial number on the card, use it directly
    if (currentCardData && currentCardData.slabSerial) {
      setCertNumber(currentCardData.slabSerial);
      setIsLoading(true);
      setIsModalOpen(true);
    } else {
      // Otherwise show the form to enter a serial number
      setShowLookupForm(true);
    }
  };

  // Handle the form submission to search PSA
  const handleSubmit = e => {
    e.preventDefault();

    // Check subscription access first
    if (!hasFeature('PSA_SEARCH')) {
      toast.error(
        'PSA search is available with Premium. Upgrade to access this feature!'
      );
      return;
    }

    if (certNumber) {
      setIsLoading(true);
      setIsModalOpen(true);
      setShowLookupForm(false);
    }
  };

  // Handle canceling the lookup
  const handleCancel = () => {
    setShowLookupForm(false);
    // Don't reset the cert number if it came from the card
    if (!currentCardData || !currentCardData.slabSerial) {
      setCertNumber('');
    }
  };

  // Handle applying PSA details to the card
  const handleApplyDetails = updatedCardData => {
    onCardUpdate(updatedCardData);
    setIsModalOpen(false);
    setIsLoading(false);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsLoading(false);
  };

  // Reset loading state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setIsLoading(false);
    }
  }, [isModalOpen]);

  return (
    <>
      {!showLookupForm ? (
        iconOnly ? (
          <button
            type="button"
            onClick={handleLookupClick}
            className={`rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              !hasFeature('PSA_SEARCH')
                ? 'cursor-not-allowed bg-gray-300 dark:bg-gray-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label={
              !hasFeature('PSA_SEARCH')
                ? 'PSA search requires Premium subscription'
                : buttonText || 'Reload PSA Data'
            }
            disabled={isLoading || !hasFeature('PSA_SEARCH')}
            title={
              !hasFeature('PSA_SEARCH')
                ? 'PSA search requires Premium subscription'
                : undefined
            }
          >
            {isLoading ? (
              <div className="size-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            ) : !hasFeature('PSA_SEARCH') ? (
              <Icon name="lock" size="sm" />
            ) : (
              <Icon
                name={currentCardData?.slabSerial ? 'refresh' : 'search'}
                size="sm"
              />
            )}
          </button>
        ) : (
          <Button
            variant="secondary"
            onClick={handleLookupClick}
            className="flex items-center gap-2"
            disabled={isLoading || !hasFeature('PSA_SEARCH')}
            title={
              !hasFeature('PSA_SEARCH')
                ? 'PSA search requires Premium subscription'
                : undefined
            }
          >
            {isLoading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            ) : !hasFeature('PSA_SEARCH') ? (
              <Icon name="lock" size="sm" />
            ) : (
              <Icon name="search" size="sm" />
            )}
            {!hasFeature('PSA_SEARCH') ? 'Premium Feature' : buttonText}
          </Button>
        )
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={certNumber}
            onChange={e => setCertNumber(e.target.value)}
            placeholder="Enter PSA cert #"
            className="focus:ring-[var(--primary-light)]/20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[var(--primary)] focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            autoFocus
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading || !hasFeature('PSA_SEARCH')}
            title={
              !hasFeature('PSA_SEARCH')
                ? 'PSA search requires Premium subscription'
                : undefined
            }
          >
            {isLoading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            ) : !hasFeature('PSA_SEARCH') ? (
              'Premium'
            ) : (
              'Search'
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </form>
      )}

      <PSADetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        certNumber={certNumber}
        currentCardData={currentCardData}
        onApplyDetails={handleApplyDetails}
        autoApply={true}
      />
    </>
  );
};

PSALookupButton.propTypes = {
  currentCardData: PropTypes.object,
  onCardUpdate: PropTypes.func.isRequired,
  iconOnly: PropTypes.bool,
  buttonText: PropTypes.string,
  onLoadingChange: PropTypes.func,
};

export default PSALookupButton;
