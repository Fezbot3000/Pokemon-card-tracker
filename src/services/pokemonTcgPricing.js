/**
 * Pokemon TCG API Pricing Service
 * 
 * Provides functionality to fetch current market prices for Pokemon cards
 * using the Pokemon TCG API via Firebase Cloud Functions (following PSA pattern)
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import logger from '../utils/logger';

// Initialize Firebase Functions
const functions = getFunctions();
const pokemonTcgPriceLookupFunction = httpsCallable(functions, 'pokemonTcgPriceLookup');

// Cache Configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Price cache to avoid unnecessary API calls
const priceCache = {
  data: {},
  
  // Load cache from localStorage
  load() {
    try {
      const cached = localStorage.getItem('pokemonTcgPriceCache');
      if (cached) {
        this.data = JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to load Pokemon TCG price cache:', error);
    }
  },
  
  // Save cache to localStorage
  save() {
    try {
      localStorage.setItem('pokemonTcgPriceCache', JSON.stringify(this.data));
    } catch (error) {
      logger.warn('Failed to save Pokemon TCG price cache:', error);
    }
  },
  
  // Get cached price data
  get(cardKey) {
    const cached = this.data[cardKey];
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      delete this.data[cardKey];
      return null;
    }
    
    return cached.data;
  },
  
  // Set cached price data
  set(cardKey, data) {
    this.data[cardKey] = {
      data,
      timestamp: Date.now()
    };
    this.save();
  }
};

// Initialize cache
priceCache.load();

// Note: Rate limiting and direct API calls are now handled by Firebase Cloud Functions

/**
 * Generate a cache key for a card based on its identifying information
 */
const generateCardKey = (cardName, setName, cardNumber) => {
  return `${cardName || 'unknown'}_${setName || 'unknown'}_${cardNumber || 'unknown'}`.toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
};

/**
 * Search for a card in the Pokemon TCG API
 * @param {Object} cardInfo - Card information
 * @param {string} cardInfo.cardName - Name of the card
 * @param {string} cardInfo.setName - Set name
 * @param {string} cardInfo.cardNumber - Card number (optional)
 * @param {string} cardInfo.year - Release year (optional)
 * @returns {Promise<Array>} Array of matching cards
 */
export const searchPokemonCard = async (cardInfo) => {
  try {
    const { cardName, setName, cardNumber, year } = cardInfo;
    
    if (!cardName) {
      throw new Error('Card name is required for Pokemon TCG API search');
    }
    
    // Build search query
    const queryParts = [];
    
    // Add card name search
    queryParts.push(`name:"${cardName}"`);
    
    // Add set search if available
    if (setName) {
      queryParts.push(`set.name:"${setName}"`);
    }
    
    // Add card number if available
    if (cardNumber) {
      queryParts.push(`number:${cardNumber}`);
    }
    
    // Add year filter if available
    if (year) {
      queryParts.push(`set.releaseDate:[${year}-01-01 TO ${year}-12-31]`);
    }
    
    const query = queryParts.join(' ');
    const url = `${POKEMON_TCG_API_BASE_URL}/cards?q=${encodeURIComponent(query)}&pageSize=20`;
    
    logger.debug('Searching Pokemon TCG API:', { query, url });
    
    const response = await rateLimitedFetch(url);
    return response.data || [];
    
  } catch (error) {
    logger.error('Error searching Pokemon TCG API:', error);
    throw error;
  }
};

/**
 * Extract price information from a Pokemon TCG API card object
 * @param {Object} card - Card object from Pokemon TCG API
 * @returns {Object} Price information
 */
const extractPriceInfo = (card) => {
  const priceInfo = {
    cardId: card.id,
    cardName: card.name,
    setName: card.set?.name,
    cardNumber: card.number,
    imageUrl: card.images?.large,
    prices: {},
    lastUpdated: new Date().toISOString()
  };
  
  // Extract TCGPlayer prices (USD)
  if (card.tcgplayer?.prices) {
    const tcgPrices = card.tcgplayer.prices;
    
    // Normal/Unlimited prices
    if (tcgPrices.normal) {
      priceInfo.prices.tcgplayer_normal = {
        low: tcgPrices.normal.low,
        mid: tcgPrices.normal.mid,
        high: tcgPrices.normal.high,
        market: tcgPrices.normal.market,
        currency: 'USD'
      };
    }
    
    // Holofoil prices
    if (tcgPrices.holofoil) {
      priceInfo.prices.tcgplayer_holofoil = {
        low: tcgPrices.holofoil.low,
        mid: tcgPrices.holofoil.mid,
        high: tcgPrices.holofoil.high,
        market: tcgPrices.holofoil.market,
        currency: 'USD'
      };
    }
    
    // 1st Edition prices
    if (tcgPrices['1stEditionNormal']) {
      priceInfo.prices.tcgplayer_1st_edition = {
        low: tcgPrices['1stEditionNormal'].low,
        mid: tcgPrices['1stEditionNormal'].mid,
        high: tcgPrices['1stEditionNormal'].high,
        market: tcgPrices['1stEditionNormal'].market,
        currency: 'USD'
      };
    }
  }
  
  // Extract CardMarket prices (EUR)
  if (card.cardmarket?.prices) {
    const cmPrices = card.cardmarket.prices;
    priceInfo.prices.cardmarket = {
      averageSellPrice: cmPrices.averageSellPrice,
      lowPrice: cmPrices.lowPrice,
      trendPrice: cmPrices.trendPrice,
      avg30: cmPrices.avg30,
      currency: 'EUR'
    };
  }
  
  return priceInfo;
};

/**
 * Get the best market price for a card
 * @param {Object} priceInfo - Price information from extractPriceInfo
 * @param {string} preferredCurrency - Preferred currency code (USD, EUR, etc.)
 * @returns {Object} Best price information
 */
const getBestMarketPrice = (priceInfo, preferredCurrency = 'USD') => {
  let bestPrice = null;
  
  // Priority order for price selection
  const pricePreferences = [
    'tcgplayer_holofoil',
    'tcgplayer_1st_edition', 
    'tcgplayer_normal',
    'cardmarket'
  ];
  
  for (const priceType of pricePreferences) {
    const price = priceInfo.prices[priceType];
    if (price) {
      // Use market price if available, otherwise use mid price, then average
      const value = price.market || price.mid || price.trendPrice || price.averageSellPrice;
      if (value && value > 0) {
        bestPrice = {
          value,
          currency: price.currency,
          source: priceType,
          lastUpdated: priceInfo.lastUpdated
        };
        break;
      }
    }
  }
  
  return bestPrice;
};

/**
 * Fetch current market price for a Pokemon card via Firebase Cloud Function
 * @param {Object} cardInfo - Card information from your app
 * @param {string} cardInfo.cardName - Name of the card
 * @param {string} cardInfo.setName - Set name  
 * @param {string} cardInfo.cardNumber - Card number (optional)
 * @param {string} cardInfo.year - Release year (optional)
 * @returns {Promise<Object>} Price information
 */
export const fetchCardPrice = async (cardInfo) => {
  try {
    const { cardName, setName, cardNumber, year } = cardInfo;
    const cardKey = generateCardKey(cardName, setName, cardNumber);
    
    // Check cache first
    const cachedPrice = priceCache.get(cardKey);
    if (cachedPrice) {
      logger.debug('Using cached price for:', cardKey);
      return cachedPrice;
    }
    
    logger.debug(`Fetching price via Firebase Cloud Function for: ${cardName}`);
    
    // Call Firebase Cloud Function (same pattern as PSA)
    const result = await pokemonTcgPriceLookupFunction({
      cardName,
      setName,
      cardNumber,
      year
    });

    // Extract the data from the Cloud Function response
    if (result.data && result.data.success) {
      const responseData = result.data.data;
      
      // Format the result to match expected structure
      const priceResult = {
        value: responseData.pricing.value,
        currency: responseData.pricing.currency,
        source: responseData.pricing.source,
        lastUpdated: responseData.pricing.lastUpdated,
        cardInfo: {
          name: responseData.cardInfo.name,
          set: responseData.cardInfo.set,
          number: responseData.cardInfo.number,
          rarity: responseData.cardInfo.rarity,
          year: responseData.cardInfo.year
        },
        apiSource: 'pokemon-tcg-api'
      };
      
      // Cache the result
      priceCache.set(cardKey, priceResult);
      
      logger.info('Fetched price for Pokemon card:', {
        cardName: responseData.cardInfo.name,
        price: priceResult.value,
        currency: priceResult.currency,
        source: priceResult.source
      });
      
      return priceResult;
    } else {
      // Handle error response
      const errorMsg = result.data?.message || 'Failed to fetch price data';
      logger.error(`Pokemon TCG price lookup failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    logger.error('Error fetching Pokemon card price:', error);
    throw error;
  }
};

/**
 * Batch fetch prices for multiple cards
 * @param {Array} cardInfoArray - Array of card information objects
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Array>} Array of price results
 */
export const fetchMultipleCardPrices = async (cardInfoArray, onProgress) => {
  const results = [];
  const total = cardInfoArray.length;
  
  for (let i = 0; i < cardInfoArray.length; i++) {
    const cardInfo = cardInfoArray[i];
    
    try {
      const priceResult = await fetchCardPrice(cardInfo);
      results.push({
        success: true,
        cardInfo,
        priceData: priceResult
      });
    } catch (error) {
      results.push({
        success: false,
        cardInfo,
        error: error.message
      });
    }
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, total);
    }
    
    // Small delay between requests to be respectful
    if (i < cardInfoArray.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
};

/**
 * Clear the price cache
 */
export const clearPriceCache = () => {
  priceCache.data = {};
  priceCache.save();
  logger.info('Pokemon TCG price cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const entries = Object.keys(priceCache.data).length;
  const totalSize = JSON.stringify(priceCache.data).length;
  
  return {
    entries,
    totalSize,
    cacheDuration: CACHE_DURATION,
    lastUpdated: new Date().toISOString()
  };
}; 
