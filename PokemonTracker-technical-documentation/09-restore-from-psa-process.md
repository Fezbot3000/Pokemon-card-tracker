# Restore from PSA Process - Technical Documentation

## Overview
The Restore from PSA process enables bulk card restoration from PSA API data, handling data mapping, validation, duplicate detection, and batch Firebase operations with comprehensive error handling.

## File Locations
- **Main Component**: `src/components/RestoreFromPSA.js`
- **Service Layer**: `src/services/psaRestoreService.js`
- **Data Mapping**: `src/utils/psaDataMapping.js`
- **Progress Tracking**: `src/hooks/useRestoreProgress.js`

## Core Restore Process

### PSA Data Fetching and Mapping
```javascript
const RestoreFromPSAService = {
  async fetchPSACollection(userId, options = {}) {
    try {
      const { 
        startDate = null, 
        endDate = null, 
        grades = null,
        categories = null 
      } = options;

      const psaData = await psaSearchService.getUserSubmissions(userId, {
        startDate,
        endDate,
        grades,
        categories
      });

      return this.mapPSADataToCards(psaData);
    } catch (error) {
      console.error('Error fetching PSA collection:', error);
      throw error;
    }
  },

  mapPSADataToCards(psaData) {
    if (!psaData || !psaData.submissions) return [];

    return psaData.submissions.flatMap(submission => 
      submission.cards.map(card => this.mapPSACardToAppCard(card, submission))
    );
  },

  mapPSACardToAppCard(psaCard, submission) {
    return {
      // Core identification
      cardName: psaCard.cardName || 'Unknown Card',
      setName: psaCard.setName || submission.setName || '',
      cardNumber: psaCard.cardNumber || '',
      year: psaCard.year || submission.year || new Date().getFullYear(),
      
      // PSA specific data
      psaCertNumber: psaCard.certNumber,
      psaGrade: psaCard.grade,
      psaLabel: psaCard.label || 'Standard',
      psaService: psaCard.serviceLevel || 'Regular',
      
      // Categories and attributes
      category: this.determineCategoryFromPSA(psaCard),
      rarity: psaCard.rarity || '',
      condition: `PSA ${psaCard.grade}`,
      
      // Financial data (to be filled by user)
      investmentAUD: 0,
      investmentUSD: 0,
      currentValueAUD: psaCard.estimatedValue?.aud || 0,
      currentValueUSD: psaCard.estimatedValue?.usd || 0,
      
      // Metadata
      datePurchased: submission.submissionDate || new Date().toISOString(),
      addedAt: new Date().toISOString(),
      source: 'PSA_RESTORE',
      originalPSAData: psaCard,
      
      // Default values
      quantity: 1,
      collection: 'Default',
      collectionId: 'default',
      notes: `Restored from PSA submission ${submission.submissionNumber}`,
      
      // Generate temporary ID
      id: `psa_temp_${psaCard.certNumber || Date.now()}_${Math.random()}`
    };
  },

  determineCategoryFromPSA(psaCard) {
    const cardName = (psaCard.cardName || '').toLowerCase();
    const setName = (psaCard.setName || '').toLowerCase();
    
    // Category mapping based on PSA data patterns
    if (cardName.includes('charizard')) return 'Charizard';
    if (cardName.includes('pikachu')) return 'Pikachu';
    if (setName.includes('base set')) return 'Base Set';
    if (setName.includes('shadowless')) return 'Shadowless';
    if (setName.includes('first edition')) return 'First Edition';
    if (psaCard.year && psaCard.year <= 2000) return 'Vintage';
    
    return 'Modern';
  }
};
```

### Duplicate Detection System
```javascript
const DuplicateDetectionService = {
  async findDuplicates(restoredCards, existingCards) {
    const duplicates = [];
    const unique = [];

    for (const restoredCard of restoredCards) {
      const duplicate = this.findMatchingCard(restoredCard, existingCards);
      
      if (duplicate) {
        duplicates.push({
          restoredCard,
          existingCard: duplicate,
          matchType: this.getMatchType(restoredCard, duplicate),
          confidence: this.calculateMatchConfidence(restoredCard, duplicate)
        });
      } else {
        unique.push(restoredCard);
      }
    }

    return { duplicates, unique };
  },

  findMatchingCard(card, existingCards) {
    // Priority 1: PSA cert number match
    if (card.psaCertNumber) {
      const certMatch = existingCards.find(existing => 
        existing.psaCertNumber === card.psaCertNumber
      );
      if (certMatch) return certMatch;
    }

    // Priority 2: Exact card details match
    const exactMatch = existingCards.find(existing => 
      existing.cardName === card.cardName &&
      existing.setName === card.setName &&
      existing.cardNumber === card.cardNumber &&
      existing.year === card.year
    );
    if (exactMatch) return exactMatch;

    // Priority 3: Fuzzy name match with set/year
    return existingCards.find(existing => 
      this.calculateSimilarity(existing.cardName, card.cardName) > 0.85 &&
      existing.setName === card.setName &&
      existing.year === card.year
    );
  },

  getMatchType(card1, card2) {
    if (card1.psaCertNumber && card1.psaCertNumber === card2.psaCertNumber) {
      return 'PSA_CERT_EXACT';
    }
    if (card1.cardName === card2.cardName && 
        card1.setName === card2.setName && 
        card1.cardNumber === card2.cardNumber) {
      return 'CARD_DETAILS_EXACT';
    }
    return 'FUZZY_MATCH';
  },

  calculateMatchConfidence(card1, card2) {
    let confidence = 0;
    
    if (card1.psaCertNumber === card2.psaCertNumber) confidence += 50;
    if (card1.cardName === card2.cardName) confidence += 20;
    if (card1.setName === card2.setName) confidence += 15;
    if (card1.cardNumber === card2.cardNumber) confidence += 10;
    if (card1.year === card2.year) confidence += 5;
    
    return Math.min(confidence, 100);
  },

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - this.editDistance(longer, shorter)) / longer.length;
  },

  editDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
};
```

### Batch Import Processing
```javascript
const BatchImportService = {
  async processBatchImport(cards, options = {}) {
    const {
      batchSize = 50,
      onProgress = () => {},
      onError = () => {},
      skipDuplicates = false,
      defaultCollection = 'Default'
    } = options;

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      createdCards: []
    };

    // Process in batches to avoid overwhelming Firebase
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.processSingleBatch(batch, {
          skipDuplicates,
          defaultCollection
        });
        
        results.successful += batchResults.successful.length;
        results.failed += batchResults.failed.length;
        results.createdCards.push(...batchResults.successful);
        results.errors.push(...batchResults.errors);
        
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
        results.failed += batch.length;
        results.errors.push({
          batch: i / batchSize + 1,
          error: error.message,
          cards: batch.length
        });
      }
      
      results.processed += batch.length;
      onProgress({
        processed: results.processed,
        total: cards.length,
        percentage: (results.processed / cards.length) * 100
      });
    }

    return results;
  },

  async processSingleBatch(cards, options) {
    const user = getCurrentUser();
    const successful = [];
    const failed = [];
    const errors = [];

    for (const card of cards) {
      try {
        // Validate card data
        const validationResult = this.validateCardData(card);
        if (!validationResult.valid) {
          throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }

        // Prepare card for saving
        const cardToSave = {
          ...card,
          id: generateId(),
          collection: options.defaultCollection,
          collectionId: options.defaultCollection.toLowerCase(),
          addedBy: user.uid,
          addedAt: new Date().toISOString()
        };

        // Save to Firebase
        await saveCard(user.uid, cardToSave);
        successful.push(cardToSave);

      } catch (error) {
        console.error('Failed to save card:', card.cardName, error);
        failed.push(card);
        errors.push({
          card: card.cardName,
          error: error.message
        });
      }
    }

    return { successful, failed, errors };
  },

  validateCardData(card) {
    const errors = [];
    
    if (!card.cardName?.trim()) {
      errors.push('Card name is required');
    }
    
    if (card.psaCertNumber && !/^\d{8,}$/.test(card.psaCertNumber)) {
      errors.push('Invalid PSA certification number');
    }
    
    if (card.psaGrade && (card.psaGrade < 1 || card.psaGrade > 10)) {
      errors.push('PSA grade must be between 1 and 10');
    }
    
    if (card.year && (card.year < 1996 || card.year > new Date().getFullYear())) {
      errors.push('Invalid year');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};
```

## Restore from PSA Component

### Main Restore Interface
```javascript
const RestoreFromPSA = () => {
  const [step, setStep] = useState('CONFIGURE');
  const [configuration, setConfiguration] = useState({
    dateRange: { start: null, end: null },
    grades: [],
    categories: [],
    defaultCollection: 'Default'
  });
  const [psaData, setPsaData] = useState([]);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const handleFetchPSAData = async () => {
    try {
      setStep('FETCHING');
      const user = getCurrentUser();
      const data = await RestoreFromPSAService.fetchPSACollection(user.uid, configuration);
      setPsaData(data);
      
      // Analyze for duplicates
      const existingCards = await getUserCards(user.uid);
      const analysis = await DuplicateDetectionService.findDuplicates(data, existingCards);
      setDuplicateAnalysis(analysis);
      
      setStep('REVIEW');
    } catch (error) {
      console.error('Error fetching PSA data:', error);
      // Handle error
    }
  };

  const handleStartImport = async (selectedCards) => {
    try {
      setImporting(true);
      setStep('IMPORTING');
      
      const results = await BatchImportService.processBatchImport(selectedCards, {
        onProgress: setProgress,
        defaultCollection: configuration.defaultCollection
      });
      
      setStep('COMPLETE');
      // Show results
    } catch (error) {
      console.error('Import failed:', error);
      setStep('ERROR');
    } finally {
      setImporting(false);
    }
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'CONFIGURE':
        return (
          <RestoreConfiguration
            configuration={configuration}
            onConfigurationChange={setConfiguration}
            onFetch={handleFetchPSAData}
          />
        );
      
      case 'FETCHING':
        return <LoadingScreen message="Fetching PSA data..." />;
      
      case 'REVIEW':
        return (
          <RestoreReview
            psaData={psaData}
            duplicateAnalysis={duplicateAnalysis}
            onStartImport={handleStartImport}
            onBack={() => setStep('CONFIGURE')}
          />
        );
      
      case 'IMPORTING':
        return (
          <ImportProgress
            progress={progress}
            importing={importing}
          />
        );
      
      case 'COMPLETE':
        return <ImportComplete onRestart={() => setStep('CONFIGURE')} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="restore-from-psa">
      <div className="restore-header">
        <h2>Restore from PSA</h2>
        <StepIndicator currentStep={step} />
      </div>
      
      <div className="restore-content">
        {renderCurrentStep()}
      </div>
    </div>
  );
};
```

### Review and Selection Interface
```javascript
const RestoreReview = ({ psaData, duplicateAnalysis, onStartImport, onBack }) => {
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [viewMode, setViewMode] = useState('ALL');

  const filteredCards = useMemo(() => {
    switch (viewMode) {
      case 'UNIQUE':
        return duplicateAnalysis?.unique || [];
      case 'DUPLICATES':
        return duplicateAnalysis?.duplicates.map(d => d.restoredCard) || [];
      default:
        return psaData;
    }
  }, [psaData, duplicateAnalysis, viewMode]);

  const handleSelectAll = (cards) => {
    const newSelected = new Set(selectedCards);
    cards.forEach(card => newSelected.add(card.id));
    setSelectedCards(newSelected);
  };

  const handleDeselectAll = (cards) => {
    const newSelected = new Set(selectedCards);
    cards.forEach(card => newSelected.delete(card.id));
    setSelectedCards(newSelected);
  };

  return (
    <div className="restore-review">
      <div className="review-header">
        <div className="review-stats">
          <span>Total Cards: {psaData.length}</span>
          <span>Unique: {duplicateAnalysis?.unique.length || 0}</span>
          <span>Potential Duplicates: {duplicateAnalysis?.duplicates.length || 0}</span>
          <span>Selected: {selectedCards.size}</span>
        </div>
        
        <div className="view-controls">
          <button 
            className={viewMode === 'ALL' ? 'active' : ''}
            onClick={() => setViewMode('ALL')}
          >
            All Cards
          </button>
          <button 
            className={viewMode === 'UNIQUE' ? 'active' : ''}
            onClick={() => setViewMode('UNIQUE')}
          >
            Unique Only
          </button>
          <button 
            className={viewMode === 'DUPLICATES' ? 'active' : ''}
            onClick={() => setViewMode('DUPLICATES')}
          >
            Duplicates
          </button>
        </div>
      </div>

      <div className="bulk-actions">
        <button onClick={() => handleSelectAll(filteredCards)}>
          Select All Visible
        </button>
        <button onClick={() => handleDeselectAll(filteredCards)}>
          Deselect All Visible
        </button>
      </div>

      <div className="cards-list">
        {filteredCards.map(card => (
          <RestoreCardItem
            key={card.id}
            card={card}
            isSelected={selectedCards.has(card.id)}
            onToggleSelect={(id) => {
              const newSelected = new Set(selectedCards);
              if (newSelected.has(id)) {
                newSelected.delete(id);
              } else {
                newSelected.add(id);
              }
              setSelectedCards(newSelected);
            }}
            isDuplicate={duplicateAnalysis?.duplicates.some(d => d.restoredCard.id === card.id)}
          />
        ))}
      </div>

      <div className="review-actions">
        <button onClick={onBack}>Back</button>
        <button 
          onClick={() => onStartImport(psaData.filter(card => selectedCards.has(card.id)))}
          disabled={selectedCards.size === 0}
        >
          Import {selectedCards.size} Cards
        </button>
      </div>
    </div>
  );
};
```

## Error Handling and Recovery

### Comprehensive Error Management
```javascript
const RestoreErrorHandler = {
  categorizeError(error) {
    if (error.code?.includes('auth/')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (error.message?.includes('network')) {
      return 'NETWORK_ERROR';
    }
    if (error.message?.includes('PSA API')) {
      return 'PSA_API_ERROR';
    }
    if (error.message?.includes('Firebase')) {
      return 'FIREBASE_ERROR';
    }
    return 'UNKNOWN_ERROR';
  },

  getRecoveryActions(errorType) {
    switch (errorType) {
      case 'AUTHENTICATION_ERROR':
        return ['Sign in again', 'Check account permissions'];
      case 'NETWORK_ERROR':
        return ['Check internet connection', 'Retry operation'];
      case 'PSA_API_ERROR':
        return ['Check PSA credentials', 'Try with different date range'];
      case 'FIREBASE_ERROR':
        return ['Retry operation', 'Check storage quota'];
      default:
        return ['Retry operation', 'Contact support'];
    }
  },

  createErrorReport(errors) {
    return {
      timestamp: new Date().toISOString(),
      errors: errors.map(error => ({
        type: this.categorizeError(error),
        message: error.message,
        stack: error.stack,
        context: error.context
      })),
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  }
};
```

## Future Enhancement Opportunities

1. **Incremental Sync**: Only restore new PSA data since last sync
2. **Advanced Mapping**: ML-based card matching and categorization  
3. **Value Integration**: Auto-populate current values from PSA market data
4. **Batch Validation**: Server-side validation for large imports
5. **Restore History**: Track and manage previous restore operations
6. **Custom Field Mapping**: User-defined field mapping from PSA data
7. **Scheduled Restores**: Automatic periodic PSA data synchronization
