import React from 'react';
import ReactDOM from 'react-dom/client';
// Import CSS files in the correct order to ensure proper cascade
import './styles/design-system.css';  // Base design tokens and variables
import './styles/main.css';           // Core styles with Tailwind
import './styles/black-background.css'; // Dark mode styling
import App from './App';
import reportWebVitals from './reportWebVitals';
// Import environment validation before Firebase initialization
import './env';

// Enable Firebase debug logging in development
if (process.env.NODE_ENV === 'development') {
  window.localStorage.setItem('debug', 'firebase:*');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();