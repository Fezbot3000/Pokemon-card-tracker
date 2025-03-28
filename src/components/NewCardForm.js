import React, { useState, useEffect, useRef } from 'react';
import { formatValue } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import { parseCSVFile, validateCSVStructure } from '../utils/dataProcessor';
import { db } from '../services/db';

const NewCardForm = ({ onSubmit, onClose, exchangeRate = 1.5, collections = {}, selectedCollection }) => {
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

  // Add state for selected collection
  const [targetCollection, setTargetCollection] = useState(selectedCollection);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);

  // Add state for input currency
  const [inputCurrency, setInputCurrency] = useState('AUD'); // Default to AUD

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();

  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef(null);
  
  // Use activeTab instead of showBatchImport
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'
  const [batchImportDragActive, setBatchImportDragActive] = useState(false);
  const batchFileInputRef = useRef(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importSuccess, setImportSuccess] = useState(null);

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

  // Manage body overflow and padding to prevent page jumping
  useEffect(() => {
    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    // Prevent background scrolling but compensate for scrollbar width
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.classList.add('modal-open');
    
    return () => {
      // Restore scrolling on unmount
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
    };
  }, []);

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
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please drop an image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.onerror = () => {
        toast.error('Error reading file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const errors = [];
    
    if (!formData.slabSerial) {
      errors.push('Serial number is required');
    }

    if (!targetCollection || targetCollection === 'All Cards') {
      errors.push('Please select a valid collection');
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
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
      }, imageFile, targetCollection);
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Batch import handlers
  const handleBatchImportDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setBatchImportDragActive(true);
    } else if (e.type === "dragleave") {
      setBatchImportDragActive(false);
    }
  };

  const handleBatchImportDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchImportDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBatchImport(e.dataTransfer.files[0]);
    }
  };

  const handleBatchFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleBatchImport(e.target.files[0]);
    }
  };

  const handleBatchImport = async (file) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    if (!targetCollection || targetCollection === 'All Cards') {
      toast.error("Please select a valid collection");
      return;
    }

    setImportLoading(true);
    setImportErrors([]);
    setImportSuccess(null);
    
    try {
      // Parse the CSV file
      const parsedData = await parseCSVFile(file);
      
      // Validate the structure
      const validation = validateCSVStructure(parsedData, 'baseData');
      if (!validation.success) {
        throw new Error(validation.error);
      }

      // Get the current collection cards
      const currentCollections = await db.getCollections();
      const collectionCards = currentCollections[targetCollection] || [];
      
      // Process each card in the import
      const newCards = [];
      const duplicates = [];
      
      for (const importedCard of parsedData) {
        const slabSerial = importedCard['Slab Serial #']?.toString();
        if (!slabSerial) {
          continue; // Skip cards without a serial number
        }
        
        // Check if card already exists in the collection
        const exists = collectionCards.some(card => 
          card.slabSerial?.toString() === slabSerial
        );
        
        if (exists) {
          duplicates.push(slabSerial);
          continue;
        }
        
        // Add the new card
        const currentValueUSD = parseFloat(importedCard['Current Value']) || 0;
        const investmentUSD = parseFloat(importedCard['Investment']) || 0;
        const currentValueAUD = Number((currentValueUSD * exchangeRate).toFixed(2));
        const investmentAUD = Number((investmentUSD * exchangeRate).toFixed(2));
        const potentialProfit = currentValueAUD - investmentAUD;
        
        const newCard = {
          id: slabSerial,
          slabSerial: slabSerial,
          datePurchased: importedCard['Date Purchased'] || new Date().toISOString().slice(0, 10),
          card: importedCard['Card'] || 'Unknown Card',
          player: importedCard['Player'] || '',
          year: importedCard['Year'] || '',
          set: importedCard['Set'] || '',
          variation: importedCard['Variation'] || '',
          number: importedCard['Number'] || '',
          category: importedCard['Category'] || '',
          condition: importedCard['Condition'] || '',
          currentValueUSD: currentValueUSD,
          currentValueAUD: currentValueAUD,
          investmentUSD: investmentUSD,
          investmentAUD: investmentAUD,
          potentialProfit: potentialProfit,
          population: importedCard['Population'] || 0
        };
        
        newCards.push(newCard);
      }
      
      // Add the new cards to the collection
      if (newCards.length > 0) {
        const updatedCollection = [...collectionCards, ...newCards];
        const updatedCollections = {
          ...currentCollections,
          [targetCollection]: updatedCollection
        };
        
        // Save to database
        await db.saveCollections(updatedCollections);
        
        setImportSuccess({
          totalImported: parsedData.length,
          added: newCards.length,
          duplicates: duplicates.length
        });
        
        toast.success(`Added ${newCards.length} new cards to your collection`);
        
        // Save the targetCollection in localStorage to ensure we navigate to it after refresh
        localStorage.setItem('selectedCollection', targetCollection);
        
        // Allow time for the success message to be seen
        setTimeout(() => {
          // Close the form
          onClose();
          
          // Refresh the page to show the updated collection
          window.location.reload();
        }, 1500);
      } else if (duplicates.length > 0) {
        setImportErrors([`All ${duplicates.length} cards already exist in your collection`]);
      } else {
        setImportErrors(['No valid cards found in the import file']);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportErrors([error.message]);
      toast.error(`Import error: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-[#1B2131] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#151821] add-card-header">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add Card</h1>
        
        <button 
          onClick={onClose}
          className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <span className="material-icons">close</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#151821]">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'single'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('single')}
        >
          Single Card
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'batch'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('batch')}
        >
          Batch Import
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'single' ? (
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {/* Image Upload */}
              <div 
                ref={dropZoneRef}
                className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer relative transition-colors
                           ${isDragging 
                             ? 'border-purple-400 dark:border-purple-500 bg-purple-50/80 dark:bg-purple-900/10' 
                             : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{ minHeight: '250px', maxHeight: '350px' }}
              >
                {imagePreview ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img src={imagePreview} alt="Card preview" className="max-h-full max-w-full object-contain" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-gray-800/50 hover:bg-gray-800/75 text-white"
                    >
                      <span className="material-icons text-sm">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="material-icons text-gray-400 dark:text-gray-600 text-4xl md:text-6xl mb-2">add_photo_alternate</span>
                    <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm md:text-base">Drag and drop an image here</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm">or click to browse</p>
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
                <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-gray-800 dark:text-gray-200">Card Details</h2>
                
                {/* Collection Selector */}
                <div className="mb-4 md:mb-6">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Collection <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                      className={`w-full px-3 md:px-4 py-2 text-left rounded-xl border 
                               ${!targetCollection || targetCollection === 'All Cards' 
                                 ? 'border-red-500 dark:border-red-500' 
                                 : 'border-gray-200 dark:border-gray-700/50'}
                               bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                               flex items-center justify-between`}
                    >
                      <span className={`text-sm md:text-base ${!targetCollection ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                        {targetCollection || 'Select a collection'}
                      </span>
                      <span className="material-icons">
                        {showCollectionDropdown ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                      </span>
                    </button>

                    {showCollectionDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1B2131] rounded-xl shadow-lg 
                                    border border-gray-200 dark:border-gray-700/50 py-1 max-h-60 overflow-auto">
                        {Object.keys(collections)
                          .filter(name => name !== 'All Cards')
                          .map(collectionName => (
                            <button
                              key={collectionName}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800
                                       text-gray-900 dark:text-white flex items-center justify-between text-sm md:text-base"
                              onClick={() => {
                                setTargetCollection(collectionName);
                                setShowCollectionDropdown(false);
                              }}
                            >
                              <span>{collectionName}</span>
                              {targetCollection === collectionName && (
                                <span className="material-icons text-primary text-lg">check</span>
                              )}
                            </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(!targetCollection || targetCollection === 'All Cards') && (
                    <p className="text-red-500 text-xs md:text-sm mt-1">Please select a collection</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Player</label>
                    <input
                      type="text"
                      name="player"
                      value={formData.player}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="Charizard"
                      inputMode="text"
                      enterKeyHint="next"
                      autoCapitalize="words"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Card Name</label>
                    <input
                      type="text"
                      name="card"
                      value={formData.card}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="1999 Pokemon Game"
                      inputMode="text"
                      enterKeyHint="next"
                      autoCapitalize="words"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Set</label>
                    <input
                      type="text"
                      name="set"
                      value={formData.set}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="Pokemon Game"
                      inputMode="text"
                      enterKeyHint="next"
                      autoCapitalize="words"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Year</label>
                    <input
                      type="text"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="1999"
                      inputMode="numeric"
                      pattern="\d*"
                      enterKeyHint="next"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Category</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="Pokemon"
                      inputMode="text"
                      enterKeyHint="next"
                      autoCapitalize="words"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Condition</label>
                    <input
                      type="text"
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="input text-sm"
                      placeholder="PSA 10"
                      inputMode="text"
                      enterKeyHint="next"
                      autoCapitalize="characters"
                    />
                  </div>
                </div>
                
                <div className="mb-4 md:mb-6">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Serial Number</label>
                  <input
                    type="text"
                    name="slabSerial"
                    value={formData.slabSerial}
                    onChange={handleInputChange}
                    className="input text-sm"
                    placeholder="12345678"
                    inputMode="numeric"
                    pattern="\d*"
                    enterKeyHint="next"
                  />
                </div>

                <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-gray-800 dark:text-gray-200">Financial Details</h2>
                
                {/* Currency Toggle */}
                <div className="mb-4 flex items-center justify-end">
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mr-2">Input Currency:</span>
                  <button 
                    type="button"
                    onClick={handleCurrencyToggle}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'bg-[#252B3B] hover:bg-[#323B4B]' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`text-xs md:text-sm font-medium ${inputCurrency === 'AUD' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                      AUD
                    </span>
                    <span className="mx-2 text-gray-500 dark:text-gray-400">/</span>
                    <span className={`text-xs md:text-sm font-medium ${inputCurrency === 'USD' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                      USD
                    </span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {inputCurrency === 'AUD' ? (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Paid (AUD)</label>
                        <input
                          type="number"
                          name="investmentAUD"
                          value={formData.investmentAUD}
                          onChange={handleNumberInputChange}
                          className="input text-sm"
                          placeholder="0"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          enterKeyHint="next"
                        />
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                          className="input text-sm"
                          placeholder="0"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          enterKeyHint="done"
                        />
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          USD: ${formatValue(formData.currentValueUSD, 'currency', false)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Paid (USD)</label>
                        <input
                          type="number"
                          name="investmentUSD"
                          value={formData.investmentUSD}
                          onChange={handleNumberInputChange}
                          className="input text-sm"
                          placeholder="0"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          enterKeyHint="next"
                        />
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                          className="input text-sm"
                          placeholder="0"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          enterKeyHint="done"
                        />
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          AUD: ${formatValue(formData.currentValueAUD, 'currency', false)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700/50 px-4 py-3 mt-8">
              <button 
                onClick={handleSubmit}
                className="w-full btn btn-primary"
              >
                Add Card
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Collection Selection */}
            <div className="mb-4 md:mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Collection
              </label>
              <div className="relative">
                <button
                  type="button"
                  className="w-full h-10 md:h-12 px-3 md:px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                            bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white text-left text-sm md:text-base
                            focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                >
                  {targetCollection === 'All Cards' ? 'Select a collection' : targetCollection}
                </button>
                <span className="absolute right-3 top-3 material-icons text-gray-500">
                  {showCollectionDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}
                </span>
                
                {showCollectionDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1B2131] border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                      {Object.keys(collections).filter(col => col !== 'All Cards').map(collection => (
                        <li key={collection}>
                          <button
                            type="button"
                            className="w-full px-3 md:px-4 py-2 text-left text-sm md:text-base text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#252B3B]"
                            onClick={() => {
                              setTargetCollection(collection);
                              setShowCollectionDropdown(false);
                            }}
                          >
                            {collection}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div 
              className={`
                border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 md:p-8 flex flex-col items-center justify-center
                ${batchImportDragActive ? 'border-purple-400 dark:border-purple-500 bg-purple-50/80 dark:bg-purple-900/10' : ''}
              `}
              onDragEnter={handleBatchImportDrag}
              onDragLeave={handleBatchImportDrag}
              onDragOver={handleBatchImportDrag}
              onDrop={handleBatchImportDrop}
            >
              <div className="text-center mb-4">
                <span className="material-icons text-gray-400 dark:text-gray-600 text-3xl md:text-5xl mb-3 md:mb-4">description</span>
                <p className="text-gray-800 dark:text-gray-200 text-sm md:text-lg mb-1 md:mb-2">Drop your CSV file here</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-4 md:mb-6">or click to select a file</p>
              </div>
              
              <button
                className="btn btn-primary"
                onClick={() => batchFileInputRef.current?.click()}
                disabled={importLoading}
              >
                {importLoading ? 'Processing...' : 'Select File'}
              </button>
              
              <input
                ref={batchFileInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleBatchFileChange}
              />
            </div>

            {/* Import Results */}
            {importSuccess && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons text-green-500 text-base md:text-lg">check_circle</span>
                  <h3 className="font-medium text-sm md:text-base">Import Successful</h3>
                </div>
                <ul className="list-disc list-inside pl-2 text-xs md:text-sm">
                  <li>Total cards in CSV: {importSuccess.totalImported}</li>
                  <li>Added to collection: {importSuccess.added}</li>
                  {importSuccess.duplicates > 0 && (
                    <li>Skipped (already in collection): {importSuccess.duplicates}</li>
                  )}
                </ul>
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons text-red-500 text-base md:text-lg">error</span>
                  <h3 className="font-medium text-sm md:text-base">Import Errors</h3>
                </div>
                <ul className="list-disc list-inside pl-2 text-xs md:text-sm">
                  {importErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 md:mt-10">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 md:mb-4">
                Batch Import Instructions
              </h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 md:mb-4">
                Your CSV file should include the following columns:
              </p>
              
              <ul className="list-disc list-inside space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-6 md:mb-8 pl-2 md:pl-4">
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
              
              <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 p-3 md:p-4 rounded-md">
                <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                  <span className="material-icons text-base md:text-lg">info</span>
                  <h3 className="font-medium text-sm md:text-base">Important Notes</h3>
                </div>
                <ul className="list-disc list-inside pl-2 text-xs md:text-sm">
                  <li>Cards with serial numbers that already exist in your collection will be skipped.</li>
                  <li>All USD values will be converted to AUD using the current exchange rate.</li>
                  <li>For the best results, make sure your CSV is properly formatted.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewCardForm;