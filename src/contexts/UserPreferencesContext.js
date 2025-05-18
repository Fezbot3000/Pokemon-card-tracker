import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../design-system/contexts/AuthContext';
import logger from '../utils/logger';

// Create context
const UserPreferencesContext = createContext();

// Local storage key for currency preference
const CURRENCY_PREFERENCE_KEY = 'pokemon_tracker_currency_preference';

// Available currencies
export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

// Approximate conversion rates (as of May 2025)
// These are relative to USD (1 USD = X of currency)
const conversionRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.51,
  CAD: 1.37,
  JPY: 109.73
};

export function UserPreferencesProvider({ children }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(() => {
    try {
      // Try to get from localStorage first
      const savedCurrency = localStorage.getItem(CURRENCY_PREFERENCE_KEY);
      if (savedCurrency) {
        return JSON.parse(savedCurrency);
      }
      // Default to USD if not found
      return currencies[0];
    } catch (error) {
      logger.error('Failed to load currency preference from localStorage', error);
      return currencies[0]; // Default to USD
    }
  });

  // Load preferences from Firestore when user changes
  useEffect(() => {
    async function loadUserPreferences() {
      if (!user) return;
      
      try {
        const userPrefsRef = doc(db, 'userPreferences', user.uid);
        const userPrefsDoc = await getDoc(userPrefsRef);
        
        if (userPrefsDoc.exists() && userPrefsDoc.data().currency) {
          const firestoreCurrency = userPrefsDoc.data().currency;
          setCurrency(firestoreCurrency);
          
          // Update localStorage
          localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(firestoreCurrency));
        } else if (currency) {
          // If we have a local currency but not in Firestore, save it to Firestore
          await saveUserPreferencesToFirestore();
        }
      } catch (error) {
        logger.error('Failed to load user preferences from Firestore', error);
      }
    }
    
    loadUserPreferences();
  }, [user]);

  // Save preferences to Firestore
  const saveUserPreferencesToFirestore = async () => {
    if (!user) return;
    
    try {
      const userPrefsRef = doc(db, 'userPreferences', user.uid);
      await setDoc(userPrefsRef, { currency }, { merge: true });
      logger.debug('User preferences saved to Firestore');
    } catch (error) {
      logger.error('Failed to save user preferences to Firestore', error);
    }
  };

  // Update currency preference
  const updateCurrency = async (newCurrency) => {
    setCurrency(newCurrency);
    
    try {
      // Save to localStorage
      localStorage.setItem(CURRENCY_PREFERENCE_KEY, JSON.stringify(newCurrency));
      
      // Save to Firestore if user is logged in
      if (user) {
        await saveUserPreferencesToFirestore();
      }
    } catch (error) {
      logger.error('Failed to save currency preference', error);
    }
  };

  // Convert amount from one currency to another
  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!amount && amount !== 0) return 0;
    if (!fromCurrency || !toCurrency) return amount;
    if (fromCurrency === toCurrency) return amount;
    
    try {
      // Parse the amount if it's a string
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numericAmount)) return 0;
      
      // Convert to USD first (as base currency)
      const amountInUSD = numericAmount / conversionRates[fromCurrency];
      // Then convert from USD to target currency
      return amountInUSD * conversionRates[toCurrency];
    } catch (error) {
      logger.error('Failed to convert currency', error);
      return amount;
    }
  };

  // Format price according to currency
  const formatPrice = (amount) => {
    if (!amount && amount !== 0) return '';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code
      }).format(amount);
    } catch (error) {
      logger.error('Failed to format price', error);
      return `${currency.symbol}${amount}`;
    }
  };

  // Function to display a price in the user's preferred currency
  const displayPrice = (amount, originalCurrency) => {
    if (!amount && amount !== 0) return '';
    
    try {
      // If no original currency is specified, assume it's in the user's currency
      const sourceCurrency = originalCurrency || currency.code;
      
      // Convert the amount if needed
      let convertedAmount = amount;
      if (sourceCurrency !== currency.code) {
        convertedAmount = convertCurrency(amount, sourceCurrency, currency.code);
      }
      
      // Format the converted amount
      return formatPrice(convertedAmount);
    } catch (error) {
      logger.error('Failed to display price', error);
      return `${currency.symbol}${amount}`;
    }
  };

  const contextValue = {
    currency,
    updateCurrency,
    formatPrice,
    convertCurrency,
    displayPrice,
    availableCurrencies: currencies
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
