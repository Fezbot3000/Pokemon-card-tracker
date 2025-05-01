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

// Enable Firebase debug logging in development
if (process.env.NODE_ENV === 'development') {
  window.localStorage.setItem('debug', 'firebase:*');
}

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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();