// currencyTestUtils.js - For testing currency conversion and formatting logic

// --- Replicated constants and core logic from UserPreferencesContext.js for testing ---
const availableCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

const conversionRates = {
  USD: 1,       // Base
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.51,
  CAD: 1.37,
  JPY: 109.73  // Example rate, might differ from context's example for JPY value illustration
};

const _testConvertAmount = (amount, fromCurrencyCode, toCurrencyCode) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    console.warn('[TestUtil] Invalid amount for conversion:', amount);
    return 0;
  }
  if (!fromCurrencyCode || !toCurrencyCode || fromCurrencyCode === toCurrencyCode) {
    return amount;
  }
  if (!conversionRates[fromCurrencyCode] || !conversionRates[toCurrencyCode]) {
    console.error(`[TestUtil] Conversion rate not found for ${fromCurrencyCode} or ${toCurrencyCode}`);
    return amount;
  }

  const amountInBase = amount / conversionRates[fromCurrencyCode];
  let convertedAmount = amountInBase * conversionRates[toCurrencyCode];

  if (toCurrencyCode === 'JPY') {
    convertedAmount = Math.round(convertedAmount);
  } else {
    convertedAmount = Math.round(convertedAmount * 100) / 100;
  }
  return convertedAmount;
};

const _testFormatUsingIntl = (amount, currencyCodeForFormatting, locale = 'en-US') => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    console.warn('[TestUtil] Invalid amount for formatting:', amount);
    return 'N/A'; // Placeholder for invalid format
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCodeForFormatting,
    }).format(amount);
  } catch (error) {
    console.error('[TestUtil] Failed to format price with Intl.NumberFormat', error);
    const currencyInfo = availableCurrencies.find(c => c.code === currencyCodeForFormatting);
    const symbol = currencyInfo ? currencyInfo.symbol : currencyCodeForFormatting;
    const fixedDecimals = currencyCodeForFormatting === 'JPY' ? 0 : 2;
    return `${symbol}${amount.toFixed(fixedDecimals)}`;
  }
};

// --- Test functions mirroring the context's public API ---
const testConvertToUserCurrency = (originalAmount, originalCurrencyCode, preferredCurrencyCode) => {
  const numericAmount = typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount;
  return _testConvertAmount(numericAmount, originalCurrencyCode, preferredCurrencyCode);
};

const testConvertFromUserCurrency = (amountInUserPref, targetOriginalCurrencyCode, preferredCurrencyCode) => {
  const numericAmount = typeof amountInUserPref === 'string' ? parseFloat(amountInUserPref) : amountInUserPref;
  return _testConvertAmount(numericAmount, preferredCurrencyCode, targetOriginalCurrencyCode);
};

const testFormatAmountForDisplay = (originalAmount, originalCurrencyCode, preferredCurrencyCode, locale = 'en-US') => {
  const numericAmount = typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount;
  const convertedAmount = testConvertToUserCurrency(numericAmount, originalCurrencyCode, preferredCurrencyCode);
  return _testFormatUsingIntl(convertedAmount, preferredCurrencyCode, locale);
};

const testFormatPreferredCurrency = (amountInUserPref, preferredCurrencyCode, locale = 'en-US') => {
  const numericAmount = typeof amountInUserPref === 'string' ? parseFloat(amountInUserPref) : amountInUserPref;
  return _testFormatUsingIntl(numericAmount, preferredCurrencyCode, locale);
};

// --- Test Cases ---
console.log('--- Testing convertToUserCurrency ---');
let preferred = 'AUD';
console.log(`(Preferred: ${preferred}) 100 USD to ${preferred}:`, testConvertToUserCurrency(100, 'USD', preferred), '(Expected: 151)');
console.log(`(Preferred: ${preferred}) 100 JPY to ${preferred}:`, testConvertToUserCurrency(100, 'JPY', preferred), '(Expected: 1.38 or 1.37 based on exact JPY rate)'); // 100/109.73 * 1.51 = 1.376...
console.log(`(Preferred: ${preferred}) -100 USD to ${preferred}:`, testConvertToUserCurrency(-100, 'USD', preferred), '(Expected: -151)');
console.log(`(Preferred: ${preferred}) null USD to ${preferred}:`, testConvertToUserCurrency(null, 'USD', preferred), '(Expected: 0)');
console.log(`(Preferred: ${preferred}) undefined USD to ${preferred}:`, testConvertToUserCurrency(undefined, 'USD', preferred), '(Expected: 0)');
console.log(`(Preferred: ${preferred}) 100 AUD to ${preferred}:`, testConvertToUserCurrency(100, 'AUD', preferred), '(Expected: 100)');
console.log(`(Preferred: ${preferred}) 100 XXX to ${preferred}:`, testConvertToUserCurrency(100, 'XXX', preferred), '(Expected: 100 and error log)');

preferred = 'JPY';
console.log(`(Preferred: ${preferred}) 100 USD to ${preferred}:`, testConvertToUserCurrency(100, 'USD', preferred), '(Expected: 10973)');

console.log('\n--- Testing convertFromUserCurrency ---');
preferred = 'AUD';
console.log(`(Preferred: ${preferred}) 151 AUD to USD:`, testConvertFromUserCurrency(151, 'USD', preferred), '(Expected: 100)');
preferred = 'JPY';
console.log(`(Preferred: ${preferred}) 10973 JPY to USD:`, testConvertFromUserCurrency(10973, 'USD', preferred), '(Expected: 100)');

console.log('\n--- Round-trip Sanity Check ---');
preferred = 'AUD';
const originalUSD = 123.45;
const valInAUD = testConvertToUserCurrency(originalUSD, 'USD', preferred);
const valBackInUSD = testConvertFromUserCurrency(valInAUD, 'USD', preferred);
console.log(`(Preferred: ${preferred}) Original ${originalUSD} USD -> ${valInAUD} AUD -> ${valBackInUSD} USD. (Expected close to ${originalUSD})`);

preferred = 'JPY';
const originalAUDforJPY = 100;
const valInJPY = testConvertToUserCurrency(originalAUDforJPY, 'AUD', preferred); // 100/1.51 * 109.73 = 7266.88... -> 7267
const valBackInAUDfromJPY = testConvertFromUserCurrency(valInJPY, 'AUD', preferred); // 7267/109.73 * 1.51 = 100.004... -> 100
console.log(`(Preferred: ${preferred}) Original ${originalAUDforJPY} AUD -> ${valInJPY} JPY -> ${valBackInAUDfromJPY} AUD. (Expected close to ${originalAUDforJPY})`);

console.log('\n--- Testing formatAmountForDisplay ---');
preferred = 'JPY'; // Test JPY display (no decimals)
console.log(`(DisplayIn: ${preferred}) 100 USD:`, testFormatAmountForDisplay(100, 'USD', preferred, 'ja-JP'), '(Expected: ¥10,973)');
preferred = 'AUD'; // Test AUD display (2 decimals)
console.log(`(DisplayIn: ${preferred}) 100 JPY:`, testFormatAmountForDisplay(100, 'JPY', preferred, 'en-AU'), '(Expected: A$1.38 or A$1.37)');

const largeValUSD = 1234567.89;
console.log(`(DisplayIn: ${preferred}) ${largeValUSD} USD:`, testFormatAmountForDisplay(largeValUSD, 'USD', preferred, 'en-AU'), `(Expected: A$${(largeValUSD * 1.51).toLocaleString('en-AU', {minimumFractionDigits: 2, maximumFractionDigits: 2})})`);
console.log(`(DisplayIn: ${preferred}) -100 USD:`, testFormatAmountForDisplay(-100, 'USD', preferred, 'en-AU'), '(Expected: -A$151.00)');
console.log(`(DisplayIn: ${preferred}) 0 USD:`, testFormatAmountForDisplay(0, 'USD', preferred, 'en-AU'), '(Expected: A$0.00)');
console.log(`(DisplayIn: ${preferred}) null USD:`, testFormatAmountForDisplay(null, 'USD', preferred, 'en-AU'), '(Expected: N/A)');

console.log('\n--- Testing formatPreferredCurrency ---');
preferred = 'AUD';
console.log(`(FormatIn: ${preferred}) 151.00 ${preferred}:`, testFormatPreferredCurrency(151.00, preferred, 'en-AU'), '(Expected: A$151.00)');
console.log(`(FormatIn: ${preferred}) 12345.67 ${preferred}:`, testFormatPreferredCurrency(12345.67, preferred, 'en-AU'), '(Expected: A$12,345.67)');
preferred = 'JPY';
console.log(`(FormatIn: ${preferred}) 10973 ${preferred}:`, testFormatPreferredCurrency(10973, preferred, 'ja-JP'), '(Expected: ¥10,973)');
console.log(`(FormatIn: ${preferred}) 0 ${preferred}:`, testFormatPreferredCurrency(0, preferred, 'ja-JP'), '(Expected: ¥0)');

// To run this file, navigate to its directory in the terminal and use: node currencyTestUtils.js
