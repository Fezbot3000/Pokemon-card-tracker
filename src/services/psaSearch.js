/**
 * PSA Search Service
 * 
 * Provides functionality to search for PSA graded cards using PSA's official API.
 * Uses Firebase Cloud Functions to make the API calls to avoid CORS issues.
 */

import { toast } from 'react-hot-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './firebase';

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
    toast.info('Using PSA API credentials from environment variables');
    
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
    return { error: error.message };
  }
};

/**
 * Search for PSA graded card by certification number
 * @param {string} certNumber - PSA certification number
 * @returns {Promise<Object>} - Card details from PSA
 */
const searchByCertNumber = async (certNumber) => {
  try {
    console.log(`Searching PSA for cert number: ${certNumber}`);
    
    // Call the Firebase Cloud Function
    const result = await psaLookupFunction({ certNumber });
    
    console.log('PSA API response via Cloud Function:', result);
    
    // Extract the data from the Cloud Function response
    if (result.data && result.data.success) {
      return result.data.data;
    } else {
      console.error('PSA lookup failed:', result.data);
      toast.error('PSA lookup failed. Please check the certification number and try again.');
      return { error: 'Failed to fetch PSA data' };
    }
  } catch (error) {
    console.error('Error searching PSA card by cert number:', error);
    toast.error(`PSA search failed: ${error.message}`);
    return { error: error.message };
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
  
  // Log the structure to help debug
  console.log('Parsing PSA data with keys:', Object.keys(psaData));
  
  // Based on the console log screenshot, we're getting a specific structure
  // with fields like brand, cardNumber, category, etc.
  const result = {
    // Card details from PSA
    cardName: psaData.PSACert?.Subject || '',
    cardNumber: psaData.PSACert?.CardNumber || psaData.PSACert?.SpecNumber || '',
    slabSerial: psaData.PSACert?.CertNumber || psaData.PSACert?.SpecId || '',
    grade: psaData.PSACert?.GradeDescription || psaData.PSACert?.CardGrade || '',
    setName: psaData.PSACert?.Brand || '',
    year: psaData.PSACert?.Year || '',
    cardType: psaData.PSACert?.Category || '',
    psaImageUrl: psaData.PSACert?.ImageUrl || '',
    population: psaData.PSACert?.TotalPopulation || 0,
    populationHigher: psaData.PSACert?.TotalPopulationHigher || 0,
    varietyType: psaData.PSACert?.Variety || '',
    certificationDate: psaData.PSACert?.CertDate || '',
    player: psaData.PSACert?.Subject || '',
    
    // Include the brand/manufacturer info which appears in your console log
    brand: psaData.PSACert?.Brand || '',
    
    // PSA website URL for the card
    psaUrl: `https://www.psacard.com/cert/${psaData.PSACert?.CertNumber || ''}`,
    
    // App-specific fields (default values, to be merged with existing data)
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
  // Create a new object with existing card data as the base
  const mergedData = { ...existingCardData };
  
  // Map PSA data to our card data structure
  if (psaCardData.cardName) mergedData.card = psaCardData.cardName;
  if (psaCardData.player) mergedData.player = psaCardData.player;
  if (psaCardData.setName) mergedData.set = psaCardData.setName;
  if (psaCardData.year) mergedData.year = psaCardData.year;
  if (psaCardData.grade) mergedData.condition = psaCardData.grade;
  if (psaCardData.slabSerial) mergedData.slabSerial = psaCardData.slabSerial;
  if (psaCardData.population) mergedData.population = psaCardData.population;
  if (psaCardData.psaUrl) mergedData.psaUrl = psaCardData.psaUrl;
  
  // If there's category information, map it to our category field
  if (psaCardData.cardType) {
    // Normalize category to one of our predefined categories if possible
    const category = psaCardData.cardType.toLowerCase();
    if (category.includes('pokemon')) {
      mergedData.category = 'Pokemon';
    } else if (category.includes('basketball')) {
      mergedData.category = 'Basketball';
    } else if (category.includes('football')) {
      mergedData.category = 'Football';
    } else if (category.includes('baseball')) {
      mergedData.category = 'Baseball';
    } else {
      mergedData.category = psaCardData.cardType;
    }
  }
  
  // Preserve existing financial data and image
  // We don't modify: investmentUSD, currentValueUSD, investmentAUD, currentValueAUD, datePurchased, notes, etc.
  
  console.log('Merged card data:', mergedData);
  return mergedData;
};

// Get reference to Firebase Functions
const functions = getFunctions();
const psaLookupFunction = httpsCallable(functions, 'psaLookup');

export {
  searchByCertNumber,
  parsePSACardData,
  mergeWithExistingCard,
  getAccessToken,
  testPSAConnection
};
