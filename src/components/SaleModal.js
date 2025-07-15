import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import Modal from '../design-system/molecules/Modal';
import Icon from '../design-system/atoms/Icon';
import ModalButton from './ui/ModalButton';

const SaleModal = ({ isOpen, onClose, selectedCards, onConfirm }) => {
  const { formatAmountForDisplay, preferredCurrency, convertToUserCurrency } =
    useUserPreferences();
  const [buyer, setBuyer] = useState('');
  const [dateSold, setDateSold] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [soldPrices, setSoldPrices] = useState({});
  const [errors, setErrors] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset state when modal is opened or cards change
  useEffect(() => {
    if (isOpen && selectedCards.length > 0) {
      // Initialize default values
      setBuyer('');
      setDateSold(new Date().toISOString().split('T')[0]);

      // Initialize sold prices with empty strings for all cards
      const initialPrices = {};
      selectedCards.forEach(card => {
        initialPrices[card.slabSerial] = '';
      });

      setSoldPrices(initialPrices);
      setErrors({});
      setIsInitialized(true);
    } else if (!isOpen) {
      setIsInitialized(false);
    }

    // Cleanup on unmount
    return () => {};
  }, [isOpen, selectedCards]);

  // Calculate total investment with proper currency conversion
  const totalInvestment = selectedCards.reduce((sum, card) => {
    const investment =
      parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0;
    const investmentInPreferredCurrency = convertToUserCurrency(
      investment,
      card.originalInvestmentCurrency || preferredCurrency.code
    );
    return sum + investmentInPreferredCurrency;
  }, 0);

  const totalSalePrice = Object.values(soldPrices).reduce(
    (sum, price) => sum + (parseFloat(price) || 0),
    0
  );
  const totalProfit = totalSalePrice - totalInvestment;

  const handlePriceChange = (slabSerial, value) => {
    setSoldPrices(prev => ({
      ...prev,
      [slabSerial]: value,
    }));
    // Clear error when user starts typing
    if (errors[slabSerial]) {
      setErrors(prev => ({
        ...prev,
        [slabSerial]: null,
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!buyer.trim()) {
      newErrors.buyer = "Please enter the buyer's name";
    }

    selectedCards.forEach(card => {
      const price = parseFloat(soldPrices[card.slabSerial]);
      if (!price || isNaN(price) || price <= 0) {
        newErrors[card.slabSerial] = 'Please enter a valid price';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onConfirm({
        buyer,
        dateSold,
        soldPrices,
        totalSalePrice,
        totalProfit,
      });
    }
  };

  const handleClose = () => {
    // Reset all state
    setBuyer('');
    setDateSold(new Date().toISOString().split('T')[0]);
    setSoldPrices({});
    setErrors({});
    setIsInitialized(false);

    // Call the onClose prop to notify parent component
    onClose();
  };

  if (!isOpen || !isInitialized) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mark Cards as Sold"
      position="right"
      size="2xl"
      closeOnClickOutside={true}
      footer={
        <div className="flex w-full items-center justify-between">
          <ModalButton variant="secondary" onClick={handleClose}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSubmit}
            leftIcon={<Icon name="sell" />}
          >
            Confirm Sale
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Buyer and Date */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Buyer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={buyer}
              onChange={e => setBuyer(e.target.value)}
              placeholder="Enter buyer name"
              className="w-full rounded-lg border border-[#ffffff33] bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#ffffff1a] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400"
            />
            {errors.buyer && (
              <p className="mt-1 text-sm text-red-500">{errors.buyer}</p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date Sold
            </label>
            <input
              type="date"
              value={dateSold}
              onChange={e => setDateSold(e.target.value)}
              className="w-full rounded-lg border border-[#ffffff33] bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#ffffff1a] dark:bg-[#0F0F0F] dark:text-white"
            />
          </div>
        </div>

        {/* Selected Cards */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Selected Cards
          </h3>
          <div className="space-y-4">
            {selectedCards.map(card => {
              const soldPrice = parseFloat(soldPrices[card.slabSerial] || '0');
              const investment =
                parseFloat(
                  card.originalInvestmentAmount || card.investmentAUD
                ) || 0;
              const investmentInPreferredCurrency = convertToUserCurrency(
                investment,
                card.originalInvestmentCurrency || preferredCurrency.code
              );
              const profit = soldPrice - investmentInPreferredCurrency;

              return (
                <div
                  key={card.slabSerial}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {card.card ||
                          card.name ||
                          card.player ||
                          'Unnamed Card'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Investment:{' '}
                        {formatAmountForDisplay(
                          investment,
                          card.originalInvestmentCurrency ||
                            preferredCurrency.code
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sold Price ({preferredCurrency.code}){' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          {preferredCurrency.symbol}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={soldPrices[card.slabSerial]}
                          onChange={e =>
                            handlePriceChange(card.slabSerial, e.target.value)
                          }
                          step="0.01"
                          min="0"
                          className="w-full rounded-lg border border-[#ffffff33] bg-white py-2 pl-8 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-[#ffffff1a] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-gray-400"
                          placeholder="0.00"
                        />
                      </div>
                      {errors[card.slabSerial] && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors[card.slabSerial]}
                        </p>
                      )}
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Profit:{' '}
                        </span>
                        <span
                          className={
                            profit >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {formatAmountForDisplay(
                            profit,
                            preferredCurrency.code
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Total Sale Price:
                </span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatAmountForDisplay(
                    totalSalePrice,
                    preferredCurrency.code
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Total Profit:
                </span>
                <div
                  className={`font-semibold ${
                    totalProfit >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatAmountForDisplay(totalProfit, preferredCurrency.code)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SaleModal;
