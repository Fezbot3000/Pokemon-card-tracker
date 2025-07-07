/**
 * PSA Search Service
 *
 * Provides functionality to search for PSA graded cards using PSA's official API.
 * Uses Firebase Cloud Functions to make the API calls to avoid CORS issues.
 */

import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import db from './firestore/dbAdapter';
import logger from '../utils/logger';
import PSANotifications from '../components/PSANotifications';
import { getPokemonSetsByYear, getAllPokemonSets } from '../data/pokemonSets';
import psaDataService from './psaDataService';

// Initialize Firebase Functions
const functions = getFunctions();

const psaLookupFunction = httpsCallable(functions, 'psaLookup');

// Firebase project region and ID for direct HTTP calls
const region = 'us-central1';
const projectId = 'mycardtracker-c8479';

// Subscription cache - no rate limiting
const subscriptionCache = {
  lastCall: 0,
  cooldown: 0, // No cooldown between calls
  isReady: function () {
    return true; // Always ready
  },
  updateLastCall: function () {
    this.lastCall = Date.now();
  },
};

// PSA search result cache
const psaCache = {
  results: {}, // Store results by cert number
  expiry: 24 * 60 * 60 * 1000, // Cache PSA results for 24 hours

  // Load cached results from localStorage
  loadFromStorage: function () {
    try {
      const stored = localStorage.getItem('psaSearchCache');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.results = parsed.results || {};
      }
    } catch (e) {
      console.warn('Failed to load PSA search cache from localStorage:', e);
    }
  },

  // Save cached results to localStorage
  saveToStorage: function () {
    try {
      localStorage.setItem(
        'psaSearchCache',
        JSON.stringify({
          results: this.results,
        })
      );
    } catch (e) {
      console.warn('Failed to save PSA search cache to localStorage:', e);
    }
  },
};

// Initialize cache from localStorage
psaCache.loadFromStorage();

/**
 * Get cached PSA result if available
 * @param {string} certNumber - PSA certification number
 * @returns {Object|null} - Cached result or null if not found/expired
 */
const getCachedPSAResult = certNumber => {
  if (!certNumber) return null;

  const cachedResult = psaCache.results[certNumber];
  if (cachedResult && Date.now() - cachedResult.timestamp < psaCache.expiry) {
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
    timestamp: Date.now(),
  };

  psaCache.saveToStorage();

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
  } else {
    psaCache.results = {};
  }
};

// No API rate limiting - completely disabled
const apiRateLimit = {
  isLimited: false,
  limitResetTime: null,
  dailyLimit: Number.MAX_SAFE_INTEGER,
  remainingCalls: Number.MAX_SAFE_INTEGER,

  setLimited: function () {
    // Do nothing - no rate limiting
  },

  resetLimit: function () {
    // Do nothing - no rate limiting
  },

  checkStatus: function () {
    // Always return unlimited status
    return {
      isLimited: false,
      limitResetTime: null,
      remainingCalls: Number.MAX_SAFE_INTEGER,
      timeUntilReset: 0,
    };
  },

  decrementCalls: function () {
    // Do nothing - no rate limiting
  },

  checkLimit: function () {
    // Always return true - no rate limiting
    return true;
  },
};

// No rate limit initialization needed

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

    // Check caches first if not forcing refresh
    if (!forceRefresh) {
      // Check memory cache first (fastest)
      const memoryResult = getCachedPSAResult(certNumber);
      if (memoryResult) {
        logger.debug(
          `Using PSA result from memory cache for cert #${certNumber}`
        );
        PSANotifications.showLookupNotification('success');
        return memoryResult;
      }

      // Then check Firebase cache
      try {
        const dbResult = await psaDataService.getCardFromCache(certNumber);
        if (dbResult) {
          logger.debug(
            `Using PSA result from Firebase for cert #${certNumber}`
          );
          // Update memory cache
          psaCache.results[certNumber] = dbResult;
          PSANotifications.showLookupNotification('success');
          return dbResult;
        }
      } catch (dbError) {
        logger.warn('Failed to get PSA result from Firebase:', dbError);
      }
    }

    // No rate limit checks - proceed directly to API call

    // No rate limiting - proceed with API call without decrementing

    // Call the Firebase Cloud Function
    const result = await psaLookupFunction({ certNumber });

    // Extract the data from the Cloud Function response
    if (result.data && result.data.success) {
      const psaData = result.data.data;

      // Cache the successful result in memory and Firebase
      cachePSAResult(certNumber, psaData);
      await psaDataService.saveCardToCache(certNumber, psaData);

      PSANotifications.showLookupNotification('success');
      return psaData;
    } else {
      // Keep error logging for PSA search since these are important for troubleshooting
      console.error('PSA lookup failed:', result.data);
      // Add more detailed logging for debugging
      if (result.data && result.data.error) {
        console.error('Error details:', result.data.error);
      }

      // Show appropriate error notification based on error type
      if (
        result.data?.error === 'PSA_API_NOT_CONFIGURED' ||
        result.data?.error === 'CONFIGURATION_ERROR'
      ) {
        PSANotifications.showLookupNotification('CONFIG_ERROR');
      } else if (result.data?.error === 'PSA_CONFIG_ERROR') {
        PSANotifications.showLookupNotification('CONFIG_ERROR');
      } else if (result.data?.error === 'NOT_FOUND') {
        PSANotifications.showLookupNotification('NOT_FOUND');
      } else if (result.data?.error === 'INVALID_DATA') {
        PSANotifications.showLookupNotification('PARSE_ERROR');
      } else {
        PSANotifications.showLookupNotification('FETCH_ERROR');
      }

      // Return error object with more specific messaging
      return {
        error: result.data?.error || 'API_ERROR',
        message:
          result.data?.message ||
          'Failed to fetch PSA data. Please try again later.',
      };
    }
  } catch (error) {
    console.error('Error searching PSA card by cert number:', error);

    // Show error notification
    PSANotifications.showLookupNotification('FETCH_ERROR');

    // Return error object
    return {
      error: 'API_ERROR',
      message: `Failed to fetch PSA data: ${error.message}`,
    };
  }
};

/**
 * Extract holo state from PSA data
 * @param {string} variety - PSA variety field
 * @param {string} cardName - Card name
 * @param {string} category - Card category
 * @returns {string} - Holo state value
 */
const extractHoloState = (variety, cardName, category) => {
  const combinedText = [variety, cardName, category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check for specific holo states in order of specificity
  if (/rainbow\s*(rare|variant)/i.test(combinedText)) {
    return 'rainbow';
  }
  if (/secret\s*rare/i.test(combinedText)) {
    return 'secret-rare';
  }
  if (/ultra\s*rare/i.test(combinedText)) {
    return 'ultra-rare';
  }
  if (/full\s*art/i.test(combinedText)) {
    return 'full-art';
  }
  if (/alternate\s*art|alt\s*art/i.test(combinedText)) {
    return 'alternate-art';
  }
  if (/reverse\s*holo/i.test(combinedText)) {
    return 'reverse-holo';
  }
  if (/gold/i.test(combinedText)) {
    return 'gold';
  }
  if (/shiny/i.test(combinedText)) {
    return 'shiny';
  }
  if (/promo/i.test(combinedText)) {
    return 'promo';
  }
  if (/1st\s*edition|first\s*edition/i.test(combinedText)) {
    return 'first-edition';
  }
  if (/shadowless/i.test(combinedText)) {
    return 'shadowless';
  }
  if (/unlimited/i.test(combinedText)) {
    return 'unlimited';
  }
  if (/holo/i.test(combinedText)) {
    return 'holo';
  }

  // Default to non-holo if no specific indicators found
  return 'non-holo';
};

/**
 * Parse PSA card data from API response to a format compatible with the app
 * @param {Object} psaData - Raw PSA API response
 * @returns {Object} - Parsed card data
 */
const parsePSACardData = psaData => {
  if (!psaData || psaData.error) {
    throw new Error(psaData?.error || 'Invalid PSA data');
  }

  // Handle different PSA API response structures
  const cert = psaData.PSACert || psaData.data?.PSACert || psaData;

  // Construct a more descriptive card name
  const cardName = [
    cert.Year,
    cert.Brand,
    cert.SetName, // If available, otherwise Brand/Title
    cert.CardNumber ? `#${cert.CardNumber}` : '',
    cert.Subject,
    cert.Variety,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

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

  // Attempt to match the set using brand and year
  const psaSetInfo = cert.Brand || cert.SetName || '';
  const psaYear = cert.Year || '';
  const matchedSetResult = findBestMatchingSet(psaSetInfo, psaYear);

  let finalSetName = psaSetInfo; // Default to raw PSA set info
  let finalSetValue = psaSetInfo; // Default to raw PSA set info for the value too, or empty

  if (matchedSetResult) {
    finalSetName = matchedSetResult.matchedLabel;
    finalSetValue = matchedSetResult.matchedValue;
  }

  const result = {
    cardName: cleanCardName, // Expected: card.cardName in form
    cardNumber: cert.CardNumber || cert.SpecNumber || '',
    certificationNumber: cert.CertNumber || cert.SpecId || '', // Changed from slabSerial
    grade: parsedGradeValue, // Expected: card.grade in form
    gradingCompany: 'PSA', // Added: Expected card.gradingCompany in form
    set: finalSetValue,
    setName: finalSetName,
    year: psaYear,
    // Explicitly set category to 'pokemon' for all PSA cards
    category: 'pokemon',
    cardType: cert.Category || '', // Expected: card.category in form (implicitly)
    psaImageUrl: cert.ImageUrl || '',
    population: cert.TotalPopulation || 0, // Expected: card.population in form
    populationHigher: cert.TotalPopulationHigher || 0,
    varietyType: cert.Variety || '',
    certificationDate: cert.CertDate || '',
    // Show edition info (e.g., '1st Edition', 'Unlimited') in player field if present, otherwise fallback to character/player
    player:
      cert.Variety &&
      !/(N\/A|NONE)/i.test(cert.Variety) &&
      /(Edition|Unlimited|1st|Promo|Holo|Reverse)/i.test(cert.Variety)
        ? cert.Variety
        : cert.Subject || '', // Expected: card.player in form
    // Extract holo state from variety and card name
    holoState: extractHoloState(cert.Variety, cleanCardName, cert.Category),
    brand: cert.Brand || '',
    psaUrl: `https://www.psacard.com/cert/${cert.CertNumber || ''}`,
    isPSAAuthenticated: true,
    _rawPsaData: cert, // Include raw data for debugging or future use
  };

  return result;
};

/**
 * Merge PSA card data with existing card data
 * @param {Object} existingCardData - Current card data in the application
 * @param {Object} psaCardData - Data retrieved from PSA
 * @returns {Object} - Merged card data
 */
const mergeWithExistingCard = (existingCardData, psaCardData) => {
  // Create a new object with existing card data as the base
  // Preserve existing values that should not be overwritten
  const mergedData = {
    ...existingCardData,
    // Preserve these fields if they exist
    datePurchased:
      existingCardData.datePurchased || new Date().toISOString().split('T')[0],
    investmentAUD: existingCardData.investmentAUD || '',
    currentValueAUD: existingCardData.currentValueAUD || '',
    quantity: existingCardData.quantity || 1,
  };

  // Map PSA data to our card data structure
  if (psaCardData.cardName) mergedData.card = psaCardData.cardName;
  if (psaCardData.player) mergedData.player = psaCardData.player;

  // Find best matching set from dropdown options
  if (psaCardData.setName) {
    const matchedSet = findBestMatchingSet(
      psaCardData.setName,
      psaCardData.year
    );

    if (matchedSet) {
      mergedData.set = matchedSet.matchedValue;
      mergedData.setName = matchedSet.matchedLabel; // Set both set and setName for compatibility
    } else {
      mergedData.set = psaCardData.setName;
      mergedData.setName = psaCardData.setName;
    }
  }

  if (psaCardData.year) mergedData.year = psaCardData.year;

  // Always set grading company to PSA for PSA searches
  mergedData.gradingCompany = 'PSA';

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
  if (psaCardData.holoState) mergedData.holoState = psaCardData.holoState;

  // Refined Category Detection:
  // Combine relevant fields into a single string for keyword checking (lowercase)
  const combinedInfo = [
    psaCardData.cardType,
    psaCardData.brand,
    psaCardData.cardName, // Often contains player/character name
    psaCardData.setName, // Set name might also indicate category
    psaCardData.player, // Player/character name is often useful for category detection
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Default category
  mergedData.category = 'pokemon'; // Default to pokemon (lowercase) for PSA searches to match form expectations

  if (combinedInfo) {
    // Dragon Ball Z - check this first as it's more specific
    if (
      combinedInfo.includes('dragon ball') ||
      combinedInfo.includes('dragonball') ||
      combinedInfo.includes('dbz') ||
      /goku|vegeta|piccolo|gohan|trunks|frieza|cell|buu/i.test(combinedInfo)
    ) {
      mergedData.category = 'dragonBallZ'; // Use camelCase to match form expectations
    }
    // One Piece
    else if (
      combinedInfo.includes('one piece') ||
      /luffy|zoro|sanji|nami|usopp|chopper|robin|franky|brook|jinbe/i.test(
        combinedInfo
      )
    ) {
      mergedData.category = 'onePiece'; // Use camelCase to match form expectations
    }
    // Pokémon check
    else if (
      combinedInfo.includes('pokemon') ||
      combinedInfo.includes('pokémon') ||
      /pikachu|charizard|blastoise|venusaur|mewtwo/i.test(combinedInfo)
    ) {
      mergedData.category = 'pokemon'; // Use lowercase to match form expectations
    }
    // Yu-Gi-Oh
    else if (
      combinedInfo.includes('yu-gi-oh') ||
      combinedInfo.includes('yugioh') ||
      combinedInfo.includes('yu gi oh') ||
      /kaiba|yugi|exodia|blue-eyes|dark magician/i.test(combinedInfo)
    ) {
      mergedData.category = 'yugioh'; // Use lowercase to match form expectations
    }
    // Magic: The Gathering
    else if (
      combinedInfo.includes('magic') ||
      combinedInfo.includes('mtg') ||
      combinedInfo.includes('gathering') ||
      /planeswalker|mana|wizards of the coast|mythic rare/i.test(combinedInfo)
    ) {
      mergedData.category = 'magicTheGathering'; // Use camelCase to match form expectations
    }
    // Sports cards - NHL
    else if (
      combinedInfo.includes('hockey') ||
      combinedInfo.includes('nhl') ||
      /gretzky|ovechkin|crosby|mcdavid/i.test(combinedInfo)
    ) {
      mergedData.category = 'nhl'; // Use lowercase to match form expectations;
    }
    // NBL (National Basketball League)
    else if (
      combinedInfo.includes('nbl') ||
      (combinedInfo.includes('national basketball league') &&
        !combinedInfo.includes('nba'))
    ) {
      mergedData.category = 'NBL';
    }
    // Sports cards - Basketball
    else if (
      combinedInfo.includes('basketball') ||
      combinedInfo.includes('nba') ||
      /lebron|jordan|kobe|curry|durant/i.test(combinedInfo)
    ) {
      mergedData.category = 'Other';
    }
    // Sports cards - Football
    else if (
      combinedInfo.includes('football') ||
      combinedInfo.includes('nfl') ||
      /quarterback|touchdown|brady|mahomes|rodgers/i.test(combinedInfo)
    ) {
      mergedData.category = 'Other';
    }
  }

  return mergedData;
};

// Function to find the best matching set from our dropdown options
const findBestMatchingSet = (setName, year) => {
  // First try to get sets for the specific year
  let availableSets = [];
  if (year) {
    const parsedYear =
      typeof year === 'string' ? parseInt(year.trim(), 10) : parseInt(year, 10);

    if (!isNaN(parsedYear)) {
      availableSets = getPokemonSetsByYear(parsedYear); // Now returns [{label, value}, ...]
    }
  }

  if (availableSets.length === 0) {
    availableSets = getAllPokemonSets(); // Now returns [{label, value}, ...]
  }

  if (setName && typeof setName === 'string' && availableSets.length > 0) {
    let cleanSetName = setName.toLowerCase().trim();
    cleanSetName = cleanSetName
      .replace(/pokemon\s+(trading\s+)?card\s+game/i, '')
      .replace(/pokemon\s+(tcg|ccg)/i, '')
      .replace(/^(japanese|english|jp|en)\s+/i, '')
      .trim();

    // Special case for Base Set cards from 1999
    if (year === '1999' && cleanSetName.includes('game')) {
      const baseSet = availableSets.find(
        set =>
          set.label.toLowerCase() === 'base set (en)' ||
          set.value.toLowerCase() === 'base set (en)'
      );
      if (baseSet) {
        return { matchedValue: baseSet.value, matchedLabel: baseSet.label };
      }
    }

    // Try for exact match on label
    const exactMatch = availableSets.find(
      set =>
        set.label.toLowerCase() === cleanSetName ||
        set.value.toLowerCase() === cleanSetName
    );
    if (exactMatch) {
      return { matchedValue: exactMatch.value, matchedLabel: exactMatch.label };
    }

    // Try for partial match with more aggressive matching on label
    const partialMatches = availableSets
      .filter(set => {
        const setLower = set.label.toLowerCase();
        const valueLower = set.value.toLowerCase();
        return (
          setLower.includes(cleanSetName) ||
          cleanSetName.includes(setLower) ||
          valueLower.includes(cleanSetName) ||
          cleanSetName.includes(valueLower)
        );
      })
      .sort((a, b) => {
        // Prioritize Base Set for 1999 cards
        if (year === '1999') {
          const aIsBase = a.label.toLowerCase().includes('base set');
          const bIsBase = b.label.toLowerCase().includes('base set');
          if (aIsBase && !bIsBase) return -1;
          if (!aIsBase && bIsBase) return 1;
        }

        const aContainsSearch = a.label.toLowerCase().includes(cleanSetName);
        const bContainsSearch = b.label.toLowerCase().includes(cleanSetName);
        if (aContainsSearch && !bContainsSearch) return -1;
        if (!aContainsSearch && bContainsSearch) return 1;
        const aLengthDiff = Math.abs(a.label.length - cleanSetName.length);
        const bLengthDiff = Math.abs(b.label.length - cleanSetName.length);
        return aLengthDiff - bLengthDiff;
      });

    if (partialMatches.length > 0) {
      const bestMatch = partialMatches[0];
      return { matchedValue: bestMatch.value, matchedLabel: bestMatch.label };
    }
  }

  // If no match found, we will not add to custom sets here anymore.
  // parsePSACardData will decide what to do if no match is found.
  return null; // Return null if no match
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
  clearPSACache,
};
