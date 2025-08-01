import React, { useState } from 'react';
import ActionSheet, {
  ActionSheetItem,
  ActionSheetDivider,
} from '../design-system/molecules/ActionSheet';
import Icon from '../design-system/atoms/Icon';

const CollectionSelector = ({
  collections,
  selectedCollection,
  onCollectionChange,
  onAddCollection,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter any existing "All Cards" from collections to prevent duplication
  const filteredCollections = collections.filter(
    collection => collection !== 'All Cards'
  );

  // Dropdown trigger component
  const trigger = (
    <div className="flex w-full items-center justify-between rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
      <div className="flex items-center">
        <Icon name="folder" className="mr-2" />
        <span className="flex-1 truncate">{selectedCollection}</span>
      </div>
      <Icon name={isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} />
    </div>
  );

  return (
    <div className="w-full min-w-[200px]">
      <div className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
        Collections
      </div>
      <ActionSheet
        trigger={trigger}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width="lg"
        title="Select Collection"
        className="w-full min-w-[200px]"
      >
        {/* All Cards option */}
        <ActionSheetItem
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
        </ActionSheetItem>

        <ActionSheetDivider />

        {/* Collections list */}
        {filteredCollections.map(collection => (
          <ActionSheetItem
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
          </ActionSheetItem>
        ))}

        <ActionSheetDivider />

        {/* Add Collection option */}
        <ActionSheetItem
          icon={<Icon name="add" />}
          onClick={e => {
            e.stopPropagation();
            onAddCollection();
            setIsOpen(false);
          }}
          className="text-primary"
        >
          New Collection
        </ActionSheetItem>
      </ActionSheet>
    </div>
  );
};

export default CollectionSelector;
