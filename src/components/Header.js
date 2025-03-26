import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/db';  // Use the correct db service
import JSZip from 'jszip';
import CollectionSelector from './CollectionSelector';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Header = ({ 
  selectedCollection, 
  collections, 
  onCollectionChange, 
  onImportClick,
  onSettingsClick,
  currentView,
  onViewChange,
  refreshCollections,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  className = ''
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const dropdownRef = useRef(null);
  const newCollectionInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle mobile menu close on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint (1024px)
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup function to ensure scroll is restored when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Remove page-no-padding class when Header is mounted
  useEffect(() => {
    document.body.classList.remove('page-no-padding');
    return () => {
      // No need to add it back when unmounting
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleSettings = () => {
    onSettingsClick();
  };

  const handleCollectionSelect = (collection) => {
    if (typeof onCollectionChange === 'function') {
      onCollectionChange(collection);
      setIsDropdownOpen(false);
    }
  };

  const handleAddNewCollection = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsNewCollectionModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim() && !collections.includes(newCollectionName.trim())) {
      onAddCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsNewCollectionModalOpen(false);
      toast.success('Collection created successfully!');
    }
  };

  const handleNewCollectionKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateCollection();
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-white dark:bg-[#1B2131] shadow-md border-b border-gray-200 dark:border-gray-700/50" style={{position: 'fixed'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Collection Dropdown */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink min-w-0 max-w-[45%] sm:max-w-[60%] md:max-w-[70%]">
              <Link to="/" className="flex-shrink-0">
                <img src="/favicon-192x192.png" alt="Pokemon Card Tracker" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain" />
              </Link>
              <div className="relative min-w-0 flex-shrink">
                <button
                  onClick={toggleDropdown}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 
                           hover:bg-white dark:hover:bg-[#252B3B] transition-colors whitespace-nowrap"
                >
                  <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[180px] md:max-w-[250px]">{selectedCollection}</span>
                  <span className="material-icons text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {isDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#1B2131] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-1 z-50">
                    <div 
                      className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#252B3B] cursor-pointer
                               text-gray-700 dark:text-gray-200"
                      onClick={() => handleCollectionSelect('All Cards')}
                    >
                      All Cards
                    </div>
                    {collections.map((collection) => (
                      <div
                        key={collection}
                        className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#252B3B] cursor-pointer
                                 text-gray-700 dark:text-gray-200 truncate"
                        onClick={() => handleCollectionSelect(collection)}
                      >
                        {collection}
                      </div>
                    ))}
                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                    <div 
                      className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#252B3B] cursor-pointer
                               text-primary flex items-center justify-between"
                      onClick={handleAddNewCollection}
                    >
                      <span>New Collection</span>
                      <span className="material-icons">add</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* View switcher - Desktop Only */}
            <div className="hidden lg:flex items-center space-x-2">
              <button
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'cards'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onViewChange('cards')}
              >
                Cards
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'sold'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onViewChange('sold')}
              >
                Sold Items
              </button>
              <Link to="/pricing" className="px-4 py-2 rounded-lg transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                Pricing
              </Link>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* Desktop Actions - keep theme and settings only on desktop */}
              <div className="hidden lg:flex items-center space-x-2">
                <button
                  onClick={() => onImportClick('priceUpdate')}
                  className="flex items-center space-x-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="material-icons">update</span>
                  <span>Update Prices</span>
                </button>
                
                <button
                  onClick={() => onImportClick('baseData')}
                  className="flex items-center space-x-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="material-icons">upload_file</span>
                  <span>Import Base Data</span>
                </button>

                {/* Theme and Settings buttons only on desktop */}
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  aria-label="Toggle theme"
                >
                  <span className="material-icons">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
                
                <button
                  onClick={toggleSettings}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  aria-label="Settings"
                >
                  <span className="material-icons">settings</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                aria-label="Menu"
              >
                <span className="material-icons">menu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden">
            <div className="bg-gray-50/50 dark:bg-[#1B2131]/50">
              <div className="px-6 py-4 space-y-4">
                {/* Theme and Settings buttons moved to mobile menu */}
                <div className="flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme & Settings</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-icons">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                      <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleSettings();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-icons">settings</span>
                      <span>Settings</span>
                    </button>
                  </div>
                </div>

                {/* View Switcher */}
                <div className="flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">View</h3>
                  <div className="flex space-x-2">
                    <button
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        currentView === 'cards'
                          ? 'bg-primary text-white'
                          : 'text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50'
                      }`}
                      onClick={() => {
                        onViewChange('cards');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Cards
                    </button>
                    <button
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        currentView === 'sold'
                          ? 'bg-primary text-white'
                          : 'text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50'
                      }`}
                      onClick={() => {
                        onViewChange('sold');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sold Items
                    </button>
                  </div>
                </div>

                {/* Import Actions */}
                <div className="flex flex-col space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        onImportClick('priceUpdate');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-icons">update</span>
                      <span>Update Prices</span>
                    </button>
                    <button
                      onClick={() => {
                        onImportClick('baseData');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-icons">upload_file</span>
                      <span>Import Base Data</span>
                    </button>
                    <Link
                      to="/pricing"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-icons">sell</span>
                      <span>Pricing Plans</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#1B2131] rounded-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50">
              <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">New Collection</h2>
              <button 
                className="text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Collection Name:
              </label>
              <input
                ref={newCollectionInputRef}
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={handleNewCollectionKeyDown}
                className="w-full px-4 py-2 rounded-xl 
                         border border-gray-200 dark:border-gray-700/50 
                         bg-white dark:bg-[#252B3B]
                         text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                         placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter collection name"
                autoFocus
              />
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  className="px-4 py-2 rounded-lg
                           bg-gray-100 dark:bg-[#252B3B] 
                           text-gray-700 dark:text-gray-300
                           hover:bg-gray-200 dark:hover:bg-[#323B4B]
                           transition-colors"
                  onClick={() => setIsNewCollectionModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 rounded-lg
                           bg-primary text-white
                           hover:bg-primary/90
                           transition-colors"
                  onClick={handleCreateCollection}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;