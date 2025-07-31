import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';

// Import design system components
import Icon from '../atoms/Icon';

// Import needed contexts and services
import { useTheme } from '../contexts/ThemeContext';
import { useUserPreferences, availableCurrencies } from '../../contexts/UserPreferencesContext';

import LoggingService from '../../services/LoggingService';

/**
 * Header component
 *
 * Main navigation header for the Pokemon card tracker application.
 * Uses the design system components for consistent styling.
 */
const Header = ({
  onSettingsClick,
  currentView,
  onViewChange,

}) => {
  const [, setPreviousView] = useState(null);
  const [, setIsAnimating] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);
  useLocation();

  // Helper function to check if current view is in the sold section
  const isSoldSection = () => {
    return ['sold', 'sold-items', 'purchase-invoices'].includes(currentView);
  };

  // Helper function to check if current view is in the marketplace section
  const isMarketplaceSection = () => {
    return [
      'marketplace',
      'marketplace-selling',
      'marketplace-messages',
    ].includes(currentView);
  };

  // Immediate mobile detection to prevent flash
  const isImmediateMobile =
    typeof window !== 'undefined' && window.innerWidth < 640; // sm breakpoint

  // Handle click outside to close currency dropdown - MOVED BEFORE EARLY RETURN
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target)
      ) {
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

  // Hide header immediately on mobile for cards view to prevent flash
  if (isImmediateMobile && currentView === 'cards') {
    return null;
  }

  // Handle view mode change with animation
  const handleViewChange = newView => {
    try {
      if (newView !== currentView) {
        setPreviousView(currentView);
        setIsAnimating(true);

        // Don't scroll to top when switching between marketplace tabs
        const isMarketplaceView = view => 
          ['marketplace', 'marketplace-selling', 'marketplace-messages'].includes(view);
        
        const isMarketplaceToMarketplace = 
          isMarketplaceView(currentView) && isMarketplaceView(newView);

        if (!isMarketplaceToMarketplace) {
          // Scroll to top of the page when switching tabs (but not between marketplace tabs)
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Call the provided handler with error handling
        if (onViewChange && typeof onViewChange === 'function') {
          // Add a small delay to ensure state updates happen in the correct order
          setTimeout(() => {
            onViewChange(newView);
          }, 0);
        }

        // Reset animation flag after transition completes
        setTimeout(() => {
          setIsAnimating(false);
        }, 300); // Match this with the CSS transition duration
      }
    } catch (error) {
      LoggingService.error('Error changing view in Header:', error);
      // Fallback: try direct view change
      if (onViewChange && typeof onViewChange === 'function') {
        onViewChange(newView);
      }
      setIsAnimating(false);
    }
  };



  // Main header implementation for the actual application
  return (
    <header className="header-responsive fixed inset-x-0 top-0 z-50 bg-white dark:bg-black">
      {/* Combined navigation bar */}
      <div className="flex h-full items-center border-b border-gray-200 px-4 dark:border-[#ffffff1a]">
        <div className="mx-auto flex w-full max-w-7xl items-center">
          {/* Left side - Logo (hidden on mobile) - Fixed width to balance right side */}
          <div className="hidden w-48 items-center sm:flex">
            <Link to="/dashboard" className="flex items-center">
                          <img
              src="/favicon_L-192x192.png"
              alt="Logo"
              className="size-8 rounded-md"
            />
            </Link>
          </div>

          {/* Center - Navigation tabs - Absolutely centered */}
          {onViewChange && (
            <div className="flex flex-1 justify-center">
              {/* Desktop navigation - always visible on larger screens */}
              <div className="hidden space-x-1 sm:flex">
                <button
                  onClick={() => handleViewChange('cards')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    currentView === 'cards'
                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon
                    name="dashboard"
                    className="mr-1 hidden xs:inline"
                    color={currentView === 'cards' ? 'white' : 'default'}
                    size="sm"
                  />
                  <span>Cards</span>
                </button>

                <button
                  onClick={() => handleViewChange('purchase-invoices')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    currentView === 'purchase-invoices'
                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon
                    name="receipt_long"
                    className="mr-1 hidden xs:inline"
                    color={
                      currentView === 'purchase-invoices' ? 'white' : 'default'
                    }
                    size="sm"
                  />
                  <span>Purchase Invoices</span>
                </button>

                <button
                  onClick={() => handleViewChange('sold-items')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    currentView === 'sold-items'
                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
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

                <button
                  onClick={() => handleViewChange('marketplace')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    isMarketplaceSection()
                      ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                      : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon
                    name="storefront"
                    className="mr-1 hidden xs:inline"
                    color={isMarketplaceSection() ? 'white' : 'default'}
                    size="sm"
                  />
                  <span>Marketplace</span>
                </button>
              </div>

              {/* Mobile navigation - contextual based on current view */}
              <div
                className={`flex justify-center space-x-1 sm:hidden ${
                  isSoldSection() || isMarketplaceSection() ? 'w-full' : ''
                }`}
              >
                {/* Hide header completely on Cards page */}
                {currentView === 'cards' ? null : (
                  <>
                    {/* Show Purchase Invoices and Sold Items buttons on any Sold-related page */}
                    {isSoldSection() && (
                      <>
                        <button
                          onClick={() => handleViewChange('purchase-invoices')}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                            currentView === 'purchase-invoices'
                              ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                              : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon
                            name="receipt_long"
                            className="mr-1 hidden xs:inline"
                            color={
                              currentView === 'purchase-invoices'
                                ? 'white'
                                : 'default'
                            }
                            size="sm"
                          />
                          <span>Purchase Invoices</span>
                        </button>

                        <button
                          onClick={() => handleViewChange('sold-items')}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                            currentView === 'sold-items'
                              ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                              : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon
                            name="sell"
                            className="mr-1 hidden xs:inline"
                            color={
                              currentView === 'sold-items' ? 'white' : 'default'
                            }
                            size="sm"
                          />
                          <span>Sold Items</span>
                        </button>
                      </>
                    )}

                    {/* Marketplace navigation tabs */}
                    {isMarketplaceSection() && (
                      <>
                        <button
                          onClick={() => handleViewChange('marketplace')}
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                            currentView === 'marketplace'
                              ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                              : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon
                            name="storefront"
                            className="mr-1 hidden xs:inline"
                            color={
                              currentView === 'marketplace'
                                ? 'white'
                                : 'default'
                            }
                            size="sm"
                          />
                          <span>Marketplace</span>
                        </button>

                        <button
                          onClick={() =>
                            handleViewChange('marketplace-selling')
                          }
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                            currentView === 'marketplace-selling'
                              ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                              : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon
                            name="sell"
                            className="mr-1 hidden xs:inline"
                            color={
                              currentView === 'marketplace-selling'
                                ? 'white'
                                : 'default'
                            }
                            size="sm"
                          />
                          <span>Selling</span>
                        </button>

                        <button
                          onClick={() =>
                            handleViewChange('marketplace-messages')
                          }
                          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                            currentView === 'marketplace-messages'
                              ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                              : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Icon
                            name="chat"
                            className="mr-1 hidden xs:inline"
                            color={
                              currentView === 'marketplace-messages'
                                ? 'white'
                                : 'default'
                            }
                            size="sm"
                          />
                          <span>Messages</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Right side - action buttons - Fixed width to balance left side */}
          <div className="hidden w-48 items-center justify-end space-x-2 sm:flex">
            {/* Currency Dropdown */}
            <div className="relative" ref={currencyDropdownRef}>
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Change currency"
              >
                <span className="mr-1">{preferredCurrency.symbol}</span>
                <span className="hidden xs:inline">
                  {preferredCurrency.code}
                </span>
                <Icon
                  name="expand_more"
                  size="sm"
                  className="ml-0.5 hidden xs:inline"
                />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {availableCurrencies.map(currency => (
                    <button
                      key={currency.code}
                      className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-all duration-200 ${currency.code === preferredCurrency.code ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-sm'}`}
                      onClick={() => {
                        updatePreferredCurrency(currency);
                        setCurrencyDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <span className="mr-2">{currency.symbol}</span>
                        <span>{currency.name}</span>
                      </div>
                      {currency.code === preferredCurrency.code && (
                        <svg className="ml-3 size-4 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Other buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label="Toggle theme"
              >
                <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
              </button>

              {onSettingsClick && (
                <button
                  onClick={onSettingsClick}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Settings"
                >
                  <Icon name="settings" />
                </button>
              )}

              {/* Upload icon removed from main navigation and moved to developer settings */}
            </div>
          </div>

          {/* Mobile right side - Hide completely on invoices and marketplace pages for proper centering */}
          {!isSoldSection() && !isMarketplaceSection() && (
            <div className="flex flex-1 items-center justify-end sm:hidden">
              {onSettingsClick && (
                <button
                  onClick={onSettingsClick}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Settings"
                >
                  <Icon name="settings" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  onSettingsClick: PropTypes.func,
  currentView: PropTypes.oneOf([
    'cards',
    'sold',
    'sold-items',
    'purchase-invoices',
    'marketplace',
    'marketplace-selling',
    'marketplace-messages',
    'grid',
    'list',
  ]),
  onViewChange: PropTypes.func,

};

export default Header;
