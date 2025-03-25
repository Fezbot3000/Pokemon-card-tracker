import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage, defaulting to true for dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Apply dark mode class to HTML element and save to localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      background: isDarkMode ? '#0B0F19' : '#ffffff',
      card: isDarkMode ? '#1B2131' : '#ffffff',
      cardHover: isDarkMode ? '#252B3B' : '#f9fafb',
      text: isDarkMode ? '#ffffff' : '#111827',
      textSecondary: isDarkMode ? '#9CA3AF' : '#4B5563',
      textTertiary: isDarkMode ? '#6B7280' : '#6B7280',
      border: isDarkMode ? 'rgba(75, 85, 99, 0.5)' : '#e5e7eb',
      primary: '#4318FF',
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 