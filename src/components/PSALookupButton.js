import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import PSADetailModal from './PSADetailModal';

/**
 * PSA Lookup Button Component
 * Allows users to search for a card by PSA certification number
 */
const PSALookupButton = ({ currentCardData, onCardUpdate, iconOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [showLookupForm, setShowLookupForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Update certNumber when currentCardData changes
  useEffect(() => {
    if (currentCardData && currentCardData.slabSerial) {
      setCertNumber(currentCardData.slabSerial);
    }
  }, [currentCardData]);

  // Handle PSA lookup button click
  const handleLookupClick = () => {
    // If we already have a serial number on the card, use it directly
    if (currentCardData && currentCardData.slabSerial) {
      console.log('[PSALookupButton] Using existing serial number:', currentCardData.slabSerial);
      setCertNumber(currentCardData.slabSerial);
      setIsLoading(true);
      setIsModalOpen(true);
    } else {
      // Otherwise show the form to enter a serial number
      setShowLookupForm(true);
    }
  };

  // Handle the form submission to search PSA
  const handleSubmit = (e) => {
    e.preventDefault();
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
  const handleApplyDetails = (updatedCardData) => {
    onCardUpdate(updatedCardData);
    setIsModalOpen(false);
    setIsLoading(false);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsLoading(false);
  };

  return (
    <>
      {!showLookupForm ? (
        iconOnly ? (
          <button
            type="button"
            onClick={handleLookupClick}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search PSA"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
            ) : (
              <Icon name="search" size="sm" />
            )}
          </button>
        ) : (
          <Button
            variant="secondary"
            onClick={handleLookupClick}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
            ) : (
              <Icon name="search" size="sm" />
            )}
            {!iconOnly && "Search PSA"}
          </Button>
        )
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
            placeholder="Enter PSA cert #"
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary-light)]/20 focus:border-[var(--primary)]"
            autoFocus
          />
          <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
            ) : (
              "Search"
            )}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
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
  iconOnly: PropTypes.bool
};

export default PSALookupButton;
