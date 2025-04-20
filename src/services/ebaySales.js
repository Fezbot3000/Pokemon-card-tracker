import { getFunctions } from 'firebase/functions';

const functions = getFunctions();
// Get Firebase region from the functions instance
const functionRegion = functions.region || 'us-central1';
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'mycardtracker-c8479';

// Direct HTTP endpoint URL for the eBay Marketplace Insights function
const EBAY_MARKETPLACE_INSIGHTS_URL = `https://${functionRegion}-${projectId}.cloudfunctions.net/proxyEbayMarketplaceInsights`;
const EBAY_COMPLETED_URL = `https://${functionRegion}-${projectId}.cloudfunctions.net/proxyEbayCompleted`;

/**
 * Helper function to make POST requests with JSON
 * @param {string} url - The URL to send the request to
 * @param {object} data - The data to send in the body
 * @returns {Promise<object>} The response data
 */
async function postJSON(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Explicitly include origin in custom header to help with CORS debugging
      'X-Client-Origin': window.location.origin
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText || 'Request failed');
  }

  return response.json();
}

/**
 * Fetch completed/sold eBay listings for a card using the backend proxy.
 * @param {object} card - Card details (brand, year, name, number, grade, etc)
 * @returns {Promise<object[]>} Array of eBay sold listings
 * @deprecated Use fetchEbayMarketplaceInsights instead - this uses the old Finding API
 */
export async function fetchEbaySales(card) {
  // Build a search query string from card details
  // --- Simplified Query for Testing Deprecated API ---
  const queryParts = [];
  // if (card.year) queryParts.push(card.year);
  // if (card.brand) queryParts.push(card.brand);
  if (card.name) queryParts.push(card.name);
  // if (card.number) queryParts.push(`#${card.number}`); // Only add number once
  if (card.grade) queryParts.push(card.grade); // Keep grade as it's often crucial

  // Construct a simpler query
  const query = queryParts.join(' ');
  // --- End Simplified Query ---

  // Only log eBay API requests/responses
  console.log('[eBay] Fetching sales for (simplified):', query);
  try {
    // Use direct HTTP fetch instead of httpsCallable
    const result = await postJSON(EBAY_COMPLETED_URL, { query });
    // Only log success with number of items
    const items = result?.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    console.log('[eBay] Success:', items.length, 'items');
    return items;
  } catch (error) {
    console.warn('[eBay] Error:', error.message);
    throw error;
  }
}

/**
 * Fetch eBay sales data using the newer Marketplace Insights API with more precise filtering.
 * @param {object} card - Card details including name, set, grade, grading company, etc.
 * @returns {Promise<object>} Processed sales data including average price
 */
export async function fetchEbayMarketplaceInsights(card) {
  console.log('[eBay Insights] Fetching sales for card:', card.name);
  
  try {
    // Extract and clean the core card name
    let cleanCardName = card.name || '';
    
    // Remove extraneous details to improve search accuracy
    cleanCardName = cleanCardName
      .replace(/\b\d{4}\b/g, '') // Remove year (e.g., "1999")
      .replace(/pokemon/i, '') // Remove "pokemon" keyword
      .replace(/#\d+/g, '') // Remove card number (e.g., "#4")
      .replace(/PSA \d+/i, '') // Remove PSA grading
      .replace(/BGS \d+\.?\d*/i, '') // Remove BGS grading
      .replace(/CGC \d+\.?\d*/i, '') // Remove CGC grading
      .trim();
      
    // Extract set name cleanly
    let setName = card.set || card.setName || '';
    // Remove "Pokemon" from the set name for better compatibility
    setName = setName.replace(/pok[eé]mon\s*/i, '').trim();
    
    // Extract grading company
    let gradingCompany = card.gradingCompany || '';
    if (!gradingCompany && card.condition) {
      // Try to extract grading company from condition
      if (card.condition.match(/\bPSA\b/i)) {
        gradingCompany = 'PSA';
      } else if (card.condition.match(/\bBGS\b/i)) {
        gradingCompany = 'BGS';
      } else if (card.condition.match(/\bCGC\b/i)) {
        gradingCompany = 'CGC';
      }
    }
    
    // Extract grade value
    let grade = card.grade || '';
    if (!grade && card.condition) {
      // Try to extract grade from condition if card.grade is empty
      const gradeMatch = card.condition.match(/\b(PSA|BGS|CGC)\s+(\d+\.?\d*)\b/i);
      if (gradeMatch) {
        // If we found both company and grade, extract the grade (second capture group)
        grade = gradeMatch[2];
      } else {
        // Try matching just a number
        const numberMatch = card.condition.match(/\b(\d+\.?\d*)\b/);
        if (numberMatch) {
          grade = numberMatch[1];
        }
      }
    }
    
    // Build the payload with clean data
    const payload = {
      cardName: cleanCardName,
      setName: setName,
      condition: card.condition || '',
      gradingCompany: gradingCompany,
      grade: grade
    };
    
    console.log('[eBay Insights] Refined request payload:', payload);
    
    // Use direct HTTP fetch instead of httpsCallable
    const result = await postJSON(EBAY_MARKETPLACE_INSIGHTS_URL, payload);
    
    console.log(`[eBay Insights] Success: ${result.salesData.length} items, avg price: $${result.averagePrice} AUD`);
    return result;
  } catch (error) {
    console.warn('[eBay Insights] Error:', error.message);
    throw error;
  }
}
