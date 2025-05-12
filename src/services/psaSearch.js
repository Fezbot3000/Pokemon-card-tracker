/**
 * PSA Search Service
 * 
 * Provides functionality to search for PSA graded cards using PSA's official API.
 * Uses Firebase Cloud Functions to make the API calls to avoid CORS issues.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import db from './db';
import logger from '../utils/logger';
import PSANotifications from '../components/PSANotifications';
import { getPokemonSetsByYear, getAllPokemonSets } from '../data/pokemonSets';
import psaDataService from './psaDataService';

// Initialize Firebase Functions
const functions = getFunctions();
const psaLookupFunction = httpsCallable(functions, 'psaLookup');

// Subscription cache to avoid too many API calls
const subscriptionCache = {
  userId: null,
  status: null,
  lastChecked: null,
  cacheExpiry: 2 * 60 * 1000, // Reduce cache time to 2 minutes for more frequent checks
};

// PSA search result cache
const psaCache = {
  results: {},  // Store results by cert number
  expiry: 24 * 60 * 60 * 1000  // Cache PSA results for 24 hours
};

// Access token storage
let accessToken = null;
let tokenExpiry = null;

/**
 * Get or refresh the PSA API access token
 * @returns {Promise<string>} - The access token
 */
const getAccessToken = async () => {
  // Check if we have a valid token
  if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
    return accessToken;
  }

  try {
    // For simplicity in this implementation, we're using a hardcoded token
    // In a production environment, you would use a more secure method
    
    // This is the token from your PSA account
    accessToken = "A_aNeEjOmhbwHJNcpcEuOdlZOtXv5OJ0PqA535oKF0eoDleejRMRVCEEOTfSe-hACCLK-pidDO3KarjNpx6JT8kvY-SsnbWBhzjLYRE-awKISKdUYqI0SvT7UJ0EeNX8AVNNNZbTFWmse-oUVocMVd-UC8FLbXyMo_gT1nVp3JpBbCLpL43dYSUDIqi3QLtB41IZcTPAHvLOnahZ5bJp8MoeL-xKHWepqhzgxjrZluTMHglicaL5sTurL7sfffANewJjAmCo8kcaLtwbGLjZ6SEenzCZwAwF3fYx5GNQ7_Kkq0um";
    
    // Set token expiry to 1 hour from now
    tokenExpiry = new Date(new Date().getTime() + 60 * 60 * 1000);
    
    return accessToken;
  } catch (error) {
    // If hardcoded token fails, try using environment variables
    console.error('Falling back to environment variables for PSA auth:', error);
    
    const psaUsername = process.env.REACT_APP_PSA_USERNAME;
    const psaPassword = process.env.REACT_APP_PSA_PASSWORD;
    
    if (!psaUsername || !psaPassword) {
      throw new Error('PSA API credentials not configured. Please set REACT_APP_PSA_USERNAME and REACT_APP_PSA_PASSWORD');
    }
    
    // Here you would implement the actual token acquisition using the credentials
    // For now, we'll show a toast that we're falling back
    PSANotifications.showLookupNotification('AUTH_ERROR');
    
    // This is a placeholder for the actual token acquisition
    throw new Error('Token acquisition from environment variables not implemented');
  }
};

/**
 * Test the PSA API connection with the current token
 * @param {string} certNumber - PSA certification number to test
 * @returns {Promise<Object>} - Raw API response data
 */
const testPSAConnection = async (certNumber = '10249374') => {
  try {
    console.log('Testing PSA API connection...');
    const token = await getAccessToken();
    
    // Try a different endpoint that might be more reliable
    const url = `https://api.psacard.com/publicapi/cert/${encodeURIComponent(certNumber)}`;
    
    console.log(`Test URL: ${url}`);
    console.log(`Using token: ${token.substring(0, 20)}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}` // Note: some APIs require "Bearer" with capital B
      },
      mode: 'cors',
    });
    
    console.log(`PSA test response status: ${response.status} ${response.statusText}`);
    
    // Log the raw text response first for debugging
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      data = { error: 'Invalid JSON response', rawText: responseText };
    }
    
    return data;
  } catch (error) {
    console.error('PSA connection test failed:', error);
    PSANotifications.showLookupNotification('FETCH_ERROR', { details: error });
    return { error: error.message };
  }
};

/**
 * Get cached PSA result if available
 * @param {string} certNumber - PSA certification number
 * @returns {Object|null} - Cached result or null if not found/expired
 */
const getCachedPSAResult = (certNumber) => {
  if (!certNumber) return null;
  
  const cachedResult = psaCache.results[certNumber];
  if (cachedResult && (Date.now() - cachedResult.timestamp < psaCache.expiry)) {
    console.log(`Using cached PSA result for cert number: ${certNumber}`);
    return cachedResult.data;
  }
  
  return null;
};

/**
 * Cache PSA search result
 * @param {string} certNumber - PSA certification number
 * @param {Object} data - PSA search result data
 */
const cachePSAResult = (certNumber, data) => {
  if (!certNumber || !data) return;
  
  psaCache.results[certNumber] = {
    data,
    timestamp: Date.now()
  };
  
  console.log(`Cached PSA result for cert number: ${certNumber}`);
  
  // Save to Firestore
  try {
    psaDataService.saveCardToCache(certNumber, data);
  } catch (error) {
    console.warn('Failed to save PSA result to Firestore:', error);
  }
};

/**
 * Clear PSA cache for a specific cert number or all
 * @param {string} certNumber - Optional specific cert number to clear
 */
const clearPSACache = (certNumber = null) => {
  if (certNumber) {
    delete psaCache.results[certNumber];
    console.log(`Cleared PSA cache for cert number: ${certNumber}`);
  } else {
    psaCache.results = {};
    console.log('Cleared all PSA cache');
  }
};

// Track API rate limiting
const apiRateLimit = {
  isLimited: false,
  limitResetTime: null,
  dailyLimit: 100,
  remainingCalls: 100,
  setLimited: function(resetTimeMs = 24 * 60 * 60 * 1000) {
    this.isLimited = true;
    this.limitResetTime = Date.now() + resetTimeMs;
    this.remainingCalls = 0;
    
    // Store in localStorage to persist between page reloads
    try {
      localStorage.setItem('psaApiRateLimit', JSON.stringify({
        isLimited: this.isLimited,
        limitResetTime: this.limitResetTime,
        remainingCalls: this.remainingCalls
      }));
    } catch (e) {
      console.warn('Failed to save PSA API rate limit to localStorage:', e);
    }
    
    console.warn(`PSA API rate limit reached. Limit will reset in ${Math.round(resetTimeMs / (60 * 60 * 1000))} hours.`);
  },
  checkStatus: function() {
    // Check if we need to restore state from localStorage
    try {
      const stored = localStorage.getItem('psaApiRateLimit');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.isLimited = parsed.isLimited;
        this.limitResetTime = parsed.limitResetTime;
        this.remainingCalls = parsed.remainingCalls;
      }
    } catch (e) {
      console.warn('Failed to load PSA API rate limit from localStorage:', e);
    }
    
    // Check if the limit has reset
    if (this.isLimited && this.limitResetTime && Date.now() > this.limitResetTime) {
      this.isLimited = false;
      this.limitResetTime = null;
      this.remainingCalls = this.dailyLimit;
      
      // Update localStorage
      try {
        localStorage.removeItem('psaApiRateLimit');
      } catch (e) {
        console.warn('Failed to clear PSA API rate limit from localStorage:', e);
      }
      
      console.log('PSA API rate limit has reset. You can now make API calls again.');
    }
    
    return {
      isLimited: this.isLimited,
      limitResetTime: this.limitResetTime,
      remainingCalls: this.remainingCalls,
      timeUntilReset: this.limitResetTime ? this.limitResetTime - Date.now() : 0
    };
  },
  decrementCalls: function() {
    if (this.remainingCalls > 0) {
      this.remainingCalls--;
      
      // Update localStorage
      try {
        localStorage.setItem('psaApiRateLimit', JSON.stringify({
          isLimited: this.isLimited,
          limitResetTime: this.limitResetTime,
          remainingCalls: this.remainingCalls
        }));
      } catch (e) {
        console.warn('Failed to save PSA API rate limit to localStorage:', e);
      }
    }
  }
};

// Initialize rate limit status from localStorage
apiRateLimit.checkStatus();

/**
 * Search for PSA graded card by certification number
 * @param {string} certNumber - PSA certification number
 * @param {boolean} forceRefresh - Force a fresh lookup bypassing cache
 * @returns {Promise<Object>} - Card details from PSA
 */
const searchByCertNumber = async (certNumber, forceRefresh = false) => {
  try {
    // Show loading notification
    PSANotifications.showLoadingNotification();
    
    // Check if we've hit the API rate limit
    const rateLimitStatus = apiRateLimit.checkStatus();
    if (rateLimitStatus.isLimited) {
      const hoursRemaining = Math.round(rateLimitStatus.timeUntilReset / (60 * 60 * 1000));
      const minutesRemaining = Math.round(rateLimitStatus.timeUntilReset / (60 * 1000)) % 60;
      
      const timeMessage = hoursRemaining > 0 
        ? `${hoursRemaining} hours and ${minutesRemaining} minutes` 
        : `${minutesRemaining} minutes`;
      
      console.warn(`PSA API rate limit reached. Limit will reset in ${timeMessage}.`);
      
      // Use our centralized notification system
      PSANotifications.showLookupNotification('RATE_LIMITED');
      
      // Return a special error that the UI can handle
      return { 
        error: 'RATE_LIMITED',
        message: `PSA lookup temporarily unavailable.`,
        certNumber: certNumber
      };
    }
    
    // Check local cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedResult = getCachedPSAResult(certNumber);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Check Firestore
      try {
        const dbResult = await psaDataService.getCardFromCache(certNumber);
        if (dbResult) {
          // Only log in development environment
          if (process.env.NODE_ENV === 'development') {
            console.log(`Using PSA result from Firestore for cert number: ${certNumber}`);
          }
          // Update memory cache with the same structure as direct API results
          psaCache.results[certNumber] = dbResult;
          return dbResult;
        }
      } catch (dbError) {
        // Keep error logging for troubleshooting
        console.warn('Failed to get PSA result from Firestore:', dbError);
      }
    }
    
    // Only log in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log(`PSA Search: Not found in any cache, calling PSA API for cert #${certNumber}`);
    }
    
    // Decrement remaining API calls
    apiRateLimit.decrementCalls();
    
    // Call the Firebase Cloud Function
    const result = await psaLookupFunction({ certNumber });
    
    // Only log in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log('PSA API response via Cloud Function:', result);
    }
    
    // Extract the data from the Cloud Function response
    if (result.data && result.data.success) {
      const psaData = result.data.data;
      
      // Cache the successful result locally
      cachePSAResult(certNumber, psaData);
      
      return psaData;
    } else {
      // Keep error logging for PSA search since these are important for troubleshooting
      console.error('PSA lookup failed:', result.data);
      // Add more detailed logging for debugging
      if (result.data && result.data.error) {
        console.error('Error details:', result.data.error);
      }
      
      // Check if this is a rate limit error (403 Forbidden)
      if (result.data?.error && result.data.error.includes('403 Forbidden')) {
        // Set the rate limit flag
        apiRateLimit.setLimited();
        
        // Use our centralized notification system
        PSANotifications.showLookupNotification('RATE_LIMITED');
        
        // Return a special error that the UI can handle
        return { 
          error: 'RATE_LIMITED',
          message: 'PSA lookup temporarily unavailable.',
          certNumber: certNumber
        };
      }
      
      // Use our centralized notification system
      PSANotifications.showLookupNotification('NOT_FOUND');
      return { error: 'NOT_FOUND' };
    }
  } catch (error) {
    console.error('Error searching PSA card by cert number:', error);
    // Use our centralized notification system
    PSANotifications.showLookupNotification('FETCH_ERROR', { details: error });
    return { error: 'FETCH_ERROR' };
  }
};

/**
 * Parse PSA card data from API response to a format compatible with the app
 * @param {Object} psaData - Raw PSA API response
 * @returns {Object} - Parsed card data
 */
const parsePSACardData = (psaData) => {
  if (!psaData || psaData.error) {
    throw new Error(psaData?.error || 'Invalid PSA data');
  }
  
  console.log('Parsing PSA data:', psaData);
  
  // Handle different PSA API response structures
  const cert = psaData.PSACert || psaData.data?.PSACert || psaData;

  // Construct a more descriptive card name
  const cardName = [
    cert.Year,
    cert.Brand,
    cert.SetName, // If available, otherwise Brand/Title
    cert.CardNumber ? `#${cert.CardNumber}` : '',
    cert.Subject,
    cert.Variety
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  // Clean card name for the app - just extract the actual card name without year/brand prefix
  const cleanCardName = cert.Subject || cert.Title || '';

  // Extract the numerical grade or 'A' for Authentic to match dropdown values
  const rawGrade = cert.GradeDescription || cert.CardGrade || '';
  let parsedGradeValue = '';
  const numericMatch = rawGrade.match(/(\d+(\.\d)?)/); // Find first number (e.g., 9, 10, 8.5)
  const authenticMatch = rawGrade.match(/Authentic/i);

  if (numericMatch) {
    parsedGradeValue = numericMatch[1];
  } else if (authenticMatch) {
    parsedGradeValue = 'A';
  }

  const result = {
    cardName: cleanCardName,
    cardNumber: cert.CardNumber || cert.SpecNumber || '',
    slabSerial: cert.CertNumber || cert.SpecId || '',
    grade: parsedGradeValue, // Use the extracted numerical/Authentic value
    setName: cert.Brand || cert.SetName || '',
    year: cert.Year || '',
    cardType: cert.Category || '',
    psaImageUrl: cert.ImageUrl || '',
    population: cert.TotalPopulation || 0,
    populationHigher: cert.TotalPopulationHigher || 0,
    varietyType: cert.Variety || '',
    certificationDate: cert.CertDate || '',
    // Show edition info (e.g., '1st Edition', 'Unlimited') in player field if present, otherwise fallback to character/player
    player: (cert.Variety && /(Edition|Unlimited|1st)/i.test(cert.Variety)) ? cert.Variety : (cert.Subject || ''),
    brand: cert.Brand || '',
    psaUrl: `https://www.psacard.com/cert/${cert.CertNumber || ''}`,
    isPSAAuthenticated: true,
  };

  console.log('Parsed PSA data into:', result);
  return result;
};

/**
 * Merge PSA card data with existing card data
 * @param {Object} existingCardData - Current card data in the application
 * @param {Object} psaCardData - Data retrieved from PSA
 * @returns {Object} - Merged card data
 */
const mergeWithExistingCard = (existingCardData, psaCardData) => {
  console.log('Merging PSA data:', psaCardData);
  console.log('With existing data:', existingCardData);
  
  // Create a new object with existing card data as the base
  // Preserve existing values that should not be overwritten
  const mergedData = { 
    ...existingCardData,
    // Preserve these fields if they exist
    datePurchased: existingCardData.datePurchased || new Date().toISOString().split('T')[0],
    investmentAUD: existingCardData.investmentAUD || '',
    currentValueAUD: existingCardData.currentValueAUD || '',
    quantity: existingCardData.quantity || 1
  };
  
  // Map PSA data to our card data structure
  if (psaCardData.cardName) mergedData.card = psaCardData.cardName;
  if (psaCardData.player) mergedData.player = psaCardData.player;
  
  // Find best matching set from dropdown options
  if (psaCardData.setName) {
    const matchedSet = findBestMatchingSet(psaCardData.setName, psaCardData.year);
    console.log('Found matching set:', matchedSet, 'from', psaCardData.setName);
    mergedData.set = matchedSet;
  }
  
  if (psaCardData.year) mergedData.year = psaCardData.year;
  
  // Always set grading company to PSA for PSA searches
  mergedData.gradingCompany = "PSA";
  
  // Format condition string correctly for CardDetailsForm dropdowns
  if (psaCardData.grade) {
    let gradeValue = psaCardData.grade.trim();
    
    // Try to extract numeric grade (e.g., from "GEM MINT 10" or "MINT 9")
    const gradeMatch = gradeValue.match(/\b(\d+(\.\d+)?)\b$/);
    const numericGrade = gradeMatch ? gradeMatch[1] : null;
    
    if (numericGrade) {
      // Use only the numeric part if found
      gradeValue = numericGrade;
    } else {
      // Keep the text grade (e.g., "Authentic"), maybe title-case it
      gradeValue = gradeValue
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Set both condition and grade fields
    mergedData.condition = `PSA ${gradeValue}`; // e.g., "PSA 10", "PSA Authentic"
    mergedData.grade = gradeValue; // Just the grade value
  }
  
  if (psaCardData.slabSerial) mergedData.slabSerial = psaCardData.slabSerial;
  if (psaCardData.population) mergedData.population = psaCardData.population;
  if (psaCardData.psaUrl) mergedData.psaUrl = psaCardData.psaUrl;
  
  // Refined Category Detection:
  // Combine relevant fields into a single string for keyword checking (lowercase)
  const combinedInfo = [
    psaCardData.cardType,
    psaCardData.brand,
    psaCardData.cardName, // Often contains player/character name
    psaCardData.setName, // Set name might also indicate category
    psaCardData.player    // Player/character name is often useful for category detection
  ].filter(Boolean).join(' ').toLowerCase();

  console.log('Category detection combined info:', combinedInfo);

  // Default category
  mergedData.category = 'Pokemon'; // Default to Pokemon for PSA searches

  if (combinedInfo) {
    // Dragon Ball Z - check this first as it's more specific
    if (combinedInfo.includes('dragon ball') || 
        combinedInfo.includes('dragonball') || 
        combinedInfo.includes('dbz') ||
        /goku|vegeta|piccolo|gohan|trunks|frieza|cell|buu/i.test(combinedInfo)) {
      mergedData.category = 'DragonBallZ';
    }
    // One Piece
    else if (combinedInfo.includes('one piece') || 
             /luffy|zoro|sanji|nami|usopp|chopper|robin|franky|brook|jinbe/i.test(combinedInfo)) {
      mergedData.category = 'OnePiece';
    }
    // Pokémon check
    else if (combinedInfo.includes('pokemon') || 
             combinedInfo.includes('pokémon') ||
             /pikachu|charizard|blastoise|venusaur|mewtwo/i.test(combinedInfo)) {
      mergedData.category = 'Pokemon';
    }
    // Yu-Gi-Oh
    else if (combinedInfo.includes('yu-gi-oh') || 
             combinedInfo.includes('yugioh') ||
             combinedInfo.includes('yu gi oh') ||
             /kaiba|yugi|exodia|blue-eyes|dark magician/i.test(combinedInfo)) {
      mergedData.category = 'YuGiOh';
    }
    // Magic: The Gathering
    else if (combinedInfo.includes('magic') || 
             combinedInfo.includes('mtg') ||
             combinedInfo.includes('gathering') ||
             /planeswalker|mana|wizards of the coast|mythic rare/i.test(combinedInfo)) {
      mergedData.category = 'MagicTheGathering';
    }
    // Sports cards - NHL
    else if (combinedInfo.includes('hockey') || 
             combinedInfo.includes('nhl') ||
             /gretzky|ovechkin|crosby|mcdavid/i.test(combinedInfo)) {
      mergedData.category = 'NHL';
    }
    // NBL (National Basketball League)
    else if (combinedInfo.includes('nbl') || 
             combinedInfo.includes('national basketball league') && !combinedInfo.includes('nba')) {
      mergedData.category = 'NBL';
    }
    // Sports cards - Basketball
    else if (combinedInfo.includes('basketball') || 
             combinedInfo.includes('nba') ||
             /lebron|jordan|kobe|curry|durant/i.test(combinedInfo)) {
      mergedData.category = 'Other';
    }
    // Sports cards - Football
    else if (combinedInfo.includes('football') || 
             combinedInfo.includes('nfl') ||
             /quarterback|touchdown|brady|mahomes|rodgers/i.test(combinedInfo)) {
      mergedData.category = 'Other';
    }
  }
  
  console.log('Final merged data:', mergedData);
  return mergedData;
};

// Function to find the best matching set from our dropdown options
const findBestMatchingSet = (setName, year) => {
  console.log('Finding best matching set for:', setName, 'year:', year);
  
  // First try to get sets for the specific year
  let availableSets = [];
  if (year) {
    const parsedYear = parseInt(year, 10);
    if (!isNaN(parsedYear)) {
      availableSets = getPokemonSetsByYear(parsedYear);
      console.log(`Found ${availableSets.length} sets for year ${parsedYear}`);
    }
  }
  
  // If no sets found for the year, use all sets
  if (availableSets.length === 0) {
    availableSets = getAllPokemonSets();
    console.log(`Using all sets (${availableSets.length} total)`);
  }
  
  // If we have a set name, try to find the best match
  if (setName && typeof setName === 'string' && availableSets.length > 0) {
    // Clean up the set name for better matching
    const cleanSetName = setName.toLowerCase().trim();
    console.log('Cleaned set name for matching:', cleanSetName);
    
    // Try for exact match first
    const exactMatch = availableSets.find(set => 
      typeof set === 'string' && set.toLowerCase() === cleanSetName
    );
    
    if (exactMatch) {
      console.log('Found exact match:', exactMatch);
      return exactMatch;
    }
    
    // Try for partial match with more aggressive matching
    // Sort by match quality - longer matches are better
    const partialMatches = availableSets
      .filter(set => 
        typeof set === 'string' && (
          set.toLowerCase().includes(cleanSetName) ||
          cleanSetName.includes(set.toLowerCase())
        )
      )
      .sort((a, b) => {
        // Prefer sets that contain the search term over sets contained in the search term
        const aContainsSearch = a.toLowerCase().includes(cleanSetName);
        const bContainsSearch = b.toLowerCase().includes(cleanSetName);
        
        if (aContainsSearch && !bContainsSearch) return -1;
        if (!aContainsSearch && bContainsSearch) return 1;
        
        // If both contain or are contained, prefer the closer length match
        const aLengthDiff = Math.abs(a.length - cleanSetName.length);
        const bLengthDiff = Math.abs(b.length - cleanSetName.length);
        return aLengthDiff - bLengthDiff;
      });
    
    if (partialMatches.length > 0) {
      console.log('Found partial matches, best match:', partialMatches[0]);
      console.log('All partial matches:', partialMatches);
      return partialMatches[0];
    }
    
    // Try word-by-word matching as a last resort
    const words = cleanSetName.split(/\s+/);
    if (words.length > 1) {
      console.log('Trying word-by-word matching with words:', words);
      
      // Try to match with individual words from the set name
      for (const word of words) {
        if (word.length < 3) continue; // Skip very short words
        
        const wordMatches = availableSets
          .filter(set => typeof set === 'string' && set.toLowerCase().includes(word))
          .sort((a, b) => a.length - b.length); // Prefer shorter matches
        
        if (wordMatches.length > 0) {
          console.log(`Found match using word "${word}":`, wordMatches[0]);
          return wordMatches[0];
        }
      }
    }
  }
  
  // If no match found, add it to custom sets and return the original value
  console.log('No matching set found, adding to custom sets:', setName);
  
  try {
    // Add the set to custom sets for the specified year or default to current year
    const targetYear = year || new Date().getFullYear().toString();
    const { addCustomSet } = require('../data/pokemonSets');
    
    // Add the set to custom sets
    addCustomSet(setName, targetYear);
    console.log(`Added "${setName}" to custom sets for year ${targetYear}`);
    
    // Also save to Firestore if available
    if (db && typeof db.saveCustomSet === 'function') {
      db.saveCustomSet(setName, targetYear)
        .then(() => console.log(`Saved custom set "${setName}" to Firestore`))
        .catch(err => console.error('Error saving custom set to Firestore:', err));
    }
  } catch (error) {
    console.error('Error adding custom set:', error);
  }
  
  return setName;
};

/**
 * Fetch PSA card image and convert it to a file
 * @param {string} certNumber - PSA certification number
 * @returns {Promise<File|null>} - The image file or null if not found
 */
// COMPLETELY DISABLED - DO NOT USE
// This function has been intentionally disabled to prevent any image fetching
// If you need this functionality, please implement it differently.
const fetchPSACardImage = async () => {
  return null;
};

export {
  searchByCertNumber,
  parsePSACardData,
  mergeWithExistingCard,
  getAccessToken,
  testPSAConnection,
  clearPSACache
};
