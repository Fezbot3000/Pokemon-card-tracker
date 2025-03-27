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
      
      // Prevent background scrolling when modal is open, but maintain width
      document.body.style.overflow = 'hidden';
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else if (!isOpen) {
      setIsInitialized(false);
      // Restore scrolling
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
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
    
    // Restore scrolling and reset padding
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Call the onClose prop to notify parent component
    onClose();
  };

  if (!isOpen || !isInitialized) return null;

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0B0F19] z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0B0F19]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Mark Cards as Sold
        </h1>
        
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
      
      {/* Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Buyer and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 md:mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
              Buyer <span className="text-red-600 dark:text-red-500">*</span>
            </label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="Enter buyer name"
              className="w-full px-3 py-2 h-10 text-sm rounded-lg border border-gray-300 dark:border-gray-700
                     bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-primary/20 focus:border-primary"
              autoComplete="off"
            />
            {errors.buyer && (
              <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.buyer}</p>
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
              className="w-full px-3 py-2 h-10 text-sm rounded-lg border border-gray-300 dark:border-gray-700
                     bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Selected Cards */}
        <div className="space-y-3 mb-4">
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
            Selected Cards
          </h3>
          {selectedCards.map(card => {
            const soldPrice = parseFloat(soldPrices[card.slabSerial] || '0');
            const investment = parseFloat(card.investmentAUD) || 0;
            const profit = soldPrice - investment;

            return (
              <div 
                key={card.slabSerial}
                className="bg-gray-100 dark:bg-[#151821] rounded-lg p-3 border border-gray-300 dark:border-transparent"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                      {card.card}
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-400">
                      Investment: {formatCurrency(investment)}
                    </p>
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="block text-xs font-medium text-gray-800 dark:text-gray-300 mb-1">
                      Sold Price (AUD) <span className="text-red-600 dark:text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={soldPrices[card.slabSerial]}
                      onChange={(e) => handlePriceChange(card.slabSerial, e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 h-10 text-sm rounded-lg border border-gray-300 dark:border-gray-700
                               bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      autoComplete="off"
                    />
                    {errors[card.slabSerial] && (
                      <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors[card.slabSerial]}</p>
                    )}
                    <div className="text-xs mt-1">
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
        <div className="border-t border-gray-300 dark:border-gray-700 pt-3 mb-20">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-700 dark:text-gray-400 text-xs md:text-sm">Total Sale Price:</span>
              <span className="float-right font-medium text-gray-900 dark:text-white text-xs md:text-sm">
                {formatCurrency(totalSalePrice)}
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-400 text-xs md:text-sm">Total Profit:</span>
              <span className={`float-right font-medium text-xs md:text-sm ${
                totalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
              }`}>
                {formatCurrency(totalProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fixed footer with actions */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0B0F19] z-10">
        <button
          onClick={handleClose}
          className="h-10 px-4 rounded-lg bg-gray-200 dark:bg-gray-800 
                   text-gray-800 dark:text-gray-300 text-sm hover:bg-gray-300 
                   dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm
                   hover:bg-primary/90 transition-colors"
        >
          Confirm Sale
        </button>
      </div>
    </div>
  );
};

export default SaleModal; 