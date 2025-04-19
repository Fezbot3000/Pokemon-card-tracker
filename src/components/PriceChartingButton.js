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
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Format the search query based on card data
  const formatSearchQuery = (cardData) => {
    const queryParts = [
      cardData.set,
      cardData.year,
      cardData.player, // Use 'player' for the card name (e.g., Chansey)
      cardData.variation
    ];
    // Add number, preferring cardNumber if available, otherwise number
    const numberPart = cardData.cardNumber || cardData.number;
    if (numberPart) {
      queryParts.push(`#${numberPart}`);
    }
    const query = queryParts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    console.log(`[PriceCharting] Generated search query: ${query}`);
    return query || cardData.card || 'unknown query'; // Ensure we always return something
  };
  
  // --- Step 1: Scoring function (Refined for better ranking) ---
  function normalize(str) {
    if (typeof str === 'string') return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (typeof str === 'number') return str.toString();
    if (str === undefined || str === null) return '';
    console.warn('[PriceCharting] Unexpected non-string value in normalize:', str, typeof str);
    return '';
  }
  function scoreProduct(candidate, userCard) {
    let score = 0;
    const candidateNumber = normalize(candidate.cardNumber || candidate.number || candidate.card_number);
    const userNumber = normalize(userCard.cardNumber || userCard.number || userCard["Card Number"]);
    const candidateSet = normalize(candidate.consoleName || candidate.console_name || candidate.set);
    const userSet = normalize(userCard.set || userCard.setName); // Use setName from PSA data too
    const candidateYear = (candidate.releaseDate || candidate.year || '').toString();
    const userYear = (userCard.year || '').toString();
    const candidateName = normalize(candidate.name || candidate["product-name"] || candidate.product_name);
    const userName = normalize(userCard.name || userCard.card || userCard.cardName); // Use card/cardName too
    // Set name match (higher importance)
    if (candidateSet && userSet && candidateSet === userSet) score += 10;
    // Card number match (higher importance)
    if (candidateNumber && userNumber) {
      if (candidateNumber === userNumber) {
        score += 10;
      } else {
        score -= 10; // Penalize number mismatch
      }
    }
    // Year match
    if (candidateYear && userYear && candidateYear === userYear) score += 3;
    // Name similarity
    if (candidateName && userName && candidateName.includes(userName)) score += 2;
    // Language/region filter
    if (candidateName.includes('japanese') || candidateName.includes('german') || candidateName.includes('french')) score -= 5;
    // Promo filter
    if (candidateName.includes('promo')) score -= 2;
    // Unlimited/1st Edition (if user specifies)
    if (userName.includes('unlimited') && candidateName.includes('unlimited')) score += 1;
    if (userName.includes('1stedition') && candidateName.includes('1stedition')) score += 1;
    // Console/set contains 'pokemon'
    if (candidateSet.includes('pokemon')) score += 1;
    return score;
  }
  
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
      
      const products = productsResponse.data.products || [];
      if (!products.length) {
        toast.error('No matching products found on PriceCharting.');
        setIsLoading(false);
        return;
      }
      
      // --- DEBUG: Log all candidate products before scoring ---
      console.log('[PriceCharting] Candidate products:', (products || []).map(p => ({
        id: p.id,
        name: p.name || p["product-name"] || p.product_name,
        set: p.consoleName || p.console_name || p.set,
        year: p.releaseDate || p.year,
        cardNumber: p.cardNumber || p.number || p.card_number
      })));
      
      // --- Step 2: Score and sort candidates ---
      const scoredProducts = (products || []).map(prod => ({
        ...prod,
        _score: scoreProduct(prod, currentCardData)
      }));
      scoredProducts.sort((a, b) => b._score - a._score);

      // --- Step 3: REMOVED Auto-select - ALWAYS show modal if results exist ---
      if (scoredProducts.length > 0) {
        // Show top 5 matches for manual selection
        setProductMatches(scoredProducts.slice(0, 5)); // Show top 5
        setShowMatchSelector(true);
      } else {
        toast.info('No potential matches found on PriceCharting.');
      }

      setIsLoading(false);
      return;
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
      console.log('[PriceCharting] Selected product (summary):', {id: selectedProduct.id, name: selectedProduct['product-name']});
      
      // Get detailed product information using the product ID
      const proxyPriceCharting = httpsCallable(functions, 'proxyPriceCharting');
      const productResponse = await proxyPriceCharting({ 
        endpoint: 'product', 
        params: { id: selectedProduct.id } 
      });
      
      console.log('Raw response from Firebase function:', productResponse); // Log the raw response

      // Assuming the Firebase function returns { data: { ... actual product data ... } }
      // or handles errors by returning a different structure.
      if (!productResponse || typeof productResponse !== 'object') {
        console.error('[PriceCharting] Invalid response structure from Firebase function:', productResponse);
        toast.error('Received invalid data structure from server.');
        setIsLoading(false);
        return;
      }

      // Check if the function signaled an error (adjust based on actual function implementation)
      if (productResponse.error) {
        console.error('[PriceCharting] Error fetching product data (from function):', productResponse.error);
        toast.error(`Failed to fetch product data: ${productResponse.error}`);
        setIsLoading(false);
        return;
      }

      // Access the actual product data, assuming it's nested under 'data'
      const productData = productResponse.data; 

      // Check if productData exists after accessing .data
      if (!productData) {
         console.error('[PriceCharting] Product data not found in Firebase response:', productResponse);
         toast.error('Product data missing in server response.');
         setIsLoading(false);
         return;
      }

      console.log('[PriceCharting] Detailed product data fetched:', productData);
      const detailedProductData = productData; // Use the extracted data
      const userCondition = currentCardData.grade || currentCardData.condition || 'Ungraded'; // Default to Ungraded
      console.log(`[PriceCharting] User's card condition: ${userCondition}`);
      console.log('[PriceCharting] Available price fields:', Object.keys(detailedProductData).filter(k => k.endsWith('-price')));

      // Log all price fields returned by the API for this product
      const prices = Object.entries(detailedProductData).filter(([key, value]) => key.endsWith('-price'));
      console.log('[PriceCharting] ALL price fields returned:', prices);

      let selectedPrice = null;
      let priceSource = 'N/A'; // To track which price field was used

      // Convert condition to lowercase for easier matching
      const lowerCaseCondition = userCondition.toLowerCase();

      // Regex to check for graded conditions (PSA, BGS, CGC + number, or GEM MT)
      const isGraded = /^(psa|bgs|cgc)\s+(\d+(\.\d+)?)\b/i.test(lowerCaseCondition) || /\bgem mt\b/i.test(lowerCaseCondition);
      // Regex to check for explicitly ungraded conditions (e.g., 'ungraded', 'raw', 'near mint')
      const isUngraded = /\b(ungraded|raw|near mint|nm|lightly played|lp|moderately played|mp|heavily played|hp|damaged)\b/i.test(lowerCaseCondition);

      console.log(`[PriceCharting] Is Graded: ${isGraded} Is Ungraded: ${isUngraded}`);

      if (isGraded) {
        // --- Refined Graded Logic --- 
        let gradeMatch = lowerCaseCondition.match(/^(psa|bgs|cgc)\s+(\d+(\.\d+)?)\b/i);
        let gradeNum = null;
        let grader = null;

        if (gradeMatch) {
          grader = gradeMatch[1].toLowerCase(); // psa, bgs, cgc
          gradeNum = gradeMatch[2]; // e.g., '10', '9.5'
        } else if (/\bgem mt\b/i.test(lowerCaseCondition)) {
          // Treat 'GEM MT' or 'GEM MT 10' as PSA 10
          grader = 'psa'; 
          gradeNum = '10';
        }

        console.log(`[PriceCharting] Detected Grader: ${grader}, Grade Number: ${gradeNum}`);

        // Prioritized list of keys to check
        const potentialKeys = [];
        if (grader && gradeNum) {
          const gradeKey = `${grader}-${gradeNum.replace('.', '-')}-price`; // e.g., psa-10-price, bgs-9-5-price
          potentialKeys.push(gradeKey);
          // Add potential mappings for PSA common grades to condition-X-price
          if (grader === 'psa') {
            if (gradeNum === '10') potentialKeys.push('condition-18-price'); // PSA 10
            if (gradeNum === '9') potentialKeys.push('condition-17-price');  // PSA 9
          }
          // Add BGS specific keys if not already covered
          if (grader === 'bgs' && gradeNum === '10') potentialKeys.push('bgs-10-price');
          if (grader === 'bgs' && gradeNum === '9.5') potentialKeys.push('bgs-9.5-price');
          // Add CGC specific keys if needed (assuming similar pattern)
          if (grader === 'cgc' && gradeNum === '10') potentialKeys.push('cgc-10-price'); 
          if (grader === 'cgc' && gradeNum === '9.5') potentialKeys.push('cgc-9.5-price'); 

        }
        // Always add the general graded price as a fallback
        potentialKeys.push('manual-only-price'); // Check this before general graded price
        potentialKeys.push('graded-price');

        console.log('[PriceCharting] Checking potential price keys:', potentialKeys);

        // Find the first available price from the prioritized list
        for (const key of potentialKeys) {
          if (detailedProductData.hasOwnProperty(key) && detailedProductData[key] !== null && detailedProductData[key] > 0) {
            selectedPrice = detailedProductData[key];
            priceSource = key;
            console.log(`[PriceCharting] Found specific price using key '${key}': $${(selectedPrice / 100).toFixed(2)}`);
            break; // Stop checking once a price is found
          }
        }
        
        // If no specific or general graded price found, consider fallback
        if (selectedPrice === null && detailedProductData.hasOwnProperty('loose-price') && detailedProductData['loose-price'] !== null) {
          console.warn(`[PriceCharting] No specific or general graded price found for '${userCondition}'. Falling back to loose price. Available API data:`, detailedProductData);
          selectedPrice = detailedProductData['loose-price'];
          priceSource = 'loose-price (fallback for graded)';
        }

      } else if (isUngraded || (!isGraded && detailedProductData.hasOwnProperty('loose-price'))) {
        // --- Ungraded or Default Logic ---
        if (detailedProductData.hasOwnProperty('loose-price') && detailedProductData['loose-price'] !== null) {
          selectedPrice = detailedProductData['loose-price'];
          priceSource = 'loose-price';
          console.log(`[PriceCharting] Using 'loose-price' for ungraded/default: $${(selectedPrice / 100).toFixed(2)}`);
        } else {
          console.warn(`[PriceCharting] 'loose-price' not available for ungraded/default condition: ${userCondition}`);
        }
      } else {
        console.warn(`[PriceCharting] Could not determine appropriate price for condition: ${userCondition}. No price updated.`);
        // selectedPrice remains null
      }

      // Log the final decision
      if (selectedPrice !== null) {
        console.log(`[PriceCharting] Final selected price for condition "${userCondition}" (${priceSource}): $${(selectedPrice / 100).toFixed(2)}`);
      } else {
        console.log(`[PriceCharting] No price could be determined for condition "${userCondition}".`);
      }

      // Helper function to create a URL-friendly slug from the product name
      const createSlug = (name) => {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
            .replace(/\s+/g, '-')      // Replace spaces with hyphens
            .replace(/-+/g, '-');     // Replace multiple hyphens with single
      };
      const setName = detailedProductData['console-name'] || ''; // e.g., "Pokemon Fossil"
      const setSlug = createSlug(setName);
      // Clean the product name by removing bracketed content before slugifying
      const rawProductName = detailedProductData['product-name'] || ''; // e.g., "Dragonite [1999-2000] #4"
      const cleanedProductName = rawProductName.replace(/\[.*?\]/g, '').trim(); // e.g., "Dragonite #4"
      const cardSlug = createSlug(cleanedProductName); // e.g., "dragonite-4"
      // Construct the final URL using the correct structure
      const finalProductUrl = `https://www.pricecharting.com/game/${setSlug || 'unknown-set'}/${cardSlug || detailedProductData.id}`;

      const updatedCardData = {
        ...currentCardData, // Start with existing data
        priceChartingId: selectedProduct.id,
        productUrl: finalProductUrl, // Use the correctly formatted URL
        lastPriceUpdate: new Date().toISOString(),
        priceSource: selectedPrice !== null ? priceSource : currentCardData.priceSource, // Keep old source if null
        // Update USD value (convert cents to dollars)
        currentValueUSD: selectedPrice !== null ? (selectedPrice / 100).toFixed(2) : currentCardData.currentValueUSD,
        // Calculate and update AUD value using a static rate
        currentValueAUD: selectedPrice !== null 
            ? ((selectedPrice / 100) * 1.55).toFixed(2) // Apply 1.55 conversion rate
            : currentCardData.currentValueAUD, // Keep old AUD value if USD update failed
      };

      console.log('[PriceCharting] Updated card data object prepared:', updatedCardData);

      // Update the card data in Firestore
      onCardUpdate(updatedCardData);
      
      // Close the selector if it was open
      setShowMatchSelector(false);
      setProductMatches([]);
      
      toast.success(`Card price updated to $${(selectedPrice !== null ? (selectedPrice / 100).toFixed(2) : currentCardData.currentValueUSD)} USD (${priceSource}) from PriceCharting`);
    }
    catch (error) {
      console.error('[PriceCharting] Error processing selected product:', error);
      // More specific error messages
      let errorMessage = 'Failed to process product data';
      if (error.code === 'functions/not-found') {
        errorMessage = 'Proxy function not found. Deployment issue?';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      toast.error(errorMessage);
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
    if (!showMatchSelector || !productMatches || productMatches.length === 0) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
        <div className="bg-white dark:bg-[#0F0F0F] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700/50">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">Select PriceCharting Match</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Multiple potential matches found. Please select the correct one.</p>
          </div>

          {/* Product List */}
          <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
              {productMatches.map((product) => {
                const productName = product['product-name'] || product.product_name || product.name || 'Unknown Product';
                const consoleName = product['console-name'] || product.console_name || product.set || 'Unknown Set';
                const productYear = product.releaseDate || product.year || 'N/A';
                const productNumber = product.cardNumber || product.number || product.card_number || 'N/A';
                const productId = product.id;
                // Generate URL for display in modal
                const modalSetSlug = createSlug(consoleName);
                const modalCleanedProductName = productName.replace(/\[.*?\]/g, '').trim();
                const modalCardSlug = createSlug(modalCleanedProductName);
                const productUrl = `https://www.pricecharting.com/game/${modalSetSlug || 'unknown-set'}/${modalCardSlug || productId}`;

                return (
                  <li key={productId} className="py-4 flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                        {productName} {productNumber !== 'N/A' ? `(#${productNumber})` : ''}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Set: {consoleName} ({productYear})</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        ID: {productId} | Score: {product._score !== undefined ? product._score : 'N/A'}
                      </p>
                      <a 
                        href={productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        onClick={(e) => e.stopPropagation()} // Prevent triggering selection when clicking link
                      >
                        View on PriceCharting
                      </a>
                    </div>
                    <Button 
                      variant="primary"
                      onClick={() => selectProduct(product)}
                      size="sm"
                    >
                      Select
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm">
            <Button variant="secondary" onClick={() => setShowMatchSelector(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the confirmation message
  const renderConfirmationMessage = () => {
    if (!showConfirmation || !autoSelectedProduct) return null;
    
    const productName = autoSelectedProduct['product-name'] || autoSelectedProduct.product_name || '';
    const consoleName = autoSelectedProduct['console-name'] || autoSelectedProduct.console_name || '';
    // Generate URL for the automatically selected product confirmation
    const autoSetSlug = createSlug(consoleName);
    const autoCleanedProductName = productName.replace(/\[.*?\]/g, '').trim();
    const autoCardSlug = createSlug(autoCleanedProductName);
    const productUrl = `https://www.pricecharting.com/game/${autoSetSlug || 'unknown-set'}/${autoCardSlug || autoSelectedProduct.id}`;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
        <div className="bg-white dark:bg-[#0F0F0F] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700/50">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">Auto-Selected Product</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please review the selected product details.</p>
          </div>

          {/* Product Details */}
          <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
            <div className="space-y-2">
              <p className="text-base font-medium text-gray-900 dark:text-white">Product Name: {productName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Console: {consoleName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Product URL: <a href={productUrl} target="_blank" rel="noopener noreferrer">{productUrl}</a></p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700/50 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-sm">
            <Button variant="primary" onClick={() => {
              selectProduct(autoSelectedProduct);
              setShowConfirmation(false);
            }}>
              Confirm and Update
            </Button>
            <Button variant="secondary" onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper function to create a URL-friendly slug from the product name
  const createSlug = (name) => {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-');     // Replace multiple hyphens with single
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
      {renderConfirmationMessage()}
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
