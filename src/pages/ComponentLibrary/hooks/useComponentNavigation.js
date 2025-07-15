import { useState, useEffect } from 'react';

/**
 * Custom hook for managing Component Library navigation
 * 
 * @returns {Object} Navigation state and handlers
 */
export const useComponentNavigation = () => {
  const [activeTab, setActiveTab] = useState('atomic');
  const [activeSection, setActiveSection] = useState('colors');

  // Handle URL hash changes for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        if (['atomic', 'composite'].includes(hash)) {
          setActiveTab(hash);
        } else if (
          [
            'colors',
            'buttons',
            'cards',
            'form-elements',
            'modern-forms',
            'navigation',
            'icons',
            'toggle',
            'dropdown',
            'toast',
            'integration-tests',
            'header',
            'modal',
            'card-details-modal',
            'statistics-summary',
            'search-toolbar',
            'login-modal',
            'settings-modal',
            'sold-items-view',
          ].includes(hash)
        ) {
          setActiveSection(hash);
        }
      }
    };

    // Set initial state from URL
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL when navigation changes
  useEffect(() => {
    const hash = `${activeTab}-${activeSection}`;
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    }
  }, [activeTab, activeSection]);

  /**
   * Navigate to a specific tab
   * 
   * @param {string} tab - Tab name to navigate to
   */
  const navigateToTab = (tab) => {
    setActiveTab(tab);
  };

  /**
   * Navigate to a specific section
   * 
   * @param {string} section - Section name to navigate to
   */
  const navigateToSection = (section) => {
    setActiveSection(section);
  };

  /**
   * Navigate to a specific tab and section
   * 
   * @param {string} tab - Tab name
   * @param {string} section - Section name
   */
  const navigateTo = (tab, section) => {
    setActiveTab(tab);
    setActiveSection(section);
  };

  return {
    activeTab,
    activeSection,
    navigateToTab,
    navigateToSection,
    navigateTo,
  };
}; 