import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../design-system';
import db from '../services/firestore/dbAdapter';  // Use the correct db service
import { useAuth } from '../design-system'; // Import auth context
import JSZip from 'jszip';
import CollectionSelector from './CollectionSelector';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

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
      <header className="dark:border-gray-700/50 fixed inset-x-0 top-0 z-40 hidden w-full border-b border-gray-200 bg-white shadow-md dark:bg-[#1B2131] sm:flex" style={{position: 'fixed'}}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Collection Dropdown */}
            <div className="flex min-w-0 max-w-[45%] shrink items-center gap-2 sm:max-w-[60%] sm:gap-4 md:max-w-[70%]">
              <Link to="/cards" className="shrink-0">
                <img src="/favicon-192x192.png" alt="MyCardTracker" className="size-8 rounded-xl object-contain sm:size-10" />
              </Link>
              <div className="relative min-w-0 shrink" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="flex items-center gap-1 whitespace-nowrap rounded-lg p-2 text-gray-700 transition-colors hover:bg-white dark:text-gray-200 
                           dark:hover:bg-[#252B3B] sm:gap-2 sm:px-3"
                >
                  <span className="max-w-[120px] truncate text-sm font-medium sm:max-w-[180px] md:max-w-[250px]">{selectedCollection}</span>
                  <span className="material-icons shrink-0 text-gray-600 dark:text-gray-300">
                    {isDropdownOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg bg-white py-1 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:bg-[#1B2131]">
                    <div 
                      className="cursor-pointer px-4 py-2 text-gray-700 hover:bg-gray-50
                               dark:text-gray-200 dark:hover:bg-[#252B3B]"
                      onClick={() => handleCollectionSelect('All Cards')}
                    >
                      All Cards
                    </div>
                    {collections
                      .filter(collection => collection !== 'All Cards')
                      .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
                      .map((collection) => (
                        <div
                          key={collection}
                          className="cursor-pointer truncate px-4 py-2 text-gray-700
                                   hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-[#252B3B]"
                          onClick={() => handleCollectionSelect(collection)}
                        >
                          {collection}
                        </div>
                      ))}
                    <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
                    <div 
                      className="flex cursor-pointer items-center justify-between px-4
                               py-2 text-primary hover:bg-gray-50 dark:hover:bg-[#252B3B]"
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
            <div className="hidden items-center space-x-2 lg:flex">
              <button
                className={`rounded-lg px-4 py-2 transition-colors ${
                  currentView === 'cards'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                onClick={() => onViewChange('cards')}
              >
                Cards
              </button>
              <button
                className={`rounded-lg px-4 py-2 transition-colors ${
                  currentView === 'sold'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                onClick={() => onViewChange('sold')}
              >
                Sold Items
              </button>
            </div>
            
            {/* Right side actions */}
            <div className="flex shrink-0 items-center space-x-2 sm:space-x-3">
              {/* Desktop Actions - keep theme and settings only on desktop */}
              <div className="hidden items-center space-x-2 lg:flex">
                {/* Theme and Settings buttons */}
                <button
                  onClick={toggleTheme}
                  className="dark:hover:bg-gray-800/50 flex size-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300"
                  aria-label="Toggle theme"
                >
                  <span className="material-icons">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
                
                <button
                  onClick={onSettingsClick}
                  className="dark:hover:bg-gray-800/50 flex hidden size-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 lg:flex"
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
        <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center">
          <div ref={newCollectionModalRef} className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-[#1B2131]">
            <div className="dark:border-gray-700/50 flex items-center justify-between border-b border-gray-200 px-6 pb-4 pt-6">
              <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">New Collection</h2>
              <button 
                className="text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <label className="mb-2 block text-gray-700 dark:text-gray-300">
                Collection Name:
              </label>
              <input
                ref={newCollectionInputRef}
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={handleNewCollectionKeyDown}
                className="dark:border-gray-700/50 focus:ring-primary/20 w-full rounded-xl 
                         border border-gray-200 bg-white 
                         px-4 py-2
                         text-gray-900 placeholder:text-gray-500
                         focus:border-primary focus:outline-none focus:ring-2 dark:bg-black
                         dark:text-white dark:placeholder:text-gray-400"
                placeholder="Enter collection name"
                autoFocus
              />
            </div>
            
            <div className="dark:border-gray-700/50 flex justify-between gap-2 border-t border-gray-200 px-6 pb-6 pt-4">
              <button 
                className="rounded-lg bg-gray-100 px-4
                         py-2 text-gray-700 
                         transition-colors hover:bg-gray-200
                         dark:bg-black dark:text-gray-300
                         dark:hover:bg-[#323B4B]"
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="hover:bg-primary/90 rounded-lg bg-primary
                         px-4 py-2
                         text-white
                         transition-colors"
                onClick={handleCreateCollection}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

Header.propTypes = {
  currentView: PropTypes.oneOf(['cards', 'sold-items', 'purchase-invoices', 'grid', 'list', 'settings']).isRequired,
};

export default Header;
