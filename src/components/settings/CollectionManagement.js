import React from 'react';
import {
  Button,
  Icon,
  SettingsPanel,
  ConfirmDialog,
} from '../../design-system';
import CustomDropdown from '../ui/CustomDropdown';

/**
 * Collection Management Component
 * Handles renaming and deleting collections
 */
const CollectionManagement = ({
  collections = {},
  collectionToRename,
  setCollectionToRename,
  collectionToDelete,
  setCollectionToDelete,
  onStartRenaming,
  onDeleteCollection,
  // isDarkMode,
}) => {
  const collectionNames = Object.keys(collections);

  // Filter out protected collections (case-insensitive)
  const protectedCollections = ['sold', 'all cards', 'default collection'];
  const filterProtectedCollections = names => {
    return names.filter(
      name => !protectedCollections.includes(name.toLowerCase())
    );
  };

  const renameableCollections = filterProtectedCollections(collectionNames);
  const deletableCollections = filterProtectedCollections(collectionNames);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedCollectionToDelete, setSelectedCollectionToDelete] =
    React.useState('');

  const handleDeleteClick = () => {
    if (collectionToDelete) {
      setSelectedCollectionToDelete(collectionToDelete);
      setShowDeleteConfirm(true);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setSelectedCollectionToDelete('');
  };

  const handleDeleteConfirmAction = () => {
    if (onDeleteCollection && selectedCollectionToDelete) {
      onDeleteCollection(selectedCollectionToDelete);
      setShowDeleteConfirm(false);
      setSelectedCollectionToDelete('');
      setCollectionToDelete('');
    }
  };

  return (
    <>
      <SettingsPanel
        title="Manage Collections"
        description="Rename or delete your card collections."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Rename Collection Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-black">
            <h4 className="mb-3 flex items-center font-medium text-gray-900 dark:text-white">
              <Icon name="edit" className="mr-2 text-indigo-400" />
              Rename Collection
            </h4>
            <div className="space-y-3">
              <CustomDropdown
                value={collectionToRename}
                onSelect={e => setCollectionToRename(e.target.value)}
                placeholder="Select Collection..."
                options={renameableCollections.map(name => ({
                  value: name,
                  label: name
                }))}
              />
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
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-black">
            <h4 className="mb-3 flex items-center font-medium text-gray-900 dark:text-white">
              <Icon name="delete" className="mr-2 text-red-400" />
              Delete Collection
            </h4>
            <div className="space-y-3">
              <CustomDropdown
                value={collectionToDelete}
                onSelect={e => setCollectionToDelete(e.target.value)}
                placeholder="Select Collection..."
                options={deletableCollections.map(name => ({
                  value: name,
                  label: name
                }))}
              />
              <Button
                variant="danger"
                onClick={handleDeleteClick}
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
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirmAction}
        title="Delete Collection"
        message={`Are you sure you want to delete the collection "${selectedCollectionToDelete}"? All cards in this collection will be permanently removed.`}
        confirmButtonProps={{
          variant: 'danger',
        }}
      />
    </>
  );
};

export default CollectionManagement;
