import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import PSADetailModal from './PSADetailModal';

/**
 * PSA Lookup Button Component
 * Allows users to search for a card by PSA certification number
 */
const PSALookupButton = ({ currentCardData, onCardUpdate, buttonText = "PSA Lookup" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [showLookupForm, setShowLookupForm] = useState(false);

  // Handle PSA lookup button click
  const handleLookupClick = () => {
    setShowLookupForm(true);
  };

  // Handle the form submission to search PSA
  const handleSubmit = (e) => {
    e.preventDefault();
    if (certNumber) {
      setIsModalOpen(true);
      setShowLookupForm(false);
    }
  };

  // Handle canceling the lookup
  const handleCancel = () => {
    setShowLookupForm(false);
    setCertNumber('');
  };

  // Handle applying PSA details to the card
  const handleApplyDetails = (updatedCardData) => {
    onCardUpdate(updatedCardData);
    setIsModalOpen(false);
    setCertNumber('');
  };

  return (
    <>
      {!showLookupForm ? (
        <Button
          variant="secondary"
          onClick={handleLookupClick}
          className="flex items-center gap-2"
        >
          <Icon name="search" size="sm" />
          {buttonText}
        </Button>
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
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        </form>
      )}

      <PSADetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        certNumber={certNumber}
        currentCardData={currentCardData}
        onApplyDetails={handleApplyDetails}
      />
    </>
  );
};

PSALookupButton.propTypes = {
  currentCardData: PropTypes.object,
  onCardUpdate: PropTypes.func.isRequired,
  buttonText: PropTypes.string
};

export default PSALookupButton;
