// This file pre-loads environment variables and validates they exist
// Import this file before any Firebase initialization

const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN', 
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
  'REACT_APP_FIREBASE_CLIENT_ID'
];

const validateEnvironment = () => {
  const missing = [];
  const present = [];
  
  // Show the NODE_ENV for debugging
  if (typeof process !== 'undefined' && process.env) {
    console.log('Current NODE_ENV:', process.env.NODE_ENV);
    console.log('Browser environment detected:', typeof window !== 'undefined');
  }
  
  // Check if running in browser/React environment (process.env differs between Node.js and browser)
  // For React, environment variables must be prefixed with REACT_APP_
  if (typeof process !== 'undefined' && process.env) {
    requiredEnvVars.forEach(varName => {
      try {
        const value = process.env[varName];
        if (!value || value === 'undefined' || value.trim() === '') {
          missing.push(varName);
        } else {
          present.push(varName);
          // Show the first few characters of each variable for debugging
          // (avoid showing full API keys in logs)
          const safeValue = value.substring(0, 5) + '...' + value.substring(value.length - 3);
          console.log(`✓ ${varName}: ${safeValue}`);
        }
      } catch (error) {
        missing.push(varName);
      }
    });
  } else {
  }
  
  if (missing.length > 0) {
    // Throw error in production, just warn in development
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables for Firebase');
    }
  } else {
  }
};

validateEnvironment();

export default validateEnvironment; 