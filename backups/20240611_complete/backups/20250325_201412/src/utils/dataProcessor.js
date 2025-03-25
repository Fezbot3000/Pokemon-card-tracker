import Papa from 'papaparse';
import { convertUsdToAud } from './currencyAPI';

/**
 * Parse a CSV file
 * @param {File} file - The CSV file to parse
 * @returns {Promise<Array>} The parsed data
 */
export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Convert numeric values to numbers
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(results.errors);
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

/**
 * Process imported data, merging with existing data and updating values
 * @param {Array} importedData - Data imported from CSV
 * @param {Array} existingCards - Existing card data for the current collection
 * @param {number} exchangeRate - Current USD to AUD exchange rate
 * @param {string} importMode - Mode of import: 'priceUpdate' or 'baseData'
 * @returns {Array} Processed card data
 */
export const processImportedData = (importedData, existingCards, exchangeRate, importMode = 'priceUpdate') => {
  // Convert a deep copy to avoid mutations
  const existingCardsCopy = JSON.parse(JSON.stringify(existingCards || []));
  const existingCardsMap = new Map();
  
  // Create a map of existing cards using Slab Serial # as key
  existingCardsCopy.forEach(card => {
    if (card.slabSerial) {
      existingCardsMap.set(card.slabSerial.toString(), card);
    }
  });
  
  // Process each imported card
  const processedCards = importedData.map(importedCard => {
    // Use Slab Serial # as unique identifier
    const slabSerial = importedCard['Slab Serial #']?.toString();
    
    if (!slabSerial) return null; // Skip cards without serial numbers
    
    // Check if card already exists in our data
    const existingCard = existingCardsMap.get(slabSerial);
    
    if (existingCard) {
      // Update existing card based on import mode
      if (importMode === 'priceUpdate') {
        // Only update price information
        return {
          ...existingCard,
          currentValueUSD: importedCard['Current Value'] || existingCard.currentValueUSD,
          currentValueAUD: Number(convertUsdToAud(importedCard['Current Value'] || existingCard.currentValueUSD, exchangeRate).toFixed(2)),
          potentialProfit: calculateProfit(
            Number(convertUsdToAud(importedCard['Current Value'] || existingCard.currentValueUSD, exchangeRate).toFixed(2)),
            existingCard.investmentAUD || 0
          ),
        };
      } else {
        // Convert Investment from USD to AUD
        const investmentAUD = Number(convertUsdToAud(
          importedCard['Investment'] !== undefined ? importedCard['Investment'] : existingCard.investmentAUD,
          exchangeRate
        ).toFixed(2));
        
        // Convert Current Value from USD to AUD
        const currentValueAUD = Number(convertUsdToAud(
          importedCard['Current Value'] || existingCard.currentValueUSD,
          exchangeRate
        ).toFixed(2));
        
        // Full base data update including investment
        return {
          ...existingCard,
          datePurchased: importedCard['Date Purchased'] || existingCard.datePurchased,
          quantity: importedCard['Quantity'] || existingCard.quantity,
          card: importedCard['Card'] || existingCard.card,
          player: importedCard['Player'] || existingCard.player,
          year: importedCard['Year'] || existingCard.year,
          set: importedCard['Set'] || existingCard.set,
          variation: importedCard['Variation'] || existingCard.variation,
          number: importedCard['Number'] || existingCard.number,
          category: importedCard['Category'] || existingCard.category,
          condition: importedCard['Condition'] || existingCard.condition,
          currentValueUSD: importedCard['Current Value'] || existingCard.currentValueUSD,
          currentValueAUD: currentValueAUD,
          investmentAUD: investmentAUD,
          population: importedCard['Population'] || existingCard.population,
          potentialProfit: calculateProfit(currentValueAUD, investmentAUD),
        };
      }
    } else {
      // For new cards
      // Convert Current Value from USD to AUD
      const currentValueAUD = Number(convertUsdToAud(importedCard['Current Value'] || 0, exchangeRate).toFixed(2));
      
      // Convert Investment from USD to AUD if in baseData mode
      const investmentAUD = importMode === 'baseData' && importedCard['Investment'] !== undefined ? 
        Number(convertUsdToAud(importedCard['Investment'], exchangeRate).toFixed(2)) : 0;
      
      return {
        id: slabSerial,
        slabSerial: slabSerial,
        datePurchased: importedCard['Date Purchased'] || 'Unknown',
        card: importedCard['Card'] || 'Unknown Card',
        player: importedCard['Player'] || '',
        year: importedCard['Year'] || '',
        set: importedCard['Set'] || '',
        variation: importedCard['Variation'] || '',
        number: importedCard['Number'] || '',
        category: importedCard['Category'] || '',
        condition: importedCard['Condition'] || '',
        quantity: importedCard['Quantity'] || 1,
        investmentAUD: investmentAUD,
        currentValueUSD: importedCard['Current Value'] || 0,
        currentValueAUD: currentValueAUD,
        potentialProfit: calculateProfit(currentValueAUD, investmentAUD),
        population: importedCard['Population'] || 0,
      };
    }
  }).filter(Boolean); // Remove null entries
  
  // Merge existing cards that weren't in the import with the processed cards
  const mergedCards = [...processedCards];
  
  // Add any existing cards that weren't in the import
  existingCardsCopy.forEach(card => {
    if (card.slabSerial && !processedCards.some(pc => pc.slabSerial === card.slabSerial)) {
      mergedCards.push(card);
    }
  });
  
  return mergedCards;
};

/**
 * Calculate profit based on current value and investment
 * @param {number} currentValue - Current value in AUD
 * @param {number} investment - Investment amount in AUD
 * @returns {number} Calculated profit
 */
const calculateProfit = (currentValue, investment) => {
  return Number((currentValue - investment).toFixed(2));
};

/**
 * Validate the CSV data structure
 * @param {Array} data - The parsed CSV data
 * @param {string} importMode - Mode of import: 'priceUpdate' or 'baseData'
 * @returns {Object} Validation result with success flag and error message
 */
export const validateCSVStructure = (data, importMode = 'priceUpdate') => {
  if (!data || data.length === 0) {
    return { 
      success: false, 
      error: "CSV file appears to be empty" 
    };
  }
  
  // Define required columns based on import mode
  const requiredColumns = importMode === 'priceUpdate' ? 
    ['Slab Serial #', 'Current Value'] : 
    ['Slab Serial #', 'Date Purchased', 'Quantity', 'Current Value', 'Investment'];
  
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    return {
      success: false,
      error: `CSV is missing required columns: ${missingColumns.join(', ')}`
    };
  }
  
  return { success: true };
};

/**
 * Calculate financial metrics for cards
 * @param {Array} cards - Array of card objects
 * @returns {Object} Financial metrics
 */
export const calculateCardMetrics = (cards) => {
  const totalInvestment = Number(cards.reduce((sum, card) => sum + (card.investmentAUD || 0), 0).toFixed(2));
  const totalValue = Number(cards.reduce((sum, card) => sum + (card.currentValueAUD || 0), 0).toFixed(2));
  const totalProfit = Number((totalValue - totalInvestment).toFixed(2));
  const profitPercentage = Number((totalInvestment > 0 ? (totalProfit / totalInvestment * 100) : 0).toFixed(2));
  
  // Count cards with profit vs loss
  const profitableCards = cards.filter(card => 
    (card.currentValueAUD || 0) > (card.investmentAUD || 0)
  ).length;
  
  const unprofitableCards = cards.filter(card => 
    (card.currentValueAUD || 0) < (card.investmentAUD || 0)
  ).length;
  
  // Identify best and worst performing cards
  const sortedByProfit = [...cards].sort((a, b) => {
    const profitA = (a.currentValueAUD || 0) - (a.investmentAUD || 0);
    const profitB = (b.currentValueAUD || 0) - (b.investmentAUD || 0);
    return profitB - profitA;
  });
  
  const bestPerformer = sortedByProfit.length > 0 ? sortedByProfit[0] : null;
  const worstPerformer = sortedByProfit.length > 0 ? sortedByProfit[sortedByProfit.length - 1] : null;
  
  return {
    totalInvestment,
    totalValue,
    totalProfit,
    profitPercentage,
    profitableCards,
    unprofitableCards,
    bestPerformer,
    worstPerformer,
    totalCards: cards.length
  };
};