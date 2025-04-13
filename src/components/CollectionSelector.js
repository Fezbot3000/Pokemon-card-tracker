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

  // Prevent body scroll when dropdown is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth <= 639) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Filter any existing "All Cards" from collections to prevent duplication
  const filteredCollections = collections.filter(collection => collection !== 'All Cards');
  
  return (
    <div className="collection-selector w-full" ref={dropdownRef}>
      <button
        className="collection-name w-full"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select collection"
      >
        <span className="material-icons">lock</span>
        <span className="truncate flex-1">{selectedCollection}</span>
        <span className="material-icons flex-shrink-0">{isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
      </button>
      
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="sm:hidden fixed inset-0 bg-black/50 z-[149]" onClick={() => setIsOpen(false)}></div>
          
          <div className="collection-dropdown">
            {/* Mobile header (visible only on small screens) */}
            <div className="sm:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
              <h3 className="font-medium">Select Collection</h3>
              <button onClick={() => setIsOpen(false)} className="p-1">
                <span className="material-icons">close</span>
              </button>
            </div>
            
            {/* All Cards option */}
            <div 
              className={`collection-item ${selectedCollection === 'All Cards' ? 'text-primary' : ''}`}
              onClick={() => {
                onCollectionChange('All Cards');
                setIsOpen(false);
              }}
            >
              <span>All Cards</span>
              {selectedCollection === 'All Cards' && (
                <span className="material-icons">check</span>
              )}
            </div>
            
            {/* Divider between All Cards and collections */}
            <div className="collection-divider"></div>
            
            {/* Collections list */}
            {filteredCollections
              .map(collection => (
                <div 
                  key={collection}
                  className={`collection-item ${selectedCollection === collection ? 'text-primary' : ''}`}
                  onClick={() => {
                    onCollectionChange(collection);
                    setIsOpen(false);
                  }}
                >
                  <span>{collection}</span>
                  {selectedCollection === collection && (
                    <span className="material-icons">check</span>
                  )}
                </div>
              ))}
              
            {/* Divider before Add Collection */}
            <div className="collection-divider"></div>
            
            {/* Add Collection option */}
            <div 
              className="collection-item text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onAddCollection();
                setIsOpen(false);
              }}
            >
              <span>New Collection</span>
              <span className="material-icons">add</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionSelector; 