import React, { useState, useEffect, useRef } from 'react';
import { formatValue } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

const NewCardForm = ({ onSubmit, onClose, exchangeRate }) => {
  const [formData, setFormData] = useState({
    player: '',
    card: '',
    set: '',
    year: '',
    category: '',
    condition: '',
    slabSerial: '',
    investmentUSD: 0,
    currentValueUSD: 0,
    investmentAUD: 0,
    currentValueAUD: 0
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const { isDark } = useTheme();

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
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [name]: numValue,
      [`${name.replace('USD', 'AUD')}`]: numValue * (exchangeRate || 1.5)
    }));
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
    try {
      await onSubmit(formData, imageFile);
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`sticky top-0 z-10 flex justify-between items-center px-8 py-4 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <button 
          className={`text-3xl hover:text-primary transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          onClick={onClose}
        >
          ×
        </button>
        <div className="flex items-center gap-4">
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            onClick={handleSubmit}
          >
            Add Card
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div 
              className={`
                relative aspect-[3/4] rounded-lg overflow-hidden
                ${imagePreview 
                  ? isDark ? 'bg-gray-800' : 'bg-gray-50' 
                  : isDark ? 'bg-gray-800' : 'bg-white'
                }
                border-2 border-dashed ${
                  isDark ? 'border-gray-700 hover:border-primary' : 'border-gray-300 hover:border-primary'
                } transition-colors cursor-pointer
              `}
              onClick={() => fileInputRef.current.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Card Preview" className="w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`material-icons text-6xl mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
                    add_photo_alternate
                  </span>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Click to add image
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Card Details
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Player
                  </label>
                  <input
                    type="text"
                    name="player"
                    value={formData.player}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Card Name
                  </label>
                  <input
                    type="text"
                    name="card"
                    value={formData.card}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Set
                  </label>
                  <input
                    type="text"
                    name="set"
                    value={formData.set}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Year
                  </label>
                  <input
                    type="text"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Condition
                  </label>
                  <input
                    type="text"
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    name="slabSerial"
                    value={formData.slabSerial}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Financial Details
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Investment (USD)
                  </label>
                  <input
                    type="number"
                    name="investmentUSD"
                    value={formData.investmentUSD}
                    onChange={handleNumberInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    step="0.01"
                  />
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                    AUD: ${(formData.investmentUSD * exchangeRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                    Current Value (USD)
                  </label>
                  <input
                    type="number"
                    name="currentValueUSD"
                    value={formData.currentValueUSD}
                    onChange={handleNumberInputChange}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    step="0.01"
                  />
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                    AUD: ${(formData.currentValueUSD * exchangeRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className={`p-4 rounded-lg ${
                isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'
              }`}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCardForm;