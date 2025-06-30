import React, { useState } from 'react';
import Dropdown, { DropdownItem, DropdownDivider } from '../design-system/molecules/Dropdown';
import Icon from '../design-system/atoms/Icon';

const CollectionSelector = ({ collections, selectedCollection, onCollectionChange, onAddCollection }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter any existing "All Cards" from collections to prevent duplication
  const filteredCollections = collections.filter(collection => collection !== 'All Cards');
  
  // Dropdown trigger component
  const trigger = (
    <div className="collection-name w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
      <div className="flex items-center">
        <Icon name="folder" className="mr-2" />
        <span className="truncate flex-1">{selectedCollection}</span>
      </div>
      <Icon name={isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} />
    </div>
  );
  
  return (
    <div className="w-full">
      <div className="text-sm font-medium mb-1 text-gray-500 dark:text-gray-400">
        Collections
      </div>
      <Dropdown 
        trigger={trigger}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width="full"
        className="collection-selector"
      >
        {/* All Cards option */}
        <DropdownItem
          icon={<Icon name="style" />}
          onClick={() => {
            onCollectionChange('All Cards');
            setIsOpen(false);
          }}
        >
          All Cards
          {selectedCollection === 'All Cards' && (
            <Icon name="check" className="ml-auto" />
          )}
        </DropdownItem>
        
        <DropdownDivider />
        
        {/* Collections list */}
        {filteredCollections.map(collection => (
          <DropdownItem
            key={collection}
            icon={<Icon name="folder" />}
            onClick={() => {
              onCollectionChange(collection);
              setIsOpen(false);
            }}
          >
            {collection}
            {selectedCollection === collection && (
              <Icon name="check" className="ml-auto" />
            )}
          </DropdownItem>
        ))}
        
        <DropdownDivider />
        
        {/* Add Collection option */}
        <DropdownItem
          icon={<Icon name="add" />}
          onClick={(e) => {
            e.stopPropagation();
            onAddCollection();
            setIsOpen(false);
          }}
          className="text-primary"
        >
          New Collection
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export default CollectionSelector;
