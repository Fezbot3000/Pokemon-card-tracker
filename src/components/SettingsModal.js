import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/db';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  selectedCollection, 
  onRenameCollection, 
  onDeleteCollection,
  refreshCollections,
  onExportData,
  onImportCollection
}) => {
  const { isDarkMode } = useTheme();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleRenameConfirm = () => {
    if (newCollectionName && newCollectionName !== selectedCollection) {
      onRenameCollection(selectedCollection, newCollectionName);
      setIsRenaming(false);
    }
  };

  const handleStartRenaming = () => {
    setNewCollectionName(selectedCollection);
    setIsRenaming(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportData();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCollection = () => {
    if (window.confirm(`Are you sure you want to delete the collection "${selectedCollection}"? This action cannot be undone.`)) {
      try {
        onDeleteCollection(selectedCollection);
        // Close modal after successful deletion
        onClose();
      } catch (error) {
        console.error("Error deleting collection:", error);
        alert(`Failed to delete collection: ${error.message}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div 
        className="modal-content max-w-xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-light text-gray-800 dark:text-gray-200">
              Settings
            </h2>
            <button 
              className="text-3xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          
          <div className="space-y-10">
            {/* Collection Settings */}
            <div>
              <h3 className="text-xl font-light text-gray-700 dark:text-gray-300 mb-4">
                Collection Settings
              </h3>
              
              <div className="mb-6">
                <div className="mb-2">
                  <label className="text-gray-600 dark:text-gray-400">Collection Name:</label>
                </div>
                
                {isRenaming ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="input flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleRenameConfirm}
                      className="btn btn-secondary"
                    >
                      Rename
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-medium text-gray-800 dark:text-gray-200">
                      {selectedCollection}
                    </div>
                    <button
                      onClick={handleStartRenaming}
                      className="btn btn-secondary"
                    >
                      Rename
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Data Management */}
            <div>
              <h3 className="text-xl font-light text-gray-700 dark:text-gray-300 mb-4">
                Data Management
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                These buttons work globally across all collections.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/10 dark:text-blue-400 dark:hover:bg-blue-900/20 flex-1 ${
                    isExporting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isExporting ? (
                    <>
                      <span className="material-icons animate-spin">sync</span>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <span className="material-icons">download</span>
                      Export All Data
                    </>
                  )}
                </button>
                
                <button
                  onClick={onImportCollection}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-400 dark:hover:bg-green-900/20 flex-1"
                >
                  <span className="material-icons">upload</span>
                  Import Backup
                </button>
              </div>
            </div>
            
            {/* Danger Zone */}
            <div>
              <h3 className="text-xl font-light text-red-600 mb-4">
                Danger Zone
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Once you delete a collection, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteCollection}
                className="btn bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 