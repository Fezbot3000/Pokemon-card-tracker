import Papa from 'papaparse';

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
 * @param {Object} options - Import options
 * @returns {Array} Processed card data
 */
export const processImportedData = (importedData, existingCards, options = {}) => {
  // Default options
  const {
    fillMissingFields = true,
    updateExistingValues = true,
    importMode = 'priceUpdate'
  } = options;
  
  // Convert a deep copy to avoid mutations
  const existingCardsCopy = JSON.parse(JSON.stringify(existingCards || []));
  const existingCardsMap = new Map();
  
  // Create a map of existing cards using Slab Serial # as key
  existingCardsCopy.forEach(card => {
    if (card.slabSerial) {
      existingCardsMap.set(card.slabSerial.toString(), card);
    }
  });
  
  // Helper function to convert value to AUD
  const convertToAUD = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Number((parseFloat(value)).toFixed(2));
  };
  
  // Update existing cards with imported data
  return existingCardsCopy.map(card => {
    const importedCard = importedData.find(ic => 
      ic['Slab Serial #']?.toString() === card.slabSerial?.toString()
    );

    if (importedCard) {
      // Start with the existing card data
      const updatedCard = { ...card };
      
      // Process financial values
      if (importedCard['Current Value'] !== undefined) {
        const newValueInSourceCurrency = parseFloat(importedCard['Current Value']) || 0;
        
        // Only update if we should update existing values or the field is empty
        if (updateExistingValues || !updatedCard.currentValueAUD) {
          updatedCard.currentValueAUD = convertToAUD(newValueInSourceCurrency);
          
          // Update potential profit
          updatedCard.potentialProfit = Number((updatedCard.currentValueAUD - (updatedCard.investmentAUD || 0)).toFixed(2));
        }
      }
      
      // Only fill in missing fields if enabled
      if (fillMissingFields) {
        // Map CSV columns to card properties
        const fieldMappings = {
          'Card': 'card',
          'Player': 'player',
          'Set': 'set',
          'Year': 'year',
          'Category': 'category',
          'Condition': 'condition',
          'Population': 'population',
          'Date Purchased': 'datePurchased'
        };
        
        // Update each field if it exists in the imported data
        Object.entries(fieldMappings).forEach(([csvField, cardField]) => {
          if (importedCard[csvField] !== undefined && importedCard[csvField] !== null) {
            // Only update if we should update existing values or the field is empty
            if (updateExistingValues || !updatedCard[cardField]) {
              updatedCard[cardField] = importedCard[csvField];
            }
          }
        });
      }
      
      return updatedCard;
    }
    return card;
  });
};

/**
 * Process imported data across all collections based on Slab Serial #
 * @param {Array} importedData - Data imported from multiple CSV files
 * @param {Object} allCollections - All collections containing cards
 * @param {Object} options - Import options
 * @returns {Object} Updated collections object with modified cards
 */
export const processMultipleCollectionsUpdate = (importedData, allCollections, options = {}) => {
  // Create a map of imported data for faster lookup
  const importedDataMap = new Map();
  importedData.forEach(item => {
    if (item['Slab Serial #']) {
      importedDataMap.set(item['Slab Serial #'].toString(), item);
    }
  });
  
  // Default options
  const {
    fillMissingFields = true,
    updateExistingValues = true
  } = options;
  
  // Helper function to convert value to AUD
  const convertToAUD = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Number((parseFloat(value)).toFixed(2));
  };
  
  // Track updates for reporting
  const updates = {
    updatedCards: 0,
    totalCards: 0,
    collections: {}
  };
  
  // Create a copy of collections to update
  const collectionsToUpdate = { ...allCollections };
  
  // Process each collection
  Object.entries(allCollections).forEach(([collectionName, collection]) => {
    // Skip if not an array
    if (!Array.isArray(collection)) return;
    
    // Update collection stats
    updates.collections[collectionName] = {
      totalCards: collection.length,
      updatedCards: 0,
      fieldsUpdated: {
        price: 0,
        cardName: 0,
        player: 0,
        set: 0,
        year: 0,
        category: 0,
        condition: 0,
        population: 0,
        datePurchased: 0
      }
    };
    
    // Update each card if it exists in the imported data
    const updatedCollection = collection.map(card => {
      if (!card.slabSerial) return card;
      
      const importedCard = importedDataMap.get(card.slabSerial.toString());
      if (importedCard) {
        // Start with the existing card data
        const updatedCard = { ...card };
        let cardWasUpdated = false;
        
        // Process financial values
        if (importedCard['Current Value'] !== undefined) {
          const newValueInSourceCurrency = parseFloat(importedCard['Current Value']) || 0;
          
          // Only update if we should update existing values or the field is empty
          if (updateExistingValues || !updatedCard.currentValueAUD) {
            updatedCard.currentValueAUD = convertToAUD(newValueInSourceCurrency);
            
            // Update potential profit
            updatedCard.potentialProfit = Number((updatedCard.currentValueAUD - (updatedCard.investmentAUD || 0)).toFixed(2));
            
            cardWasUpdated = true;
            updates.collections[collectionName].fieldsUpdated.price++;
          }
        }
        
        // Only fill in missing fields if enabled
        if (fillMissingFields) {
          // Map CSV columns to card properties and stats tracking
          const fieldMappings = [
            { csvField: 'Card', cardField: 'card', statField: 'cardName' },
            { csvField: 'Player', cardField: 'player', statField: 'player' },
            { csvField: 'Set', cardField: 'set', statField: 'set' },
            { csvField: 'Year', cardField: 'year', statField: 'year' },
            { csvField: 'Category', cardField: 'category', statField: 'category' },
            { csvField: 'Condition', cardField: 'condition', statField: 'condition' },
            { csvField: 'Population', cardField: 'population', statField: 'population' },
            { csvField: 'Date Purchased', cardField: 'datePurchased', statField: 'datePurchased' }
          ];
          
          // Update each field if it exists in the imported data
          fieldMappings.forEach(({ csvField, cardField, statField }) => {
            if (importedCard[csvField] !== undefined && importedCard[csvField] !== null) {
              // Only update if we should update existing values or the field is empty
              if (updateExistingValues || !updatedCard[cardField]) {
                updatedCard[cardField] = importedCard[csvField];
                cardWasUpdated = true;
                updates.collections[collectionName].fieldsUpdated[statField]++;
              }
            }
          });
        }
        
        if (cardWasUpdated) {
          updates.updatedCards++;
          updates.collections[collectionName].updatedCards++;
        }
        
        return updatedCard;
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
  const requiredColumns = ['Slab Serial #'];
  
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
