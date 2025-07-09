import React from 'react';
import ReactDOM from 'react-dom/client';
// Import CSS files in the correct order to ensure proper cascade
import './styles/globals.css'; // Modernized global styles with design tokens
import './styles/main.css'; // Primary layout and component styles
import './styles/utilities.css'; // Custom utility classes
import './styles/ios-fixes.css'; // iOS Safari specific fixes
import { router } from './router';
import { RouterProvider } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
// Import environment validation before Firebase initialization
import './env';
// Import app initialization
import { initializeAppService } from './services/appInitialization';
import logger from './utils/logger';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize the application
initializeAppService()
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
