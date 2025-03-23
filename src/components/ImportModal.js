import React, { useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ImportModal = ({ isOpen, onClose, onImport, mode = 'priceUpdate', loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isDark } = useTheme();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImport(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`sticky top-0 z-10 flex justify-between items-center px-8 py-4 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {mode === 'priceUpdate' ? 'Update Card Prices' : 'Import Base Data'}
        </h2>
        <button 
          className={`text-3xl hover:text-primary transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div 
          className={`
            relative p-8 border-2 border-dashed rounded-lg
            ${dragActive 
              ? 'border-primary bg-primary/5' 
              : isDark 
                ? 'border-gray-700 bg-gray-800' 
                : 'border-gray-300 bg-white'
            }
            transition-colors
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleChange}
          />

          <div className="flex flex-col items-center justify-center text-center">
            <span className={`material-icons text-4xl mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>upload_file</span>
            <div className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Drop your CSV file here
            </div>
            <div className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              or click to select a file
            </div>
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Select File'}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Price Update Instructions</h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Your CSV file should include the following columns:</p>
          <ul className={`list-disc list-inside space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <li>Slab Serial # - Unique identifier for each card</li>
            {mode === 'priceUpdate' ? (
              <li>Current Value - Current value in USD (will be converted to AUD)</li>
            ) : (
              <>
                <li>Investment - Investment amount in USD</li>
                <li>Current Value - Current value in USD</li>
                <li>Card - Card name</li>
                <li>Player - Pokémon name</li>
                <li>Year - Card year</li>
                <li>Set - Card set</li>
                <li>Category - Card category</li>
                <li>Condition - Card condition</li>
              </>
            )}
          </ul>
          {mode === 'priceUpdate' && (
            <div className={`p-4 rounded-lg text-sm ${
              isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
            }`}>
              Important: This import will ONLY update the current values and optional card details. Investment values will not be modified to preserve your cost basis data.
            </div>
          )}
          {mode === 'baseData' && (
            <div className={`p-4 rounded-lg text-sm ${
              isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
            }`}>
              Note: All USD values will be converted to AUD using the current exchange rate. For price updates only, use the "Update Prices" option instead.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal; 