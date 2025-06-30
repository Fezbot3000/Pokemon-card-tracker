/**
 * Pokemon TCG Service
 * 
 * Provides functionality to fetch card pricing data using the Pokemon TCG API.
 * Uses Firebase Cloud Functions to make the API calls to avoid CORS issues.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import logger from '../utils/logger';

// Initialize Firebase Functions
const functions = getFunctions();
const pokemonTcgLookupFunction = httpsCallable(functions, 'pokemonTcgLookup');

// Temporary direct API call for testing (while Firebase deployment is being fixed)
const fetchCardPricingDirect = async (cardName, setName = null, cardNumber = null) => {
  try {
    // Clean and improve the card name for better searching
    let cleanCardName = cardName;
    if (cleanCardName) {
      // Remove common prefixes and suffixes that might not match
      cleanCardName = cleanCardName
        .replace(/^FA\//, '') // Remove "FA/" prefix
        .replace(/\s+EX$/, ' EX') // Normalize EX suffix
        .replace(/\s+GX$/, ' GX') // Normalize GX suffix
        .replace(/\s+V$/, ' V') // Normalize V suffix
        .replace(/\s+VMAX$/, ' VMAX') // Normalize VMAX suffix
        .trim();
    }

    // Check if this is likely a Japanese/promotional card that won't be in the English API
    const isLikelyJapaneseCard = setName && (
      setName.toLowerCase().includes('japanese') ||
      setName.toLowerCase().includes('promo') ||
      setName.toLowerCase().includes('expansion') ||
      setName.toLowerCase().includes('anniversary')
    );

    if (isLikelyJapaneseCard) {
      return {
        error: 'JAPANESE_CARD',
        message: `This appears to be a Japanese or promotional card ("${setName}"). The Pokemon TCG API only contains English cards, so pricing data is not available. Try checking Japanese card marketplaces like Yahoo Auctions Japan or Mercari.`
      };
    }

    // Build search query - try multiple approaches but be more strict about matching
    let searchQueries = [];
    
    // Primary search with cleaned name
    if (cleanCardName) {
      searchQueries.push(`name:"${cleanCardName}"`);
      
      // If the name contains special characters, try a broader search
      if (cleanCardName.includes('/') || cleanCardName.includes('&')) {
        const simpleName = cleanCardName.split(/[\/&]/)[0].trim();
        searchQueries.push(`name:"${simpleName}"`);
      }
    }

    // Try each search query until we find results
    for (let i = 0; i < searchQueries.length; i++) {
      let searchQuery = searchQueries[i];
      
      // Add set filter if available and it looks like an English set
      if (setName && !setName.toLowerCase().includes('japanese') && !setName.toLowerCase().includes('expansion')) {
        searchQuery += ` set.name:"${setName}"`;
      }
      
      // Add number filter if available
      if (cardNumber) {
        searchQuery += ` number:${cardNumber}`;
      }


      
      try {
        // Direct API call (temporary for testing)
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=10`, {
          method: 'GET',
          headers: {
            'X-Api-Key': 'eafc1044-68d5-4479-8354-882387542e5d', // Your API key (temporary for testing)
            'Accept': 'application/json',
            'User-Agent': 'Pokemon-Card-Tracker/1.0'
          }
        });
        
        if (!response.ok) {
          console.warn(`Search attempt ${i + 1} failed with status: ${response.status}`);
          continue;
        }
        
        const responseData = await response.json();
        
        if (responseData.data && responseData.data.length > 0) {
          // Found results! But let's be more careful about matching
          const cards = responseData.data;
          
          // Try to find a better match by comparing card names more carefully
          let bestMatch = null;
          let exactMatch = false;
          
          for (const card of cards) {
            const cardNameLower = card.name.toLowerCase();
            const searchNameLower = cleanCardName.toLowerCase();
            
            // Check for exact match first
            if (cardNameLower === searchNameLower) {
              bestMatch = card;
              exactMatch = true;
              break;
            }
            
            // Check if the search name is contained in the card name
            if (cardNameLower.includes(searchNameLower) || searchNameLower.includes(cardNameLower)) {
              if (!bestMatch) {
                bestMatch = card;
              }
            }
          }
          
          if (bestMatch) {
            
            return {
              cardId: bestMatch.id,
              name: bestMatch.name,
              set: bestMatch.set?.name || 'Unknown',
              number: bestMatch.number,
              rarity: bestMatch.rarity,
              tcgplayer: bestMatch.tcgplayer || null,
              cardmarket: bestMatch.cardmarket || null,
              images: bestMatch.images || null,
              updatedAt: new Date().toISOString(),
              isExactMatch: exactMatch,
              originalSearchName: cardName
            };
          }
        }
      } catch (searchError) {
        console.warn(`Search attempt ${i + 1} error:`, searchError.message);
        continue;
      }
    }
    
    // If no results found with any search query
    return {
      error: 'NOT_FOUND',
      message: `No cards found for "${cardName}". This might be a Japanese card, promotional card, or variant not available in the English Pokemon TCG database. Try searching for a more common English card name like "Pikachu" or "Charizard".`
    };
    
  } catch (error) {
    console.error('Direct Pokemon TCG API error:', error);
    return {
      error: 'API_ERROR',
      message: `Failed to fetch Pokemon TCG data: ${error.message}`
    };
  }
};

/**
 * Search for Pokemon card pricing by card details
 * @param {string} cardName - Name of the card
 * @param {string} setName - Optional set name
 * @param {string} cardNumber - Optional card number
 * @returns {Promise<Object>} - Card pricing details from Pokemon TCG API
 */
const fetchCardPricing = async (cardName, setName = null, cardNumber = null) => {
  try {
    logger.debug(`Fetching pricing for card: ${cardName}, set: ${setName}, number: ${cardNumber}`);
    
    // Try Firebase Function first, fall back to direct API call if it fails
    try {
      // Call the Firebase Cloud Function
      const result = await pokemonTcgLookupFunction({ 
        cardName, 
        setName, 
        cardNumber 
      });
      
      logger.debug('Pokemon TCG API response via Cloud Function:', result);
      
      // Extract the data from the Cloud Function response
      if (result.data && result.data.success) {
        const pricingData = result.data.data;
        logger.info(`Successfully fetched pricing for ${cardName} via Firebase Function`);
        return pricingData;
      } else {
        throw new Error(result.data?.message || 'Firebase Function failed');
      }
    } catch (firebaseError) {
      console.warn('Firebase Function failed, trying direct API call:', firebaseError.message);
      
      // Fall back to direct API call
      const directResult = await fetchCardPricingDirect(cardName, setName, cardNumber);
      if (directResult.error) {
        throw new Error(directResult.message);
      }
      
      logger.info(`Successfully fetched pricing for ${cardName} via direct API call`);
      return directResult;
    }
  } catch (error) {
    console.error('Error fetching Pokemon TCG card pricing:', error);
    
    // Return error object
    return {
      error: 'API_ERROR',
      message: `Failed to fetch card pricing: ${error.message}`
    };
  }
};

/**
 * Extract the best market price from TCGPlayer pricing data
 * @param {Object} tcgplayerData - TCGPlayer pricing data from API
 * @returns {Object} - Formatted pricing information
 */
const extractBestPrice = (tcgplayerData) => {
  if (!tcgplayerData || !tcgplayerData.prices) {
    return null;
  }
  
  const prices = tcgplayerData.prices;
  let bestPrice = null;
  let priceType = 'unknown';
  
  // Priority order: normal, holofoil, reverseHolofoil, 1stEditionNormal, 1stEditionHolofoil
  const priceTypes = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil'];
  
  for (const type of priceTypes) {
    if (prices[type] && prices[type].market) {
      bestPrice = prices[type].market;
      priceType = type;
      break;
    }
  }
  
  // If no market price found, try mid price
  if (!bestPrice) {
    for (const type of priceTypes) {
      if (prices[type] && prices[type].mid) {
        bestPrice = prices[type].mid;
        priceType = type;
        break;
      }
    }
  }
  
  return bestPrice ? {
    price: bestPrice,
    type: priceType,
    currency: 'USD',
    source: 'TCGPlayer',
    url: tcgplayerData.url,
    updatedAt: tcgplayerData.updatedAt
  } : null;
};

/**
 * Format pricing data for display in the UI
 * @param {Object} pricingData - Raw pricing data from API
 * @returns {Object} - Formatted pricing for UI display
 */
const formatPricingForDisplay = (pricingData) => {
  if (pricingData.error) {
    return {
      success: false,
      error: pricingData.error,
      message: pricingData.message
    };
  }
  
  const tcgplayerPrice = extractBestPrice(pricingData.tcgplayer);
  
  return {
    success: true,
    cardName: pricingData.name,
    set: pricingData.set,
    number: pricingData.number,
    rarity: pricingData.rarity,
    pricing: {
      tcgplayer: tcgplayerPrice,
      hasImage: !!(pricingData.images && pricingData.images.small)
    },
    updatedAt: pricingData.updatedAt
  };
};

export {
  fetchCardPricing,
  extractBestPrice,
  formatPricingForDisplay
};
