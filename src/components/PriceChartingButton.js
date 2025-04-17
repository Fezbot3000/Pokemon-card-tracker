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
      
      // Create a scoring system based on term frequency
      
      // Card name is most important
      if (cardName && productName.includes(cardName)) {
        const points = 25;
        score += points;
        matchDetails.push(`Card name match (+${points})`);
      }
      
      // Card number is very specific
      if (cardNumber && productName.includes(`#${cardNumber}`)) {
        const points = 20;
        score += points;
        matchDetails.push(`Card number match (+${points})`);
      }
      
      // Set name is important for distinguishing between different sets
      if (setName && productName.includes(setName)) {
        const points = 15;
        score += points;
        matchDetails.push(`Set name match (+${points})`);
      } else if (setName) {
        // Check for partial set name matches
        const setWords = setName.split(' ').filter(word => word.length > 2);
        const matchedWords = setWords.filter(word => productName.includes(word));
        if (matchedWords.length > 0) {
          const points = Math.floor(10 * (matchedWords.length / setWords.length));
          score += points;
          matchDetails.push(`Partial set match (${matchedWords.join(', ')}) (+${points})`);
        }
      }
      
      // Player name might be important for character cards
      if (playerName && playerName !== cardName && productName.includes(playerName)) {
        const points = 10;
        score += points;
        matchDetails.push(`Player name match (+${points})`);
      }
      
      // Year helps distinguish between reprints
      if (year && productName.includes(year)) {
        const points = 10;
        score += points;
        matchDetails.push(`Year match (+${points})`);
      }
      
      // Check for edition indicators
      const isFirstEdition = /\b(1st|first)(\s+edition)?\b/i.test(productName);
      const isShadowless = /\bshadowless\b/i.test(productName);
      
      // Match edition type from set name
      const cardIsFirstEd = /\b(1st|first)(\s+edition)?\b/i.test(setName);
      const cardIsShadowless = /\bshadowless\b/i.test(setName);
      
      // Award points for matching edition type
      if (cardIsFirstEd && isFirstEdition) {
        const points = 20;
        score += points;
        matchDetails.push(`1st Edition match (+${points})`);
      } else if (cardIsShadowless && isShadowless) {
        const points = 20;
        score += points;
        matchDetails.push(`Shadowless match (+${points})`);
      } else if (!cardIsFirstEd && !cardIsShadowless && !isFirstEdition && !isShadowless) {
        // If neither card nor product mention 1st edition or shadowless, likely both are unlimited
        const points = 10;
        score += points;
        matchDetails.push(`Unlimited match (+${points})`);
      } else if ((cardIsFirstEd !== isFirstEdition) || (cardIsShadowless !== isShadowless)) {
        // Penalize mismatched edition types
        const points = -15;
        score += points;
        matchDetails.push(`Edition mismatch (${points})`);
      }
      
      // Condition matching for graded cards
      if (condition) {
        // Extract grading info if present
        const gradeMatch = condition.match(/\b(psa|bgs|cgc)\s*(\d+)\b/i);
        
        if (gradeMatch) {
          const gradingCompany = gradeMatch[1].toLowerCase();
          const grade = gradeMatch[2];
          
          // Check if product name contains the same grading info
          if (productName.includes(gradingCompany) && productName.includes(grade)) {
            const points = 15;
            score += points;
            matchDetails.push(`Grade match (${gradingCompany.toUpperCase()} ${grade}) (+${points})`);
          }
        } else if (condition.includes('gem mt') && productName.includes('gem mt')) {
          const points = 15;
          score += points;
          matchDetails.push(`Condition match (GEM MT) (+${points})`);
        }
      }
      
      // Check if the product is for Pokemon cards
      if (consoleName.includes('pokemon')) {
        const points = 10;
        score += points;
        matchDetails.push(`Pokemon console match (+${points})`);
      }
      
      // Add the product with its score and match details
      return {
        ...product,
        score,
        matchDetails
      };
    });
    
    // Sort by score (highest first)
    const sortedProducts = scoredProducts.sort((a, b) => b.score - a.score);
    
    // Return the best match
    return sortedProducts[0];
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
        const scoredProducts = products.map(product => {
          const score = findBestMatch([product], currentCardData)?.score || 0;
          return { ...product, score };
        }).sort((a, b) => b.score - a.score);
        
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Select the Best Match</h2>
          <p className="mb-4">Multiple matches found. Please select the most appropriate card:</p>
          
          <div className="space-y-3">
            {productMatches.map((product, index) => {
              // Handle different property naming conventions in the API response
              const productName = product['product-name'] || product.product_name || `Product #${index + 1}`;
              const consoleName = product['console-name'] || product.console_name || 'Unknown';
              
              return (
                <div 
                  key={product.id || index}
                  className="border rounded p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={() => selectProduct(product)}
                >
                  <div>
                    <div className="font-medium">{productName}</div>
                    <div className="text-sm text-gray-600">{consoleName}</div>
                    {product.score && (
                      <div className="text-xs text-gray-500">Match score: {product.score}</div>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="primary"
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
          
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={cancelSelection}>
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
