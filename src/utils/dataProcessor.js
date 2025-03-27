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
 * Parse multiple CSV files and combine their data
 * @param {File[]} files - The CSV files to parse
 * @returns {Promise<Array>} The combined parsed data
 */
export const parseMultipleCSVFiles = async (files) => {
  const results = [];
  const errors = [];
  
  // Process each file
  for (const file of files) {
    try {
      const data = await parseCSVFile(file);
      results.push(...data);
    } catch (error) {
      errors.push({ file: file.name, error });
    }
  }
  
  if (errors.length > 0 && results.length === 0) {
    throw new Error(`Failed to parse CSV files: ${errors.map(e => `${e.file}: ${e.error}`).join(', ')}`);
  }
  
  return results;
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
  
  if (importMode === 'priceUpdate') {
    // For price updates, only update existing cards
    return existingCardsCopy.map(card => {
      const importedCard = importedData.find(ic => 
        ic['Slab Serial #']?.toString() === card.slabSerial?.toString()
      );

      if (importedCard) {
        const newValueUSD = parseFloat(importedCard['Current Value']) || 0;
        const newValueAUD = Number((newValueUSD * exchangeRate).toFixed(2));
        
        return {
          ...card,
          currentValueUSD: newValueUSD,
          currentValueAUD: newValueAUD,
          potentialProfit: Number((newValueAUD - (card.investmentAUD || 0)).toFixed(2))
        };
      }
      return card;
    });
  }

  // For base data import, process each imported card
  const processedCards = importedData.map(importedCard => {
    const slabSerial = importedCard['Slab Serial #']?.toString();
    if (!slabSerial) return null;

    const existingCard = existingCardsMap.get(slabSerial);
    
    if (existingCard) {
      // Convert values from USD to AUD
      const currentValueAUD = Number(convertUsdToAud(
        importedCard['Current Value'] || existingCard.currentValueUSD,
        exchangeRate
      ).toFixed(2));
      
      const investmentAUD = Number(convertUsdToAud(
        importedCard['Investment'] !== undefined ? importedCard['Investment'] : existingCard.investmentAUD,
        exchangeRate
      ).toFixed(2));

      return {
        ...existingCard,
        datePurchased: importedCard['Date Purchased'] || existingCard.datePurchased,
        card: importedCard['Card'] || existingCard.card,
        player: importedCard['Player'] || existingCard.player,
        year: importedCard['Year'] || existingCard.year,
        set: importedCard['Set'] || existingCard.set,
        variation: importedCard['Variation'] || existingCard.variation,
        number: importedCard['Number'] || existingCard.number,
        category: importedCard['Category'] || existingCard.category,
        condition: importedCard['Condition'] || existingCard.condition,
        currentValueUSD: importedCard['Current Value'] || existingCard.currentValueUSD,
        currentValueAUD,
        investmentAUD,
        population: importedCard['Population'] || existingCard.population,
        potentialProfit: Number((currentValueAUD - investmentAUD).toFixed(2))
      };
    }

    // For new cards in base data import
    const currentValueAUD = Number(convertUsdToAud(importedCard['Current Value'] || 0, exchangeRate).toFixed(2));
    const investmentAUD = Number(convertUsdToAud(importedCard['Investment'] || 0, exchangeRate).toFixed(2));

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
      currentValueUSD: importedCard['Current Value'] || 0,
      currentValueAUD,
      investmentAUD,
      potentialProfit: Number((currentValueAUD - investmentAUD).toFixed(2)),
      population: importedCard['Population'] || 0
    };
  }).filter(Boolean);

  // For base data import, merge with existing cards
  return [...processedCards];
};

/**
 * Process imported data across all collections based on Slab Serial #
 * @param {Array} importedData - Data imported from multiple CSV files
 * @param {Object} allCollections - All collections containing cards
 * @param {number} exchangeRate - Current USD to AUD exchange rate
 * @returns {Object} Updated collections object with modified cards
 */
export const processMultipleCollectionsUpdate = (importedData, allCollections, exchangeRate) => {
  // Create a deep copy to avoid mutations
  const allCollectionsCopy = JSON.parse(JSON.stringify(allCollections || {}));
  
  // Create a map of imported data for quick lookup by Slab Serial #
  const importedDataMap = new Map();
  importedData.forEach(item => {
    if (item['Slab Serial #']) {
      importedDataMap.set(item['Slab Serial #'].toString(), item);
    }
  });
  
  // Track all updates for summary
  const updates = {
    totalCards: 0,
    updatedCards: 0,
    collections: {}
  };
  
  // Ignore 'All Cards' collection as it's a virtual collection
  const collectionsToUpdate = { ...allCollectionsCopy };
  if ('All Cards' in collectionsToUpdate) {
    delete collectionsToUpdate['All Cards'];
  }
  
  // Process each collection
  Object.keys(collectionsToUpdate).forEach(collectionName => {
    const collection = collectionsToUpdate[collectionName];
    
    // Skip if not an array
    if (!Array.isArray(collection)) return;
    
    // Update collection stats
    updates.collections[collectionName] = {
      totalCards: collection.length,
      updatedCards: 0
    };
    
    // Update each card if it exists in the imported data
    const updatedCollection = collection.map(card => {
      if (!card.slabSerial) return card;
      
      const importedCard = importedDataMap.get(card.slabSerial.toString());
      if (importedCard) {
        const newValueUSD = parseFloat(importedCard['Current Value']) || 0;
        const newValueAUD = Number((newValueUSD * exchangeRate).toFixed(2));
        
        updates.updatedCards++;
        updates.collections[collectionName].updatedCards++;
        
        return {
          ...card,
          currentValueUSD: newValueUSD,
          currentValueAUD: newValueAUD,
          potentialProfit: Number((newValueAUD - (card.investmentAUD || 0)).toFixed(2))
        };
      }
      return card;
    });
    
    updates.totalCards += collection.length;
    collectionsToUpdate[collectionName] = updatedCollection;
  });
  
  return {
    collections: collectionsToUpdate,
    stats: updates
  };
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