import React from 'react';
import { Button, Icon, SettingsPanel, ConfirmDialog } from '../../design-system';

/**
 * Collection Management Component
 * Handles renaming and deleting collections
 */
const CollectionManagement = ({
  collections = [],
  collectionToRename,
  setCollectionToRename,
  collectionToDelete,
  setCollectionToDelete,
  onStartRenaming,
  onDeleteCollection,
  isDarkMode
}) => {
  const handleDeleteConfirm = () => {
    if (onDeleteCollection && collectionToDelete) {
      onDeleteCollection(collectionToDelete);
      setCollectionToDelete('');
    }
  };

  return (
    <>
      <SettingsPanel
        title="Manage Collections"
        description="Rename or delete your card collections."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Rename Collection Section */}
          <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Icon name="edit" className="text-indigo-400 mr-2" />
              Rename Collection
            </h4>
            <div className="space-y-3">
              <select 
                className={`w-full rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  isDarkMode 
                    ? 'bg-[#0F0F0F] text-white border border-[#ffffff1a]' 
                    : 'bg-white text-gray-800 border border-gray-300'
                }`}
                value={collectionToRename}
                onChange={(e) => setCollectionToRename(e.target.value)}
              >
                <option value="" disabled>Select Collection...</option>
                {Array.isArray(collections) 
                  ? collections.filter(name => name !== 'All Cards').map((collection) => (
                      <option key={collection} value={collection}>
                        {collection}
                      </option>
                    ))
                  : Object.keys(collections).filter(name => name !== 'All Cards' && name !== 'Sold').map((collection) => (
                      <option key={collection} value={collection}>
                        {collection}
                      </option>
                    ))
                }
              </select>
              <Button
                variant="primary"
                onClick={onStartRenaming}
                disabled={!collectionToRename}
                iconLeft={<Icon name="edit" />}
                fullWidth
              >
                Rename Selected Collection
              </Button>
            </div>
          </div>
          
          {/* Delete Collection Section */}
          <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Icon name="delete" className="text-red-400 mr-2" />
              Delete Collection
            </h4>
            <div className="space-y-3">
              <select 
                className={`w-full rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  isDarkMode 
                    ? 'bg-[#0F0F0F] text-white border border-[#ffffff1a]' 
                    : 'bg-white text-gray-800 border border-gray-300'
                }`}
                value={collectionToDelete}
                onChange={(e) => setCollectionToDelete(e.target.value)}
              >
                <option value="" disabled>Select Collection...</option>
                {Array.isArray(collections) 
                  ? collections.filter(name => name !== 'All Cards').map((collection) => (
                      <option key={collection} value={collection}>
                        {collection}
                      </option>
                    ))
                  : Object.keys(collections).filter(name => name !== 'All Cards' && name !== 'Sold').map((collection) => (
                      <option key={collection} value={collection}>
                        {collection}
                      </option>
                    ))
                }
              </select>
              <Button
                variant="danger"
                onClick={() => collectionToDelete && setCollectionToDelete(collectionToDelete)}
                disabled={!collectionToDelete}
                iconLeft={<Icon name="delete" />}
                fullWidth
              >
                Delete Selected Collection
              </Button>
            </div>
          </div>
        </div>
      </SettingsPanel>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!collectionToDelete}
        onClose={() => setCollectionToDelete('')}
        onConfirm={handleDeleteConfirm}
        title="Delete Collection"
        message={`Are you sure you want to delete the collection "${collectionToDelete}"? All cards in this collection will be permanently removed.`}
        confirmButtonProps={{
          variant: 'danger'
        }}
      />
    </>
  );
};

export default CollectionManagement;
