import React, { useState, useEffect, useRef } from 'react';
import { formatValue } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

const NewCardForm = ({ onSubmit, onClose, exchangeRate = 1.5 }) => {
  const [formData, setFormData] = useState({
    player: '',
    card: '',
    set: '',
    year: '',
    category: '',
    condition: '',
    slabSerial: '',
    investmentUSD: '',
    currentValueUSD: '',
    investmentAUD: '',
    currentValueAUD: ''
  });

  // Add state for input currency
  const [inputCurrency, setInputCurrency] = useState('AUD'); // Default to AUD

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    // Allow empty input (will be treated as 0)
    const numValue = value === '' ? '' : parseFloat(value);
    
    setFormData(prev => {
      if (inputCurrency === 'AUD') {
        // User is entering values in AUD
        if (name === 'investmentAUD') {
          return {
            ...prev,
            investmentAUD: numValue,
            investmentUSD: numValue !== '' ? (numValue / exchangeRate).toFixed(2) : ''
          };
        } else if (name === 'currentValueAUD') {
          return {
            ...prev,
            currentValueAUD: numValue,
            currentValueUSD: numValue !== '' ? (numValue / exchangeRate).toFixed(2) : ''
          };
        }
      } else {
        // User is entering values in USD
        if (name === 'investmentUSD') {
          return {
            ...prev,
            investmentUSD: numValue,
            investmentAUD: numValue !== '' ? (numValue * exchangeRate).toFixed(2) : ''
          };
        } else if (name === 'currentValueUSD') {
          return {
            ...prev,
            currentValueUSD: numValue,
            currentValueAUD: numValue !== '' ? (numValue * exchangeRate).toFixed(2) : ''
          };
        }
      }
      return { ...prev, [name]: numValue };
    });
  };

  const handleCurrencyToggle = () => {
    setInputCurrency(prev => prev === 'AUD' ? 'USD' : 'AUD');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.slabSerial) {
      setError('Serial number is required');
      return;
    }
    
    // Calculate potential profit using AUD values (always stored in AUD internally)
    const investmentAUD = parseFloat(formData.investmentAUD) || 0;
    const currentValueAUD = parseFloat(formData.currentValueAUD) || 0;
    const potentialProfit = currentValueAUD - investmentAUD;
    
    try {
      await onSubmit({
        ...formData,
        // Ensure numbers are stored as numbers, not strings
        investmentAUD: investmentAUD,
        currentValueAUD: currentValueAUD,
        investmentUSD: parseFloat(formData.investmentUSD) || 0,
        currentValueUSD: parseFloat(formData.currentValueUSD) || 0,
        potentialProfit
      }, imageFile);
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0B0F19] z-50">
      <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span className="material-icons">close</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="btn btn-primary"
          >
            Add Card
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Upload */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary relative"
               onClick={() => fileInputRef.current?.click()}
               style={{ minHeight: '400px' }}>
            {imagePreview ? (
              <img src={imagePreview} alt="Card preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-center">
                <span className="material-icons text-gray-400 dark:text-gray-600 text-6xl mb-2">add_photo_alternate</span>
                <p className="text-gray-500 dark:text-gray-400">Click to add image</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Form Fields */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Card Details</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Player</label>
                <input
                  type="text"
                  name="player"
                  value={formData.player}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Charizard"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Card Name</label>
                <input
                  type="text"
                  name="card"
                  value={formData.card}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="1999 Pokemon Game"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Set</label>
                <input
                  type="text"
                  name="set"
                  value={formData.set}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Pokemon Game"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="1999"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Pokemon"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                <input
                  type="text"
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="PSA 10"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Serial Number</label>
              <input
                type="text"
                name="slabSerial"
                value={formData.slabSerial}
                onChange={handleInputChange}
                className="input"
                placeholder="12345678"
              />
            </div>

            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Financial Details</h2>
            
            {/* Currency Toggle */}
            <div className="mb-4 flex items-center justify-end">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Input Currency:</span>
              <button 
                onClick={handleCurrencyToggle}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-[#252B3B] hover:bg-[#323B4B]' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <span className={`font-medium ${inputCurrency === 'AUD' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                  AUD
                </span>
                <span className="mx-2 text-gray-500 dark:text-gray-400">/</span>
                <span className={`font-medium ${inputCurrency === 'USD' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                  USD
                </span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {inputCurrency === 'AUD' ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Investment (AUD)</label>
                    <input
                      type="number"
                      name="investmentAUD"
                      value={formData.investmentAUD}
                      onChange={handleNumberInputChange}
                      className="input"
                      placeholder="0"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      USD: ${formatValue(formData.investmentUSD, 'currency', false)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (AUD)</label>
                    <input
                      type="number"
                      name="currentValueAUD"
                      value={formData.currentValueAUD}
                      onChange={handleNumberInputChange}
                      className="input"
                      placeholder="0"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      USD: ${formatValue(formData.currentValueUSD, 'currency', false)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Investment (USD)</label>
                    <input
                      type="number"
                      name="investmentUSD"
                      value={formData.investmentUSD}
                      onChange={handleNumberInputChange}
                      className="input"
                      placeholder="0"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      AUD: ${formatValue(formData.investmentAUD, 'currency', false)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value (USD)</label>
                    <input
                      type="number"
                      name="currentValueUSD"
                      value={formData.currentValueUSD}
                      onChange={handleNumberInputChange}
                      className="input"
                      placeholder="0"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      AUD: ${formatValue(formData.currentValueAUD, 'currency', false)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCardForm;