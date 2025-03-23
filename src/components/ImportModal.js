import React, { useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ImportModal = ({ isOpen, onClose, onImport, mode = 'priceUpdate', loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();

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
    <div className="fixed inset-0 bg-white dark:bg-[#0B0F19] z-50">
      <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {mode === 'baseData' ? 'Import Base Data' : 'Update Card Prices'}
        </h1>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div 
          className={`
            border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center
            ${dragActive ? 'border-primary dark:border-primary bg-primary/5 dark:bg-primary/10' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center mb-4">
            <span className="material-icons text-gray-400 dark:text-gray-600 text-5xl mb-4">description</span>
            <p className="text-gray-800 dark:text-gray-200 text-lg mb-2">Drop your CSV file here</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">or click to select a file</p>
          </div>
          
          <button
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Select File'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleChange}
          />
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Price Update Instructions
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your CSV file should include the following columns:
          </p>
          
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-8 pl-4">
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
          
          <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 p-4 rounded-md">
            {mode === 'priceUpdate' ? (
              "Important: This import will ONLY update the current values and optional card details. Investment values will not be modified to preserve your cost basis data."
            ) : (
              "Note: All USD values will be converted to AUD using the current exchange rate. For price updates only, use the \"Update Prices\" option instead."
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal; 