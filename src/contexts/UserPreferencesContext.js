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
const CLOUD_FUNCTION_EXCHANGE_RATE_URL = 'https://us-central1-mycardtracker-c8479.cloudfunctions.net/getExchangeRates';

// Available currencies
export const availableCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

const AUD_CURRENCY_INFO = availableCurrencies.find(c => c.code === 'AUD') || availableCurrencies[0];

// Approximate conversion rates (as of a defined point in time, e.g., May 2025 for simulation)
// Base Currency: USD (1 USD = X of the specified currency)
// These rates should be periodically reviewed and updated if managing manually.
// For a production system, fetching these from a reliable API is recommended.
const conversionRates = {
  USD: 1,       // Base
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.51,
  CAD: 1.37,
  JPY: 109.73   // Note: JPY often has higher values, e.g., 1 USD ~ 150 JPY in reality (May 2024)
};

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
      logger.error('Failed to load currency preference from localStorage', error);
      return AUD_CURRENCY_INFO; // Default to AUD on error
    }
  });

  const [liveExchangeRates, setLiveExchangeRates] = useState(null); // State for live rates

  // Fetch live exchange rates on mount or when user changes
  useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const response = await fetch(CLOUD_FUNCTION_EXCHANGE_RATE_URL); // New call to Cloud Function
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!data.error && data.rates) { // New check for Cloud Function response
          setLiveExchangeRates(data.rates); // Use data.rates from Cloud Function
          logger.info('Live exchange rates fetched successfully via proxy.', data.rates);
        } else {
          logger.error('Failed to fetch live exchange rates via proxy:', data.message || 'Invalid API response format from proxy', data);
          setLiveExchangeRates(null); // Fallback or ensure it's handled
        }
      } catch (error) {
        logger.error('Failed to fetch live exchange rates via proxy:', error);
        setLiveExchangeRates(null); // Fallback to null if error
      }
    };

    fetchLiveRates(); // Fetch on initial load
    // Consider re-fetching periodically or based on other triggers if needed
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
          if (firestoreData.currency && availableCurrencies.find(c => c.code === firestoreData.currency.code)) {
            const firestoreCurrency = firestoreData.currency;
            setPreferredCurrency(firestoreCurrency);
            localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(firestoreCurrency));
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
    const unsubscribe = onSnapshot(userPrefsRef, (doc) => {
      try {
        if (doc.exists()) {
          const firestoreData = doc.data();
          if (firestoreData.currency && availableCurrencies.find(c => c.code === firestoreData.currency.code)) {
            const firestoreCurrency = firestoreData.currency;
            // Only update if the currency has actually changed
            if (firestoreCurrency.code !== preferredCurrency.code) {
              logger.info('Currency preference updated from another device:', firestoreCurrency);
              setPreferredCurrency(firestoreCurrency);
              localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(firestoreCurrency));
            }
          }
        }
      } catch (error) {
        logger.error('Error in currency preference real-time listener:', error);
      }
    }, (error) => {
      logger.error('Error setting up currency preference listener:', error);
    });
    
    loadUserPreferencesFromFirestore();
    
    // Clean up listener when component unmounts or user changes
    return () => unsubscribe();
  }, [user]); // Removed preferredCurrency from dependency array to avoid loop on initial save

  // Save preferences to Firestore (takes currencyToSave to handle initial save correctly)
  const saveUserPreferencesToFirestore = async (currencyToSave) => {
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
  const updatePreferredCurrency = async (newCurrencyObject) => {
    if (!availableCurrencies.find(c => c.code === newCurrencyObject.code)) {
      logger.warn('Attempted to set invalid currency:', newCurrencyObject);
      return;
    }
    // Local state and storage updates will also happen via the Firestore listener
    // but we set them immediately for a responsive UI
    setPreferredCurrency(newCurrencyObject);
    localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(newCurrencyObject));
    await saveUserPreferencesToFirestore(newCurrencyObject);
  };

  // --- Internal Core Conversion and Formatting Logic ---
  
  const _convertAmount = (amount, fromCurrencyCode, toCurrencyCode) => {
    if (fromCurrencyCode === toCurrencyCode) return amount;
    if (amount === 0 || isNaN(amount)) return 0;

    const ratesToUse = liveExchangeRates || conversionRates;

    // Check if both currencies are in the rates object
    if (!ratesToUse[fromCurrencyCode] || !ratesToUse[toCurrencyCode]) {
      logger.warn(
        `Missing rate for ${fromCurrencyCode} or ${toCurrencyCode}. Using 1:1 as fallback. Live rates available: ${!!liveExchangeRates}`,
        { fromCurrencyCode, toCurrencyCode, availableRates: Object.keys(ratesToUse) }
      );
      // Fallback: if a rate is missing (e.g., new currency not in hardcoded list and API fails)
      // try direct conversion if one is USD, otherwise assume 1:1 for safety to avoid NaN
      // This part of fallback might need more robust handling depending on how critical direct match is.
      if (fromCurrencyCode === 'USD') return amount * (ratesToUse[toCurrencyCode] || 1);
      if (toCurrencyCode === 'USD') return amount / (ratesToUse[fromCurrencyCode] || 1);
      return amount; // Or throw an error, or handle more gracefully
    }

    let amountInBase = amount;
    // If 'fromCurrency' is not the base (USD for both rate sets), convert it to base first
    if (fromCurrencyCode !== 'USD') {
      amountInBase = amount / ratesToUse[fromCurrencyCode];
    }

    // Convert from base to the target currency
    const convertedAmount = amountInBase * ratesToUse[toCurrencyCode];
    
    // For JPY, typically no decimals. For others, 2 decimals.
    const isJPY = toCurrencyCode === 'JPY';
    return isJPY ? Math.round(convertedAmount) : parseFloat(convertedAmount.toFixed(2));
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
      const currencyInfo = availableCurrencies.find(c => c.code === currencyCodeForFormatting);
      const symbol = currencyInfo ? currencyInfo.symbol : currencyCodeForFormatting;
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
    const numericAmount = typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount;
    return _convertAmount(numericAmount, originalCurrencyCode, preferredCurrency.code);
  };

  /**
   * Converts an amount from the user's preferred display currency back to a target original currency.
   * Useful for saving edits made in the display currency back to the database in its original currency.
   * @param {number|string} amountInUserPref - The amount in the user's preferred currency.
   * @param {string} targetOriginalCurrencyCode - The target currency code to convert back to (e.g., 'USD', 'AUD').
   * @returns {number} The converted amount in the target original currency.
   */
  const convertFromUserCurrency = (amountInUserPref, targetOriginalCurrencyCode) => {
    const numericAmount = typeof amountInUserPref === 'string' ? parseFloat(amountInUserPref) : amountInUserPref;
    return _convertAmount(numericAmount, preferredCurrency.code, targetOriginalCurrencyCode);
  };

  /**
   * Formats an amount that is ALREADY in the user's preferred currency for display.
   * @param {number|string} amountInUserPref - The amount (assumed to be in the user's preferred currency).
   * @returns {string} The formatted currency string.
   */
  const formatPreferredCurrency = (amountInUserPref) => {
    const numericAmount = typeof amountInUserPref === 'string' ? parseFloat(amountInUserPref) : amountInUserPref;
    return _formatUsingIntl(numericAmount, preferredCurrency.code);
  };

  /**
   * Converts an amount from its original currency to the user's preferred currency AND formats it for display.
   * @param {number|string} originalAmount - The amount in the original currency.
   * @param {string} originalCurrencyCode - The currency code of the original amount (e.g., 'USD', 'AUD').
   * @returns {string} The formatted currency string in the user's preferred currency.
   */
  const formatAmountForDisplay = (originalAmount, originalCurrencyCode) => {
    const numericAmount = typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount;
    const convertedAmount = convertToUserCurrency(numericAmount, originalCurrencyCode);
    return _formatUsingIntl(convertedAmount, preferredCurrency.code);
  };

  const contextValue = {
    preferredCurrency,         // The user's selected currency object {code, symbol, name}
    updatePreferredCurrency,   // Function to change the preferred currency
    conversionRates,           // The raw conversion rates object (USD base)
    availableCurrencies,       // List of available currency objects
    liveExchangeRates,         // Expose live rates (could be null)
    
    // New core API functions
    convertToUserCurrency,
    convertFromUserCurrency,
    formatPreferredCurrency,   // Use if amount is already in preferred currency
    formatAmountForDisplay,    // Use if amount is in an original currency and needs conversion + formatting
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
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
