/**
 * Price Charting Search Results Modal
 * 
 * Displays search results from Price Charting API and allows user to select 
 * and apply pricing data to their card
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import Modal from '../design-system/molecules/Modal';
import ModalButton from '../design-system/atoms/ModalButton';
import { searchCardPrice, extractBestPrice, getPriceChartingUrl } from '../services/priceChartingService';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import LoggingService from '../services/LoggingService';

const PriceChartingModal = ({
  isOpen,
  onClose,
  currentCardData,
  onApplyPrice,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { formatAmountForDisplay } = useUserPreferences();

  // Fetch Price Charting data when modal opens
  useEffect(() => {
    const fetchPriceData = async () => {
      if (!isOpen || !currentCardData) return;

      setIsLoading(true);
      setError(null);
      setSearchResults([]);
      setSelectedProduct(null);

      try {
        const results = await searchCardPrice(currentCardData);
        
        if (results && results.length > 0) {
          setSearchResults(results);
          // Auto-select the first result
          setSelectedProduct(results[0]);
          
          const topMatch = results[0];
          const matchScore = topMatch.matchScore || 0;
          
          if (matchScore >= 60) {
            toast.success(`Found ${results.length} matches! Top match: ${Math.round(matchScore)}% confidence`);
          } else if (matchScore >= 40) {
            toast.success(`Found ${results.length} possible matches (best: ${Math.round(matchScore)}% confidence)`);
          } else {
            toast.success(`Found ${results.length} potential matches (low confidence - please review carefully)`);
          }
        } else {
          setError('No good matches found for this card. The search may need more specific details, or this card may not be in the Price Charting database.');
          toast.error('No matching products found in Price Charting database');
        }
      } catch (err) {
        LoggingService.error('Price Charting search error:', err);
        setError(err.message || 'Failed to search Price Charting');
        toast.error(`Price Charting search failed: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && currentCardData) {
      fetchPriceData();
    }
  }, [isOpen, currentCardData]);

  // Handle applying selected price to card
  const handleApplyPrice = () => {
    if (!selectedProduct) {
      toast.error('Please select a product first');
      return;
    }

    const bestPrice = extractBestPrice(selectedProduct);
    
    if (!bestPrice) {
      toast.error('No price data available for this product');
      return;
    }

    // Apply the price to the card
    onApplyPrice({
      price: bestPrice.price,
      priceInUSD: bestPrice.price, // Price Charting returns USD
      currency: bestPrice.currency,
      source: 'Price Charting',
      productInfo: {
        id: selectedProduct.id,
        name: selectedProduct['product-name'] || selectedProduct.name,
        category: selectedProduct.category,
        priceType: bestPrice.priceType
      },
      lastUpdated: bestPrice.lastUpdated
    });

    toast.success('Price Charting data applied successfully!');
    onClose();
  };

  // Get the best price for a product
  const getBestPriceForProduct = (product) => {
    const bestPrice = extractBestPrice(product);
    return bestPrice ? bestPrice.price : 0;
  };

  // Get match confidence level
  const getMatchConfidence = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/20', dotColor: 'bg-green-500' };
    if (score >= 60) return { level: 'Good', color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/20', dotColor: 'bg-blue-500' };
    if (score >= 40) return { level: 'Fair', color: 'yellow', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20', dotColor: 'bg-yellow-500' };
    return { level: 'Poor', color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/20', dotColor: 'bg-red-500' };
  };

  // Create footer with buttons
  const modalFooter = !isLoading && (
    <div className="flex w-full items-center justify-between">
      <ModalButton variant="secondary" onClick={onClose}>
        Cancel
      </ModalButton>
      
      {selectedProduct && getBestPriceForProduct(selectedProduct) > 0 && (
        <ModalButton variant="primary" onClick={handleApplyPrice}>
          Apply Price ({formatAmountForDisplay(getBestPriceForProduct(selectedProduct), 'USD')})
        </ModalButton>
      )}
    </div>
  );

  return createPortal(
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Price Charting Search Results"
      size="modal-width-60"
      position="right"
      closeOnClickOutside={false}
      footer={modalFooter}
    >
      <div className="space-y-6">
        {/* Search Query Info */}
        {currentCardData && (
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
              Searching for:
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {[
                'Pokemon',
                currentCardData.cardName || currentCardData.card || currentCardData.name,
                currentCardData.set || currentCardData.setName,
                currentCardData.year,
                currentCardData.gradingCompany && currentCardData.grade ? `${currentCardData.gradingCompany} ${currentCardData.grade}` : null
              ].filter(Boolean).join(' ')}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center">
            <div className="inline-block size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Searching Price Charting database...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Search Results */}
        {!isLoading && searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Found {searchResults.length} best matches:
              </h4>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Ranked by relevance
              </div>
            </div>
            
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {searchResults.map((product, index) => {
                const isSelected = selectedProduct === product;
                const bestPrice = getBestPriceForProduct(product);
                const matchScore = product.matchScore || 0;
                const confidence = getMatchConfidence(matchScore);
                
                return (
                  <div
                    key={product.id || index}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {product['product-name'] || product.name || 'Unknown Product'}
                          </h5>
                          {index === 0 && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Best Match
                            </span>
                          )}
                        </div>
                        
                                                 {/* Match confidence indicator */}
                         <div className={`mb-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${confidence.bgColor}`}>
                           <div className={`mr-1 size-2 rounded-full ${confidence.dotColor}`}></div>
                           {confidence.level} Match ({Math.round(matchScore)}%)
                         </div>
                        
                        {product.category && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Category: {product.category}
                          </p>
                        )}
                        {product.console && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Platform: {product.console}
                          </p>
                        )}
                      </div>
                      
                      <div className="ml-4 text-right">
                        {bestPrice > 0 ? (
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatAmountForDisplay(bestPrice, 'USD')}
                          </div>
                        ) : (
                          <div className="text-gray-500 dark:text-gray-400">
                            No price data
                          </div>
                        )}
                        
                        {/* Show price type */}
                        {(() => {
                          const bestPriceInfo = extractBestPrice(product);
                          return bestPriceInfo ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {bestPriceInfo.priceType.replace(/-/g, ' ').toUpperCase()}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    
                    {/* Price Charting link */}
                    <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Want to see more details and price history?
                      </div>
                      <a
                        href={getPriceChartingUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent parent click handler
                        className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30"
                      >
                        <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on Price Charting
                      </a>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-2 rounded bg-blue-100 p-2 text-xs text-blue-800 dark:bg-blue-800/30 dark:text-blue-300">
                        ✓ Selected - Click "Apply Price" to use this data
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Help text */}
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                💡 <strong>Tip:</strong> Results are automatically filtered and ranked based on how well they match your card details. 
                The "Best Match" result is typically the most accurate. Click "View on Price Charting" to see detailed price history and more information.
              </p>
            </div>
          </div>
        )}


      </div>
    </Modal>,
    document.body
  );
};

PriceChartingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentCardData: PropTypes.object,
  onApplyPrice: PropTypes.func.isRequired,
};

export default PriceChartingModal; 