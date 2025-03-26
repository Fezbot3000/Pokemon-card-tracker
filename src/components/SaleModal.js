import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currencyAPI';

const SaleModal = ({ isOpen, onClose, selectedCards, onConfirm }) => {
  const [buyer, setBuyer] = useState('');
  const [dateSold, setDateSold] = useState(new Date().toISOString().split('T')[0]);
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
  }, [isOpen, selectedCards]);

  const totalInvestment = selectedCards.reduce((sum, card) => sum + (parseFloat(card.investmentAUD) || 0), 0);
  const totalSalePrice = Object.values(soldPrices).reduce((sum, price) => sum + (parseFloat(price) || 0), 0);
  const totalProfit = totalSalePrice - totalInvestment;

  const handlePriceChange = (slabSerial, value) => {
    setSoldPrices(prev => ({
      ...prev,
      [slabSerial]: value
    }));
    // Clear error when user starts typing
    if (errors[slabSerial]) {
      setErrors(prev => ({
        ...prev,
        [slabSerial]: null
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
        newErrors[card.slabSerial] = "Please enter a valid price";
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
        totalProfit
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1B2131] rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">
            Mark Cards as Sold
          </h2>

          {/* Buyer and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                Buyer <span className="text-red-600 dark:text-red-500">*</span>
              </label>
              <input
                type="text"
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder="Enter buyer name"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                         bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.buyer && (
                <p className="text-red-600 dark:text-red-500 text-sm mt-1">{errors.buyer}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                Date Sold
              </label>
              <input
                type="date"
                value={dateSold}
                onChange={(e) => setDateSold(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                         bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Selected Cards */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Selected Cards
            </h3>
            {selectedCards.map(card => {
              const soldPrice = parseFloat(soldPrices[card.slabSerial] || '0');
              const investment = parseFloat(card.investmentAUD) || 0;
              const profit = soldPrice - investment;

              return (
                <div 
                  key={card.slabSerial}
                  className="bg-gray-100 dark:bg-[#151821] rounded-lg p-4 border border-gray-300 dark:border-transparent"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {card.card}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-400">
                        Investment: {formatCurrency(investment)}
                      </p>
                    </div>
                    <div className="sm:w-48">
                      <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                        Sold Price (AUD) <span className="text-red-600 dark:text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={soldPrices[card.slabSerial]}
                        onChange={(e) => handlePriceChange(card.slabSerial, e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700
                                 bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      {errors[card.slabSerial] && (
                        <p className="text-red-600 dark:text-red-500 text-sm mt-1">{errors[card.slabSerial]}</p>
                      )}
                      <div className="text-sm mt-1">
                        Profit: {' '}
                        <span className={profit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                          {formatCurrency(profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-300 dark:border-gray-700 pt-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-700 dark:text-gray-400">Total Sale Price:</span>
                <span className="float-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(totalSalePrice)}
                </span>
              </div>
              <div>
                <span className="text-gray-700 dark:text-gray-400">Total Profit:</span>
                <span className={`float-right font-medium ${
                  totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {formatCurrency(totalProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 
                       text-gray-800 dark:text-gray-300 hover:bg-gray-300 
                       dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-primary text-white 
                       hover:bg-primary/90 transition-colors"
            >
              Confirm Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleModal; 