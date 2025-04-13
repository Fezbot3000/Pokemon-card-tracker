import React, { useState, useEffect, useRef } from 'react';
import { formatValue } from '../utils/formatters';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import { parseCSVFile, validateCSVStructure } from '../utils/dataProcessor';
import db from '../services/db';
import PSALookupButton from './PSALookupButton';

const NewCardForm = ({ onSubmit, onClose, exchangeRate = 1.5, collections = {}, selectedCollection }) => {
  const [formData, setFormData] = useState({
    player: '',
    card: '',
    set: '',
    year: '',
    category: '',
    condition: '',
    slabSerial: '',
    datePurchased: '',
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
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

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

  // Handle close with animation
  const handleClose = () => {
    setIsOpen(false);
    // Wait for the close animation to finish
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
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
        handleClose();
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
      const cardData = {
        player: formData.player,
        card: formData.card,
        set: formData.set,
        year: formData.year,
        category: formData.category,
        condition: formData.condition,
        slabSerial: formData.slabSerial,
        datePurchased: formData.datePurchased,
        investmentUSD: parseFloat(formData.investmentUSD) || 0,
        currentValueUSD: parseFloat(formData.currentValueUSD) || 0, 
        investmentAUD,
        currentValueAUD,
        potentialProfit
      };
      
      await onSubmit(cardData, imageFile, targetCollection);
    } catch (error) {
      setError(error.message);
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
    try {
      setImportLoading(true);
      setImportErrors([]);
      
      // Parse CSV file
      const parsedData = await parseCSVFile(file);
      
      // Validate CSV structure
      const validation = validateCSVStructure(parsedData, 'baseData');
      if (!validation.success) {
        setImportErrors([validation.error]);
        setImportLoading(false);
        return;
      }

      // Validate target collection
      if (!targetCollection || targetCollection === 'All Cards') {
        setImportErrors(['Please select a valid collection']);
        setImportLoading(false);
        return;
      }
      
      // Process and validate each entry
      const errors = [];
      const validCards = [];
      
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        
        // Skip empty rows
        if (Object.values(row).every(val => !val)) continue;
        
        // Check for required fields
        if (!row.slabSerial) {
          errors.push(`Row ${i + 1}: Missing serial number`);
          continue;
        }
        
        // Make sure numeric fields are parsed as numbers
        const investmentAUD = parseFloat(row.investmentAUD) || 0;
        const currentValueAUD = parseFloat(row.currentValueAUD) || 0;
        
        // Calculate derived fields
        const potentialProfit = currentValueAUD - investmentAUD;
        const investmentUSD = investmentAUD / exchangeRate;
        const currentValueUSD = currentValueAUD / exchangeRate;
        
        // Create card object
        const cardData = {
          player: row.player || '',
          card: row.card || '',
          set: row.set || '',
          year: row.year || '',
          category: row.category || '',
          condition: row.condition || '',
          slabSerial: row.slabSerial,
          datePurchased: row.datePurchased || '',
          investmentUSD: parseFloat(investmentUSD.toFixed(2)),
          currentValueUSD: parseFloat(currentValueUSD.toFixed(2)),
          investmentAUD,
          currentValueAUD,
          potentialProfit
        };
        
        validCards.push(cardData);
      }
      
      // Check for errors
      if (errors.length > 0) {
        setImportErrors(errors);
        setImportLoading(false);
        return;
      }
      
      // Add cards to collection
      try {
        // Get existing collection
        const existingCards = collections[targetCollection] || [];
        
        // Check for duplicate serials
        const existingSerials = new Set(existingCards.map(card => card.slabSerial));
        const duplicates = validCards.filter(card => existingSerials.has(card.slabSerial));
        
        if (duplicates.length > 0) {
          setImportErrors([`${duplicates.length} cards have duplicate serial numbers`]);
          setImportLoading(false);
          return;
        }
        
        // Combine existing and new cards
        const updatedCollection = [...existingCards, ...validCards];
        
        // Update collections
        await db.saveCollections({
          ...collections,
          [targetCollection]: updatedCollection
        });
        
        // Success!
        setImportSuccess({
          count: validCards.length,
          collection: targetCollection
        });
        
        // Close modal after a delay
        setTimeout(() => {
          handleClose();
        }, 2000);
        
      } catch (error) {
        console.error('Error saving to database:', error);
        setImportErrors(['Failed to save cards to database']);
      }
      
    } catch (error) {
      console.error('Batch import error:', error);
      setImportErrors([`Error processing file: ${error.message}`]);
    } finally {
      setImportLoading(false);
    }
  };

  // Effect to trigger open animation on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Render different layouts based on screen size
  return (
    <>
      {/* Semi-transparent overlay that covers the entire screen */}
      <div 
        className={`card-details-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleClose}
      />
      
      {/* Modal content positioned on the right side */}
      <div
        className={`new-card-modal-content ${isOpen ? 'open' : ''}`}
        onWheel={preventPropagation}
        onTouchMove={preventPropagation}
      >
        {/* Modal Header */}
        <div className={`sticky top-0 z-10 border-b ${isDarkMode ? 'bg-[#1B2131] border-gray-700/50' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {activeTab === 'single' ? 'Add New Card' : 'Batch Import'}
              </h2>
            </div>
            <button 
              onClick={handleClose}
              className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <span className={`material-icons ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>close</span>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="px-4 pt-1">
            <div className="flex border-b space-x-6 overflow-x-auto">
              <button
                className={`pb-3 font-medium text-base border-b-2 transition-colors ${
                  activeTab === 'single' 
                    ? (isDarkMode ? 'text-white border-primary' : 'text-gray-900 border-primary')
                    : (isDarkMode ? 'text-gray-400 border-transparent' : 'text-gray-500 border-transparent')
                }`}
                onClick={() => setActiveTab('single')}
              >
                Single Card
              </button>
              <button
                className={`pb-3 font-medium text-base border-b-2 transition-colors ${
                  activeTab === 'batch' 
                    ? (isDarkMode ? 'text-white border-primary' : 'text-gray-900 border-primary')
                    : (isDarkMode ? 'text-gray-400 border-transparent' : 'text-gray-500 border-transparent')
                }`}
                onClick={() => setActiveTab('batch')}
              >
                Batch Import
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'single' ? (
          <>
            {/* Single Card Content */}
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="cardForm" onSubmit={handleSubmit}>
                {/* Image upload area */}
                <div
                  ref={dropZoneRef}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800/30 mb-4 max-w-[180px] max-h-[250px] aspect-[2/3] relative mx-auto cursor-pointer"
                  onClick={() => imagePreview && setShowEnlargedImage(true)}
                >
                  {imagePreview ? (
                    <div className="w-full h-full">
                      <img 
                        src={imagePreview} 
                        alt="Card preview" 
                        className="w-full h-full object-contain" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all">
                        <span className="material-icons text-white opacity-0 hover:opacity-100 scale-75 hover:scale-100 transition-all">zoom_in</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <span className="material-icons text-gray-400 dark:text-gray-600 text-4xl mb-2">
                        add_photo_alternate
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">
                        No image yet
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Enlarged Image Modal */}
                {showEnlargedImage && imagePreview && (
                  <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowEnlargedImage(false)}>
                    <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Card preview (enlarged)" 
                        className="max-h-[90vh] max-w-[90vw] object-contain" 
                      />
                      <button 
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEnlargedImage(false);
                        }}
                      >
                        <span className="material-icons">close</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Image Button */}
                <div 
                  className="flex justify-center mb-6 relative"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {isDragging && (
                    <div className="absolute inset-0 -m-4 border-2 border-dashed border-purple-500 rounded-lg bg-purple-900/10 flex items-center justify-center z-0">
                      <p className="text-purple-300 font-medium">Drop image here</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center space-x-2 text-white bg-gray-800/70 px-4 py-2 rounded-lg relative z-10"
                  >
                    <span className="material-icons text-sm">photo_camera</span>
                    <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </button>
                </div>

                {/* Card Information */}
                <div className="mb-6">
                  <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Card Information</h4>
                  
                  {/* PSA Lookup Button */}
                  <div className="mb-4">
                    <PSALookupButton 
                      currentCardData={formData} 
                      onCardUpdate={(updatedData) => {
                        setFormData(prev => ({
                          ...prev,
                          ...updatedData
                        }));
                        toast.success("Card details updated from PSA data");
                      }}
                      buttonText="Lookup PSA Card"
                    />
                  </div>

                  {/* Collection Selection */}
                  <div className="mb-4">
                    <label htmlFor="collection" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Collection
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        className={`w-full px-3 py-2 border rounded-lg text-left ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                      >
                        {targetCollection || 'Select a collection'}
                      </button>
                      {showCollectionDropdown && (
                        <div className={`absolute z-10 mt-1 w-full border rounded-lg shadow-lg max-h-48 overflow-y-auto ${
                          isDarkMode 
                            ? 'bg-[#1B2131] border-gray-700' 
                            : 'bg-white border-gray-200'
                        }`}>
                          {Object.keys(collections).filter(c => c !== 'All Cards').map(collection => (
                            <button
                              key={collection}
                              type="button"
                              className={`w-full px-3 py-2 text-left ${
                                isDarkMode 
                                  ? 'hover:bg-[#252B3B] text-white' 
                                  : 'hover:bg-gray-50 text-gray-900'
                              }`}
                              onClick={() => {
                                setTargetCollection(collection);
                                setShowCollectionDropdown(false);
                              }}
                            >
                              {collection}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Player and Card Name Row */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="player" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Player
                      </label>
                      <input
                        type="text"
                        id="player"
                        name="player"
                        value={formData.player}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., Charizard"
                      />
                    </div>
                    <div>
                      <label htmlFor="card" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Card Name
                      </label>
                      <input
                        type="text"
                        id="card"
                        name="card"
                        value={formData.card}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., Base Set"
                      />
                    </div>
                  </div>

                  {/* Set and Year Row */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="set" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Set
                      </label>
                      <input
                        type="text"
                        id="set"
                        name="set"
                        value={formData.set}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., Base Set"
                      />
                    </div>
                    <div>
                      <label htmlFor="year" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Year
                      </label>
                      <input
                        type="text"
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., 1999"
                      />
                    </div>
                  </div>

                  {/* Category and Condition Row */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="category" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Category
                      </label>
                      <input
                        type="text"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., Pokemon"
                      />
                    </div>
                    <div>
                      <label htmlFor="condition" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Condition
                      </label>
                      <input
                        type="text"
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., PSA 10"
                      />
                    </div>
                  </div>

                  {/* Serial Number and Date Purchased Row */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="slabSerial" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Serial Number
                      </label>
                      <input
                        type="text"
                        id="slabSerial"
                        name="slabSerial"
                        value={formData.slabSerial}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                        placeholder="e.g., 12345678"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="datePurchased" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date Purchased
                      </label>
                      <input
                        type="date"
                        id="datePurchased"
                        name="datePurchased"
                        value={formData.datePurchased}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode 
                            ? 'border-gray-700 bg-[#252B3B] text-white' 
                            : 'border-gray-300 bg-white text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-6">
                  <h4 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Investment Details</h4>
                  
                  {/* Currency Toggle */}
                  <div className="flex justify-end mb-3">
                    <div className="inline-flex rounded-md shadow-sm">
                      <button
                        type="button"
                        onClick={() => setInputCurrency('USD')}
                        className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                          inputCurrency === 'USD'
                            ? (isDarkMode ? 'bg-purple-700 text-white border-purple-700' : 'bg-purple-600 text-white border-purple-600')
                            : (isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-300')
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputCurrency('AUD')}
                        className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                          inputCurrency === 'AUD'
                            ? (isDarkMode ? 'bg-purple-700 text-white border-purple-700' : 'bg-purple-600 text-white border-purple-600')
                            : (isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-300')
                        }`}
                      >
                        AUD
                      </button>
                    </div>
                  </div>
                  
                  {/* Paid Value */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor={inputCurrency === 'AUD' ? 'investmentAUD' : 'investmentUSD'} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Paid ({inputCurrency})
                      </label>
                      <div className="relative">
                        <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {inputCurrency === 'AUD' ? 'A$' : '$'}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          id={inputCurrency === 'AUD' ? 'investmentAUD' : 'investmentUSD'}
                          name={inputCurrency === 'AUD' ? 'investmentAUD' : 'investmentUSD'}
                          value={inputCurrency === 'AUD' ? formData.investmentAUD : formData.investmentUSD}
                          onChange={handleNumberInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg ${
                            isDarkMode 
                              ? 'border-gray-700 bg-[#252B3B] text-white' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor={inputCurrency === 'AUD' ? 'currentValueAUD' : 'currentValueUSD'} className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Current Value ({inputCurrency})
                      </label>
                      <div className="relative">
                        <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {inputCurrency === 'AUD' ? 'A$' : '$'}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          id={inputCurrency === 'AUD' ? 'currentValueAUD' : 'currentValueUSD'}
                          name={inputCurrency === 'AUD' ? 'currentValueAUD' : 'currentValueUSD'}
                          value={inputCurrency === 'AUD' ? formData.currentValueAUD : formData.currentValueUSD}
                          onChange={handleNumberInputChange}
                          className={`w-full pl-10 pr-3 py-2 border rounded-lg ${
                            isDarkMode 
                              ? 'border-gray-700 bg-[#252B3B] text-white' 
                              : 'border-gray-300 bg-white text-gray-900'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Conversion Info */}
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                    <p>Exchange Rate: 1 USD = {exchangeRate.toFixed(2)} AUD</p>
                    {inputCurrency === 'AUD' ? (
                      <p>USD values are calculated automatically</p>
                    ) : (
                      <p>AUD values are calculated automatically</p>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            {/* Sticky Footer */}
            <div className={`sticky bottom-0 p-4 border-t z-10 flex justify-end space-x-3 ${
              isDarkMode 
                ? 'bg-[#1B2131] border-gray-700/50'
                : 'bg-white border-gray-200'
            }`}>
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="cardForm"
                className={`px-4 py-2 rounded-lg text-white ${
                  isDarkMode 
                    ? 'bg-primary hover:bg-primary-dark' 
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                Add Card
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Batch Import Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className={`rounded-lg p-6 mb-6 ${
                isDarkMode 
                  ? 'bg-[#252B3B] border border-gray-700' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Import Multiple Cards
                </h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Upload a CSV file with multiple card entries. 
                  The file must have the following headers:
                </p>
                
                <div className={`p-3 rounded mb-4 font-mono text-xs whitespace-nowrap overflow-x-auto ${
                  isDarkMode 
                    ? 'bg-gray-800 text-green-300' 
                    : 'bg-gray-100 text-green-600'
                }`}>
                  player,card,set,year,category,condition,slabSerial,datePurchased,investmentAUD,currentValueAUD
                </div>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer ${
                    batchImportDragActive
                      ? (isDarkMode ? 'border-purple-400 bg-purple-900/20' : 'border-purple-400 bg-purple-50')
                      : (isDarkMode ? 'border-gray-700 hover:border-purple-400 hover:bg-purple-900/10' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50')
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBatchImportDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBatchImportDragActive(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleBatchImportDrop}
                  onClick={() => batchFileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <span className={`material-icons text-4xl mb-2 ${
                      batchImportDragActive
                        ? 'text-purple-400'
                        : (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                    }`}>
                      cloud_upload
                    </span>
                    {importLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Processing...</p>
                      </div>
                    ) : (
                      <>
                        <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                          {batchImportDragActive ? 'Drop your file here' : 'Drag and drop your CSV file here'}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          or click to browse
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleBatchFileChange}
                    ref={batchFileInputRef}
                    className="hidden"
                  />
                </div>
                
                {importSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg">
                    <p className="flex items-start">
                      <span className="material-icons text-green-500 mr-2">check_circle</span>
                      <span>{importSuccess}</span>
                    </p>
                  </div>
                )}
                
                {importErrors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg">
                    <p className="font-medium mb-1 flex items-center">
                      <span className="material-icons text-red-500 mr-2">error</span>
                      <span>Import Errors</span>
                    </p>
                    <ul className="list-disc ml-8 text-sm space-y-1 mt-2">
                      {importErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-sm mt-4">
                  <p className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Need a template?</p>
                  <button
                    type="button"
                    onClick={() => {
                      // Generate template CSV
                      const headers = "player,card,set,year,category,condition,slabSerial,datePurchased,investmentAUD,currentValueAUD";
                      const example = "Charizard,Base Set,Pokemon Base Set,1999,Pokemon,PSA 10,12345678,2022-01-01,1000,1500";
                      const csvContent = `${headers}\n${example}`;
                      
                      // Create and download the file
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'card_import_template.csv';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className={`text-primary hover:underline ${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                  >
                    Download template CSV
                  </button>
                </div>
              </div>
              
              <div className={`rounded-lg p-6 ${
                isDarkMode 
                  ? 'bg-[#252B3B] border border-gray-700' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Import Tips</h4>
                <ul className={`text-sm space-y-2 list-disc pl-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li>Make sure your CSV file has the correct header row</li>
                  <li>Dates should be in YYYY-MM-DD format</li>
                  <li>Use the slabSerial field as a unique identifier</li>
                  <li>Currency values should be numeric only (e.g., 10.99)</li>
                  <li>Each card requires a unique serial number</li>
                </ul>
              </div>
            </div>
            
            {/* Footer with action buttons */}
            <div className={`sticky bottom-0 p-4 border-t z-10 flex justify-end space-x-3 ${
              isDarkMode 
                ? 'bg-[#1B2131] border-gray-700/50'
                : 'bg-white border-gray-200'
            }`}>
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              {activeTab === 'single' && (
                <button
                  type="submit"
                  form="cardForm"
                  className={`px-4 py-2 rounded-lg text-white ${
                    isDarkMode 
                      ? 'bg-primary hover:bg-primary-dark' 
                      : 'bg-primary hover:bg-primary-dark'
                  }`}
                >
                  Add Card
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NewCardForm;