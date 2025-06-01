# PSA Search System - Technical Documentation

## Overview
The PSA Search System integrates with PSA's API through Firebase Cloud Functions to retrieve card certification data. It includes caching mechanisms, token management, error handling, and seamless integration with card forms for auto-population of card details.

## File Locations
- **Primary Service**: `src/services/psaSearch.js`
- **PSA Lookup Button**: `src/components/PSALookupButton.js`
- **PSA Detail Modal**: `src/components/PSADetailModal.js`
- **Firebase Function**: `functions/src/psaApi.js` (Cloud Function)

## Architecture Overview

### System Components
1. **Client-side Service** (`psaSearch.js`) - Handles API calls, caching, and data processing
2. **UI Components** - PSA lookup button and detail modal for user interaction
3. **Cloud Function** - Server-side PSA API integration to avoid CORS issues
4. **Caching Layer** - Multi-level caching (localStorage + Firestore) for performance

## Core Service (`psaSearch.js`)

### Configuration and Constants
```javascript
// Environment Configuration
const USE_CLOUD_FUNCTION = true; // Toggle between cloud function and direct API
const CACHE_EXPIRY_HOURS = 24;
const CACHE_KEY_PREFIX = 'psa_search_';
const LOCAL_CACHE_KEY = 'psa_cache';
const FIRESTORE_CACHE_COLLECTION = 'psaCache';

// API Configuration  
const PSA_BASE_URL = 'https://api.psacard.com/publicapi/cert';
const FIREBASE_FUNCTION_URL = 'https://us-central1-pokemon-card-tracker-7a2d9.cloudfunctions.net';
```

### Cache Management System

#### Local Storage Cache
```javascript
const psaCache = {
  data: new Map(),
  
  // Set cache entry with expiry
  set(key, value) {
    const entry = {
      value: value,
      timestamp: Date.now(),
      expiry: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
    };
    
    this.data.set(key, entry);
    this.persistToLocalStorage();
    return entry;
  },
  
  // Get cache entry if not expired
  get(key) {
    const entry = this.data.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      this.persistToLocalStorage();
      return null;
    }
    
    return entry.value;
  },
  
  // Clear expired entries
  cleanup() {
    const now = Date.now();
    let cleaned = false;
    
    for (const [key, entry] of this.data.entries()) {
      if (now > entry.expiry) {
        this.data.delete(key);
        cleaned = true;
      }
    }
    
    if (cleaned) {
      this.persistToLocalStorage();
    }
  },
  
  // Persist cache to localStorage
  persistToLocalStorage() {
    try {
      const cacheArray = Array.from(this.data.entries());
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.warn('Failed to persist PSA cache to localStorage:', error);
    }
  },
  
  // Load cache from localStorage
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(LOCAL_CACHE_KEY);
      if (saved) {
        const cacheArray = JSON.parse(saved);
        this.data = new Map(cacheArray);
        this.cleanup(); // Remove expired entries on load
      }
    } catch (error) {
      console.warn('Failed to load PSA cache from localStorage:', error);
      this.data.clear();
    }
  }
};

// Initialize cache from localStorage
psaCache.loadFromLocalStorage();
```

#### Firestore Cache Integration
```javascript
const saveToFirestoreCache = async (serial, data) => {
  try {
    if (!auth.currentUser) return;
    
    const cacheDoc = {
      data: data,
      timestamp: Date.now(),
      expiry: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000),
      userId: auth.currentUser.uid
    };
    
    await setDoc(
      doc(firestore, FIRESTORE_CACHE_COLLECTION, `${auth.currentUser.uid}_${serial}`),
      cacheDoc
    );
    
  } catch (error) {
    console.warn('Failed to save PSA cache to Firestore:', error);
  }
};

const getFromFirestoreCache = async (serial) => {
  try {
    if (!auth.currentUser) return null;
    
    const docRef = doc(firestore, FIRESTORE_CACHE_COLLECTION, `${auth.currentUser.uid}_${serial}`);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const cacheDoc = docSnap.data();
    
    // Check if expired
    if (Date.now() > cacheDoc.expiry) {
      // Delete expired cache entry
      await deleteDoc(docRef);
      return null;
    }
    
    return cacheDoc.data;
    
  } catch (error) {
    console.warn('Failed to get PSA cache from Firestore:', error);
    return null;
  }
};
```

### Core Search Functions

#### Main Search Function
```javascript
export const searchPSACard = async (serial) => {
  if (!serial) {
    throw new Error('Serial number is required');
  }

  const sanitizedSerial = String(serial).trim();
  if (!sanitizedSerial) {
    throw new Error('Valid serial number is required');
  }

  const cacheKey = `${CACHE_KEY_PREFIX}${sanitizedSerial}`;
  
  try {
    // Check local cache first
    const cachedResult = psaCache.get(cacheKey);
    if (cachedResult) {
      console.log('PSA data found in local cache for serial:', sanitizedSerial);
      return cachedResult;
    }

    // Check Firestore cache
    const firestoreCached = await getFromFirestoreCache(sanitizedSerial);
    if (firestoreCached) {
      console.log('PSA data found in Firestore cache for serial:', sanitizedSerial);
      // Also store in local cache for faster future access
      psaCache.set(cacheKey, firestoreCached);
      return firestoreCached;
    }

    console.log('PSA data not in cache, fetching from API for serial:', sanitizedSerial);
    
    // Fetch from API via Cloud Function or direct
    let data;
    if (USE_CLOUD_FUNCTION) {
      data = await fetchFromCloudFunction(sanitizedSerial);
    } else {
      data = await fetchFromPSADirect(sanitizedSerial);
    }

    if (!data) {
      throw new Error('No data returned from PSA API');
    }

    // Process and normalize the data
    const processedData = processPSAData(data);
    
    // Cache the result in both local and Firestore
    psaCache.set(cacheKey, processedData);
    await saveToFirestoreCache(sanitizedSerial, processedData);

    return processedData;

  } catch (error) {
    console.error('Error in PSA search:', error);
    throw error;
  }
};
```

#### Cloud Function Integration
```javascript
const fetchFromCloudFunction = async (serial) => {
  try {
    const response = await fetch(`${FIREBASE_FUNCTION_URL}/psaLookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        certNumber: serial,
        userId: auth.currentUser?.uid 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 404) {
        throw new Error('PSA certificate not found');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      } else if (response.status === 401) {
        throw new Error('Authentication failed. Please check your PSA API access.');
      } else {
        throw new Error(`PSA API error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Unknown PSA API error');
    }

    return data.data;

  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
};
```

### Data Processing and Normalization

#### PSA Data Processing
```javascript
const processPSAData = (rawData) => {
  if (!rawData) return null;

  try {
    // Handle both array and object responses
    const dataItem = Array.isArray(rawData) ? rawData[0] : rawData;
    
    if (!dataItem) {
      throw new Error('No PSA data available');
    }

    // Normalize field names and clean data
    const processed = {
      // Certificate Information
      certificationNumber: dataItem.CertNumber || dataItem.certNumber || '',
      cardName: cleanString(dataItem.CardName || dataItem.cardName || ''),
      player: cleanString(dataItem.Player || dataItem.player || ''),
      
      // Set Information  
      set: cleanString(dataItem.Set || dataItem.set || ''),
      setName: cleanString(dataItem.Set || dataItem.set || ''),
      year: parseYear(dataItem.Year || dataItem.year),
      
      // Card Details
      variety: cleanString(dataItem.Variety || dataItem.variety || ''),
      category: cleanString(dataItem.Category || dataItem.category || ''),
      
      // Grading Information
      grade: parseGrade(dataItem.Grade || dataItem.grade),
      condition: parseGrade(dataItem.Grade || dataItem.grade),
      
      // Metadata
      psaData: dataItem, // Keep original data for reference
      psaSearched: true,
      lastPSAUpdate: new Date().toISOString()
    };

    return processed;

  } catch (error) {
    console.error('Error processing PSA data:', error);
    throw new Error('Failed to process PSA data: ' + error.message);
  }
};

// Helper functions for data cleaning
const cleanString = (str) => {
  if (!str) return '';
  return String(str).trim().replace(/\s+/g, ' ');
};

const parseYear = (year) => {
  if (!year) return null;
  const parsed = parseInt(year);
  return isNaN(parsed) ? null : parsed;
};

const parseGrade = (grade) => {
  if (!grade) return '';
  // Handle numeric grades
  if (typeof grade === 'number') {
    return `PSA ${grade}`;
  }
  // Handle string grades
  const str = String(grade).trim();
  if (/^\d+$/.test(str)) {
    return `PSA ${str}`;
  }
  return str;
};
```

### Utility Functions

#### Connection Testing
```javascript
export const testPSAConnection = async () => {
  try {
    // Test with a known PSA certificate
    const testSerial = '12345678'; // Replace with actual test serial
    
    if (USE_CLOUD_FUNCTION) {
      const response = await fetch(`${FIREBASE_FUNCTION_URL}/psaLookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          certNumber: testSerial,
          userId: auth.currentUser?.uid,
          testConnection: true 
        }),
      });
      
      return response.ok;
    } else {
      // Test direct PSA API connection
      const response = await fetch(`${PSA_BASE_URL}/${testSerial}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      return response.status !== 0; // Any response means connection works
    }
    
  } catch (error) {
    console.error('PSA connection test failed:', error);
    return false;
  }
};
```

#### Token Management (for direct API access)
```javascript
export const setPSAToken = (token) => {
  if (!token) {
    console.warn('No PSA token provided');
    return false;
  }
  
  try {
    localStorage.setItem('psa_api_token', token);
    return true;
  } catch (error) {
    console.error('Failed to store PSA token:', error);
    return false;
  }
};

export const getPSAToken = () => {
  try {
    return localStorage.getItem('psa_api_token');
  } catch (error) {
    console.error('Failed to retrieve PSA token:', error);
    return null;
  }
};
```

## UI Components

### PSA Lookup Button Component
```javascript
const PSALookupButton = ({ 
  currentCardData, 
  onCardUpdate, 
  onLoadingChange, 
  iconOnly = false 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [psaData, setPsaData] = useState(null);

  const handlePSALookup = async () => {
    const serial = currentCardData?.certificationNumber || 
                  currentCardData?.slabSerial || 
                  currentCardData?.id;
    
    if (!serial) {
      toast.error('Please enter a PSA certification number first');
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      const data = await searchPSACard(serial);
      
      if (data) {
        setPsaData(data);
        setShowDetailModal(true);
        toast.success('PSA data found!');
      } else {
        toast.error('No PSA data found for this certification number');
      }
      
    } catch (error) {
      console.error('PSA lookup error:', error);
      toast.error(`PSA lookup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleApplyPSAData = (selectedData) => {
    if (onCardUpdate) {
      onCardUpdate(selectedData);
    }
    setShowDetailModal(false);
  };

  return (
    <>
      <button
        onClick={handlePSALookup}
        disabled={isLoading}
        className={`psa-lookup-btn ${iconOnly ? 'icon-only' : ''} ${isLoading ? 'loading' : ''}`}
        title="Lookup PSA card details"
      >
        {isLoading ? (
          <div className="spinner" />
        ) : (
          <SearchIcon className="w-4 h-4" />
        )}
        {!iconOnly && (
          <span className="ml-2">
            {isLoading ? 'Searching...' : 'PSA Lookup'}
          </span>
        )}
      </button>

      {showDetailModal && psaData && (
        <PSADetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          psaData={psaData}
          currentCardData={currentCardData}
          onApply={handleApplyPSAData}
        />
      )}
    </>
  );
};
```

### PSA Detail Modal
The PSA Detail Modal displays the fetched PSA data and allows users to selectively apply fields to their card:

```javascript
const PSADetailModal = ({ 
  isOpen, 
  onClose, 
  psaData, 
  currentCardData, 
  onApply 
}) => {
  const [selectedFields, setSelectedFields] = useState(new Set());

  const fieldMapping = {
    cardName: 'Card Name',
    player: 'Player',
    set: 'Set',
    year: 'Year',
    category: 'Category',
    variety: 'Variety',
    grade: 'Grade/Condition',
    certificationNumber: 'Certification Number'
  };

  const handleFieldToggle = (field) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  };

  const handleApplySelected = () => {
    const updatedData = {};
    
    selectedFields.forEach(field => {
      if (psaData[field] !== undefined && psaData[field] !== null) {
        updatedData[field] = psaData[field];
      }
    });

    // Always include PSA metadata
    updatedData.psaData = psaData.psaData;
    updatedData.psaSearched = true;
    updatedData.lastPSAUpdate = new Date().toISOString();

    onApply(updatedData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PSA Card Details">
      <div className="psa-detail-modal">
        <div className="psa-data-section">
          <h3>Found PSA Data</h3>
          <div className="field-comparison">
            {Object.entries(fieldMapping).map(([field, label]) => (
              <div key={field} className="field-row">
                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field)}
                    onChange={() => handleFieldToggle(field)}
                  />
                  <span className="field-label">{label}</span>
                </label>
                <div className="field-values">
                  <div className="current-value">
                    Current: {currentCardData?.[field] || 'Not set'}
                  </div>
                  <div className="psa-value">
                    PSA: {psaData?.[field] || 'Not available'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleApplySelected}
            className="btn-primary"
            disabled={selectedFields.size === 0}
          >
            Apply Selected ({selectedFields.size})
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

## Firebase Cloud Function Integration

### Cloud Function Structure (`functions/src/psaApi.js`)
```javascript
const functions = require('firebase-functions');
const axios = require('axios');

exports.psaLookup = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  try {
    const { certNumber, userId, testConnection } = req.body;

    if (!certNumber && !testConnection) {
      res.status(400).send({ error: 'Certificate number is required' });
      return;
    }

    // Get PSA API token from Firebase config
    const psaToken = functions.config().psa?.token;
    
    if (!psaToken) {
      res.status(500).send({ error: 'PSA API token not configured' });
      return;
    }

    // Make request to PSA API
    const psaResponse = await axios.get(
      `https://api.psacard.com/publicapi/cert/${certNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${psaToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    if (psaResponse.status === 200 && psaResponse.data) {
      res.status(200).send({
        success: true,
        data: psaResponse.data
      });
    } else {
      res.status(404).send({
        success: false,
        error: 'PSA certificate not found'
      });
    }

  } catch (error) {
    console.error('PSA API Error:', error);
    
    if (error.response?.status === 404) {
      res.status(404).send({
        success: false,
        error: 'PSA certificate not found'
      });
    } else if (error.response?.status === 429) {
      res.status(429).send({
        success: false,
        error: 'Rate limit exceeded'
      });
    } else {
      res.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});
```

## Integration with Card Forms

### Add Card Modal Integration
The PSA search integrates seamlessly with the Add Card Modal:

```javascript
// In AddCardModal.js
const handleApplyPsaDetails = (psaData) => {
  setCardData(prev => ({
    ...prev,
    ...psaData,
    // Preserve existing data that shouldn't be overwritten
    quantity: prev.quantity,
    investmentAUD: prev.investmentAUD,
    currentValueAUD: prev.currentValueAUD,
    collection: prev.collection,
    datePurchased: prev.datePurchased
  }));
  
  setIsPsaDataApplied(true);
  toast.success("Card details updated from PSA data");
};
```

### Card Details Modal Integration
Similar integration in the Card Details Modal for editing existing cards:

```javascript
// In CardDetails.js  
const onCardUpdate = (updatedData) => {
  setEditedCard(prev => {
    const newData = {
      ...prev,
      ...updatedData,
      // Preserve image-related properties
      imageUrl: prev.imageUrl,
      _pendingImageFile: prev._pendingImageFile,
      _blobUrl: prev._blobUrl,
      hasImage: prev.hasImage
    };
    return newData;
  });
  
  setHasUnsavedChanges(true);
  toast.success("Card details updated from PSA data");
};
```

## Error Handling and User Experience

### Error Types and Handling
1. **Network Errors**: Connection timeouts, offline status
2. **API Errors**: Invalid certificates, rate limits, authentication failures
3. **Data Errors**: Malformed responses, missing required fields
4. **Cache Errors**: Storage failures, corruption recovery

### User Feedback Mechanisms
- Loading spinners during searches
- Toast notifications for success/error states
- Progress indicators for batch operations
- Detailed error messages with suggested actions

### Retry Logic
```javascript
const retryPSASearch = async (serial, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await searchPSACard(serial);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

## Performance Optimizations

### Caching Strategy
- **Local Cache**: Immediate access for frequently accessed cards
- **Firestore Cache**: Cross-device synchronization with expiry
- **Cache Warmup**: Preload PSA data for visible cards
- **Cache Cleanup**: Automatic removal of expired entries

### Network Optimization
- Request deduplication for simultaneous searches
- Batch processing for multiple PSA lookups
- Connection pooling for Cloud Function calls
- Compression for large PSA responses

## Security Considerations

### API Token Management
- PSA tokens stored in Firebase Functions config (server-side)
- No client-side token exposure
- User authentication required for PSA lookups
- Rate limiting to prevent abuse

### Data Privacy
- PSA data cached with user isolation
- Automatic cache expiry for data freshness
- No sensitive data logged in client console
- Secure transmission via HTTPS

## Future Enhancement Opportunities

1. **Batch PSA Lookups**: Process multiple certificates simultaneously
2. **PSA Data Enrichment**: Additional metadata from PSA population reports
3. **Smart Suggestions**: Recommend PSA lookups based on card patterns
4. **Real-time Updates**: WebSocket integration for live PSA data changes
5. **Advanced Caching**: Intelligent cache preloading and management
6. **Mobile Optimization**: Optimized UI for mobile PSA number entry
