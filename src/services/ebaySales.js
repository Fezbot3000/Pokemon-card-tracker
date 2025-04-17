import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const proxyEbayCompleted = httpsCallable(functions, 'proxyEbayCompleted');

/**
 * Fetch completed/sold eBay listings for a card using the backend proxy.
 * @param {object} card - Card details (brand, year, name, number, grade, etc)
 * @returns {Promise<object[]>} Array of eBay sold listings
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
    const result = await proxyEbayCompleted({ query });
    // Only log success with number of items
    const items = result?.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    console.log('[eBay] Success:', items.length, 'items');
    return items;
  } catch (error) {
    console.warn('[eBay] Error:', error.message);
    throw error;
  }
}
