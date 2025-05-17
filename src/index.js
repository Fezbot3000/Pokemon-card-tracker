import React from 'react';
import ReactDOM from 'react-dom/client';
// Import CSS files in the correct order to ensure proper cascade
import './styles/design-system.css';  // Base design tokens and variables
import './styles/main.css';           // Core styles with Tailwind
import './styles/black-background.css'; // Dark mode styling
import App, { router } from './App';
import { RouterProvider } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
// Import environment validation before Firebase initialization
import './env';
// Import app initialization
import { initializeApp } from './services/appInitialization';
import logger from './utils/logger';
// Import error handling utilities - now using targeted approach
import { initErrorSuppression } from './utils/errorHandler';
import initNetworkInterceptors from './utils/networkInterceptor';
import initExtensionLogBlocker from './utils/extensionLogBlocker';
import ErrorBoundary from './components/ErrorBoundary';
// Import subscription manager for proper Firestore subscription handling
import subscriptionManager from './utils/subscriptionManager';

// Disable Firebase debug logging for production readiness
window.localStorage.removeItem('debug');

// Initialize extension log blocker first to prevent 1Password logs
initExtensionLogBlocker();

// Initialize basic error handling
initErrorSuppression();

// Initialize targeted network interceptors for Firebase-specific error handling
initNetworkInterceptors();

// Log the subscription manager initialization
logger.debug('Subscription manager initialized for Firestore subscription tracking');

// Initialize the application
initializeApp()
  .then(() => {
    logger.debug('App initialization complete, rendering React app');
  })
  .catch(error => {
    logger.error('Error during app initialization:', error);
  });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>
);

// Only report web vitals in development mode
if (process.env.NODE_ENV !== 'production') {
  reportWebVitals();
}