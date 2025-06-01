# Import/Export & Data Management System

## Overview

The Pokemon Card Tracker features comprehensive data management capabilities including CSV import/export, data reset utilities, security verification tools, and personal data export for GDPR compliance. The system handles multiple data formats and provides robust error handling and progress tracking.

## Import System

### CSV Import Architecture

**Import Modes:**
1. **Price Update Mode**: Updates existing card values without modifying other data
2. **Base Data Import**: Full card data import for new collections

**Core Components:**
- `ImportModal.js`: User interface for file selection and import options
- `CSVImporter.js`: Drag-and-drop file handler
- `dataProcessor.js`: CSV parsing and data validation logic

### CSV Import Implementation

**File Processing Pipeline:**
```javascript
// Multi-file CSV import with validation
export const parseMultipleCSVFiles = async (files) => {
  const results = [];
  const errors = [];
  
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
```

**Data Validation:**
```javascript
export const validateCSVStructure = (data, importMode = 'priceUpdate') => {
  if (!data || data.length === 0) {
    return { 
      success: false, 
      error: "CSV file appears to be empty" 
    };
  }
  
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
```

### Import Features

#### 1. Price Update Import
**Purpose:** Update card values across collections without affecting other data

**Key Features:**
- Multi-file CSV processing
- Cross-collection card matching via Slab Serial #
- Currency conversion during import
- Progress tracking and detailed logs
- Rollback capability on errors

**Implementation:**
```javascript
export const processMultipleCollectionsUpdate = (importedData, allCollections, options = {}) => {
  const importedDataMap = new Map();
  importedData.forEach(item => {
    if (item['Slab Serial #']) {
      importedDataMap.set(item['Slab Serial #'], item);
    }
  });

  const collectionsToUpdate = {};
  const updates = {
    totalCards: 0,
    updatedCards: 0,
    collections: {}
  };

  // Process each collection
  Object.entries(allCollections).forEach(([collectionName, collection]) => {
    const updatedCollection = collection.map(card => {
      const importedCard = importedDataMap.get(card.slabSerial);
      if (importedCard) {
        // Update card values with imported data
        return updateCardValues(card, importedCard, options);
      }
      return card;
    });
    
    collectionsToUpdate[collectionName] = updatedCollection;
  });

  return {
    collections: collectionsToUpdate,
    stats: updates
  };
};
```

#### 2. Base Data Import
**Purpose:** Import complete card datasets for new collections

**Features:**
- Full card data import
- Automatic field mapping
- Duplicate detection
- Data validation
- Progress indicators

#### 3. Import Options

**Currency Handling:**
- Source currency selection (USD, AUD, etc.)
- Automatic conversion to user's preferred currency
- Exchange rate application during import

**Data Merge Options:**
- Fill missing fields from import data
- Update existing values option
- Preserve existing data where applicable

## Export System

### Export Architecture

**Export Types:**
1. **Personal Data Export**: GDPR-compliant data package
2. **Collection Export**: Individual collection data
3. **Full Data Export**: Complete user dataset
4. **Admin Export**: System-wide data (admin only)

### Export Implementation

**Core Export Manager:**
```javascript
export const exportDataManager = {
  async exportData(options = {}, user, selectedCollection) {
    return new Promise(async (resolve, reject) => {
      try {
        const { personalDataExport = false, returnBlob = false } = options;
        
        if (personalDataExport) {
          // GDPR-compliant personal data export
          return await this.generatePersonalDataExport(user);
        }
        
        // Standard data export
        return await this.generateStandardExport(user, selectedCollection);
      } catch (error) {
        logger.error('Export failed:', error);
        reject(error);
      }
    });
  }
};
```

### Export Features

#### 1. ZIP File Generation
**Multi-format export package:**
- JSON data files
- CSV spreadsheets
- Card images (if available)
- Metadata and documentation

**Implementation:**
```javascript
const zip = new JSZip();

// Add user data
zip.file('user-profile.json', JSON.stringify(userData, null, 2));
zip.file('collections.json', JSON.stringify(collectionsData, null, 2));
zip.file('sold-items.json', JSON.stringify(soldItems, null, 2));

// Add CSV versions
zip.file('collections.csv', generateCSV(collectionsData));
zip.file('sold-items.csv', generateCSV(soldItems));

// Add card images if available
if (options.includeImages) {
  await addCardImages(zip, cardData);
}

// Generate and download
const content = await zip.generateAsync({ type: 'blob' });
downloadBlob(content, filename);
```

#### 2. Personal Data Export (GDPR)
**Compliance Features:**
- Complete user data package
- Human-readable format
- Data source documentation
- Privacy information
- Download audit trail

**Data Categories:**
- User profile information
- Collection data
- Transaction history
- Preferences and settings
- Usage analytics (anonymized)

#### 3. Progress Tracking
**Real-time Export Progress:**
```javascript
const updateProgress = (message, percentage) => {
  setExportProgress({ message, percentage });
  console.log(`Export Progress: ${message} (${percentage}%)`);
};

// Usage during export
updateProgress('Gathering user data...', 10);
updateProgress('Processing collections...', 30);
updateProgress('Generating CSV files...', 60);
updateProgress('Creating ZIP archive...', 90);
updateProgress('Export complete!', 100);
```

## Data Management Tools

### Security Verification

**Data Linkage Audit:**
```javascript
const handleVerifySecurity = async () => {
  try {
    if (!currentUser?.uid) {
      toast.error('You must be logged in to verify security');
      return;
    }
    
    setIsAnalyzing(true);
    const securityStatus = {
      userId: currentUser.uid,
      collections: {},
      orphanedItems: [],
      summary: ''
    };
    
    // Verify all data belongs to current user
    const collections = await db.getCollections();
    Object.entries(collections).forEach(([name, cards]) => {
      const userCards = cards.filter(card => card.userId === currentUser.uid);
      const orphaned = cards.filter(card => !card.userId || card.userId !== currentUser.uid);
      
      securityStatus.collections[name] = {
        total: cards.length,
        userOwned: userCards.length,
        orphaned: orphaned.length
      };
      
      if (orphaned.length > 0) {
        securityStatus.orphanedItems.push(...orphaned);
      }
    });
    
    return securityStatus;
  } catch (error) {
    logger.error('Security verification failed:', error);
  }
};
```

### Data Reset Manager

**Comprehensive Reset System:**
```javascript
export const dataResetManager = {
  async resetAllData({ user, setCollections, setSelectedCollection }) {
    try {
      toast.loading('Resetting all data...', { duration: 30000, id: 'reset-data' });
      
      // Clear Firestore data
      await this.clearFirestoreData(user.uid);
      
      // Clear local IndexedDB
      await this.clearLocalDatabase();
      
      // Clear localStorage (preserve auth)
      this.clearLocalStorage();
      
      // Reset app state
      this.resetAppState(setCollections, setSelectedCollection);
      
      toast.success('All data has been reset successfully', { id: 'reset-data' });
    } catch (error) {
      logger.error('Error resetting data:', error);
      toast.error('Failed to reset data completely', { id: 'reset-data' });
    }
  }
};
```

**Reset Categories:**
1. **Firestore Data**: User collections, cards, preferences
2. **Local Database**: IndexedDB cached data
3. **localStorage**: Settings and cache (preserving auth)
4. **App State**: In-memory data and UI state

### Cache Management

**Multi-layer Caching System:**
```javascript
class CacheManager {
  constructor() {
    this.cardData = null;
    this.collections = null;
    this.soldItems = null;
    this.imageCache = new Map();
    this.loadingImages = new Set();
    this.viewStates = {
      cardList: null,
      soldItems: null,
      settings: null,
      scrollPositions: {}
    };
  }
  
  // Cache operations
  setCardData(data) {
    this.cardData = data;
    this.initialized = true;
  }
  
  getCollections() {
    return this.collections;
  }
  
  clearAll() {
    // Clear all caches
    this.cardData = null;
    this.collections = null;
    this.soldItems = null;
    this.imageCache.clear();
    this.viewStates = {};
  }
}
```

## Data Processing Utilities

### Field Mapping System

**CSV to Internal Field Mapping:**
```javascript
const fieldMappings = {
  'Slab Serial #': 'slabSerial',
  'Current Value': 'currentValue',
  'Pokemon': 'pokemonName',
  'Set': 'setName',
  'Card Number': 'cardNumber',
  'Grade': 'grade',
  'Purchase Price': 'purchasePrice',
  'Purchase Date': 'purchaseDate'
};
```

**Dynamic Field Processing:**
```javascript
export const processImportedData = (importedData, existingCards, options = {}) => {
  const {
    fillMissingFields = true,
    updateExistingValues = true,
    importMode = 'priceUpdate'
  } = options;
  
  return existingCards.map(card => {
    const importedCard = importedData.find(item => 
      item['Slab Serial #'] === card.slabSerial
    );
    
    if (importedCard) {
      const updatedCard = { ...card };
      
      // Update each field if it exists in imported data
      Object.entries(fieldMappings).forEach(([csvField, cardField]) => {
        if (importedCard[csvField] !== undefined && importedCard[csvField] !== null) {
          if (updateExistingValues || !updatedCard[cardField]) {
            updatedCard[cardField] = importedCard[csvField];
          }
        }
      });
      
      return updatedCard;
    }
    return card;
  });
};
```

### Data Validation

**Import Validation Pipeline:**
1. **File Format Check**: Verify CSV structure and encoding
2. **Required Fields**: Ensure essential columns present
3. **Data Type Validation**: Verify numeric values, dates
4. **Business Logic**: Check for duplicates, invalid ranges
5. **User Permissions**: Verify user owns data being imported

**Error Handling:**
```javascript
const validateImportData = (data, mode) => {
  const errors = [];
  const warnings = [];
  
  data.forEach((row, index) => {
    // Check required fields
    if (!row['Slab Serial #']) {
      errors.push(`Row ${index + 1}: Missing Slab Serial #`);
    }
    
    // Validate numeric fields
    if (row['Current Value'] && isNaN(parseFloat(row['Current Value']))) {
      warnings.push(`Row ${index + 1}: Invalid Current Value`);
    }
    
    // Check data consistency
    if (row['Purchase Price'] && row['Current Value']) {
      const purchasePrice = parseFloat(row['Purchase Price']);
      const currentValue = parseFloat(row['Current Value']);
      
      if (currentValue < 0) {
        warnings.push(`Row ${index + 1}: Negative current value`);
      }
    }
  });
  
  return { errors, warnings };
};
```

## Performance Optimizations

### Batch Processing

**Large Dataset Handling:**
```javascript
const processBatchImport = async (data, batchSize = 100) => {
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
    
    // Update progress
    const progress = Math.round(((i + batch.length) / data.length) * 100);
    updateProgress(`Processing batch ${Math.ceil((i + 1) / batchSize)}...`, progress);
    
    // Allow UI updates between batches
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return results;
};
```

### Memory Management

**Streaming Data Processing:**
- Process large CSV files in chunks
- Clear intermediate data structures
- Monitor memory usage during imports
- Garbage collection hints for large operations

### Progress Tracking

**Real-time User Feedback:**
```javascript
const ImportProgressTracker = {
  updateProgress: (step, percentage, details = '') => {
    setProgress({
      step,
      percentage,
      details,
      timestamp: new Date()
    });
    
    logger.log(`Import Progress: ${step} (${percentage}%) - ${details}`);
  },
  
  logError: (error, context = '') => {
    setErrors(prev => [...prev, { error, context, timestamp: new Date() }]);
    logger.error(`Import Error: ${context}`, error);
  }
};
```

## Error Recovery

### Import Error Handling

**Recovery Strategies:**
1. **Partial Success**: Continue processing valid data, report errors
2. **Rollback**: Restore previous state on critical failures
3. **Retry Logic**: Automatic retry for transient failures
4. **User Choices**: Allow user to choose how to handle errors

**Error Categories:**
- **File Format Errors**: Invalid CSV structure, encoding issues
- **Data Validation Errors**: Missing required fields, invalid values
- **Network Errors**: Firebase connection issues during import
- **Permission Errors**: Insufficient access rights
- **Storage Errors**: Database write failures

### Export Error Handling

**Graceful Degradation:**
```javascript
const handleExportError = async (error, context) => {
  logger.error(`Export error in ${context}:`, error);
  
  // Attempt recovery based on error type
  if (error.code === 'storage/unauthorized') {
    // Try with reduced data set
    return await exportEssentialDataOnly();
  } else if (error.code === 'quota-exceeded') {
    // Split export into smaller chunks
    return await exportInChunks();
  } else {
    // Fall back to basic JSON export
    return await exportBasicJSON();
  }
};
```

## Future Enhancements

### Planned Features

1. **Enhanced Import Formats:**
   - Excel (.xlsx) support
   - JSON imports
   - API integrations

2. **Advanced Export Options:**
   - Custom field selection
   - Multiple output formats
   - Scheduled exports
   - Cloud storage integration

3. **Data Migration Tools:**
   - Platform migration utilities
   - Data format converters
   - Version upgrade tools

4. **Automation:**
   - Scheduled data backups
   - Automatic price updates
   - Smart data validation

## Testing Strategy

### Import/Export Testing

**Test Categories:**
- **File Format Tests**: Various CSV structures, edge cases
- **Data Validation**: Valid/invalid data scenarios
- **Large Dataset Tests**: Performance with large files
- **Error Handling**: Network failures, permission issues
- **Cross-browser Tests**: File handling compatibility

**Test Data:**
- Sample CSV files with various structures
- Edge case data (special characters, large numbers)
- Malformed files for error testing
- Large datasets for performance testing

This import/export and data management system provides comprehensive tools for data handling while maintaining data integrity and providing excellent user experience through progress tracking and error recovery mechanisms.
