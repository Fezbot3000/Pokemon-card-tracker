import React, { useState, useRef, useEffect } from 'react';

const CollectionSelector = ({ collections, selectedCollection, onCollectionChange, onAddCollection }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
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
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center space-x-2 px-4 py-2 bg-[#1B2131] border border-gray-700/50 text-white rounded-lg hover:bg-[#252B3B] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedCollection}</span>
        <span className="material-icons text-xl">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-56 bg-[#1B2131] rounded-lg shadow-lg py-1 right-0 border border-gray-700/50">
          {/* All Cards option */}
          <button
            className={`w-full text-left px-4 py-2 flex items-center justify-between
                       ${selectedCollection === 'All Cards' 
                         ? 'text-primary bg-[#252B3B]' 
                         : 'text-gray-200 hover:bg-[#252B3B]'}`}
            onClick={() => {
              onCollectionChange('All Cards');
              setIsOpen(false);
            }}
          >
            <span>All Cards</span>
            {selectedCollection === 'All Cards' && (
              <span className="material-icons text-primary">check</span>
            )}
          </button>
          
          <div className="border-t border-gray-700/50 my-1"></div>
          
          {/* Collections list */}
          {collections
            .filter(collection => collection !== 'All Cards')
            .map(collection => (
              <button
                key={collection}
                className={`w-full text-left px-4 py-2 flex items-center justify-between
                           ${selectedCollection === collection 
                             ? 'text-primary bg-[#252B3B]' 
                             : 'text-gray-200 hover:bg-[#252B3B]'}`}
                onClick={() => {
                  onCollectionChange(collection);
                  setIsOpen(false);
                }}
              >
                <span>{collection}</span>
                {selectedCollection === collection && (
                  <span className="material-icons text-primary">check</span>
                )}
              </button>
            ))}
            
          <div className="border-t border-gray-700/50 my-1"></div>
          
          {/* Add Collection option */}
          <button
            className="w-full text-left px-4 py-2 flex items-center justify-between text-primary hover:bg-[#252B3B]"
            onClick={(e) => {
              e.stopPropagation();
              onAddCollection();
              setIsOpen(false);
            }}
          >
            <span>New Collection</span>
            <span className="material-icons">add</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionSelector; 