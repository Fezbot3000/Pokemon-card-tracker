import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../design-system';
import db from '../services/db';  // Use the correct db service
import { useAuth } from '../design-system'; // Import auth context
import JSZip from 'jszip';
import CollectionSelector from './CollectionSelector';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

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
  const { currentUser } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const dropdownRef = useRef(null);
  const newCollectionModalRef = useRef(null);
  const newCollectionInputRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns and modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle collection dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      
      // Handle new collection modal
      if (newCollectionModalRef.current && 
          !newCollectionModalRef.current.contains(event.target) && 
          isNewCollectionModalOpen) {
        setIsNewCollectionModalOpen(false);
        setNewCollectionName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNewCollectionModalOpen]);

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
              <div className="relative min-w-0 flex-shrink" ref={dropdownRef}>
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
                    {collections
                      .filter(collection => collection !== 'All Cards')
                      .map((collection) => (
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
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {/* Desktop Actions - keep theme and settings only on desktop */}
              <div className="hidden lg:flex items-center space-x-2">
                {/* Theme and Settings buttons */}
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
                  onClick={onSettingsClick}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hidden lg:flex"
                  aria-label="Settings"
                  type="button"
                >
                  <span className="material-icons">settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div ref={newCollectionModalRef} className="bg-white dark:bg-[#1B2131] rounded-xl w-full max-w-md mx-4">
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