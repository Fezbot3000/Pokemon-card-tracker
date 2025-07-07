import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../design-system/contexts/AuthContext';
import logger from '../utils/logger';

// Create context
const UserPreferencesContext = createContext();

// Local storage key for currency preference
const CURRENCY_PREFERENCE_KEY = 'pokemon_tracker_currency_preference';

// URL for the Firebase Cloud Function proxy
const CLOUD_FUNCTION_EXCHANGE_RATE_URL =
  'https://us-central1-mycardtracker-c8479.cloudfunctions.net/getExchangeRates';

// Available currencies
export const availableCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

const AUD_CURRENCY_INFO =
  availableCurrencies.find(c => c.code === 'AUD') || availableCurrencies[0];

// Base conversion rates (USD to X) - Last updated 2025-05-19
const conversionRates = {
  USD: 1,
  EUR: 0.91,
  GBP: 0.79,
  JPY: 134.5,
  AUD: 1.48,
  CAD: 1.35,
};

// Constants for rate management
const RATE_STORAGE_KEY = 'exchangeRates';
const RATE_LAST_FETCH_KEY = 'lastRateFetch';
const FETCH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export function UserPreferencesProvider({ children }) {
  const { user } = useAuth();
  // Stores the user's preferred currency object, e.g., { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
  const [preferredCurrency, setPreferredCurrency] = useState(() => {
    try {
      const savedCurrencyString = localStorage.getItem(CURRENCY_PREFERENCE_KEY);
      if (savedCurrencyString) {
        const savedCurrency = JSON.parse(savedCurrencyString);
        // Ensure the saved currency is valid, otherwise fallback
        if (availableCurrencies.find(c => c.code === savedCurrency.code)) {
          return savedCurrency;
        }
      }
      return AUD_CURRENCY_INFO; // Default to AUD
    } catch (error) {
      logger.error(
        'Failed to load currency preference from localStorage',
        error
      );
      return AUD_CURRENCY_INFO; // Default to AUD on error
    }
  });

  const [liveExchangeRates, setLiveExchangeRates] = useState(null); // State for live rates

  // Fetch live exchange rates on mount or when user changes
  useEffect(() => {
    const fetchWithRetry = async (
      url,
      options,
      maxRetries = 3,
      baseDelay = 1000
    ) => {
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(url, options);
          if (response.ok) return response;

          // For 5xx errors, we'll retry
          if (response.status >= 500) {
            lastError = new Error(`Server error: ${response.status}`);
            // Don't retry on last attempt
            if (i === maxRetries - 1) throw lastError;
          } else {
            // For other errors (4xx), throw immediately
            throw new Error(`API request failed: ${response.status}`);
          }
        } catch (error) {
          lastError = error;
          // Don't retry on last attempt
          if (i === maxRetries - 1) throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      throw lastError;
    };

    const loadStoredRates = () => {
      try {
        const stored = localStorage.getItem(RATE_STORAGE_KEY);
        if (stored) {
          const { rates, timestamp } = JSON.parse(stored);
          // Verify the stored rates have all required currencies
          const hasAllCurrencies = Object.keys(conversionRates).every(
            currency => rates[currency]
          );
          if (hasAllCurrencies) {
            return rates;
          }
        }
      } catch (error) {
        logger.warn('Failed to load stored rates:', error);
      }
      return null;
    };

    const saveRatesToStorage = rates => {
      try {
        localStorage.setItem(
          RATE_STORAGE_KEY,
          JSON.stringify({
            rates,
            timestamp: Date.now(),
          })
        );
        localStorage.setItem(RATE_LAST_FETCH_KEY, Date.now().toString());
      } catch (error) {
        logger.warn('Failed to save rates to storage:', error);
      }
    };

    const shouldFetchRates = () => {
      try {
        const lastFetch = parseInt(localStorage.getItem(RATE_LAST_FETCH_KEY));
        return !lastFetch || Date.now() - lastFetch > FETCH_INTERVAL;
      } catch {
        return true;
      }
    };

    const fetchLiveRates = async () => {
      // Immediately load stored rates as a fallback
      const stored = loadStoredRates();
      if (stored) {
        // Set stored rates immediately so we have something to work with
        setLiveExchangeRates(stored);
      } else {
        // If no stored rates, use hardcoded rates
        setLiveExchangeRates(conversionRates);
      }

      // Check if service is marked as unavailable
      const serviceUnavailable = localStorage.getItem(
        'exchangeRateServiceUnavailable'
      );
      if (serviceUnavailable) {
        const unavailableUntil = parseInt(serviceUnavailable);
        if (Date.now() < unavailableUntil) {
          // Service is still in cooldown, use already set rates
          return;
        }
        // Cooldown period is over, clear the flag and try again
        localStorage.removeItem('exchangeRateServiceUnavailable');
      }

      // Don't fetch if it's not time yet
      if (!shouldFetchRates()) {
        return; // We already set the stored rates above
      }

      try {
        // Mark the service as temporarily unavailable to prevent multiple concurrent requests
        // This will be cleared if the request succeeds
        localStorage.setItem(
          'exchangeRateServiceUnavailable',
          (Date.now() + 5 * 60 * 1000).toString()
        ); // 5 minute cooldown

        const response = await fetch(CLOUD_FUNCTION_EXCHANGE_RATE_URL, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          mode: 'cors',
          // Add a cache-busting parameter to avoid cached 500 responses
          cache: 'no-cache',
          credentials: 'same-origin',
        });

        // If the response is not ok, throw immediately before trying to parse JSON
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Successfully got response, clear the temporary unavailable flag
        localStorage.removeItem('exchangeRateServiceUnavailable');

        if (!data.error && data.rates) {
          // Verify the response has all required currencies
          const hasAllCurrencies = Object.keys(conversionRates).every(
            currency => data.rates[currency]
          );
          if (hasAllCurrencies) {
            setLiveExchangeRates(data.rates);
            saveRatesToStorage(data.rates);
            return;
          }
        }
        throw new Error('Invalid rate data');
      } catch (error) {
        // For server errors, set a longer cooldown
        if (error.message.includes('500')) {
          // Mark service as unavailable for 6 hours on server error
          localStorage.setItem(
            'exchangeRateServiceUnavailable',
            (Date.now() + 6 * 60 * 60 * 1000).toString()
          );
          logger.warn(
            'Exchange rate API returned 500 error, using fallback rates for 6 hours'
          );
        } else if (error.message === 'Exchange rate service not configured') {
          // Mark service as unavailable for 24 hours on configuration error
          localStorage.setItem(
            'exchangeRateServiceUnavailable',
            (Date.now() + 24 * 60 * 60 * 1000).toString()
          );
          logger.info(
            'Exchange rate service is not configured, using fallback rates'
          );
        } else {
          // For other errors, set a shorter cooldown
          localStorage.setItem(
            'exchangeRateServiceUnavailable',
            (Date.now() + 30 * 60 * 1000).toString()
          ); // 30 minutes
          logger.warn('Using fallback rates due to error:', error);
        }

        // We already set fallback rates at the beginning of this function
      }
    };

    fetchLiveRates(); // Fetch on initial load

    // Retry every 30 minutes
    const intervalId = setInterval(fetchLiveRates, 30 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount

  // Load preferences from Firestore when user context changes and set up real-time listener
  useEffect(() => {
    if (!user) return;

    // Initial load from Firestore
    async function loadUserPreferencesFromFirestore() {
      try {
        const userPrefsRef = doc(db, 'userPreferences', user.uid);
        const userPrefsDoc = await getDoc(userPrefsRef);

        if (userPrefsDoc.exists()) {
          const firestoreData = userPrefsDoc.data();
          if (
            firestoreData.currency &&
            availableCurrencies.find(
              c => c.code === firestoreData.currency.code
            )
          ) {
            const firestoreCurrency = firestoreData.currency;
            setPreferredCurrency(firestoreCurrency);
            localStorage.setItem(
              CURRENCY_PREFERENCE_KEY,
              JSON.stringify(firestoreCurrency)
            );
          } else {
            // Firestore doc exists but currency is invalid or missing, save current local/default
            await saveUserPreferencesToFirestore(preferredCurrency); // Save current preferredCurrency
          }
        } else if (preferredCurrency) {
          // No Firestore doc, but we have a local/default: save it to Firestore
          await saveUserPreferencesToFirestore(preferredCurrency);
        }
      } catch (error) {
        logger.error('Failed to load user preferences from Firestore', error);
      }
    }

    // Set up real-time listener for changes
    const userPrefsRef = doc(db, 'userPreferences', user.uid);
    const unsubscribe = onSnapshot(
      userPrefsRef,
      doc => {
        try {
          if (doc.exists()) {
            const firestoreData = doc.data();
            if (
              firestoreData.currency &&
              availableCurrencies.find(
                c => c.code === firestoreData.currency.code
              )
            ) {
              const firestoreCurrency = firestoreData.currency;
              // Only update if the currency has actually changed
              if (firestoreCurrency.code !== preferredCurrency.code) {
                logger.info(
                  'Currency preference updated from another device:',
                  firestoreCurrency
                );
                setPreferredCurrency(firestoreCurrency);
                localStorage.setItem(
                  CURRENCY_PREFERENCE_KEY,
                  JSON.stringify(firestoreCurrency)
                );
              }
            }
          }
        } catch (error) {
          logger.error(
            'Error in currency preference real-time listener:',
            error
          );
        }
      },
      error => {
        logger.error('Error setting up currency preference listener:', error);
      }
    );

    loadUserPreferencesFromFirestore();

    // Clean up listener when component unmounts or user changes
    return () => unsubscribe();
  }, [user]); // Removed preferredCurrency from dependency array to avoid loop on initial save

  // Save preferences to Firestore (takes currencyToSave to handle initial save correctly)
  const saveUserPreferencesToFirestore = async currencyToSave => {
    if (!user) return;

    try {
      const userPrefsRef = doc(db, 'userPreferences', user.uid);
      // Store the currency object under the field name 'currency' in Firestore
      await setDoc(userPrefsRef, { currency: currencyToSave }, { merge: true });
      logger.debug('User preferences saved to Firestore:', currencyToSave);
    } catch (error) {
      logger.error('Failed to save user preferences to Firestore', error);
    }
  };

  // Update user's preferred currency
  const updatePreferredCurrency = async newCurrencyObject => {
    if (!availableCurrencies.find(c => c.code === newCurrencyObject.code)) {
      logger.warn('Attempted to set invalid currency:', newCurrencyObject);
      return;
    }
    // Local state and storage updates will also happen via the Firestore listener
    // but we set them immediately for a responsive UI
    setPreferredCurrency(newCurrencyObject);
    localStorage.setItem(
      CURRENCY_PREFERENCE_KEY,
      JSON.stringify(newCurrencyObject)
    );
    await saveUserPreferencesToFirestore(newCurrencyObject);
  };

  // --- Internal Core Conversion and Formatting Logic ---

  const _convertAmount = (amount, fromCurrencyCode, toCurrencyCode) => {
    // Handle invalid inputs
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 0;
    }

    // If converting to the same currency, no conversion needed
    if (fromCurrencyCode === toCurrencyCode) {
      return amount;
    }

    try {
      // Use hardcoded rates if live rates aren't available
      const rates = liveExchangeRates || conversionRates;

      // Validate currency codes
      if (!rates[fromCurrencyCode]) {
        logger.error(
          `Missing rate for ${fromCurrencyCode}, using 1:1 conversion`
        );
        return amount;
      }
      if (!rates[toCurrencyCode]) {
        logger.error(
          `Missing rate for ${toCurrencyCode}, using 1:1 conversion`
        );
        return amount;
      }

      // Convert to USD first (our base currency)
      let amountInUSD;
      if (fromCurrencyCode === 'USD') {
        amountInUSD = amount;
      } else {
        const fromRate = rates[fromCurrencyCode];
        if (!fromRate || fromRate <= 0) {
          logger.error(`Invalid rate for ${fromCurrencyCode}: ${fromRate}`);
          return amount;
        }
        amountInUSD = amount / fromRate;
      }

      // Then convert from USD to target currency
      const toRate = rates[toCurrencyCode];
      if (!toRate || toRate <= 0) {
        logger.error(`Invalid rate for ${toCurrencyCode}: ${toRate}`);
        return amount;
      }
      const result = amountInUSD * toRate;

      // Validate result
      if (!isFinite(result)) {
        logger.error('Invalid conversion result', {
          amount,
          fromCurrencyCode,
          toCurrencyCode,
          result,
          rates: {
            from: rates[fromCurrencyCode],
            to: rates[toCurrencyCode],
          },
        });
        return amount;
      }

      // For JPY, round to whole numbers
      if (toCurrencyCode === 'JPY') {
        return Math.round(result);
      }

      // For other currencies, keep 2 decimal places
      return Math.round(result * 100) / 100;
    } catch (error) {
      logger.error('Currency conversion error', {
        error,
        amount,
        fromCurrencyCode,
        toCurrencyCode,
      });
      return amount;
    }
  };

  const _formatUsingIntl = (amount, currencyCodeForFormatting) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      logger.warn('Invalid amount for formatting:', amount);
      return ''; // Or a placeholder like 'N/A'
    }

    try {
      // Intl.NumberFormat handles JPY (no decimals) and other currencies correctly by default based on locale rules.
      // navigator.language is preferred for user's locale, fallback to 'en-US'.
      return new Intl.NumberFormat(navigator.language || 'en-US', {
        style: 'currency',
        currency: currencyCodeForFormatting,
      }).format(amount);
    } catch (error) {
      logger.error('Failed to format price with Intl.NumberFormat', error);
      const currencyInfo = availableCurrencies.find(
        c => c.code === currencyCodeForFormatting
      );
      const symbol = currencyInfo
        ? currencyInfo.symbol
        : currencyCodeForFormatting;
      const fixedDecimals = currencyCodeForFormatting === 'JPY' ? 0 : 2;
      return `${symbol}${amount.toFixed(fixedDecimals)}`; // Fallback basic formatting
    }
  };

  // --- Public API Functions ---

  /**
   * Converts an amount from its original currency to the user's preferred display currency.
   * @param {number|string} originalAmount - The amount in the original currency.
   * @param {string} originalCurrencyCode - The currency code of the original amount (e.g., 'USD', 'AUD').
   * @returns {number} The converted amount in the user's preferred currency.
   */
  const convertToUserCurrency = (originalAmount, originalCurrencyCode) => {
    const numericAmount =
      typeof originalAmount === 'string'
        ? parseFloat(originalAmount)
        : originalAmount;
    return _convertAmount(
      numericAmount,
      originalCurrencyCode,
      preferredCurrency.code
    );
  };

  /**
   * Converts an amount from the user's preferred display currency back to a target original currency.
   * Useful for saving edits made in the display currency back to the database in its original currency.
   * @param {number|string} amountInUserPref - The amount in the user's preferred currency.
   * @param {string} targetOriginalCurrencyCode - The target currency code to convert back to (e.g., 'USD', 'AUD').
   * @returns {number} The converted amount in the target original currency.
   */
  const convertFromUserCurrency = (
    amountInUserPref,
    targetOriginalCurrencyCode
  ) => {
    const numericAmount =
      typeof amountInUserPref === 'string'
        ? parseFloat(amountInUserPref)
        : amountInUserPref;
    return _convertAmount(
      numericAmount,
      preferredCurrency.code,
      targetOriginalCurrencyCode
    );
  };

  /**
   * Formats an amount that is ALREADY in the user's preferred currency for display.
   * @param {number|string} amountInUserPref - The amount (assumed to be in the user's preferred currency).
   * @returns {string} The formatted currency string.
   */
  const formatPreferredCurrency = amountInUserPref => {
    const numericAmount =
      typeof amountInUserPref === 'string'
        ? parseFloat(amountInUserPref)
        : amountInUserPref;
    return _formatUsingIntl(numericAmount, preferredCurrency.code);
  };

  /**
   * Converts an amount from its original currency to the user's preferred currency AND formats it for display.
   * @param {number|string} originalAmount - The amount in the original currency.
   * @param {string} originalCurrencyCode - The currency code of the original amount (e.g., 'USD', 'AUD').
   * @returns {string} The formatted currency string in the user's preferred currency.
   */
  const formatAmountForDisplay = (originalAmount, originalCurrencyCode) => {
    const numericAmount =
      typeof originalAmount === 'string'
        ? parseFloat(originalAmount)
        : originalAmount;
    const convertedAmount = convertToUserCurrency(
      numericAmount,
      originalCurrencyCode
    );
    return _formatUsingIntl(convertedAmount, preferredCurrency.code);
  };

  const contextValue = {
    preferredCurrency, // The user's selected currency object {code, symbol, name}
    updatePreferredCurrency, // Function to change the preferred currency
    conversionRates, // The raw conversion rates object (USD base)
    availableCurrencies, // List of available currency objects
    liveExchangeRates, // Expose live rates (could be null)

    // New core API functions
    convertToUserCurrency,
    convertFromUserCurrency,
    formatPreferredCurrency, // Use if amount is already in preferred currency
    formatAmountForDisplay, // Use if amount is in an original currency and needs conversion + formatting
  };

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      'useUserPreferences must be used within a UserPreferencesProvider'
    );
  }
  return context;
}
