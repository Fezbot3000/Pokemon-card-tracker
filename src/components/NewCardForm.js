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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint in Tailwind
    };
    
    checkMobile(); // Check on initial load
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

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

  // Add click outside handler for modal (desktop only)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile) return; // Don't close on outside click on mobile
      
      const modalContent = document.querySelector('.new-card-modal-content');
      if (modalContent && !modalContent.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isMobile]);

  // Stop propagation of scroll events in modal content
  const preventPropagation = (e) => {
    if (isMobile) return; // Don't prevent on mobile
    e.stopPropagation();
  };

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

  // Render different layouts based on screen size
  return (
    <div className={`${isMobile ? 'fixed inset-0 bg-gray-100 dark:bg-[#111827] z-30' : 'fixed inset-0 bg-black/50 z-50 overflow-hidden'}`}
         onWheel={preventPropagation} 
         onTouchMove={preventPropagation}>
      <div 
        className={`
          ${isMobile 
            ? 'h-full overflow-y-auto pb-20' 
            : 'fixed top-0 right-0 h-full w-[480px] bg-white dark:bg-[#1B2131] shadow-xl new-card-modal-content transform translate-x-0 transition-transform duration-300 ease-in-out'
          }
        `}
        onScroll={preventPropagation}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1B2131] border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Add Card</h1>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252B3B] transition-colors"
          >
            <span className="material-icons text-gray-500 dark:text-gray-400">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('single')}
              className={`py-3 px-6 transition-colors ${
                activeTab === 'single'
                  ? 'text-primary border-b-2 border-primary font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Single Card
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`py-3 px-6 transition-colors ${
                activeTab === 'batch'
                  ? 'text-primary border-b-2 border-primary font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Batch Import
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto h-[calc(100%-120px)]">
          {/* Use your existing content but simplified structure */}
          <div className="p-4">
            {activeTab === 'single' ? (
              <div>
                {/* Card Details Section */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                  {/* Left column - Image upload */}
                  <div 
                    ref={dropZoneRef}
                    className={`
                      border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 md:p-6 min-h-[240px] w-full md:w-48 md:min-w-[12rem]
                      ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700'}
                      ${imagePreview ? 'bg-gray-50 dark:bg-gray-800/30' : ''}
                    `}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={imagePreview} 
                          alt="Card preview" 
                          className="w-full h-full object-contain" 
                        />
                        <button 
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <span className="material-icons text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-4">
                          <span className="material-icons text-gray-400 dark:text-gray-600 text-4xl mb-2">
                            add_photo_alternate
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                            Drag and drop an image here
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            or click to browse
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-sm btn-secondary mt-2"
                        >
                          Select Image
                        </button>
                      </>
                    )}
                  </div>

                  {/* Right column - Form fields */}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Card Details</h2>
                    
                    {/* Collection Selection */}
                    <div className="mb-4">
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Collection</label>
                      <div className="relative">
                        <button
                          type="button"
                          className="w-full h-10 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                                  bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white text-left text-sm
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
                                    className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#252B3B]"
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
                      {/* Error message if needed */}
                      {targetCollection === 'All Cards' && (
                        <p className="text-red-500 text-xs mt-1">Please select a collection</p>
                      )}
                    </div>

                    {/* Rest of your form fields - simplified */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Player</label>
                          <input
                            type="text"
                            name="player"
                            value={formData.player}
                            onChange={handleInputChange}
                            className="input text-sm"
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
                            className="input text-sm"
                            placeholder="1999 Pokemon Game"
                          />
                        </div>
                      </div>
                      
                      {/* More form fields would go here */}
                      
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Serial Number</label>
                        <input
                          type="text"
                          name="slabSerial"
                          value={formData.slabSerial}
                          onChange={handleInputChange}
                          className="input text-sm"
                          placeholder="12345678"
                        />
                      </div>

                      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Financial Details</h2>
                      
                      {/* Currency Toggle */}
                      <div className="mb-4 flex items-center justify-end">
                        <span className="text-xs text-gray-600 dark:text-gray-400 mr-2">Input Currency:</span>
                        <button 
                          type="button"
                          onClick={handleCurrencyToggle}
                          className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-[#252B3B] hover:bg-gray-200 dark:hover:bg-[#323B4B] transition-colors"
                        >
                          <span className={`text-xs font-medium ${inputCurrency === 'AUD' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                            AUD
                          </span>
                          <span className="mx-2 text-gray-500 dark:text-gray-400">/</span>
                          <span className={`text-xs font-medium ${inputCurrency === 'USD' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                            USD
                          </span>
                        </button>
                      </div>
                      
                      {/* Financial inputs would go here */}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Batch Import Tab Content */
              <div>
                {/* Your existing batch import content */}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          {activeTab === 'single' ? (
            <button 
              onClick={handleSubmit}
              className="w-full btn btn-primary"
            >
              Add Card
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab('single')} 
              className="w-full btn btn-secondary"
            >
              Back to Single Card
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewCardForm;