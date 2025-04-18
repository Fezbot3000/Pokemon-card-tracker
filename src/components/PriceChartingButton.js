import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import { Button, Icon } from '../design-system';
import { functions, httpsCallable } from '../services/firebase';

/**
 * PriceChartingButton Component
 * 
 * A button that fetches price data from PriceCharting API for Pokemon cards
 */
const PriceChartingButton = ({ 
  currentCardData, 
  onCardUpdate,
  buttonText = "Update Price from PriceCharting",
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [productMatches, setProductMatches] = useState([]);
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  
  // Format the search query based on card data
  const formatSearchQuery = (cardData) => {
    // Start with the essential information
    const parts = [];
    
    // Add card name if available
    if (cardData.card) {
      parts.push(cardData.card);
    }
    
    // Add player/character name if available and different from card name
    if (cardData.player && cardData.player !== cardData.card) {
      parts.push(cardData.player);
    }
    
    // Add set name if available
    if (cardData.set) {
      parts.push(cardData.set);
    }
    
    // Add year if available
    if (cardData.year) {
      parts.push(cardData.year.toString());
    }
    
    // Add condition if available - this helps with graded cards
    if (cardData.condition) {
      parts.push(cardData.condition);
    }
    
    // Join all parts into a query string
    const query = parts.join(' ');
    return query;
  };
  
  // Find the best match from search results using natural language processing techniques
  const findBestMatch = (products, cardData) => {
    if (!products || products.length === 0) return null;
    
    // Function to normalize text for comparison
    const normalize = (text) => {
      if (!text) return '';
      return text.toLowerCase()
        .replace(/[^\w\s#]/g, '') // Remove special chars except # (important for card numbers)
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
    };
    
    // Extract and normalize card information
    const cardName = normalize(cardData.card);
    const playerName = normalize(cardData.player);
    const setName = normalize(cardData.set);
    const year = cardData.year ? cardData.year.toString() : '';
    const condition = normalize(cardData.condition);
    
    // Extract card number if present in the card name
    const cardNumberMatch = cardName.match(/#?(\d+)/);
    const cardNumber = cardNumberMatch ? cardNumberMatch[1] : null;
    
    // Score each product based on how well it matches our card
    const scoredProducts = products.map(product => {
      // Handle different property naming conventions in the API response
      const productName = normalize(product['product-name'] || product.product_name || '');
      const consoleName = normalize(product['console-name'] || product.console_name || '');
      
      let score = 0;
      let matchDetails = [];

      // Exact matches are highly valuable
      if (productName === `${playerName} ${cardNumber}` || productName === `${cardName} ${cardNumber}`) {
        score += 50;
        matchDetails.push('Exact match (+50)');
      }
      
      // Card number is very specific and important
      if (cardNumber) {
        if (productName.includes(`#${cardNumber}`)) {
          score += 40;
          matchDetails.push('Exact card number match (+40)');
        } else if (productName.includes(cardNumber)) {
          score += 30;
          matchDetails.push('Card number in name (+30)');
        }
      }

      // Set name is crucial for identifying the correct card
      if (setName) {
        if (consoleName.includes(setName)) {
          score += 35;
          matchDetails.push('Set name exact match (+35)');
        } else {
          // Check for partial set name matches
          const setWords = setName.split(' ').filter(word => word.length > 2);
          const matchedWords = setWords.filter(word => consoleName.includes(word));
          if (matchedWords.length > 0) {
            const partialScore = Math.floor((matchedWords.length / setWords.length) * 25);
            score += partialScore;
            matchDetails.push(`Partial set match (+${partialScore})`);
          }
        }
      }

      // Card name/player name matches
      if (cardName && productName.includes(cardName)) {
        score += 25;
        matchDetails.push('Card name match (+25)');
      }
      if (playerName && productName.includes(playerName)) {
        score += 25;
        matchDetails.push('Player name match (+25)');
      }

      // Year matching
      if (year && productName.includes(year)) {
        score += 20;
        matchDetails.push('Year match (+20)');
      }

      // Condition matching (especially for graded cards)
      if (condition) {
        if (productName.includes(condition)) {
          score += 15;
          matchDetails.push('Condition match (+15)');
        }
        // Special handling for PSA graded cards
        if (condition.includes('psa') && productName.includes('psa')) {
          score += 10;
          matchDetails.push('PSA grade match (+10)');
        }
      }

      // Penalize matches that seem too different
      if (score === 0 && cardName && !productName.includes(cardName) && !productName.includes(playerName)) {
        score -= 20;
        matchDetails.push('No name match (-20)');
      }

      return {
        ...product,
        score,
        matchDetails
      };
    });

    // Sort by score descending
    scoredProducts.sort((a, b) => b.score - a.score);

    // Filter out low-quality matches
    const highestScore = scoredProducts[0]?.score || 0;
    const threshold = Math.max(30, highestScore - 20); // Either minimum 30 points or within 20 points of best match

    const filteredProducts = scoredProducts.filter(product => product.score >= threshold);

    // Limit to top 5 matches
    return filteredProducts.slice(0, 5);
  };
  
  // Determine the most appropriate price field to use
  const determineBestPriceField = (product, cardData) => {
    if (!product) return { price: null, source: 'Unknown' };
    
    // Check if the card is graded
    const isGraded = cardData.condition && (
      /\b(psa|bgs|cgc)\s*\d+\b/i.test(cardData.condition) || 
      /\bgem\s*mt\b/i.test(cardData.condition)
    );
    
    let price = null;
    let source = '';
    
    // Select the appropriate price field based on card condition
    if (isGraded && product['graded-price']) {
      price = product['graded-price'];
      source = 'Graded';
    } else if (product['loose-price']) {
      price = product['loose-price'];
      source = 'Loose';
    } else if (product.price) {
      price = product.price;
      source = 'Default';
    } else if (product['complete-price']) {
      price = product['complete-price'];
      source = 'Complete';
    } else if (product['new-price']) {
      price = product['new-price'];
      source = 'New';
    }
    
    // Convert to number
    const numericPrice = price ? parseFloat(price) : null;
    
    return { 
      price: numericPrice, 
      source 
    };
  };
  
  // Fetch price data from Price Charting API via Firebase Function
  const fetchPriceData = async () => {
    setIsLoading(true);
    try {
      const query = formatSearchQuery(currentCardData);
      console.log('[PriceCharting] Search query:', query);
      
      // Use the Firebase Function proxy instead of direct API call
      const proxyPriceCharting = httpsCallable(functions, 'proxyPriceCharting');
      
      // First, get a list of matching products
      const productsResponse = await proxyPriceCharting({ 
        endpoint: 'products', 
        params: { q: query } 
      });
      
      console.log('[PriceCharting] API response data:', productsResponse.data);
      
      // Check if we got any results
      if (!productsResponse.data.products || productsResponse.data.products.length === 0) {
        console.log('[PriceCharting] No matching cards found');
        toast.error("No matching cards found on PriceCharting");
        setIsLoading(false);
        return;
      }
      
      const products = productsResponse.data.products;
      
      // If we have multiple matches, show the selector UI
      if (products.length > 1) {
        console.log('[PriceCharting] Multiple matches found:', products.length);
        
        // Score and sort the products by relevance
        const scoredProducts = findBestMatch(products, currentCardData);
        
        setProductMatches(scoredProducts);
        setShowMatchSelector(true);
        setIsLoading(false);
        return;
      }
      
      // If we only have one match, use it directly
      await selectProduct(products[0]);
      
    } catch (error) {
      console.warn('[PriceCharting] Error fetching price data:', error.message);
      toast.error(`Failed to fetch price data: ${error.message}`);
      setIsLoading(false);
    }
  };
  
  // Handle selecting a specific product from the matches
  const selectProduct = async (selectedProduct) => {
    setIsLoading(true);
    try {
      console.log('[PriceCharting] Selected product:', selectedProduct);
      
      // Get detailed product information using the product ID
      const proxyPriceCharting = httpsCallable(functions, 'proxyPriceCharting');
      const productResponse = await proxyPriceCharting({ 
        endpoint: 'product', 
        params: { id: selectedProduct.id } 
      });
      
      console.log('[PriceCharting] Detailed product data:', productResponse.data);
      
      const productData = productResponse.data;
      
      // Extract the product ID
      const productId = productData.id;
      
      if (!productId) {
        console.log('[PriceCharting] No product ID found in response');
        toast.error("Could not find product ID in PriceCharting response");
        setIsLoading(false);
        return;
      }
      
      console.log('[PriceCharting] Product ID:', productId);
      
      // Construct the product URL
      const productUrl = `https://www.pricecharting.com/game/pokemon/${productId}`;
      console.log('[PriceCharting] Product URL:', productUrl);
      
      // Determine the best price field to use
      const { price, source } = determineBestPriceField(productData, currentCardData);
      
      if (!price) {
        console.log('[PriceCharting] No suitable price found');
        toast.error("Could not find a suitable price on PriceCharting");
        setIsLoading(false);
        return;
      }
      
      console.log('[PriceCharting] Selected', source, 'price:', price);
      
      // Update the card data
      const updatedCardData = {
        ...currentCardData,
        currentValueAUD: price,
        priceSource: `PriceCharting (${source})`,
        priceChartingUrl: productUrl,
        priceChartingName: productData['product-name'] || selectedProduct.product_name,
        priceChartingProductId: productId,
        lastPriceUpdate: new Date().toISOString()
      };
      
      console.log('[PriceCharting] Updated card data:', updatedCardData);
      
      // Update the card data
      onCardUpdate(updatedCardData);
      
      // Close the selector if it was open
      setShowMatchSelector(false);
      setProductMatches([]);
      
      toast.success(`Card price updated to $${price} from PriceCharting`);
    } catch (error) {
      console.warn('[PriceCharting] Error processing product data:', error.message);
      toast.error(`Failed to process product data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel product selection
  const cancelSelection = () => {
    setShowMatchSelector(false);
    setProductMatches([]);
  };
  
  // Render the product selector UI
  const renderProductSelector = () => {
    if (!showMatchSelector || productMatches.length === 0) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
        <div className="bg-white dark:bg-[#0F0F0F] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700/50">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">Select Card Match</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Multiple matches found. Please select the most appropriate card.</p>
          </div>

          {/* Product List */}
          <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
            <div className="space-y-2">
              {productMatches.map((product, index) => {
                const productName = product['product-name'] || product.product_name || `Product #${index + 1}`;
                const consoleName = product['console-name'] || product.console_name || 'Unknown';
                
                return (
                  <div 
                    key={product.id || index}
                    className="group flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => selectProduct(product)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">{productName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{consoleName}</p>
                      {product.score && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Match score: {product.score}</p>
                      )}
                    </div>
                    <Button 
                      variant="primary"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectProduct(product);
                      }}
                    >
                      Select
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm">
            <Button variant="secondary" onClick={cancelSelection}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      <Button
        variant="outline"
        onClick={fetchPriceData}
        disabled={isLoading}
        iconLeft={<Icon name={isLoading ? "hourglass_empty" : "attach_money"} />}
        className={className}
      >
        {isLoading ? "Fetching Price..." : buttonText}
      </Button>
      
      {renderProductSelector()}
    </>
  );
};

PriceChartingButton.propTypes = {
  /** Current card data */
  currentCardData: PropTypes.object.isRequired,
  /** Callback function to update card data */
  onCardUpdate: PropTypes.func.isRequired,
  /** Button text */
  buttonText: PropTypes.string,
  /** Additional class names */
  className: PropTypes.string
};

export default PriceChartingButton;
