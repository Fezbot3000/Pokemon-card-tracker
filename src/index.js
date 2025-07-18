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
import ErrorBoundary from './components/ErrorBoundary';
import { shouldDeferFirebase } from './utils/mobileOptimizations';

// Performance optimization: defer heavy initialization on mobile
const initializeApp = async () => {
  if (shouldDeferFirebase()) {
    // Defer heavy services on mobile for faster initial render
    setTimeout(async () => {
      const { initializeAppService } = await import('./services/appInitialization');
      const logger = await import('./utils/logger');
      
      initializeAppService()
        .then(() => {})
        .catch(error => {
          logger.default.error('Error during app initialization:', error);
        });
    }, 1000); // Defer by 1 second on mobile
  } else {
    // Initialize immediately on desktop
    const { initializeAppService } = await import('./services/appInitialization');
    const logger = await import('./utils/logger');
    
    initializeAppService()
      .then(() => {})
      .catch(error => {
        logger.default.error('Error during app initialization:', error);
      });
  }
};

// Initialize the application with performance optimization
initializeApp();

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
