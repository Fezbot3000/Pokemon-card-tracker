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
    <div className="collection-selector" ref={dropdownRef}>
      <button
        className="collection-name"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select collection"
      >
        <span className="material-icons">lock</span>
        <span>{selectedCollection}</span>
        <span className="material-icons">{isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
      </button>
      
      {isOpen && (
        <div className="collection-dropdown">
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
          {collections
            .filter(collection => collection !== 'All Cards')
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
      )}
    </div>
  );
};

export default CollectionSelector; 