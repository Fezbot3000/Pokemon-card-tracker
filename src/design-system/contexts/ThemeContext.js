import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Theme Context for the design system
 *
 * This context provides theme-related functionality (light/dark mode)
 * to all components in the design system.
 */
const ThemeContext = createContext();

/**
 * Theme Provider Component
 *
 * Wraps the application to provide theme functionality
 */
export const ThemeProvider = ({ children, initialTheme = 'light' }) => {
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference in localStorage
    const savedTheme = localStorage.getItem('theme');

    // Check for system preference if no saved preference
    if (!savedTheme) {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      return prefersDark ? 'dark' : 'light';
    }

    return savedTheme || initialTheme;
  });

  // Update theme in localStorage and apply to document
  useEffect(() => {
    localStorage.setItem('theme', theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Set a specific theme
  const setThemeMode = mode => {
    if (mode === 'light' || mode === 'dark') {
      setTheme(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use the theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export default ThemeContext;
