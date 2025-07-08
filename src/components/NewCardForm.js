import React, { useState, useEffect, useRef } from 'react';
import { formatValue } from '../utils/formatters';
import { useTheme } from '../design-system';
import { toast } from 'react-hot-toast';
import { parseCSVFile, validateCSVStructure } from '../utils/dataProcessor';
import db from '../services/firestore/dbAdapter';
import PSALookupButton from './PSALookupButton';
import logger from '../services/LoggingService';

const NewCardForm = ({
  onSubmit,
  onClose,
  exchangeRate = 1.5,
  collections = {},
  selectedCollection,
}) => {
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
    currentValueAUD: '',
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
    const handleEscapeKey = event => {
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
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
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
    const handleClickOutside = event => {
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
  const preventPropagation = e => {
    if (isMobile) return; // Don't prevent on mobile
    e.stopPropagation();
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberInputChange = e => {
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
            investmentUSD:
              numValue !== '' ? (numValue / exchangeRate).toFixed(2) : '',
          };
        } else if (name === 'currentValueAUD') {
          return {
            ...prev,
            currentValueAUD: numValue,
            currentValueUSD:
              numValue !== '' ? (numValue / exchangeRate).toFixed(2) : '',
          };
        }
      } else {
        // User is entering values in USD
        if (name === 'investmentUSD') {
          return {
            ...prev,
            investmentUSD: numValue,
            investmentAUD:
              numValue !== '' ? (numValue * exchangeRate).toFixed(2) : '',
          };
        } else if (name === 'currentValueUSD') {
          return {
            ...prev,
            currentValueUSD: numValue,
            currentValueAUD:
              numValue !== '' ? (numValue * exchangeRate).toFixed(2) : '',
          };
        }
      }
      return { ...prev, [name]: numValue };
    });
  };

  const handleCurrencyToggle = () => {
    setInputCurrency(prev => (prev === 'AUD' ? 'USD' : 'AUD'));
  };

  const handleImageChange = e => {
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

  const handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = e => {
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

  const handleSubmit = async e => {
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
        potentialProfit,
      };

      await onSubmit(cardData, imageFile, targetCollection);
    } catch (error) {
      setError(error.message);
    }
  };

  // Batch import handlers
  const handleBatchImportDrag = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setBatchImportDragActive(true);
    } else if (e.type === 'dragleave') {
      setBatchImportDragActive(false);
    }
  };

  const handleBatchImportDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setBatchImportDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleBatchImport(e.dataTransfer.files[0]);
    }
  };

  const handleBatchFileChange = e => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleBatchImport(e.target.files[0]);
    }
  };

  const handleBatchImport = async file => {
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
          potentialProfit,
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
        const existingSerials = new Set(
          existingCards.map(card => card.slabSerial)
        );
        const duplicates = validCards.filter(card =>
          existingSerials.has(card.slabSerial)
        );

        if (duplicates.length > 0) {
          setImportErrors([
            `${duplicates.length} cards have duplicate serial numbers`,
          ]);
          setImportLoading(false);
          return;
        }

        // Combine existing and new cards
        const updatedCollection = [...existingCards, ...validCards];

        // Update collections
        await db.saveCollections({
          ...collections,
          [targetCollection]: updatedCollection,
        });

        // Success!
        setImportSuccess({
          count: validCards.length,
          collection: targetCollection,
        });

        // Close modal after a delay
        setTimeout(() => {
          handleClose();
        }, 2000);
      } catch (error) {
        logger.error('Error saving to database:', error);
        setImportErrors(['Failed to save cards to database']);
      }
    } catch (error) {
      logger.error('Batch import error:', error);
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
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'} bg-black/40 dark:bg-black/60`}
        aria-hidden="true"
      ></div>

      {/* Modal container */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isMobile ? 'items-end' : ''}`}
        onClick={isMobile ? undefined : handleClose} // Only allow outside click close on desktop
      >
        {/* Modal content with transition */}
        <div
          className={`new-card-modal-content mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white text-gray-900 shadow-xl transition-all duration-300 ease-out dark:bg-[#1B2131] dark:text-gray-200 ${
            isOpen
              ? isMobile
                ? 'translate-y-0 opacity-100'
                : 'scale-100 opacity-100'
              : isMobile
                ? 'translate-y-full opacity-0'
                : 'scale-95 opacity-0'
          }`}
          style={{ maxHeight: '90vh' }} // Limit height to 90% of viewport height
          onClick={e => e.stopPropagation()} // Prevent closing when clicking inside content
        >
          {/* Header */}
          <div
            className={`dark:border-gray-700/50 flex items-center justify-between border-b border-gray-200 p-4`}
          >
            <h2
              className={`text-lg font-semibold text-gray-900 dark:text-white`}
            >
              Add New Card
            </h2>
            <button
              onClick={handleClose}
              className={`rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white`}
            >
              <svg
                className="size-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className={`dark:border-gray-700/50 border-b border-gray-200`}>
            <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('single')}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'single'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200'
                }`}
              >
                Single Card Entry
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'batch'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200'
                }`}
              >
                Batch Import from CSV
              </button>
            </nav>
          </div>

          {/* Conditional Content based on activeTab */}
          {activeTab === 'single' && (
            <form
              id="cardForm"
              onSubmit={handleSubmit}
              className="grow overflow-y-auto"
              onScroll={preventPropagation}
            >
              {/* Form content */}
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                {/* Card Image Section */}
                <div className="space-y-4 md:col-span-1">
                  <label
                    className={`block text-sm font-medium text-gray-700 dark:text-gray-300`}
                  >
                    Card Image
                  </label>
                  <div
                    ref={dropZoneRef}
                    className={`relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-gray-500 transition-colors hover:border-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 ${isDragging ? 'border-primary bg-purple-50 dark:border-primary dark:bg-[#2a3042]' : ''} `}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Card Preview"
                        className="mx-auto h-48 w-auto rounded object-contain"
                        onClick={e => {
                          e.stopPropagation();
                          setShowEnlargedImage(true);
                        }} // Prevent click opening file dialog
                      />
                    ) : (
                      <div className="flex h-48 flex-col items-center justify-center">
                        <svg
                          className={`mx-auto size-12 text-gray-400 dark:text-gray-500`}
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="mt-2 block text-sm font-medium">
                          {isDragging
                            ? 'Drop image here'
                            : 'No image available'}
                        </span>
                        <span className="mt-1 block text-xs">
                          Click or drag & drop
                        </span>
                      </div>
                    )}
                  </div>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation(); // Prevent triggering file input click
                        fileInputRef.current?.click();
                      }}
                      className={`flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600`}
                    >
                      <svg
                        className="-ml-1 mr-2 size-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Replace Image
                    </button>
                  )}
                  {/* Profit/Loss Display */}
                  <div
                    className={`rounded-lg bg-gray-100 p-3 text-center dark:bg-black`}
                  >
                    <span
                      className={`block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400`}
                    >
                      Profit/Loss
                    </span>
                    <span
                      className={`mt-1 block text-xl font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                    >
                      {formatValue(profit, 'AUD', exchangeRate)}
                    </span>
                  </div>
                </div>

                {/* Card Information Section */}
                <div className="space-y-4 md:col-span-2">
                  {[
                    'player',
                    'card',
                    'set',
                    'year',
                    'category',
                    'condition',
                    'slabSerial',
                    'datePurchased',
                    'investmentUSD',
                    'currentValueUSD',
                    'investmentAUD',
                    'currentValueAUD',
                  ].map(field => {
                    const isRequired = [
                      'card',
                      'set',
                      'year',
                      'category',
                    ].includes(field);
                    const isNumeric = ['year'].includes(field);
                    const isCurrency = ['investment', 'currentValue'].some(
                      prefix => field.startsWith(prefix)
                    );
                    const labelMap = {
                      player: 'Player',
                      card: 'Card Name',
                      set: 'Set',
                      year: 'Year',
                      category: 'Category',
                      condition: 'Condition',

                      slabSerial: 'Serial Number',
                      datePurchased: 'Date Purchased',
                      investmentAUD: 'Purchase Price (AUD)',
                      currentValueAUD: 'Current Value (AUD)',
                      investmentUSD: 'Purchase Price (USD)',
                      currentValueUSD: 'Current Value (USD)',
                    };
                    const currencyField = field.startsWith('investment')
                      ? 'investment'
                      : field.startsWith('currentValue')
                        ? 'currentValue'
                        : null;
                    const fieldName = currencyField
                      ? `${currencyField}${inputCurrency}`
                      : field;

                    // Skip rendering the non-active currency fields
                    if (isCurrency && !field.endsWith(inputCurrency)) {
                      return null;
                    }

                    const commonInputClasses = `block w-full sm:text-sm rounded-md shadow-sm focus:ring-primary focus:border-primary 
                                              bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 
                                              dark:bg-black dark:border-gray-600 dark:text-gray-200 dark:placeholder:text-gray-500`;
                    const commonLabelClasses = `block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300`;

                    // Render Select or Input based on field type
                    return (
                      <div key={fieldName}>
                        <label
                          htmlFor={fieldName}
                          className={commonLabelClasses}
                        >
                          {labelMap[fieldName]}
                          {isRequired && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </label>
                        {field === 'set' ? (
                          <select
                            id={fieldName}
                            name={fieldName}
                            value={formData[fieldName]}
                            onChange={handleInputChange}
                            required={isRequired}
                            className={commonInputClasses}
                          >
                            <option value="" disabled>
                              Select Set...
                            </option>
                            {/* Add set options here */}
                          </select>
                        ) : field === 'category' ? (
                          <select
                            id={fieldName}
                            name={fieldName}
                            value={formData[fieldName]}
                            onChange={handleInputChange}
                            required={isRequired}
                            className={commonInputClasses}
                          >
                            <option value="" disabled>
                              Select Category...
                            </option>
                            {/* Add category options here */}
                          </select>
                        ) : (
                          <input
                            type={
                              isNumeric
                                ? 'number'
                                : isCurrency
                                  ? 'text'
                                  : field === 'datePurchased'
                                    ? 'date'
                                    : 'text'
                            }
                            id={fieldName}
                            name={fieldName}
                            value={formData[fieldName]}
                            onChange={
                              isNumeric || isCurrency
                                ? handleNumberInputChange
                                : handleInputChange
                            }
                            required={isRequired}
                            className={commonInputClasses}
                            step={isCurrency ? '0.01' : undefined}
                            min={
                              isNumeric && field !== 'year' ? '0' : undefined
                            } // Allow negative years?
                          />
                        )}
                        {/* PSA Lookup Button for slabSerial */}
                        {field === 'slabSerial' && formData.slabSerial && (
                          <PSALookupButton
                            serialNumber={formData.slabSerial}
                            onDataFetched={data => {
                              // Update form data with fetched PSA data
                              // Be careful not to overwrite user input unless intended
                              // // LoggingService.info("PSA Data Fetched:", data);
                              // Example: setFormData(prev => ({ ...prev, population: data.population || prev.population }));
                              // toast.success('PSA data fetched!');
                            }}
                            onError={errorMsg => {
                              // toast.error(`PSA Lookup Error: ${errorMsg}`);
                            }}
                            className="mt-2"
                          />
                        )}
                        {/* Currency Toggle Button */}
                        {isCurrency && (
                          <button
                            type="button"
                            onClick={handleCurrencyToggle}
                            className={`mt-2 rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500`}
                          >
                            Switch to {inputCurrency === 'AUD' ? 'USD' : 'AUD'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          )}
          {activeTab === 'batch' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className={`mb-6 rounded-lg p-6 ${
                  isDarkMode
                    ? 'border border-gray-700 bg-[#252B3B]'
                    : 'border border-gray-200 bg-gray-50'
                }`}
              >
                <h3
                  className={`mb-2 text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Import Multiple Cards
                </h3>
                <p
                  className={`mb-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  Upload a CSV file with multiple card entries. The file must
                  have the following headers:
                </p>

                <div
                  className={`mb-4 overflow-x-auto whitespace-nowrap rounded p-3 font-mono text-xs ${
                    isDarkMode
                      ? 'bg-gray-800 text-green-300'
                      : 'bg-gray-100 text-green-600'
                  }`}
                >
                  player,card,set,year,category,condition,slabSerial,datePurchased,investmentAUD,currentValueAUD
                </div>

                <div
                  className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center ${
                    batchImportDragActive
                      ? isDarkMode
                        ? 'border-purple-400 bg-purple-900/20'
                        : 'border-purple-400 bg-purple-50'
                      : isDarkMode
                        ? 'border-gray-700 hover:border-purple-400 hover:bg-purple-900/10'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                  onDragEnter={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBatchImportDragActive(true);
                  }}
                  onDragLeave={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBatchImportDragActive(false);
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleBatchImportDrop}
                  onClick={() => batchFileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`material-icons mb-2 text-4xl ${
                        batchImportDragActive
                          ? 'text-purple-400'
                          : isDarkMode
                            ? 'text-gray-500'
                            : 'text-gray-400'
                      }`}
                    >
                      cloud_upload
                    </span>
                    {importLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="mb-2 size-8 animate-spin rounded-full border-b-2 border-primary"></div>
                        <p
                          className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          Processing...
                        </p>
                      </div>
                    ) : (
                      <>
                        <p
                          className={`mb-1 font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                        >
                          {batchImportDragActive
                            ? 'Drop your file here'
                            : 'Drag and drop your CSV file here'}
                        </p>
                        <p
                          className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
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
                  <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-800 dark:bg-green-900/20 dark:text-green-200">
                    <p className="flex items-start">
                      <span className="material-icons mr-2 text-green-500">
                        check_circle
                      </span>
                      <span>{importSuccess}</span>
                    </p>
                  </div>
                )}

                {importErrors.length > 0 && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-200">
                    <p className="mb-1 flex items-center font-medium">
                      <span className="material-icons mr-2 text-red-500">
                        error
                      </span>
                      <span>Import Errors</span>
                    </p>
                    <ul className="ml-8 mt-2 list-disc space-y-1 text-sm">
                      {importErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 text-sm">
                  <p
                    className={`mb-1 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    Need a template?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      // Generate template CSV
                      const headers =
                        'player,card,set,year,category,condition,slabSerial,datePurchased,investmentAUD,currentValueAUD';
                      const example =
                        'Charizard,Base Set,Pokemon Base Set,1999,Pokemon,PSA 10,12345678,2022-01-01,1000,1500';
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

              <div
                className={`rounded-lg p-6 ${
                  isDarkMode
                    ? 'border border-gray-700 bg-[#252B3B]'
                    : 'border border-gray-200 bg-gray-50'
                }`}
              >
                <h4
                  className={`mb-3 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Import Tips
                </h4>
                <ul
                  className={`list-disc space-y-2 pl-5 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  <li>Make sure your CSV file has the correct header row</li>
                  <li>Dates should be in YYYY-MM-DD format</li>
                  <li>Use the slabSerial field as a unique identifier</li>
                  <li>Currency values should be numeric only (e.g., 10.99)</li>
                  <li>Each card requires a unique serial number</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NewCardForm;
