/**
 * Card Search Autocomplete Component
 * 
 * Real-time search autocomplete for Price Charting cards
 * Shows dropdown results as user types, with debouncing
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import { searchCardsByName } from '../services/priceChartingService';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import logger from '../services/LoggingService';

const CardSearchAutocomplete = ({ onSelectCard, placeholder = "Search for cards...", className = "" }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  
  const { formatAmountForDisplay } = useUserPreferences();

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info(`Starting card search for: "${searchQuery}"`);
      const searchResults = await searchCardsByName(searchQuery.trim(), 12); // Limit to 12 for dropdown
      logger.info(`Search completed. Found ${searchResults?.length || 0} results`);
      
      console.log('Search results received:', { 
        searchQuery, 
        resultsLength: searchResults?.length || 0, 
        results: searchResults 
      });
      
      if (searchResults && searchResults.length > 0) {
        console.log('Setting results and opening dropdown:', searchResults);
        setResults(searchResults);
        setIsOpen(true);
        setHighlightedIndex(-1);
        setError(null); // Clear any previous errors
      } else {
        logger.warn(`No results found for: "${searchQuery}"`);
        console.log('No results - setting error state');
        setResults([]);
        setIsOpen(false);
        setError(`No cards found for "${searchQuery}"`);
      }
    } catch (err) {
      logger.error('Autocomplete search error:', err);
      console.error('Full autocomplete error:', err); // Also log to console for debugging
      setError(`Search failed: ${err.message || 'Unknown error'}`);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search by 800ms to let user finish typing
    debounceRef.current = setTimeout(() => {
      debouncedSearch(value);
    }, 800);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelectCard(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle card selection
  const handleSelectCard = (card) => {
    const cardName = getCardDisplayName(card);
    setQuery(cardName);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelectCard(card);
    toast.success(`Selected: ${cardName}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const dropdownElement = dropdownRef.current;
      const highlightedElement = dropdownElement.querySelector(`[data-index="${highlightedIndex}"]`);
      
      if (highlightedElement) {
        // Calculate if the element is outside the visible area
        const dropdownRect = dropdownElement.getBoundingClientRect();
        const elementRect = highlightedElement.getBoundingClientRect();
        
        // Check if element is below the visible area
        if (elementRect.bottom > dropdownRect.bottom) {
          highlightedElement.scrollIntoView({ 
            block: 'end', 
            behavior: 'smooth' 
          });
        }
        // Check if element is above the visible area
        else if (elementRect.top < dropdownRect.top) {
          highlightedElement.scrollIntoView({ 
            block: 'start', 
            behavior: 'smooth' 
          });
        }
      }
    }
  }, [highlightedIndex]);

  // Get display name for card
  const getCardDisplayName = (card) => {
    if (card.cardDetails.cardName) {
      return card.cardDetails.cardName;
    }
    return card.name
      .replace(/^Pokemon\s*/i, '')
      .replace(/\b(PSA|BGS|CGC|SGC)\s*\d+(?:\.\d+)?\b/i, '')
      .trim();
  };

  // Get card set display
  const getCardSetDisplay = (card) => {
    const { set, year } = card.cardDetails;
    if (set && year) return `${set} (${year})`;
    if (set) return set;
    if (year) return year.toString();
    return 'Unknown Set';
  };

  // Get condition display
  const getConditionDisplay = (card) => {
    const { condition, gradingCompany, grade } = card.cardDetails;
    if (condition) return condition;
    if (gradingCompany && grade) return `${gradingCompany} ${grade}`;
    return null;
  };

  // Get additional price info
  const getPriceBreakdown = (card) => {
    if (!card.allPrices) return null;
    
    const prices = [];
    if (card.allPrices.loose) prices.push(`Loose: ${formatAmountForDisplay(card.allPrices.loose / 100, 'USD')}`);
    if (card.allPrices.complete) prices.push(`Complete: ${formatAmountForDisplay(card.allPrices.complete / 100, 'USD')}`);
    if (card.allPrices.new) prices.push(`New: ${formatAmountForDisplay(card.allPrices.new / 100, 'USD')}`);
    if (card.allPrices.graded) prices.push(`Graded: ${formatAmountForDisplay(card.allPrices.graded / 100, 'USD')}`);
    
    return prices.length > 0 ? prices.slice(0, 2) : null; // Show max 2 price types
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="focus:ring-primary/20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-white"
          autoComplete="off"
        />
        
        {/* Search Icon / Loading Spinner */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <div className="size-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          ) : (
            <svg className="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[60000] mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {error ? (
            <div className="p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((card, index) => {
                const isHighlighted = index === highlightedIndex;
                const cardName = getCardDisplayName(card);
                const setDisplay = getCardSetDisplay(card);
                const conditionDisplay = getConditionDisplay(card);
                const price = card.bestPrice ? card.bestPrice.price : 0;

                return (
                  <div
                    key={card.id || index}
                    data-index={index}
                    className={`cursor-pointer px-3 py-2 transition-colors ${
                      isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleSelectCard(card)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {card.name || cardName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          <span className="font-medium">Set:</span> {card.console || card.genre || card.platform || setDisplay}
                          {card.releaseDate && (
                            <span className="ml-2">• <span className="font-medium">Year:</span> {card.releaseDate.split('-')[0]}</span>
                          )}
                        </div>
                        {conditionDisplay && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {conditionDisplay}
                          </div>
                        )}
                        
                        {/* Additional price breakdown */}
                        {getPriceBreakdown(card) && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {getPriceBreakdown(card).join(' • ')}
                          </div>
                        )}
                        
                        {/* Show release date if available */}
                        {card.releaseDate && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Released: {card.releaseDate}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-3 text-right shrink-0">
                        {price > 0 ? (
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatAmountForDisplay(price, 'USD')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            No price
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Footer hint */}
              <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Press ↑↓ to navigate, Enter to select, Esc to close
              </div>
            </div>
          ) : query.length >= 2 && !isLoading && (
            <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
              No cards found for "{query}"
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {query.length === 0 && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Type at least 3 characters to search for cards
        </div>
      )}
      
      {query.length > 0 && query.length < 3 && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Type {3 - query.length} more character{3 - query.length !== 1 ? 's' : ''} to search...
        </div>
      )}
    </div>
  );
};

CardSearchAutocomplete.propTypes = {
  onSelectCard: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string
};

export default CardSearchAutocomplete;
