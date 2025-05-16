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
// Import error suppression utilities
import { initErrorSuppression } from './utils/errorHandler';
import initNetworkErrorSuppression from './utils/networkErrorSuppressor';

// Disable Firebase debug logging for production readiness
window.localStorage.removeItem('debug');


// Initialize error suppression to clean up console logs
initErrorSuppression();

// Initialize network error suppression to handle Firestore connection issues
initNetworkErrorSuppression();

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
    <RouterProvider router={router} />
  </React.StrictMode>
);

// Only report web vitals in development mode
if (process.env.NODE_ENV !== 'production') {
  reportWebVitals();
}