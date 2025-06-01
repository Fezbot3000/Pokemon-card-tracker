# Currency Functionality Documentation

## Overview

The Pokemon Card Tracker app implements a comprehensive multi-currency system that supports international users by allowing currency selection, automatic conversion, and localized formatting. This document details the complete currency infrastructure including frontend UI components, backend conversion logic, data persistence, and formatting utilities.

## Currency System Architecture

### Supported Currencies

The application supports 6 major currencies:

```javascript
export const availableCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];
```

**Primary Markets**:
- **AUD (Australian Dollar)**: Primary market and default currency
- **USD (US Dollar)**: International standard and pricing baseline
- **EUR/GBP/CAD/JPY**: Additional international support

### Data Flow Architecture

```
User Selection → Local Storage → Firestore → Exchange Rate API → Display Formatting
     ↓              ↓             ↓              ↓                    ↓
[UI Components] [Persistence] [Sync] [Live Conversion] [Localized Display]
```

## Core Implementation

### 1. User Preferences Context (`src/contexts/UserPreferencesContext.js`)

**Purpose**: Central state management for currency preferences and conversion rates.

```javascript
// Context structure
const UserPreferencesContext = createContext({
  preferredCurrency: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  exchangeRates: { USD: 1, AUD: 1.48, EUR: 0.91, ... },
  convertToPreferredCurrency: (amount, fromCurrency) => number,
  updateCurrency: (newCurrency) => void,
  isRatesLoading: boolean
});
```

**Key Features**:
- **Real-time Exchange Rates**: Fetches rates from Cloud Function every 12 hours
- **Offline Fallback**: Uses cached rates when API unavailable
- **Automatic Sync**: Syncs currency preference with Firestore when user authenticated
- **Local Storage Persistence**: Maintains preference across sessions

**Exchange Rate Management**:
```javascript
// Fetches live rates from Firebase Cloud Function
const CLOUD_FUNCTION_EXCHANGE_RATE_URL = 
  'https://us-central1-mycardtracker-c8479.cloudfunctions.net/getExchangeRates';

// Fallback conversion rates (USD base)
const conversionRates = {
  USD: 1,
  EUR: 0.91,
  GBP: 0.79, 
  JPY: 134.50,
  AUD: 1.48,
  CAD: 1.35,
};
```

### 2. Currency Selection Components

#### Mobile Settings Modal (`src/components/MobileSettingsModal.js`)

**Purpose**: Mobile-optimized currency selection interface.

```javascript
const MobileSettingsModal = ({ isOpen, onClose }) => {
  const [currency, setCurrency] = useState(
    localStorage.getItem('currency') || 'USD'
  );

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
    window.dispatchEvent(new Event('currencyChange'));
  };

  return (
    <div className="setting-group">
      <label>Currency:</label>
      <select value={currency} onChange={handleCurrencyChange}>
        <option value="AUD">AUD - Australian Dollar</option>
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="GBP">GBP - British Pound</option>
        <option value="CAD">CAD - Canadian Dollar</option>
        <option value="JPY">JPY - Japanese Yen</option>
      </select>
    </div>
  );
};
```

**Features**:
- **Immediate Local Persistence**: Saves to localStorage on change
- **Event Broadcasting**: Dispatches global currency change event
- **User-Friendly Labels**: Shows currency code and full name

#### Desktop Application Settings (`src/components/ApplicationSettings.js`)

**Purpose**: Desktop currency selection with enhanced UX.

```javascript
const ApplicationSettings = () => {
  const { preferredCurrency, updateCurrency } = useUserPreferences();

  const handleCurrencyChange = (e) => {
    const selectedCode = e.target.value;
    const selectedCurrency = availableCurrencies.find(
      curr => curr.code === selectedCode
    );
    updateCurrency(selectedCurrency);
  };

  return (
    <div className="settings-group">
      <label htmlFor="currency-select">Display Currency:</label>
      <select 
        id="currency-select"
        value={preferredCurrency.code}
        onChange={handleCurrencyChange}
      >
        {availableCurrencies.map(currency => (
          <option key={currency.code} value={currency.code}>
            {currency.code} - {currency.name} ({currency.symbol})
          </option>
        ))}
      </select>
    </div>
  );
};
```

**Features**:
- **Context Integration**: Uses UserPreferencesContext for state management
- **Rich Display**: Shows code, name, and symbol for each currency
- **Automatic Sync**: Triggers Firestore sync when authenticated

### 3. Currency Conversion Logic

#### Core Conversion Function (`UserPreferencesContext.js`)

```javascript
const convertToPreferredCurrency = useCallback((amount, fromCurrency = 'USD') => {
  if (!amount || isNaN(amount)) return 0;
  
  const fromRate = exchangeRates[fromCurrency] || fallbackRates[fromCurrency] || 1;
  const toRate = exchangeRates[preferredCurrency.code] || 
                 fallbackRates[preferredCurrency.code] || 1;
  
  // Convert: fromCurrency → USD → preferredCurrency
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  
  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimals
}, [exchangeRates, preferredCurrency.code]);
```

**Conversion Strategy**:
1. **USD as Base**: All conversions go through USD as the base currency
2. **Two-Step Process**: Original Currency → USD → Target Currency
3. **Precision Handling**: Rounds to 2 decimal places for currency display
4. **Error Handling**: Graceful fallback for missing rates or invalid amounts

#### Exchange Rate Fetching

```javascript
const fetchExchangeRates = useCallback(async () => {
  try {
    setIsRatesLoading(true);
    
    const response = await fetch(CLOUD_FUNCTION_EXCHANGE_RATE_URL);
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    
    const data = await response.json();
    const rates = data.rates || data;
    
    // Validate rates structure
    if (typeof rates === 'object' && rates.USD) {
      setExchangeRates(rates);
      
      // Cache rates and timestamp
      localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rates));
      localStorage.setItem(RATE_LAST_FETCH_KEY, Date.now().toString());
    } else {
      throw new Error('Invalid rate format received');
    }
  } catch (error) {
    logger.warn('Failed to fetch live exchange rates, using cached/fallback rates', error);
    
    // Try to load cached rates
    const cachedRates = localStorage.getItem(RATE_STORAGE_KEY);
    if (cachedRates) {
      setExchangeRates(JSON.parse(cachedRates));
    } else {
      setExchangeRates(conversionRates); // Use hardcoded fallback
    }
  } finally {
    setIsRatesLoading(false);
  }
}, []);
```

**Features**:
- **Automatic Updates**: Fetches fresh rates every 12 hours
- **Caching Strategy**: Stores rates in localStorage for offline use
- **Error Recovery**: Falls back to cached or hardcoded rates on failure
- **Loading States**: Provides loading indicator during rate fetching

### 4. Currency Formatting Utilities

#### Primary Formatter (`src/utils/formatters.js`)

```javascript
export const formatCurrency = (amount, currencyInfo = null) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currencyInfo ? `${currencyInfo.symbol}0.00` : '$0.00';
  }

  const currency = currencyInfo || { symbol: '$', code: 'USD' };
  
  // Handle different formatting for JPY (no decimals)
  if (currency.code === 'JPY') {
    return `${currency.symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  // Standard currency formatting with 2 decimals
  return `${currency.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};
```

**Formatting Rules**:
- **Symbol Prefix**: Currency symbol appears before the amount
- **Thousands Separators**: Uses locale-appropriate comma separators
- **Decimal Precision**: 2 decimal places for most currencies
- **JPY Exception**: No decimal places for Japanese Yen
- **Null Safety**: Graceful handling of invalid amounts

#### Extended Formatting (`src/services/dataProcessor.js`)

```javascript
// Format with explicit currency context
export const formatPriceWithCurrency = (price, fromCurrency, preferredCurrency, exchangeRates) => {
  if (!price || !preferredCurrency) return formatCurrency(0, preferredCurrency);
  
  // Convert price to preferred currency
  const convertedPrice = convertCurrency(price, fromCurrency, preferredCurrency.code, exchangeRates);
  
  // Format with localization
  return formatCurrency(convertedPrice, preferredCurrency);
};

// Utility for percentage formatting
export const formatPercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
};
```

### 5. Data Persistence Strategy

#### Local Storage Management

**Storage Keys**:
```javascript
const CURRENCY_PREFERENCE_KEY = 'pokemon_tracker_currency_preference';
const RATE_STORAGE_KEY = 'exchangeRates';
const RATE_LAST_FETCH_KEY = 'lastRateFetch';
```

**Storage Format**:
```javascript
// Currency preference (full object)
localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify({
  code: 'AUD',
  symbol: 'A$', 
  name: 'Australian Dollar'
}));

// Exchange rates (rates object)
localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify({
  USD: 1,
  AUD: 1.48,
  EUR: 0.91,
  // ... other rates
}));

// Last fetch timestamp
localStorage.setItem(RATE_LAST_FETCH_KEY, Date.now().toString());
```

#### Firestore Synchronization

**User Preferences Document** (`userPreferences/{userId}`):
```javascript
{
  currency: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar'
  },
  // ... other preferences
  updatedAt: Timestamp
}
```

**Sync Strategy**:
1. **Load**: localStorage → Context State → Firestore (when authenticated)
2. **Update**: User Selection → Context → localStorage → Firestore
3. **Conflict Resolution**: Firestore takes precedence over localStorage on login

```javascript
// Firestore sync logic
useEffect(() => {
  if (!user?.uid) return;
  
  const userPrefsRef = doc(db, 'userPreferences', user.uid);
  
  const unsubscribe = onSnapshot(userPrefsRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      if (data.currency && data.currency.code) {
        setPreferredCurrency(data.currency);
        // Update localStorage to match Firestore
        localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(data.currency));
      }
    }
  });
  
  return unsubscribe;
}, [user]);
```

### 6. Backend Exchange Rate Service

#### Firebase Cloud Function (`functions/src/exchangeRateFunction.js`)

```javascript
const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.getExchangeRates = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    // Fetch from external exchange rate API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/USD?access_key=${functions.config().exchange.api_key}`
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter to supported currencies only
    const supportedRates = {
      USD: 1, // Base currency
      AUD: data.rates.AUD,
      EUR: data.rates.EUR,
      GBP: data.rates.GBP,
      CAD: data.rates.CAD,
      JPY: data.rates.JPY
    };
    
    res.json({
      rates: supportedRates,
      lastUpdated: new Date().toISOString(),
      source: 'exchangerate-api.com'
    });
    
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    
    // Return fallback rates
    res.status(200).json({
      rates: {
        USD: 1,
        AUD: 1.48,
        EUR: 0.91,
        GBP: 0.79,
        CAD: 1.35,
        JPY: 134.50
      },
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    });
  }
});
```

**Features**:
- **CORS Enabled**: Allows cross-origin requests from frontend
- **Error Handling**: Returns fallback rates if external API fails
- **Rate Filtering**: Only returns supported currencies
- **Caching Headers**: Can be extended with caching for performance

### 7. UI Integration Patterns

#### Card Value Display Components

```javascript
// Collection card showing converted values
const CollectionCard = ({ card }) => {
  const { preferredCurrency, convertToPreferredCurrency } = useUserPreferences();
  
  const displayPrice = convertToPreferredCurrency(card.currentValueUSD, 'USD');
  const purchasePrice = convertToPreferredCurrency(card.purchasePrice, card.purchaseCurrency);
  
  return (
    <div className="card-value">
      <span className="current-value">
        {formatCurrency(displayPrice, preferredCurrency)}
      </span>
      <span className="purchase-price">
        Paid: {formatCurrency(purchasePrice, preferredCurrency)}
      </span>
    </div>
  );
};
```

#### Marketplace Listing Display

```javascript
// Marketplace listing with original and converted prices
const MarketplaceListing = ({ listing }) => {
  const { preferredCurrency, convertToPreferredCurrency } = useUserPreferences();
  
  const convertedPrice = convertToPreferredCurrency(
    listing.price, 
    listing.originalCurrency
  );
  
  return (
    <div className="listing-price">
      <span className="main-price">
        {formatCurrency(convertedPrice, preferredCurrency)}
      </span>
      {listing.originalCurrency !== preferredCurrency.code && (
        <span className="original-price">
          ({formatCurrency(listing.price, {
            code: listing.originalCurrency,
            symbol: getCurrencySymbol(listing.originalCurrency)
          })})
        </span>
      )}
    </div>
  );
};
```

### 8. Event System Integration

#### Global Currency Change Events

```javascript
// Event-driven updates for components not using React Context
useEffect(() => {
  const handleCurrencyChange = () => {
    const newCurrency = localStorage.getItem('currency');
    if (newCurrency && newCurrency !== currentCurrency) {
      setCurrentCurrency(newCurrency);
      // Trigger component refresh/recalculation
      refreshDisplayValues();
    }
  };
  
  window.addEventListener('currencyChange', handleCurrencyChange);
  
  return () => {
    window.removeEventListener('currencyChange', handleCurrencyChange);
  };
}, [currentCurrency]);
```

**Use Cases**:
- **Modal Updates**: Currency selection in modals affects main app
- **Component Synchronization**: Ensures all components show consistent currency
- **Cross-Component Communication**: Updates components that don't share context

### 9. Performance Optimizations

#### Memoization Strategies

```javascript
// Memoized currency conversion to prevent unnecessary recalculations
const convertToPreferredCurrency = useCallback((amount, fromCurrency = 'USD') => {
  // ... conversion logic
}, [exchangeRates, preferredCurrency.code]);

// Memoized formatting for large lists
const memoizedFormatCurrency = useMemo(() => {
  return (amount) => formatCurrency(amount, preferredCurrency);
}, [preferredCurrency]);
```

#### Batch Updates

```javascript
// Batch currency updates for collections
const updateCollectionCurrencies = useCallback(async (collection) => {
  const updates = collection.cards.map(card => ({
    ...card,
    displayValue: convertToPreferredCurrency(card.originalValue, card.originalCurrency)
  }));
  
  // Single state update for all cards
  setCollectionCards(updates);
}, [convertToPreferredCurrency]);
```

### 10. Error Handling and Fallbacks

#### Graceful Degradation

```javascript
// Currency conversion with multiple fallback layers
const safeConvertCurrency = (amount, fromCurrency, toCurrency) => {
  try {
    // Try live rates
    if (exchangeRates[fromCurrency] && exchangeRates[toCurrency]) {
      return convertWithLiveRates(amount, fromCurrency, toCurrency);
    }
    
    // Fall back to cached rates
    const cachedRates = JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || '{}');
    if (cachedRates[fromCurrency] && cachedRates[toCurrency]) {
      return convertWithCachedRates(amount, fromCurrency, toCurrency, cachedRates);
    }
    
    // Fall back to hardcoded rates
    return convertWithFallbackRates(amount, fromCurrency, toCurrency);
    
  } catch (error) {
    logger.error('Currency conversion failed', error);
    return amount; // Return original amount as last resort
  }
};
```

#### User Communication

```javascript
// Status indicator for exchange rate freshness
const ExchangeRateStatus = () => {
  const { isRatesLoading, lastRateUpdate } = useUserPreferences();
  
  if (isRatesLoading) {
    return <span className="rate-status updating">Updating rates...</span>;
  }
  
  const isStale = Date.now() - lastRateUpdate > FETCH_INTERVAL;
  
  return (
    <span className={`rate-status ${isStale ? 'stale' : 'fresh'}`}>
      {isStale ? 'Using cached rates' : 'Rates up to date'}
    </span>
  );
};
```

### 11. Testing Strategies

#### Unit Tests for Currency Functions

```javascript
// Example test for currency conversion
describe('Currency Conversion', () => {
  it('should convert USD to AUD correctly', () => {
    const rates = { USD: 1, AUD: 1.48 };
    const result = convertCurrency(100, 'USD', 'AUD', rates);
    expect(result).toBe(148);
  });
  
  it('should handle invalid amounts gracefully', () => {
    const result = convertCurrency(null, 'USD', 'AUD', {});
    expect(result).toBe(0);
  });
  
  it('should format currency correctly for different locales', () => {
    const aud = { code: 'AUD', symbol: 'A$' };
    const result = formatCurrency(1234.56, aud);
    expect(result).toBe('A$1,234.56');
  });
});
```

#### Integration Tests

```javascript
// Test currency selection workflow
describe('Currency Selection Integration', () => {
  it('should update all components when currency changes', async () => {
    const { getByRole, getAllByText } = render(<App />);
    
    // Change currency in settings
    const currencySelect = getByRole('combobox', { name: /currency/i });
    fireEvent.change(currencySelect, { target: { value: 'EUR' } });
    
    // Verify all displayed prices updated to EUR
    await waitFor(() => {
      const eurPrices = getAllByText(/€/);
      expect(eurPrices.length).toBeGreaterThan(0);
    });
  });
});
```

### 12. Future Enhancements

#### Planned Features

**Real-time Rate Updates**:
- WebSocket connection for live rate streaming
- Automatic rate refresh without user interaction
- Visual indicators for rate changes

**Advanced Formatting**:
- User-configurable decimal places
- Cultural formatting preferences (commas vs periods)
- Currency name display options

**Enhanced Conversion**:
- Historical exchange rate tracking
- Rate change notifications
- Conversion rate transparency

**Analytics Integration**:
- Currency usage tracking
- Conversion frequency analysis
- Regional preference insights

#### Technical Improvements

**Caching Strategy**:
```javascript
// Implement service worker for rate caching
const cacheExchangeRates = async (rates) => {
  const cache = await caches.open('exchange-rates-v1');
  await cache.put('/api/rates', new Response(JSON.stringify(rates)));
};
```

**Rate Provider Redundancy**:
```javascript
// Multiple exchange rate API sources
const RATE_PROVIDERS = [
  'https://api.exchangerate-api.com/v4/latest/USD',
  'https://api.fixer.io/latest?base=USD',
  'https://openexchangerates.org/api/latest.json'
];
```

This currency system provides a robust, user-friendly international experience while maintaining performance and reliability across all application features.
