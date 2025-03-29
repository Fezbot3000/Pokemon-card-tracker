import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const CollectionSelect = ({ collections = [], selectedCollection, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDarkMode } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Find the selected collection name
  const selectedCollectionName = collections.find(
    collection => collection.id === selectedCollection
  )?.name || 'Select Collection';

  // Ensure collections is always an array and filter out any invalid entries
  const safeCollections = Array.isArray(collections) 
    ? collections.filter(c => c && c.id && c.name)
    : [];

  const handleSelect = (collection) => {
    onChange(collection.id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Custom dropdown button */}
      <button
        className={`flex items-center justify-between w-full px-4 py-3 text-left rounded-lg
                  border focus:outline-none focus:ring-2 focus:ring-primary
                  bg-white dark:bg-[#0A0E17] 
                  border-gray-300 dark:border-gray-700
                  text-gray-900 dark:text-white
                  ${isOpen ? 'ring-2 ring-primary' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedCollectionName}</span>
        <span className="material-icons text-gray-500 dark:text-gray-400">
          {isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && safeCollections.length > 0 && (
        <div 
          className="absolute z-10 w-full mt-1 overflow-auto 
                    bg-white dark:bg-[#0A0E17] 
                    border border-gray-300 dark:border-gray-700 
                    rounded-lg shadow-lg max-h-60"
          role="listbox"
        >
          <ul className="py-1">
            {safeCollections.map((collection) => (
              <li 
                key={collection.id}
                className={`px-4 py-2 cursor-pointer
                          ${collection.id === selectedCollection 
                            ? 'bg-primary/20 text-primary'
                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#1E293B]'
                          }`}
                onClick={() => handleSelect(collection)}
                role="option"
                aria-selected={collection.id === selectedCollection}
              >
                <div className="flex items-center">
                  {collection.id === selectedCollection && (
                    <span className="material-icons text-primary mr-2 text-sm">check</span>
                  )}
                  <span className={collection.id === selectedCollection ? 'ml-0' : 'ml-6'}>
                    {collection.name}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Empty state */}
      {isOpen && safeCollections.length === 0 && (
        <div 
          className="absolute z-10 w-full mt-1 p-4 text-center
                    bg-white dark:bg-[#0A0E17] 
                    border border-gray-300 dark:border-gray-700 
                    rounded-lg shadow-lg"
        >
          <p className="text-gray-500 dark:text-gray-400">No collections available</p>
        </div>
      )}
    </div>
  );
};

export default CollectionSelect; 