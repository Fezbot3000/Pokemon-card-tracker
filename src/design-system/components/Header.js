import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

// Import design system components
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import Dropdown, { DropdownItem, DropdownDivider } from '../molecules/Dropdown';
import Modal from '../molecules/Modal';

// Import needed contexts and services
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/notifications';
import { baseColors } from '../styles/colors';

/**
 * Header component
 * 
 * Main navigation header for the Pokemon card tracker application.
 * Uses the design system components for consistent styling.
 */
const Header = ({ 
  selectedCollection = 'Default Collection', 
  collections = [], 
  onCollectionChange, 
  onImportClick,
  onSettingsClick,
  currentView,
  onViewChange,
  refreshCollections,
  onAddCollection,
  hideCollectionSelector = false,
  isComponentLibrary = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [previousView, setPreviousView] = useState(currentView);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef(null);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth() || { user: null, logout: () => {} };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle view mode change with animation
  const handleViewChange = (newView) => {
    if (newView !== currentView) {
      setPreviousView(currentView);
      setIsAnimating(true);
      
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
                className="w-8 h-8 rounded-full"
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
      {/* Top bar */}
      <div className="border-b border-gray-200 dark:border-[#ffffff1a] py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Left side - Logo and collection selector */}
          <div className="flex items-center">
            <img 
              src="/favicon-192x192.png" 
              alt="Pokemon Card Tracker" 
              className="w-8 h-8 rounded-full"
            />
            
            {!hideCollectionSelector && (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-gray-200"
                >
                  <span className="font-medium">{selectedCollection}</span>
                  <Icon name="expand_more" className="text-gray-500 dark:text-gray-400 ml-1" />
                </button>
                
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-[#1B2131] ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                          Collections
                        </div>
                          
                          {/* Collection list */}
                          <div>
                            {collections.map((collection) => (
                              <button
                                key={collection}
                                className={`w-full text-left px-4 py-2 text-sm ${
                                  selectedCollection === collection
                                    ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => {
                                  onCollectionChange(collection);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                {collection}
                              </button>
                            ))}
                          </div>
                          
                          {/* Actions */}
                          <div className="border-t border-gray-100 dark:border-gray-700">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                              onClick={() => {
                                setIsNewCollectionModalOpen(true);
                                setIsDropdownOpen(false);
                              }}
                            >
                              <Icon name="add" className="mr-2 text-gray-500 dark:text-gray-400" />
                              New Collection
                            </button>
                            
                            {refreshCollections && (
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
                                onClick={() => {
                                  refreshCollections();
                                  setIsDropdownOpen(false);
                                  toast.success('Collections refreshed');
                                }}
                              >
                                <Icon name="refresh" className="mr-2 text-gray-500 dark:text-gray-400" />
                                Refresh Collections
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
              </div>
            )}
          </div>
          
          {/* Right side - Currency and settings */}
          <div className="flex items-center">
            <div className="mr-2 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium text-gray-700 dark:text-white">
              AUD
            </div>
            
            {onSettingsClick && (
              <button
                id="settings-button"
                onClick={() => {
                  if (onSettingsClick) {
                    onSettingsClick();
                  }
                }}
                className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 settings-button"
                aria-label="Settings"
                style={{ 
                  position: 'relative', 
                  zIndex: 10000, 
                  pointerEvents: 'auto',
                  cursor: 'pointer'
                }}
              >
                <Icon name="settings" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom bar - View toggle buttons */}
      {onViewChange && (
        <div className="hidden sm:block px-4 py-2 border-b border-gray-200 dark:border-[#ffffff1a] flex justify-center">
          <div className="max-w-7xl w-full mx-auto flex justify-center">
            <div className="flex bg-gray-100 dark:bg-black rounded-full p-1 overflow-hidden">
              {/* Cards Button */}
              <button
                onClick={() => handleViewChange('cards')}
                className={`px-4 py-1.5 flex items-center justify-center rounded-full relative transition-colors duration-200 ${
                  currentView === 'cards' 
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon 
                  name="style" 
                  className="mr-1 hidden xs:inline" 
                  color={currentView === 'cards' ? 'white' : 'default'} 
                />
                <span>Cards</span>
              </button>
              {/* Small gap */}
              <div className="w-1"></div>
              {/* Purchase Invoices Button */}
              <button
                onClick={() => handleViewChange('purchase-invoices')}
                className={`px-4 py-1.5 flex items-center justify-center rounded-full relative transition-colors duration-200 ${
                  currentView === 'purchase-invoices' 
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon 
                  name="receipt" 
                  className="mr-1 hidden xs:inline" 
                  color={currentView === 'purchase-invoices' ? 'white' : 'default'} 
                />
                <span>Purchase Invoices</span>
              </button>
              {/* Small gap */}
              <div className="w-1"></div>
              {/* Sold Items Button */}
              <button
                onClick={() => handleViewChange('sold-items')}
                className={`px-4 py-1.5 flex items-center justify-center rounded-full relative transition-colors duration-200 ${
                  currentView === 'sold-items' 
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon 
                  name="sell" 
                  className="mr-1 hidden xs:inline" 
                  color={currentView === 'sold-items' ? 'white' : 'default'} 
                />
                <span>Sold Items</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* New Collection Modal */}
      <Modal
        isOpen={isNewCollectionModalOpen}
        onClose={() => setIsNewCollectionModalOpen(false)}
        title="Create New Collection"
      >
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="newCollectionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Collection Name
            </label>
            <input
              type="text"
              id="newCollectionName"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full px-3 py-2 border border-[#ffffff33] dark:border-[#ffffff1a] rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-default)] focus:border-[var(--primary-default)] dark:bg-gray-800 dark:text-white"
              placeholder="Enter collection name"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setIsNewCollectionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (newCollectionName.trim() && onAddCollection) {
                  onAddCollection(newCollectionName.trim());
                  setNewCollectionName('');
                  setIsNewCollectionModalOpen(false);
                  toast.success('Collection created successfully!');
                }
              }}
              disabled={!newCollectionName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  );
};

Header.propTypes = {
  selectedCollection: PropTypes.string,
  collections: PropTypes.array,
  onCollectionChange: PropTypes.func,
  onImportClick: PropTypes.func,
  onSettingsClick: PropTypes.func,
  currentView: PropTypes.oneOf(['cards', 'sold-items', 'purchase-invoices', 'grid', 'list']),
  onViewChange: PropTypes.func,
  refreshCollections: PropTypes.func,
  onAddCollection: PropTypes.func,
  hideCollectionSelector: PropTypes.bool,
  isComponentLibrary: PropTypes.bool
};

export default Header;
