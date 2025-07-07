import React from 'react';
import ReactDOM from 'react-dom/client';
// Import CSS files in the correct order to ensure proper cascade
import './styles/globals.css'; // Modernized global styles with design tokens
import './styles/utilities.css'; // Custom utility classes
import './styles/ios-fixes.css'; // iOS Safari specific fixes
import App from './App';
import { router } from './router';
import { RouterProvider } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
// Import environment validation before Firebase initialization
import './env';
// Import app initialization
import { initializeApp } from './services/appInitialization';
import logger from './utils/logger';
// Import unified error handler
import { initUnifiedErrorHandler } from './utils/unifiedErrorHandler';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize unified error handler
initUnifiedErrorHandler();

// Initialize the application
initializeApp()
  .then(() => {})
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
