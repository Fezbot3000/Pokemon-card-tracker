const fs = require('fs');
const path = require('path');

// Path to the exported database file
const inputFilePath = 'C:/Users/Matth/OneDrive/Desktop/mycardtracker_data_6sZLdZ0vUCcGpMpq5TeIcTTUe0u1_2025-05-20 (7)/personal_data_normalized.json';
const outputFilePath = 'C:/Users/Matth/OneDrive/Desktop/mycardtracker_data_6sZLdZ0vUCcGpMpq5TeIcTTUe0u1_2025-05-20 (7)/personal_data_normalized_v2.json';

// Stats tracking
const stats = {
  fieldsRemoved: {
    cardName: 0,
    name: 0,
    player: 0,
    setName: 0,
    collection: 0,
    gradeCompany: 0,
    imagePath: 0
  },
  fieldsStandardized: {
    card: 0,
    dates: {
      parsed: 0,
      failed: 0,
      dateFields: {}
    }
  }
};

// Utility function to normalize card data
function normalizeCardData(card) {
  if (!card) return card;
  
  // Create a normalized copy
  const normalized = {...card};
  
  // Ensure numeric fields are numbers
  const numericFields = ['population', 'populationHigher', 'investmentAUD', 'investmentUSD', 
    'currentValueAUD', 'currentValueUSD', 'originalInvestmentAmount', 'originalCurrentValueAmount', 
    'potentialProfit', 'quantity', 'year', 'number'];
  
  numericFields.forEach(field => {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      if (typeof normalized[field] === 'string' && normalized[field].trim() !== '') {
        normalized[field] = parseFloat(normalized[field]);
      }
    }
  });
  
  // Standardize name fields - keep only card
  // First ensure card field exists by copying from other fields if needed
  if (!normalized.card) {
    normalized.card = normalized.cardName || normalized.player || normalized.name || '';
    if (normalized.card) {
      stats.fieldsStandardized.card++;
    }
  }
  
  // Extract just the card name from the full description
  if (normalized.card && typeof normalized.card === 'string') {
    // Check if the card field contains a full description (e.g., "1999 Pokemon Fossil Muk 1st Edition #28 PSA 10")
    if (normalized.card.includes('#') || normalized.card.includes('PSA') || 
        normalized.card.includes('Pokemon') || normalized.card.match(/\d{4}/)) {
      // Extract just the card name - typically the last part after spaces, before any "#" or "PSA"
      const cardParts = normalized.card.split(' ');
      let cardName = '';
      
      // Try to find the player/card name in the string
      if (normalized.player && normalized.card.includes(normalized.player)) {
        cardName = normalized.player;
      } else {
        // Look for the card name - typically after the set name and before any "#" or grade
        for (let i = 0; i < cardParts.length; i++) {
          if (cardParts[i].match(/^#\d+$/) || cardParts[i] === 'PSA' || cardParts[i] === 'BGS') {
            // Found a marker, use the previous part as the card name
            if (i > 0) {
              cardName = cardParts[i-1];
              break;
            }
          }
        }
        
        // If we couldn't find it using markers, use the player field or just take the last word
        if (!cardName && normalized.player) {
          cardName = normalized.player;
        } else if (!cardName) {
          // Just use the last word that's not a number or grade
          for (let i = cardParts.length - 1; i >= 0; i--) {
            if (!cardParts[i].match(/^\d+$/) && !['PSA', 'BGS', 'GMA'].includes(cardParts[i])) {
              cardName = cardParts[i];
              break;
            }
          }
        }
      }
      
      // Clean up the card name - remove any trailing punctuation
      if (cardName) {
        cardName = cardName.replace(/[^\w\s]/g, '').trim();
        normalized.card = cardName;
        stats.fieldsStandardized.card++;
      }
    }
  }
  
  // Standardize set fields - keep only set
  if (normalized.setName && !normalized.set) {
    normalized.set = normalized.setName;
  } else if (normalized.setName && normalized.set && normalized.setName !== normalized.set) {
    // If both exist and are different, keep the more detailed one
    if (normalized.setName.length > normalized.set.length) {
      normalized.set = normalized.setName;
    }
  }
  
  // Ensure collection fields are consistent - keep only collectionId
  if (!normalized.collectionId && normalized.collection) {
    normalized.collectionId = normalized.collection;
  }
  
  // Ensure consistent grading company - keep only gradingCompany
  if (!normalized.gradingCompany && normalized.gradeCompany) {
    normalized.gradingCompany = normalized.gradeCompany;
  }
  
  // Standardize date formats
  const dateFields = ['datePurchased', 'dateSold', 'soldDate', 'createdAt', 'updatedAt', 'date'];
  
  dateFields.forEach(field => {
    if (normalized[field] && typeof normalized[field] === 'string') {
      if (!stats.fieldsStandardized.dates.dateFields[field]) {
        stats.fieldsStandardized.dates.dateFields[field] = { parsed: 0, failed: 0 };
      }
      
      try {
        // Try to parse the date
        let date;
        
        // Check for MM/DD/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized[field])) {
          const parts = normalized[field].split('/');
          date = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
        } 
        // Check for DD/MM/YYYY format
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized[field])) {
          const parts = normalized[field].split('/');
          date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        }
        // Check for MM-DD-YYYY format
        else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(normalized[field])) {
          const parts = normalized[field].split('-');
          date = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
        }
        // Check for DD-MM-YYYY format
        else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(normalized[field])) {
          const parts = normalized[field].split('-');
          date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        }
        // Check for YYYY-MM-DD format (already correct)
        else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized[field])) {
          const parts = normalized[field].split('-');
          date = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
        }
        // Try direct parsing as a fallback
        else {
          date = new Date(normalized[field]);
        }
        
        if (date instanceof Date && !isNaN(date)) {
          // Format as YYYY-MM-DD
          const isoDate = date.toISOString().split('T')[0];
          normalized[field] = isoDate;
          stats.fieldsStandardized.dates.parsed++;
          stats.fieldsStandardized.dates.dateFields[field].parsed++;
        } else {
          // Couldn't parse the date, flag it
          normalized[`${field}_unparseable`] = normalized[field];
          stats.fieldsStandardized.dates.failed++;
          stats.fieldsStandardized.dates.dateFields[field].failed++;
        }
      } catch (error) {
        // Error parsing date, flag it
        normalized[`${field}_unparseable`] = normalized[field];
        stats.fieldsStandardized.dates.failed++;
        stats.fieldsStandardized.dates.dateFields[field].failed++;
      }
    }
  });
  
  // Ensure image fields are consistent - keep only imageUrl
  if (normalized.imagePath && !normalized.imageUrl) {
    normalized.imageUrl = normalized.imagePath;
  }
  
  // Ensure category is lowercase
  if (normalized.category && typeof normalized.category === 'string') {
    normalized.category = normalized.category.toLowerCase();
  }
  
  // Remove redundant fields after copying their values
  if (normalized.cardName) {
    delete normalized.cardName;
    stats.fieldsRemoved.cardName++;
  }
  
  if (normalized.name) {
    delete normalized.name;
    stats.fieldsRemoved.name++;
  }
  
  if (normalized.player) {
    delete normalized.player;
    stats.fieldsRemoved.player++;
  }
  
  if (normalized.setName) {
    delete normalized.setName;
    stats.fieldsRemoved.setName++;
  }
  
  if (normalized.collection) {
    delete normalized.collection;
    stats.fieldsRemoved.collection++;
  }
  
  if (normalized.gradeCompany) {
    delete normalized.gradeCompany;
    stats.fieldsRemoved.gradeCompany++;
  }
  
  if (normalized.imagePath) {
    delete normalized.imagePath;
    stats.fieldsRemoved.imagePath++;
  }
  
  return normalized;
}

// Function to normalize sold item data
function normalizeSoldItemData(soldItem) {
  if (!soldItem) return soldItem;
  
  const normalized = normalizeCardData(soldItem); // Apply card normalization first
  
  // Additional sold item specific normalizations
  const soldNumericFields = ['finalValueAUD', 'finalProfitAUD'];
  
  soldNumericFields.forEach(field => {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      if (typeof normalized[field] === 'string' && normalized[field].trim() !== '') {
        normalized[field] = parseFloat(normalized[field]);
      }
    }
  });
  
  // Ensure soldDate and dateSold are consistent
  if (normalized.soldDate && !normalized.dateSold) {
    normalized.dateSold = normalized.soldDate;
  } else if (!normalized.soldDate && normalized.dateSold) {
    normalized.soldDate = normalized.dateSold;
  }
  
  return normalized;
}

// Function to normalize the entire database
function normalizeDatabase(data) {
  if (!data) return data;
  
  const normalized = {...data};
  
  // Normalize collections
  if (normalized.collections) {
    Object.keys(normalized.collections).forEach(collectionKey => {
      if (Array.isArray(normalized.collections[collectionKey])) {
        normalized.collections[collectionKey] = normalized.collections[collectionKey].map(card => normalizeCardData(card));
      }
    });
  }
  
  // Normalize sold items
  if (normalized.soldItems && Array.isArray(normalized.soldItems)) {
    normalized.soldItems = normalized.soldItems.map(item => normalizeSoldItemData(item));
  }
  
  // Normalize purchase invoices if they exist
  if (normalized.purchaseInvoices && Array.isArray(normalized.purchaseInvoices)) {
    normalized.purchaseInvoices = normalized.purchaseInvoices.map(invoice => {
      const normalizedInvoice = {...invoice};
      
      // Normalize cards within invoices
      if (normalizedInvoice.cards && Array.isArray(normalizedInvoice.cards)) {
        normalizedInvoice.cards = normalizedInvoice.cards.map(card => normalizeCardData(card));
      }
      
      // Ensure numeric fields are numbers
      if (normalizedInvoice.totalAmount !== undefined && typeof normalizedInvoice.totalAmount === 'string') {
        normalizedInvoice.totalAmount = parseFloat(normalizedInvoice.totalAmount);
      }
      
      if (normalizedInvoice.cardCount !== undefined && typeof normalizedInvoice.cardCount === 'string') {
        normalizedInvoice.cardCount = parseInt(normalizedInvoice.cardCount, 10);
      }
      
      return normalizedInvoice;
    });
  }
  
  return normalized;
}

// Main function to process the database file
async function processDatabase() {
  try {
    console.log(`Reading database file from: ${inputFilePath}`);
    const data = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));
    
    console.log('Normalizing database...');
    const normalizedData = normalizeDatabase(data);
    
    console.log(`Writing normalized database to: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, JSON.stringify(normalizedData, null, 2), 'utf8');
    
    console.log('Database normalization complete!');
    
    // Generate statistics report
    console.log('\n--- Normalization Statistics ---');
    console.log('\nFields Removed:');
    Object.keys(stats.fieldsRemoved).forEach(field => {
      console.log(`  ${field}: ${stats.fieldsRemoved[field]} occurrences`);
    });
    
    console.log('\nFields Standardized:');
    console.log(`  card: ${stats.fieldsStandardized.card} occurrences`);
    
    console.log('\nDate Parsing:');
    console.log(`  Successfully parsed: ${stats.fieldsStandardized.dates.parsed} dates`);
    console.log(`  Failed to parse: ${stats.fieldsStandardized.dates.failed} dates`);
    
    console.log('\nDate Fields Breakdown:');
    Object.keys(stats.fieldsStandardized.dates.dateFields).forEach(field => {
      const fieldStats = stats.fieldsStandardized.dates.dateFields[field];
      console.log(`  ${field}: ${fieldStats.parsed} parsed, ${fieldStats.failed} failed`);
    });
    
    // Write statistics to a file
    const statsFilePath = path.join(path.dirname(outputFilePath), 'normalization_stats.json');
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
    console.log(`\nDetailed statistics written to: ${statsFilePath}`);
    
  } catch (error) {
    console.error('Error processing database:', error);
  }
}

// Execute the process
processDatabase();
