import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

// Import design system components
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import Dropdown, { DropdownItem, DropdownDivider } from '../molecules/Dropdown';

// Import needed contexts and services
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences, availableCurrencies } from '../../contexts/UserPreferencesContext';
import { baseColors } from '../styles/colors';

/**
 * Header component
 * 
 * Main navigation header for the Pokemon card tracker application.
 * Uses the design system components for consistent styling.
 */
const Header = ({ 
  onImportClick,
  onSettingsClick,
  currentView,
  onViewChange,
  isComponentLibrary = false
}) => {
  const [previousView, setPreviousView] = useState(currentView);
  const [isAnimating, setIsAnimating] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth() || { user: null, logout: () => {} };
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);



  // Handle click outside to close currency dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setCurrencyDropdownOpen(false);
      }
    }

    // Add event listener when dropdown is open
    if (currencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currencyDropdownOpen]);

  // Handle view mode change with animation
  const handleViewChange = (newView) => {
    if (newView !== currentView) {
      setPreviousView(currentView);
      setIsAnimating(true);
      
      // Scroll to top of the page when switching tabs
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Call the provided handler
      onViewChange?.(newView);
      
      // Reset animation flag after transition completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Match this with the CSS transition duration
    }
  };

  // If this is being used in the component library, render a simplified version
  if (isComponentLibrary) {
    return (
      <header className="bg-white dark:bg-black fixed top-0 left-0 right-0 z-50">
        {/* Top bar */}
        <div className="border-b border-gray-200 dark:border-[#ffffff1a] py-2 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <img 
                src="/favicon-192x192.png" 
                alt="Pokemon Card Tracker" 
                className="w-8 h-8 rounded-md"
              />
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                Pokemon Card Tracker
              </span>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle theme"
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Main header implementation for the actual application
  return (
    <header className="bg-white dark:bg-black fixed top-0 left-0 right-0 z-50">
      {/* Combined navigation bar */}
      <div className="border-b border-gray-200 dark:border-[#ffffff1a] py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Left side - Logo (hidden on mobile) */}
          <div className="hidden sm:flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <img 
                src="/favicon-192x192.png" 
                alt="Pokemon Card Tracker" 
                className="w-8 h-8 rounded-md"
              />
              <span className="ml-2 font-medium text-gray-900 dark:text-white hidden xs:inline">
                Pokemon Card Tracker
              </span>
            </Link>
          </div>
          
          {/* Navigation tabs - integrated into the top bar */}
          {onViewChange && (
            <div className="flex-1 flex justify-center overflow-x-auto hide-scrollbar mx-4">
              <div className="flex space-x-2">
                {/* Cards Button */}
                <button
                  onClick={() => handleViewChange('cards')}
                  className={`px-3 py-1.5 flex items-center justify-center rounded-full relative transition-colors duration-200 ${
                    currentView === 'cards' 
                      ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon 
                    name="style" 
                    className="mr-1 hidden xs:inline" 
                    color={currentView === 'cards' ? 'white' : 'default'} 
                    size="sm"
                  />
                  <span>Cards</span>
                </button>
                {/* Purchase Invoices Button */}
                <button
                  onClick={() => handleViewChange('purchase-invoices')}
                  className={`px-3 py-1.5 flex items-center justify-center rounded-full relative transition-colors duration-200 ${
                    currentView === 'purchase-invoices' 
                      ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon 
                    name="receipt" 
                    className="mr-1 hidden xs:inline" 
                    color={currentView === 'purchase-invoices' ? 'white' : 'default'} 
                    size="sm"
                  />
                  <span>Purchase Invoices</span>
                </button>
                {/* Sold Items Button */}
                <button
                  onClick={() => handleViewChange('sold-items')}
                  className={`px-3 py-1.5 flex items-center justify-center rounded-full relative transition-colors duration-200 ${
                    currentView === 'sold-items' 
                      ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon 
                    name="sell" 
                    className="mr-1 hidden xs:inline" 
                    color={currentView === 'sold-items' ? 'white' : 'default'} 
                    size="sm"
                  />
                  <span>Sold Items</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Right side - action buttons */}
          <div className="flex items-center space-x-2">
            {/* Currency Dropdown - Visible on all screen sizes */}
            <div className="relative" ref={currencyDropdownRef}>
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="px-2 py-1 flex items-center justify-center rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                aria-label="Change currency"
              >
                <span className="mr-1">{preferredCurrency.symbol}</span>
                <span className="hidden xs:inline">{preferredCurrency.code}</span>
                <Icon name="expand_more" size="sm" className="ml-0.5 hidden xs:inline" />
              </button>
              
              {currencyDropdownOpen && (
                <div 
                  className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                >
                  {availableCurrencies.map((currency) => (
                    <button
                      key={currency.code}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${currency.code === preferredCurrency.code ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''}`}
                      onClick={() => {
                        updatePreferredCurrency(currency);
                        setCurrencyDropdownOpen(false);
                      }}
                    >
                      <span className="mr-2">{currency.symbol}</span>
                      <span>{currency.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Other buttons - Hidden on mobile */}
            <div className="hidden sm:flex items-center space-x-2">
            
            <button
              onClick={toggleTheme}
              className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle theme"
            >
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
            </button>
            
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Settings"
              >
                <Icon name="settings" />
              </button>
            )}
            
            {/* Upload icon removed from main navigation and moved to developer settings */}
            </div>
          </div>
        </div>
      </div>
      

    </header>
  );
};

Header.propTypes = {
  onImportClick: PropTypes.func,
  onSettingsClick: PropTypes.func,
  currentView: PropTypes.oneOf(['cards', 'sold-items', 'purchase-invoices', 'grid', 'list']),
  onViewChange: PropTypes.func,
  isComponentLibrary: PropTypes.bool
};

export default Header;
