import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../design-system';
import { preventBodyScroll, restoreBodyScroll } from '../utils/modalUtils';

const ImportModal = ({ isOpen, onClose, onImport, mode = 'priceUpdate', loading }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Add state for import options
  const [importCurrency, setImportCurrency] = useState('USD');
  const [fillMissingFields, setFillMissingFields] = useState(true);
  const [updateExistingValues, setUpdateExistingValues] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Manage body scroll prevention
  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      preventBodyScroll();
    } else {
      setModalVisible(false);
      restoreBodyScroll();
    }
    
    return () => {
      restoreBodyScroll();
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
          file.name.toLowerCase().endsWith('.csv')
        );
        if (files.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        }
      } else {
        // For base data import, only one file at a time
        if (e.dataTransfer.files[0].name.toLowerCase().endsWith('.csv')) {
          onImport(e.dataTransfer.files[0]);
        }
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      
      if (mode === 'priceUpdate') {
        // For price update, allow multiple files
        const files = Array.from(e.target.files).filter(file => 
          file.name.toLowerCase().endsWith('.csv')
        );
        
        if (files.length > 0) {
          setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        }
      } else {
        // For base data import, only one file at a time
        const file = e.target.files[0];
        
        if (file && file.name.toLowerCase().endsWith('.csv')) {
          onImport(file);
        }
      }
    }
  };

  const triggerFileInput = () => {
    // Add a small delay to help iOS recognize the click
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmitFiles = () => {
    if (selectedFiles.length > 0) {
      // Include import options with the files
      onImport(selectedFiles, {
        currency: importCurrency,
        fillMissingFields,
        updateExistingValues
      });
    }
  };

  if (!modalVisible) return null;

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0B0F19] z-50 flex flex-col modal-content">
      <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {mode === 'baseData' ? 'Import Base Data' : 'Update Card Data'}
        </h1>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 overflow-y-auto flex-1" onScroll={(e) => e.stopPropagation()}>
        {mode === 'priceUpdate' && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="material-icons text-blue-500 mr-2 mt-0.5">info</span>
              <div>
                <h3 className="text-blue-700 dark:text-blue-400 font-medium mb-1">Multi-CSV Import</h3>
                <p className="text-blue-600 dark:text-blue-300 text-sm">
                  You can upload multiple CSV files at once to update card data across all collections.
                  The system will match cards by Slab Serial # and update their information accordingly.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`border-2 border-dashed ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600'} rounded-lg p-10 text-center cursor-pointer transition-colors duration-200`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={mode === 'priceUpdate'}
            accept=".csv"
            onChange={handleChange}
            className="hidden"
            disabled={loading}
          />
          
          <div
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <span className="material-icons text-4xl text-gray-400 dark:text-gray-500 mb-2">
              upload_file
            </span>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
              Drop your CSV file(s) here
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              or click to select multiple files
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              onClick={triggerFileInput}
              disabled={loading}
            >
              Select CSV Files
            </button>
          </div>
        </div>

        {/* Import Options */}
        {mode === 'priceUpdate' && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1B2131] rounded-lg border border-gray-200 dark:border-gray-700/50">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Import Options</h3>
            <div className="flex flex-col items-start space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4 mb-4">
              {/* Currency Selector */}
              <div>
                <label htmlFor="importCurrency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                <select 
                  value={importCurrency} 
                  onChange={(e) => setImportCurrency(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="USD">USD (US Dollar)</option>
                  <option value="AUD">AUD (Australian Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="JPY">JPY (Japanese Yen)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select the currency used in your CSV file. Values will be converted to AUD.
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="fillMissingFields"
                  checked={fillMissingFields}
                  onChange={(e) => setFillMissingFields(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="fillMissingFields" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Fill in missing card data fields (name, condition, etc.)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="updateExistingValues"
                  checked={updateExistingValues}
                  onChange={(e) => setUpdateExistingValues(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="updateExistingValues" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Update existing values (uncheck to only fill empty fields)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              Selected Files ({selectedFiles.length})
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
                className={`btn btn-primary ${
                  (loading || selectedFiles.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Processing...' : `Update Cards (${selectedFiles.length} files)`}
              </button>
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            CSV Format Instructions
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your CSV file should include the following columns:
          </p>
          
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-8 pl-4">
            <li><strong>Slab Serial #</strong> - Unique identifier for each card (required)</li>
            <li><strong>Current Value</strong> - Current value in your selected currency</li>
            <li><strong>Card</strong> - Card name</li>
            <li><strong>Player</strong> - Pokémon or player name</li>
            <li><strong>Year</strong> - Card year</li>
            <li><strong>Set</strong> - Card set</li>
            <li><strong>Category</strong> - Card category</li>
            <li><strong>Condition</strong> - Card condition</li>
            <li><strong>Population</strong> - Card population count</li>
          </ul>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 p-4 rounded-md">
            <p className="mb-2">
              <strong>Multiple File Upload:</strong> You can upload multiple CSV files at once. The system will match cards across all collections by Slab Serial #.
            </p>
            <p className="mb-2">
              <strong>Works Across All Collections:</strong> Updates will be applied to all matching cards in any collection - no need to pre-select a specific collection.
            </p>
            <p className="mb-2">
              <strong>Data Completion:</strong> With "Fill in missing data fields" enabled, the system will add any missing information to your cards while preserving existing data.
            </p>
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
              <p className="font-medium mb-2">CSV Format Example:</p>
              <div className="bg-white dark:bg-gray-800 rounded p-2 overflow-x-auto text-sm font-mono">
                Slab Serial #,Current Value,Card,Player,Set,Condition,Population<br/>
                12345678,150,Charizard,Charizard,Base Set,PSA 9,1200<br/>
                87654321,290,Blastoise,Blastoise,Base Set,PSA 10,350<br/>
                ...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;