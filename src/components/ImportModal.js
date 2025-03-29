import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ImportModal = ({ isOpen, onClose, onImport, mode = 'priceUpdate', loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Manage body overflow and padding to prevent page jumping
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Prevent background scrolling but compensate for scrollbar width
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      // Restore scrolling on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (mode === 'priceUpdate') {
        // For price update, allow multiple files
        const files = Array.from(e.dataTransfer.files).filter(file => 
          file.type === "text/csv" || file.name.endsWith('.csv')
        );
        if (files.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        }
      } else {
        // For base data import, only one file at a time
        onImport(e.dataTransfer.files[0]);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      if (mode === 'priceUpdate') {
        // For price update, allow multiple files
        const files = Array.from(e.target.files).filter(file => 
          file.type === "text/csv" || file.name.endsWith('.csv')
        );
        if (files.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        }
      } else {
        // For base data import, only one file at a time
        onImport(e.target.files[0]);
      }
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmitFiles = () => {
    if (selectedFiles.length > 0) {
      onImport(selectedFiles);
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
            ${dragActive ? 'border-purple-400 dark:border-purple-500 bg-purple-50/80 dark:bg-purple-900/10' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-center mb-4">
            <span className="material-icons text-gray-400 dark:text-gray-600 text-5xl mb-4">description</span>
            <p className="text-gray-800 dark:text-gray-200 text-lg mb-2">
              {mode === 'priceUpdate' 
                ? 'Drop your CSV file(s) here' 
                : 'Drop your CSV file here'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {mode === 'priceUpdate' 
                ? 'or click to select multiple files' 
                : 'or click to select a file'}
            </p>
            
            {/* Show badge for selected files if in price update mode */}
            {mode === 'priceUpdate' && selectedFiles.length > 0 && (
              <div className="inline-flex items-center px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary">
                <span className="material-icons text-sm mr-1.5">check_circle</span>
                <span className="text-sm font-medium">{selectedFiles.length} file(s) selected</span>
              </div>
            )}
          </div>
          
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? 'Processing...' : (mode === 'priceUpdate' ? 'Select CSV Files' : 'Select File')}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleChange}
            multiple={mode === 'priceUpdate'}
          />
        </div>

        {/* Display selected files for price update mode */}
        {mode === 'priceUpdate' && selectedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Selected CSV Files ({selectedFiles.length})
            </h3>
            
            <ul className="space-y-2 mb-4">
              {selectedFiles.map((file, index) => (
                <li 
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between bg-gray-50 dark:bg-[#1B2131] p-3 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="material-icons text-primary mr-2">description</span>
                    <span className="text-gray-900 dark:text-white">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveFile(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </li>
              ))}
            </ul>
            
            <div className="flex justify-end">
              <button
                onClick={handleSubmitFiles}
                disabled={loading || selectedFiles.length === 0}
                className={`btn btn-primary flex items-center gap-2 ${
                  (loading || selectedFiles.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons">update</span>
                    <span>Update Prices for All {selectedFiles.length} Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
              <>
                <p className="mb-2 font-semibold">
                  <strong>Multiple File Upload:</strong> Upload multiple CSV files at once to update your entire collection.
                </p>
                <p className="mb-2">
                  How it works:
                </p>
                <ul className="list-disc pl-5 mb-2 space-y-1">
                  <li>Each CSV file should contain Slab Serial # and Current Value columns.</li>
                  <li>The system identifies cards across all your collections by matching Slab Serial #.</li>
                  <li>All cards from all collections will be updated in one go.</li>
                  <li>If a card in your CSV doesn't exist in any collection, it will be added as a new card.</li>
                  <li>New cards will be added to your first collection automatically.</li>
                </ul>
                <p className="mt-2 italic">
                  Tip: You can organize your CSV files by set, category, or any other criteria to make price updates more manageable.
                </p>
              </>
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