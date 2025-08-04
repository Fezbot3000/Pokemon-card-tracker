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
  
     // Rate limiting - temporarily disabled for debugging
   const now = Date.now();
   const minDelay = 1000; // Only 1 second delay for now
   if (now - lastRequestTime < minDelay) {
     const waitTime = minDelay - (now - lastRequestTime);
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
     // Add timeout to prevent hanging requests
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
     
     const response = await fetch(url.toString(), {
       method: 'GET',
       headers: {
         'Accept': 'application/json',
         'User-Agent': 'Pokemon-Card-Tracker/1.0'
       },
       signal: controller.signal
     });
     
     clearTimeout(timeoutId);
    
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
     console.error('API request error details:', {
       error: error,
       message: error.message,
       url: url.toString(),
       endpoint: endpoint
     });
     
     if (error.name === 'AbortError') {
       throw new Error('Request timed out after 10 seconds');
     }
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
  
  logger.debug(`searchProducts called with query: "${query}", limit: ${limit}`);
  
  const cacheKey = generateCacheKey(query);
  
  // Check cache first
  const cachedResult = priceChartingCache.get(cacheKey);
  if (cachedResult) {
    logger.debug('Using cached Price Charting results for:', query);
    return cachedResult;
  }
  
  try {
         logger.debug('Making API request for query:', query);
     console.log('About to make API request:', {
       endpoint: '/api/products',
       query: query,
       limit: limit,
       fullUrl: `${PRICECHARTING_BASE_URL}/api/products?q=${encodeURIComponent(query)}&limit=${limit}`
     });
     
     // Try different endpoints that Price Charting might use
     let response;
     const endpoints = [
       '/api/products',
       '/api',
       '/search-products'
     ];
     
     let lastError;
     for (const endpoint of endpoints) {
       try {
         console.log(`Trying endpoint: ${endpoint}`);
         response = await makeApiRequest(endpoint, {
           q: query,
           limit,
           format: 'json'
         });
         console.log(`Success with endpoint: ${endpoint}`);
         break;
       } catch (err) {
         console.log(`Failed with endpoint ${endpoint}:`, err.message);
         console.error(`Full error for ${endpoint}:`, err);
         lastError = err;
         continue;
       }
     }
     
     if (!response) {
       throw lastError || new Error('All API endpoints failed');
     }
    
         logger.debug('API response received:', { 
       hasProducts: !!response.products, 
       productCount: response.products?.length || 0,
       responseKeys: Object.keys(response || {})
     });
     
     console.log('Full API response structure:', {
       response: response,
       responseKeys: Object.keys(response || {}),
       hasProducts: !!response.products,
       productsArray: response.products,
       responseStatus: response.status,
       responseMessage: response.message,
       firstProductFullData: response.products?.[0],
       firstProductKeys: response.products?.[0] ? Object.keys(response.products[0]) : []
     });
    
    // Extract products from response
    const products = response.products || [];
    
    // Cache the results
    priceChartingCache.set(cacheKey, products);
    
    logger.info(`Price Charting search found ${products.length} results for: "${query}"`);
    console.log(`Price Charting API response for "${query}":`, { 
      productCount: products.length, 
      firstProduct: products[0],
      response 
    });
    
    return products;
    
  } catch (error) {
    logger.error('Price Charting search failed:', error);
    console.error('Full product search error:', error);
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
 * Generate Price Charting product page URL
 * @param {Object} product - Product data from Price Charting API
 * @returns {string|null} URL to the product page on Price Charting
 */
export const getPriceChartingUrl = (product) => {
  if (!product || !product.id) {
    return null;
  }
  
  // Price Charting URL format: https://www.pricecharting.com/game/[category]/[product-name]
  // But the most reliable way is to use the product ID in the URL structure
  const productName = product['product-name'] || product.name || '';
  
  if (productName) {
    // Clean the product name for URL
    const cleanName = productName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Construct URL with product name and ID for maximum compatibility
    return `${PRICECHARTING_BASE_URL}/game/${product.category || 'pokemon-cards'}/${cleanName}`;
  }
  
  // Fallback: if we can't construct a clean URL, return a search URL
  return `${PRICECHARTING_BASE_URL}/search?q=${encodeURIComponent(productName)}`;
};

/**
 * Search for cards by name using Price Charting API
 * Optimized for card discovery and form population
 * @param {string} cardName - Card name to search for
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of card results suitable for selection
 */
export const searchCardsByName = async (cardName, limit = 10) => {
  if (!cardName || cardName.trim().length < 3) {
    throw new Error('Card name must be at least 3 characters');
  }
  
  // Try multiple search strategies to get more results
  const searchTerms = [
    `Pokemon ${cardName.trim()}`,
    cardName.trim(), // Search without Pokemon prefix too
    `${cardName.trim()} Pokemon`
  ];
  
  logger.debug('Searching for cards by name:', { cardName, searchTerms });
  
  try {
    logger.info(`Starting searchCardsByName with terms:`, searchTerms);
    
    // Search with multiple strategies and combine results
    const allProducts = [];
    const seenIds = new Set();
    
    for (const query of searchTerms) {
      try {
        logger.debug(`Searching with query: "${query}"`);
        const products = await searchProducts(query, limit * 3); // Get even more results
        logger.debug(`Query "${query}" returned ${products?.length || 0} products`);
        
        products.forEach(product => {
          if (!seenIds.has(product.id)) {
            seenIds.add(product.id);
            allProducts.push(product);
          }
        });
      } catch (err) {
        logger.warn(`Search failed for query "${query}":`, err);
        console.error(`Search error for "${query}":`, err); // Also log to console
      }
    }
    
    logger.debug(`Total products before filtering: ${allProducts.length}`);
    
    // Process and clean up results for card selection
    console.log('About to filter products:', { 
      allProductsCount: allProducts.length, 
      cardName: cardName.toLowerCase(),
      allProducts: allProducts 
    });
    
    const cardResults = allProducts
      .filter(product => {
        // Temporarily accept ALL products to test if filtering is the issue
        const productName = (product['product-name'] || product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        
        // Log each product to see what we're filtering out
        const passes = true; // Accept everything for now
        
                 // Only log first few products to avoid console spam
         if (allProducts.indexOf(product) < 3) {
           console.log('Filtering product (sample):', { 
             name: productName, 
             category, 
             id: product.id,
             allAvailableFields: Object.keys(product),
             fullProductData: product,
             passes: passes
           });
         }
        
        return passes; // Accept all products temporarily
      })
      .slice(0, limit)
             .map(product => ({
         id: product.id,
         name: product['product-name'] || product.name,
         category: product.category,
         console: product.console,
         
         // Extract ALL available data from the API
         // Common Price Charting fields
         loosePrice: product['loose-price'],
         completePrice: product['complete-price'], 
         newPrice: product['new-price'],
         gradedPrice: product['graded-price'],
         priceChartingPrice: product['price-charting-price'],
         
         // Product details
         releaseDate: product['release-date'],
         genre: product.genre,
         publisher: product.publisher,
         platform: product.platform,
         upc: product.upc,
         asin: product.asin,
         
         // Grading specific
         psaPrice: product['psa-price'],
         bgsPrice: product['bgs-price'],
         cgcPrice: product['cgc-price'],
         
         // Volume/sales data
         saleVolume: product['sale-volume'],
         lastSaleDate: product['last-sale-date'],
         saleStats: product['sale-stats'],
         
         // Extract card details from product name
         cardDetails: parseCardDetailsFromName(product['product-name'] || product.name),
         
         // Include ALL pricing info available
         allPrices: {
           loose: product['loose-price'],
           complete: product['complete-price'],
           new: product['new-price'],
           graded: product['graded-price'],
           priceCharting: product['price-charting-price'],
           psa: product['psa-price'],
           bgs: product['bgs-price'],
           cgc: product['cgc-price']
         },
         
         // Get the best available price
         bestPrice: extractBestPrice(product),
         
         // Keep ALL original product data for debugging
         originalProduct: product,
         availableFields: Object.keys(product)
       }));
    
    logger.info(`Found ${cardResults.length} card results for: "${cardName}"`);
    
    console.log('Final card results:', {
      cardName,
      allProductsCount: allProducts.length,
      cardResultsCount: cardResults.length,
      cardResults: cardResults,
      searchTerms
    });
    
    if (cardResults.length === 0) {
      logger.warn(`No cards found after filtering. All products: ${allProducts.length}, Filtered: ${cardResults.length}`);
      console.warn('No cards found after filtering:', { 
        allProducts: allProducts.length, 
        cardResults: cardResults.length,
        searchTerms,
        firstProduct: allProducts[0] 
      });
    }
    
    return cardResults;
    
  } catch (error) {
    logger.error('Card search failed:', error);
    throw error;
  }
};

/**
 * Parse card details from a Price Charting product name
 * @param {string} productName - Full product name from Price Charting
 * @returns {Object} Parsed card details
 */
const parseCardDetailsFromName = (productName) => {
  if (!productName) return {};
  
  const details = {
    cardName: '',
    set: '',
    year: null,
    grade: '',
    gradingCompany: '',
    condition: '',
    holofoil: false
  };
  
  // Remove "Pokemon" prefix and clean up
  let cleanName = productName.replace(/^Pokemon\s*/i, '').trim();
  
  // Extract year (4 digits)
  const yearMatch = cleanName.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    details.year = parseInt(yearMatch[0]);
    cleanName = cleanName.replace(yearMatch[0], '').trim();
  }
  
  // Extract grading info (PSA 10, BGS 9.5, etc.)
  const gradeMatch = cleanName.match(/\b(PSA|BGS|CGC|SGC)\s*(\d+(?:\.\d+)?)\b/i);
  if (gradeMatch) {
    details.gradingCompany = gradeMatch[1].toUpperCase();
    details.grade = gradeMatch[2];
    details.condition = `${details.gradingCompany} ${details.grade}`;
    cleanName = cleanName.replace(gradeMatch[0], '').trim();
  }
  
  // Check for holofoil
  if (/\b(holo|holofoil|holographic)\b/i.test(cleanName)) {
    details.holofoil = true;
    cleanName = cleanName.replace(/\b(holo|holofoil|holographic)\b/i, '').trim();
  }
  
  // Common Pokemon sets
  const setPatterns = [
    /\b(base set|jungle|fossil|team rocket|gym heroes|gym challenge)\b/i,
    /\b(neo genesis|neo discovery|neo destiny|neo revelation)\b/i,
    /\b(expedition|aquapolis|skyridge)\b/i,
    /\b(ruby sapphire|sandstorm|dragon|team magma vs team aqua)\b/i,
    /\b(diamond pearl|mysterious treasures|secret wonders|great encounters)\b/i,
    /\b(legends awakened|stormfront|platinum|rising rivals)\b/i,
    /\b(supreme victors|arceus|heartgold soulsilver|unleashed)\b/i,
    /\b(undaunted|triumphant|black white|emerging powers|noble victories)\b/i,
    /\b(next destinies|dark explorers|dragons exalted|boundaries crossed)\b/i,
    /\b(plasma storm|plasma freeze|plasma blast|legendary treasures)\b/i,
    /\b(xy|flashfire|furious fists|phantom forces|primal clash)\b/i,
    /\b(roaring skies|ancient origins|breakthrough|breakpoint)\b/i,
    /\b(fates collide|steam siege|evolutions|sun moon|guardians rising)\b/i,
    /\b(burning shadows|shining legends|crimson invasion|ultra prism)\b/i,
    /\b(forbidden light|celestial storm|dragon majesty|lost thunder)\b/i,
    /\b(team up|detective pikachu|unbroken bonds|unified minds)\b/i,
    /\b(cosmic eclipse|sword shield|rebel clash|darkness ablaze)\b/i,
    /\b(champions path|vivid voltage|battle styles|chilling reign)\b/i,
    /\b(evolving skies|celebrations|fusion strike|brilliant stars)\b/i,
    /\b(astral radiance|pokemon go|lost origin|silver tempest)\b/i,
    /\b(paldea evolved|obsidian flames|paradox rift|paldean fates)\b/i,
    /\b(temporal forces|twilight mastery|shrouded fable)\b/i
  ];
  
  for (const pattern of setPatterns) {
    const setMatch = cleanName.match(pattern);
    if (setMatch) {
      details.set = setMatch[0];
      cleanName = cleanName.replace(setMatch[0], '').trim();
      break;
    }
  }
  
  // Extract card number if present (e.g., "#271", "#TG06")
  const cardNumberMatch = cleanName.match(/\s*#?(\w+\d+|\d+\w*)\s*$/);
  if (cardNumberMatch) {
    details.cardNumber = cardNumberMatch[1];
    cleanName = cleanName.replace(cardNumberMatch[0], '').trim();
  }
  
  // Extract card name (what's left)
  details.cardName = cleanName
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-']/g, '') // Remove special chars except hyphens and apostrophes
    .replace(/\b(ex|gx|v|vmax|vstar)\b/gi, '') // Remove card type suffixes
    .trim();
  
  return details;
};

/**
 * Convert Price Charting card data to form data structure
 * @param {Object} cardResult - Card result from searchCardsByName
 * @returns {Object} Card data suitable for form population
 */
export const convertPriceChartingToCardData = (cardResult) => {
  if (!cardResult) return {};
  
  console.log('Converting card result to form data:', {
    cardResult,
    cardDetails: cardResult.cardDetails,
    bestPrice: cardResult.bestPrice,
    allPrices: cardResult.allPrices,
    originalProduct: cardResult.originalProduct,
    rawApiData: {
      name: cardResult.name,
      releaseDate: cardResult.releaseDate,
      console: cardResult.console,
      genre: cardResult.genre,
      publisher: cardResult.publisher,
      platform: cardResult.platform
    }
  });
  
  const { cardDetails, bestPrice, allPrices, originalProduct } = cardResult;
  
  // Extract the best available price value
  // IMPORTANT: Price Charting API returns prices in PENNIES, not dollars
  let currentValue = '';
  console.log('Price extraction debug:', {
    bestPrice,
    allPrices,
    originalPriceFields: {
      'loose-price': cardResult['loose-price'],
      'cib-price': cardResult['cib-price'], 
      'new-price': cardResult['new-price'],
      'manual-only-price': cardResult['manual-only-price'], // PSA 10 equivalent
      'graded-price': cardResult['graded-price'],
      'bgs-10-price': cardResult['bgs-10-price']
    }
  });
  
  if (bestPrice && bestPrice.price > 0) {
    // Convert from pennies to dollars
    currentValue = (bestPrice.price / 100).toString();
  } else if (allPrices) {
    // Try to find any available price
    const availablePrices = [
      allPrices.priceCharting,
      allPrices.loose, 
      allPrices.complete,
      allPrices.new,
      allPrices.graded
    ].filter(price => price && price > 0);
    
    if (availablePrices.length > 0) {
      // Convert from pennies to dollars
      currentValue = (availablePrices[0] / 100).toString();
    }
  }
  
  // If still no price, try direct fields from API response (official field names)
  if (!currentValue) {
    const directPriceFields = [
      cardResult['loose-price'],        // Ungraded card
      cardResult['manual-only-price'],  // PSA 10 equivalent  
      cardResult['graded-price'],       // Grade 9
      cardResult['cib-price'],          // Grade 7-7.5
      cardResult['new-price'],          // Grade 8-8.5
      cardResult['bgs-10-price']        // BGS 10
    ];
    
    for (let price of directPriceFields) {
      if (price && price > 0) {
        // API returns prices in pennies, convert to dollars
        currentValue = (price / 100).toString();
        break;
      }
    }
  }
  
  console.log('Final extracted price (converted from pennies to dollars):', currentValue);
  
  // Extract year from release date if not in cardDetails
  let year = cardDetails.year || '';
  if (!year && cardResult.releaseDate) {
    const yearMatch = cardResult.releaseDate.match(/(\d{4})/);
    if (yearMatch) {
      year = yearMatch[1];
    }
  }
  
  // Try to intelligently determine set from various sources and match to app's Pokemon sets
  let setName = cardDetails.set || '';
  console.log('Set extraction debug:', {
    cardDetailsSet: cardDetails.set,
    console: cardResult.console,
    genre: cardResult.genre,
    platform: cardResult.platform,
    publisher: cardResult.publisher,
    cardName: cardResult.name,
    releaseDate: cardResult.releaseDate
  });
  
  if (!setName || setName === 'Unknown Set') {
    // Strategy 1: Try to extract specific set name from card name using comprehensive patterns
    if (cardResult.name) {
      // Modern sets (most important for current cards)
      const modernSetPatterns = [
        // 2024 sets
        /\b(stellar crown|shrouded fable|twilight masquerade|temporal forces|paldean fates)\b/i,
        // 2023 sets  
        /\b(paradox rift|obsidian flames|paldea evolved|scarlet.*violet|pokemon 151)\b/i,
        // 2022 sets
        /\b(silver tempest|lost origin|astral radiance|brilliant stars|crown zenith)\b/i,
        // 2021 sets
        /\b(fusion strike|evolving skies|chilling reign|battle styles)\b/i,
        // 2020 sets
        /\b(vivid voltage|darkness ablaze|rebel clash|sword.*shield)\b/i,
        // Classic modern sets
        /\b(cosmic eclipse|unified minds|unbroken bonds|team up|lost thunder|celestial storm|forbidden light|ultra prism|crimson invasion|burning shadows|guardians rising|sun.*moon)\b/i,
        // XY era
        /\b(fates collide|breakpoint|breakthrough|ancient origins|roaring skies|double crisis|primal clash|phantom forces|furious fists|flashfire|xy)\b/i,
        // BW era  
        /\b(legendary treasures|plasma blast|plasma freeze|plasma storm|boundaries crossed|dragons exalted|dark explorers|next destinies|noble victories|emerging powers|black.*white)\b/i,
        // Earlier sets
        /\b(call of legends|triumphant|unleashed|heartgold.*soulsilver|rising rivals|platinum|stormfront|legends awakened|majestic dawn|great encounters|secret wonders|mysterious treasures|diamond.*pearl)\b/i,
        // Classic sets
        /\b(power keepers|dragon frontiers|crystal guardians|holon phantoms|legend maker|delta species|unseen forces|emerald|deoxys|team rocket returns|firered.*leafgreen|hidden legends|team magma.*team aqua|dragon|sandstorm|ruby.*sapphire)\b/i,
        // Base era
        /\b(skyridge|aquapolis|expedition|neo destiny|neo revelation|neo discovery|neo genesis|base set 2|gym challenge|gym heroes|team rocket|fossil|jungle|base set)\b/i,
        // Special sets
        /\b(celebrations|evolutions|generations|radiant collection|shining legends|hidden fates|champions path|shining fates|pokemon 25th|mcdonalds|pop series)\b/i
      ];
      
      for (const pattern of modernSetPatterns) {
        const match = cardResult.name.match(pattern);
        if (match) {
          // Clean up the match and try to format it properly
          let matchedSet = match[1].toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          
          // Convert to proper format matching our Pokemon sets
          const setMappings = {
            'stellar crown': 'Stellar Crown',
            'shrouded fable': 'Shrouded Fable', 
            'twilight masquerade': 'Twilight Masquerade',
            'temporal forces': 'Temporal Forces',
            'paldean fates': 'Scarlet & Violet: Paldean Fates',
            'paradox rift': 'Paradox Rift',
            'obsidian flames': 'Obsidian Flames',
            'paldea evolved': 'Paldea Evolved',
            'scarlet violet': 'Scarlet & Violet',
            'pokemon 151': 'Pokémon 151',
            'silver tempest': 'Silver Tempest',
            'lost origin': 'Lost Origin', 
            'astral radiance': 'Astral Radiance',
            'brilliant stars': 'Brilliant Stars',
            'crown zenith': 'Crown Zenith',
            'fusion strike': 'Fusion Strike',
            'evolving skies': 'Evolving Skies',
            'chilling reign': 'Chilling Reign',
            'battle styles': 'Battle Styles',
            'vivid voltage': 'Vivid Voltage',
            'darkness ablaze': 'Darkness Ablaze',
            'rebel clash': 'Rebel Clash',
            'sword shield': 'Sword & Shield',
            'base set': 'Base Set',
            'jungle': 'Jungle',
            'fossil': 'Fossil',
            'team rocket': 'Team Rocket',
            'gym heroes': 'Gym Heroes',
            'gym challenge': 'Gym Challenge',
            'neo genesis': 'Neo Genesis',
            'neo discovery': 'Neo Discovery',
            'neo revelation': 'Neo Revelation',
            'neo destiny': 'Neo Destiny'
          };
          
          if (setMappings[matchedSet]) {
            setName = setMappings[matchedSet];
            break;
          }
        }
      }
    }
    
    // Strategy 2: If no specific set found, try console/genre/platform fields
    if (!setName || setName === 'Unknown Set') {
      if (cardResult.console && cardResult.console !== 'Pokemon' && cardResult.console !== 'Pokemon Card') {
        setName = cardResult.console;
      }
      else if (cardResult.genre && cardResult.genre !== 'Pokemon' && cardResult.genre !== 'Pokemon Card') {
        setName = cardResult.genre;
      }
      else if (cardResult.platform && cardResult.platform !== 'Pokemon' && cardResult.platform !== 'Pokemon Card') {
        setName = cardResult.platform;
      }
    }
    
    // Strategy 3: Try to infer from release date if we have it
    if ((!setName || setName === 'Unknown Set') && cardResult.releaseDate) {
      const year = cardResult.releaseDate.split('-')[0];
      if (year === '2024') {
        setName = 'Stellar Crown'; // Default to recent popular set
      } else if (year === '2023') {
        setName = 'Obsidian Flames';
      } else if (year === '2022') {
        setName = 'Lost Origin';
      } else if (year === '2021') {
        setName = 'Evolving Skies';
      }
    }
    
    // Final fallback
    if (!setName || setName === cardDetails.set || setName === 'Pokemon' || setName === 'Pokemon Card') {
      setName = 'Unknown Set';
    }
  }
  
  console.log('Final extracted set:', setName);
  
  const formData = {
    cardName: cardDetails.cardName || cardResult.name || '',
    set: setName,
    year: year,
    grade: cardDetails.grade || '',
    gradingCompany: cardDetails.gradingCompany || '',
    condition: cardDetails.condition || '',
    category: 'pokemon', // Always Pokemon since we're filtering for it
    
    // Add current value in AUD (Price Charting returns USD, but we'll populate the USD field)
    currentValueAUD: currentValue,
    currentValueUSD: currentValue,
    
    // Additional fields from Price Charting
    releaseDate: cardResult.releaseDate || '',
    publisher: cardResult.publisher || '',
    platform: cardResult.platform || cardResult.console || '',
    upc: cardResult.upc || '',
    
    // Include source information
    priceChartingData: {
      productId: originalProduct?.id || cardResult.id,
      productName: cardResult.name,
      source: 'Price Charting',
      lastUpdated: new Date().toISOString(),
      allPrices: allPrices,
      releaseDate: cardResult.releaseDate
    }
  };
  
  console.log('Generated form data:', formData);
  return formData;
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
