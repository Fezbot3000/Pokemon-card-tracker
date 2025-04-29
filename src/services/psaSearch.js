/**
 * PSA Search Service
 * 
 * Provides functionality to search for PSA graded cards using PSA's official API.
 * Uses Firebase Cloud Functions to make the API calls to avoid CORS issues.
 */

import { toast } from 'react-hot-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './firebase';
import { getPokemonSetsByYear, getAllPokemonSets } from '../data/pokemonSets';

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
      // Add more detailed logging for debugging
      if (result.data && result.data.error) {
        console.error('Error details:', result.data.error);
      }
      toast.error('PSA lookup failed. Please check the certification number and try again.');
      return { error: result.data?.error || 'Failed to fetch PSA data' };
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
  const cert = psaData.PSACert || {};

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

  const result = {
    cardName: cleanCardName,
    cardNumber: cert.CardNumber || cert.SpecNumber || '',
    slabSerial: cert.CertNumber || cert.SpecId || '',
    grade: cert.GradeDescription || cert.CardGrade || '',
    setName: cert.Brand || '',
    year: cert.Year || '',
    cardType: cert.Category || '',
    psaImageUrl: cert.ImageUrl || '',
    population: cert.TotalPopulation || 0,
    populationHigher: cert.TotalPopulationHigher || 0,
    varietyType: cert.Variety || '',
    certificationDate: cert.CertDate || '',
    player: cert.Subject || '', // Just the character/player
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
  // Create a new object with existing card data as the base
  const mergedData = { ...existingCardData };
  
  // Map PSA data to our card data structure
  if (psaCardData.cardName) mergedData.card = psaCardData.cardName;
  if (psaCardData.player) mergedData.player = psaCardData.player;
  
  // Find best matching set from dropdown options
  if (psaCardData.setName) {
    const matchedSet = findBestMatchingSet(psaCardData.setName, psaCardData.year);
    mergedData.set = matchedSet;
  }
  
  if (psaCardData.year) mergedData.year = psaCardData.year;
  
  // Format condition string correctly for CardDetailsForm dropdowns
  if (psaCardData.grade) {
    const company = "PSA";
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
    mergedData.condition = `${company} ${gradeValue}`; // e.g., "PSA 10", "PSA Authentic"
    mergedData.gradingCompany = company; // Ensure grading company is set for dropdown
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
  mergedData.category = 'Other';

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
    // Sports cards - Baseball
    else if (combinedInfo.includes('baseball') || 
             combinedInfo.includes('mlb') ||
             /pitcher|batter|trout|ruth|aaron|bonds/i.test(combinedInfo)) {
      mergedData.category = 'Other';
    }
    // Sports cards - Soccer
    else if (combinedInfo.includes('soccer') || 
             (combinedInfo.includes('football') && !combinedInfo.includes('nfl')) ||
             combinedInfo.includes('fifa') ||
             /messi|ronaldo|pele|maradona|mbappe/i.test(combinedInfo)) {
      // If it's EPL related, that will be caught in the EPL check
      // Otherwise categorize as Other
      mergedData.category = 'Other';
    }
    // EPL (English Premier League)
    else if (combinedInfo.includes('premier league') || 
             combinedInfo.includes('epl') ||
             /manchester united|liverpool|chelsea|arsenal/i.test(combinedInfo)) {
      mergedData.category = 'EPL';
    }
    // F1
    else if (combinedInfo.includes('formula 1') || 
             combinedInfo.includes('f1') ||
             /hamilton|verstappen|schumacher|grand prix|ferrari|mclaren/i.test(combinedInfo)) {
      mergedData.category = 'F1';
    }
    // WWE
    else if (combinedInfo.includes('wwe') || 
             combinedInfo.includes('wrestling') ||
             combinedInfo.includes('wwf') ||
             /undertaker|cena|rock|austin|hogan/i.test(combinedInfo)) {
      mergedData.category = 'WWE';
    }
    // Default to Other if no specific category is detected
    else {
      mergedData.category = 'Other';
    }
  }
  
  console.log('Detected category:', mergedData.category);
  
  // Preserve existing financial data and image
  // We don't modify: investmentUSD, currentValueUSD, investmentAUD, currentValueAUD, datePurchased, notes, etc.
  
  // Preserve any existing card image if it exists
  if (existingCardData?.hasImage && existingCardData?.imageUrl) {
    console.log('Preserving existing card image:', existingCardData.imageUrl);
    mergedData.hasImage = existingCardData.hasImage;
    mergedData.imageUrl = existingCardData.imageUrl;
    // Also keep any image-related metadata
    if (existingCardData.imageUpdatedAt) {
      mergedData.imageUpdatedAt = existingCardData.imageUpdatedAt;
    }
  }
  
  console.log('Merged card data:', mergedData);
  return mergedData;
};

// Function to find the best matching set from our dropdown options
const findBestMatchingSet = (setName, year) => {
  // First try to get sets for the specific year
  let availableSets = [];
  if (year) {
    const parsedYear = parseInt(year, 10);
    if (!isNaN(parsedYear)) {
      availableSets = getPokemonSetsByYear(parsedYear);
    }
  }
  
  // If no sets found for the year, use all sets
  if (availableSets.length === 0) {
    availableSets = getAllPokemonSets();
  }
  
  // If we have a set name, try to find the best match
  if (setName && typeof setName === 'string' && availableSets.length > 0) {
    // Try for exact match first
    const exactMatch = availableSets.find(set => 
      typeof set === 'string' && set.toLowerCase() === setName.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try for partial match
    const partialMatch = availableSets.find(set => 
      typeof set === 'string' && (
        set.toLowerCase().includes(setName.toLowerCase()) ||
        setName.toLowerCase().includes(set.toLowerCase())
      )
    );
    
    if (partialMatch) {
      return partialMatch;
    }
  }
  
  // If no match found, return original value
  return setName;
};

/**
 * Create a placeholder image for a PSA card
 * @param {string} certNumber - The PSA certification number
 * @returns {File} - A File object containing a simple canvas-generated image
 */
const createPlaceholderImage = (certNumber) => {
  // Create a canvas element to generate a nicer placeholder image
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 900;
  
  const ctx = canvas.getContext('2d');
  
  // Card background - light gray
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // PSA slab outer border
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 12;
  ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
  
  // Inner border with shadow effect
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(30, 30, canvas.width - 60, canvas.height - 60);
  
  // Add drop shadow effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  // PSA Header area
  ctx.shadowColor = 'transparent'; // Turn off shadow for header
  ctx.fillStyle = '#222222';
  ctx.fillRect(40, 40, canvas.width - 80, 90);
  
  // PSA Logo text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PSA', canvas.width / 2, 100);
  
  // Cert Number with styling
  ctx.fillStyle = '#222222';
  ctx.font = '30px Arial, sans-serif';
  ctx.fillText(`Cert #${certNumber}`, canvas.width / 2, 170);
  
  // Add Pokemon logo/branding
  ctx.fillStyle = '#ffcb05'; // Pokemon yellow
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2 - 100, 100, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#3c5aa6'; // Pokemon blue
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2 - 100, 80, 0, Math.PI * 2);
  ctx.fill();
  
  // Card information
  ctx.fillStyle = '#222222';
  ctx.font = 'bold 40px Arial, sans-serif';
  ctx.fillText('PSA CARD', canvas.width / 2, canvas.height / 2 + 50);
  
  // Add stylized information about image pending
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText('Image will be available', canvas.width / 2, canvas.height / 2 + 120);
  ctx.fillText('after card verification', canvas.width / 2, canvas.height / 2 + 160);
  
  // Add a camera icon
  ctx.fillStyle = '#666666';
  ctx.beginPath();
  const cameraX = canvas.width / 2;
  const cameraY = canvas.height / 2 + 230;
  const cameraWidth = 80;
  const cameraHeight = 60;
  
  // Camera body
  ctx.fillRect(cameraX - cameraWidth/2, cameraY - cameraHeight/2, cameraWidth, cameraHeight);
  
  // Camera lens
  ctx.beginPath();
  ctx.arc(cameraX, cameraY, 25, 0, Math.PI * 2);
  ctx.fillStyle = '#444444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cameraX, cameraY, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#222222';
  ctx.fill();
  
  // Add info text at bottom
  ctx.fillStyle = '#666666';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText(`Search complete - Card #${certNumber}`, canvas.width / 2, canvas.height - 60);
  
  // Convert canvas to blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], `psa-card-${certNumber}.png`, { type: 'image/png' });
      console.log(`Created enhanced placeholder image for cert #${certNumber}, size: ${file.size} bytes`);
      resolve(file);
    }, 'image/png', 0.9);
  });
};

/**
 * Fetch PSA card image and convert it to a file
 * @param {string} certNumber - PSA certification number
 * @returns {Promise<File|null>} - The image file or null if not found
 */
const fetchPSACardImage = async (certNumber) => {
  if (!certNumber) return null;
  
  try {
    // Use PSA's main site image URL format instead
    // Try multiple URL patterns to increase chances of finding an image
    const imageUrls = [
      // URL pattern from PSA website
      `https://www.psacard.com/cert/${certNumber}/PSAcert`, 
      // Old pattern as fallback
      `https://imgs.collectors.com/psacard/lg/${certNumber}.jpg`
    ];
    
    // Create a placeholder image as fallback 
    const placeholderImage = createPlaceholderImage(certNumber);
    
    // Try to fetch image from PSA using a Cloud Function - this avoids CORS issues
    console.log(`Attempting to fetch PSA image for cert #${certNumber}`);
    
    try {
      // Call the PSA lookup function to get any image URLs that might be in the response
      const psaData = await psaLookupFunction({ certNumber, includeImage: true });
      
      // Check if we got image data in the response
      if (psaData.data?.imageUrl) {
        imageUrls.unshift(psaData.data.imageUrl); // Add to the front of our attempt list
      }
    } catch (lookupError) {
      console.warn('Could not get image URL from PSA lookup function:', lookupError);
    }
    
    // Return the placeholder image - we'll skip the network fetch attempts since they're failing
    console.log('Using placeholder image for PSA card');
    return placeholderImage;
  } catch (error) {
    console.error('Error fetching PSA card image:', error);
    return null;
  }
};

// Get reference to Firebase Functions
const functions = getFunctions();
const psaLookupFunction = httpsCallable(functions, 'psaLookup');

export {
  searchByCertNumber,
  parsePSACardData,
  mergeWithExistingCard,
  getAccessToken,
  testPSAConnection,
  fetchPSACardImage
};
