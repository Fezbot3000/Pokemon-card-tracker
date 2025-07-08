/**
 * Price Charting API Service
 * 
 * Provides functionality to search for Pokemon card prices using the Price Charting API
 * Following the same patterns as the PSA service for consistency
 */

import logger from '../utils/logger';
import { getPriceChartingApiKey } from '../config/secrets';

// Price Charting API Configuration
const PRICECHARTING_BASE_URL = 'https://www.pricecharting.com';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours as recommended by Price Charting
const RATE_LIMIT_DELAY = 5 * 60 * 1000; // 5 minutes between requests as recommended

// In-memory cache for API responses
const priceChartingCache = {
  data: {},
  
  // Load cache from localStorage
  load() {
    try {
      const cached = localStorage.getItem('priceChartingCache');
      if (cached) {
        this.data = JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to load Price Charting cache:', error);
    }
  },
  
  // Save cache to localStorage
  save() {
    try {
      localStorage.setItem('priceChartingCache', JSON.stringify(this.data));
    } catch (error) {
      logger.warn('Failed to save Price Charting cache:', error);
    }
  },
  
  // Get cached data
  get(key) {
    const cached = this.data[key];
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      delete this.data[key];
      return null;
    }
    
    return cached.data;
  },
  
  // Set cached data
  set(key, data) {
    this.data[key] = {
      data,
      timestamp: Date.now()
    };
    this.save();
  }
};

// Initialize cache
priceChartingCache.load();

// Rate limiting tracker
let lastRequestTime = 0;

/**
 * Get Price Charting API key using centralized secrets management
 * @returns {string|null} API key or null if not configured
 */
const getApiKey = () => {
  try {
    const key = getPriceChartingApiKey();
    
    // Validate key format (should be 40 characters)
    if (key && key.length !== 40) {
      logger.warn('Price Charting API key appears to be invalid length');
      return null;
    }
    
    return key;
  } catch (error) {
    logger.warn('Price Charting API key not configured:', error.message);
    return null;
  }
};

/**
 * Build search query from card data - more targeted approach
 * @param {Object} card - Card data from your application
 * @returns {string} Search query for Price Charting API
 */
const buildSearchQuery = (card) => {
  const parts = [];
  
  // Start with Pokemon category
  parts.push('Pokemon');
  
  // Add card name (most important for matching)
  const cardName = card.cardName || card.card || card.name;
  if (cardName) {
    // Clean up card name - remove common suffixes that might confuse search
    const cleanName = cardName
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
      .replace(/\s*-.*$/, '') // Remove everything after dash
      .trim();
    parts.push(cleanName);
  }
  
  // Add set information (but make it more specific)
  const setName = card.set || card.setName;
  if (setName) {
    // Clean up set name
    const cleanSet = setName
      .replace(/POKEMON\s*/gi, '') // Remove redundant "Pokemon" prefix
      .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses
      .trim();
    if (cleanSet) {
      parts.push(cleanSet);
    }
  }
  
  // Add year if available and reasonable
  if (card.year && card.year >= 1996 && card.year <= new Date().getFullYear()) {
    parts.push(card.year);
  }
  
  // Join all parts with spaces
  const query = parts.filter(Boolean).join(' ');
  
  logger.debug('Built Price Charting search query:', query);
  return query;
};

/**
 * Calculate similarity score between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple word overlap scoring
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matches = 0;
  words1.forEach(word1 => {
    words2.forEach(word2 => {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
      }
    });
  });
  
  return matches / Math.max(words1.length, words2.length);
};

/**
 * Score a product result based on how well it matches the card data
 * @param {Object} product - Product from Price Charting API
 * @param {Object} card - Original card data
 * @returns {number} Match score (0-100)
 */
const scoreProductMatch = (product, card) => {
  let score = 0;
  let maxScore = 0;
  
  const productName = product['product-name'] || product.name || '';
  const cardName = card.cardName || card.card || card.name || '';
  
  // Card name similarity (most important - 40 points)
  if (cardName && productName) {
    const nameSimilarity = calculateSimilarity(cardName, productName);
    score += nameSimilarity * 40;
    maxScore += 40;
  }
  
  // Set name similarity (20 points)
  const cardSet = card.set || card.setName || '';
  if (cardSet && productName) {
    const setSimilarity = calculateSimilarity(cardSet, productName);
    score += setSimilarity * 20;
    maxScore += 20;
  }
  
  // Year match (15 points)
  if (card.year && productName) {
    const yearStr = card.year.toString();
    if (productName.includes(yearStr)) {
      score += 15;
    }
    maxScore += 15;
  }
  
  // Grading company match (15 points)
  if (card.gradingCompany && productName) {
    const gradingCompany = card.gradingCompany.toLowerCase();
    const productLower = productName.toLowerCase();
    if (productLower.includes(gradingCompany)) {
      score += 15;
    }
    maxScore += 15;
  }
  
  // Grade match (10 points)
  if (card.grade && productName) {
    const gradeStr = card.grade.toString();
    if (productName.includes(gradeStr)) {
      score += 10;
    }
    maxScore += 10;
  }
  
  // Calculate percentage score
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
};

/**
 * Filter and rank product results based on card data
 * @param {Array} products - Raw products from Price Charting API
 * @param {Object} card - Original card data
 * @returns {Array} Filtered and ranked products
 */
const filterAndRankProducts = (products, card) => {
  if (!products || products.length === 0) return [];
  
  // Score each product
  const scoredProducts = products.map(product => ({
    ...product,
    matchScore: scoreProductMatch(product, card)
  }));
  
  // Filter out products with very low scores
  const filteredProducts = scoredProducts.filter(product => product.matchScore > 20);
  
  // Sort by match score (highest first)
  const rankedProducts = filteredProducts.sort((a, b) => b.matchScore - a.matchScore);
  
  // Return top 10 results
  const topResults = rankedProducts.slice(0, 10);
  
  logger.debug('Filtered and ranked products:', {
    original: products.length,
    filtered: filteredProducts.length,
    top: topResults.length,
    topScores: topResults.map(p => ({ name: p['product-name'], score: p.matchScore }))
  });
  
  return topResults;
};

/**
 * Generate cache key for a search query
 * @param {string} query - Search query
 * @returns {string} Cache key
 */
const generateCacheKey = (query) => {
  return `search_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
};

/**
 * Make API request with rate limiting
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response
 */
const makeApiRequest = async (endpoint, params = {}) => {
  const key = getApiKey();
  
  if (!key) {
    throw new Error('Price Charting API key not configured');
  }
  
  // Rate limiting - ensure we don't make requests too frequently
  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - (now - lastRequestTime);
    logger.debug(`Rate limiting: waiting ${waitTime}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Build URL with parameters
  const url = new URL(`${PRICECHARTING_BASE_URL}${endpoint}`);
  url.searchParams.append('t', key);
  
  // Add other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });
  
  logger.debug('Making Price Charting API request:', url.pathname + url.search);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Pokemon-Card-Tracker/1.0'
      }
    });
    
    lastRequestTime = Date.now();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for API-level errors
    if (data.status === 'error') {
      throw new Error(data['error-message'] || 'Unknown API error');
    }
    
    return data;
    
  } catch (error) {
    logger.error('Price Charting API request failed:', error);
    throw error;
  }
};

/**
 * Search for products using the Price Charting API
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of product results
 */
export const searchProducts = async (query, limit = 20) => {
  if (!query || query.trim() === '') {
    throw new Error('Search query is required');
  }
  
  const cacheKey = generateCacheKey(query);
  
  // Check cache first
  const cachedResult = priceChartingCache.get(cacheKey);
  if (cachedResult) {
    logger.debug('Using cached Price Charting results for:', query);
    return cachedResult;
  }
  
  try {
    const response = await makeApiRequest('/api/products', {
      q: query,
      limit
    });
    
    // Extract products from response
    const products = response.products || [];
    
    // Cache the results
    priceChartingCache.set(cacheKey, products);
    
    logger.info(`Price Charting search found ${products.length} results for: "${query}"`);
    
    return products;
    
  } catch (error) {
    logger.error('Price Charting search failed:', error);
    throw error;
  }
};

/**
 * Search for a card using card data from your application
 * @param {Object} card - Card data
 * @returns {Promise<Array>} Array of matching products (filtered and ranked)
 */
export const searchCardPrice = async (card) => {
  if (!card) {
    throw new Error('Card data is required');
  }
  
  const query = buildSearchQuery(card);
  
  if (!query || query.trim() === '') {
    throw new Error('Unable to build search query from card data');
  }
  
  logger.debug('Searching Price Charting for card:', {
    cardName: card.cardName || card.card || card.name,
    set: card.set || card.setName,
    year: card.year,
    grade: card.grade,
    gradingCompany: card.gradingCompany,
    query
  });
  
  // Get raw search results
  const rawResults = await searchProducts(query);
  
  // Filter and rank the results
  const filteredResults = filterAndRankProducts(rawResults, card);
  
  logger.info(`Price Charting search completed:`, {
    query,
    rawResults: rawResults.length,
    filteredResults: filteredResults.length,
    topMatch: filteredResults[0] ? {
      name: filteredResults[0]['product-name'],
      score: filteredResults[0].matchScore
    } : null
  });
  
  return filteredResults;
};

/**
 * Get detailed product information by ID
 * @param {number} productId - Price Charting product ID
 * @returns {Promise<Object>} Product details
 */
export const getProductById = async (productId) => {
  if (!productId) {
    throw new Error('Product ID is required');
  }
  
  const cacheKey = `product_${productId}`;
  
  // Check cache first
  const cachedResult = priceChartingCache.get(cacheKey);
  if (cachedResult) {
    logger.debug('Using cached product details for ID:', productId);
    return cachedResult;
  }
  
  try {
    const response = await makeApiRequest('/api/product', {
      id: productId
    });
    
    // Cache the result
    priceChartingCache.set(cacheKey, response);
    
    logger.info(`Retrieved product details for ID: ${productId}`);
    
    return response;
    
  } catch (error) {
    logger.error('Failed to get product details:', error);
    throw error;
  }
};

/**
 * Convert Price Charting price (pennies) to dollars
 * @param {number} pennies - Price in pennies
 * @returns {number} Price in dollars
 */
export const convertPenniesToDollars = (pennies) => {
  if (typeof pennies !== 'number' || isNaN(pennies)) {
    return 0;
  }
  return pennies / 100;
};

/**
 * Extract the best price from a product
 * @param {Object} product - Product data from Price Charting
 * @returns {Object|null} Best price information
 */
export const extractBestPrice = (product) => {
  if (!product) {
    return null;
  }
  
  // Price Charting products have various price fields
  // Common fields: price-charting-price, loose-price, complete-price, new-price
  const priceFields = [
    'price-charting-price',
    'loose-price', 
    'complete-price',
    'new-price'
  ];
  
  for (const field of priceFields) {
    if (product[field] && product[field] > 0) {
      return {
        price: convertPenniesToDollars(product[field]),
        priceInPennies: product[field],
        priceType: field,
        currency: 'USD',
        source: 'Price Charting',
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  return null;
};

/**
 * Clear the Price Charting cache
 */
export const clearCache = () => {
  priceChartingCache.data = {};
  priceChartingCache.save();
  logger.info('Price Charting cache cleared');
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export const getCacheStats = () => {
  const entries = Object.keys(priceChartingCache.data).length;
  const totalSize = JSON.stringify(priceChartingCache.data).length;
  
  return {
    entries,
    totalSize,
    cacheDuration: CACHE_DURATION,
    rateLimitDelay: RATE_LIMIT_DELAY,
    lastUpdated: new Date().toISOString()
  };
}; 