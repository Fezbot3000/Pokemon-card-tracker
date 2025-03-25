import React, { useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ImportModal = ({ isOpen, onClose, onImport, mode = 'priceUpdate', loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const validateFile = (file) => {
    if (!file) {
      throw new Error('No file selected');
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Please upload a CSV file');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size too large. Maximum size is 10MB');
    }
  };

  const handleFile = async (file) => {
    try {
      setError(null);
      validateFile(file);
      await onImport(file);
    } catch (err) {
      setError(err.message);
      console.error('Import error:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    if (!loading) {
      fileInputRef.current?.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl mx-4 p-6 rounded-xl shadow-lg bg-[#0B0F19]">
        <h2 className="text-xl font-semibold mb-4 text-white">{mode === 'baseData' ? 'Import Base Data' : 'Update Card Prices'}</h2>
        
        <div 
          className={`border-2 border-dashed ${dragActive ? 'border-primary bg-primary/5' : 'border-blue-500/50'} rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="material-icons text-gray-400 dark:text-gray-600 text-5xl mb-4">description</span>
          <p className="text-lg font-medium text-white mb-1">Drop your CSV file here</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">or click to select a file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleChange}
          />
        </div>

        {/* Show error message if any */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Show loading indicator only when actually loading */}
        {loading && (
          <div className="mt-4 flex justify-center">
            <button className="btn btn-secondary flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Processing...
            </button>
          </div>
        )}
        
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4 text-white">
            {mode === 'baseData' ? 'Base Data Import Instructions' : 'Price Update Instructions'}
          </h3>
          
          {mode === 'baseData' ? (
            <>
              <p className="text-gray-300 mb-4">Your CSV file should include the following columns:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-400">
                <li>Slab Serial # - Unique identifier for each card</li>
                <li>Investment - Investment amount in USD</li>
                <li>Current Value - Current value in USD</li>
                <li>Card - Card name</li>
                <li>Player - Pokémon name</li>
                <li>Year - Card year</li>
                <li>Set - Card set</li>
                <li>Category - Card category</li>
                <li>Condition - Card condition</li>
              </ul>
              
              <div className="mt-6 p-4 bg-purple-900/30 border border-purple-500/50 rounded-lg">
                <p className="text-purple-200 text-sm">
                  <strong>Note:</strong> All USD values will be converted to AUD using the current exchange rate. For price updates only, use
                  the "Update Prices" option instead.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-4">Your CSV file should include the following columns:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-400">
                <li>Slab Serial # - Unique identifier for each card</li>
                <li>Current Value - Current value in USD (will be converted to AUD)</li>
              </ul>
              
              <div className="mt-6 p-4 bg-purple-900/30 border border-purple-500/50 rounded-lg">
                <p className="text-purple-200 text-sm">
                  <strong>Important:</strong> This import will ONLY update the current values and optional card details. Investment values will
                  not be modified to preserve your cost basis data.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            className="btn btn-secondary mr-3"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal; 