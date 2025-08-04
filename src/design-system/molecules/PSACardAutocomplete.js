import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { searchPSACardsByName } from '../../services/psaDatabaseManager';
import logger from '../../utils/logger';

// Simple debounce function if lodash is not available
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * PSACardAutocomplete - Autocomplete component for searching and selecting PSA cards
 * Searches the PSA database by card name and provides rich card selection
 */
const PSACardAutocomplete = ({
  value = '',
  placeholder = 'Type card name to search PSA database...',
  onSelect,
  onInputChange,
  disabled = false,
  className = '',
  label = '',
  error = '',
  name = '',
  id = '',
  required = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [psaCards, setPsaCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ position: 'bottom', top: 0, left: 0, width: 0 });
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const portalRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchValue) => {
      if (!searchValue || searchValue.length < 2) {
        setPsaCards([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log(`🔍 PSA Autocomplete: Searching for "${searchValue}"`);
        logger.debug(`PSA Autocomplete: Searching for "${searchValue}"`);
        
        const results = await searchPSACardsByName(searchValue, 10);
        console.log(`🔍 PSA Autocomplete: Found ${results.length} results:`, results);
        
        setPsaCards(results);
        logger.debug(`PSA Autocomplete: Found ${results.length} results`);
      } catch (error) {
        console.error('🚨 PSA Autocomplete search error:', error);
        logger.error('PSA Autocomplete search error:', error);
        setPsaCards([]);
      } finally {
        setIsLoading(false);
      }
    }, 300), // 300ms debounce
    []
  );

  // Handle input changes
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    console.log(`🔍 PSA Autocomplete: Input changed to "${inputValue}"`);
    setSearchTerm(inputValue);
    
    // Notify parent of input change
    if (onInputChange) {
      onInputChange(e);
    }

    // Open dropdown when typing
    if (inputValue.length >= 2) {
      console.log(`🔍 PSA Autocomplete: Opening dropdown and searching...`);
      setIsOpen(true);
      debouncedSearch(inputValue);
    } else {
      console.log(`🔍 PSA Autocomplete: Closing dropdown (too short)`);
      setIsOpen(false);
      setPsaCards([]);
    }
  };

  // Handle PSA card selection
  const handleCardSelect = (psaCard) => {
    setSearchTerm(psaCard.cardName);
    setIsOpen(false);
    setPsaCards([]);
    
    if (onSelect) {
      onSelect(psaCard);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setIsOpen(true);
      debouncedSearch(searchTerm);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideTrigger = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsidePortal = portalRef.current && !portalRef.current.contains(event.target);
      
      if (isOutsideTrigger && isOutsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 320; // Estimated max height
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const position = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
    
    setDropdownPosition({
      position,
      top: position === 'bottom' ? rect.bottom + window.scrollY + 4 : rect.top + window.scrollY - dropdownHeight - 4,
      left: rect.left + window.scrollX,
      width: rect.width
    });
  }, []);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();
    }
  }, [isOpen, calculateDropdownPosition]);

  // Sync external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Render dropdown content
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <div
        ref={portalRef}
        className="fixed z-[60000] bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 60000
        }}
      >
        {isLoading && (
          <div className="p-3 text-center text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full size-4 border-b-2 border-blue-500"></div>
              <span>Searching PSA database...</span>
            </div>
          </div>
        )}
        
        {!isLoading && psaCards.length === 0 && searchTerm.length >= 2 && (
          <div className="p-3 text-center text-gray-500 dark:text-gray-400">
            No PSA cards found for "{searchTerm}"
          </div>
        )}
        
        {!isLoading && psaCards.length > 0 && (
          <div className="p-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              Found {psaCards.length} PSA cards
            </div>
            {psaCards.map((psaCard, index) => (
              <button
                key={`${psaCard.certNumber}-${index}`}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                onClick={() => handleCardSelect(psaCard)}
                type="button"
              >
                <div className="space-y-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {psaCard.cardName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-4">
                    <span className="font-medium">PSA {psaCard.grade}</span>
                    <span>{psaCard.brand}</span>
                    {psaCard.totalPopulation > 0 && (
                      <span>Pop: {psaCard.totalPopulation}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Cert #: {psaCard.certNumber}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label
          htmlFor={id || name}
          className={`block text-sm font-medium mb-1 ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-white'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id || name}
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={!searchTerm ? placeholder : ""}
          disabled={disabled}
          className={`
            relative flex items-center justify-between border rounded-lg cursor-text transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-600'}
            ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-white'}
            w-full h-10 text-base px-3 pr-10
          `}
          {...props}
        />
        
        {/* Search icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg 
            className="size-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
      </div>
      
      {error && (
        <p id={`${id || name}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {renderDropdown()}
    </div>
  );
};

PSACardAutocomplete.propTypes = {
  value: PropTypes.string,
  placeholder: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onInputChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
  required: PropTypes.bool,
};

export default PSACardAutocomplete;
