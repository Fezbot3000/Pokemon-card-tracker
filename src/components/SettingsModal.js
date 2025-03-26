import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/db';
import Profile from './Profile';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';

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
  const { isDarkMode, toggleTheme } = useTheme();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleRenameConfirm = () => {
    if (newCollectionName && newCollectionName !== selectedCollection) {
      onRenameCollection(selectedCollection, newCollectionName);
      setIsRenaming(false);
      toast.success('Collection renamed successfully!');
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
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCollection = () => {
    try {
      onDeleteCollection(selectedCollection);
      toast.success('Collection deleted successfully!');
      // Close modal after successful deletion
      onClose();
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error(`Failed to delete collection: ${error.message}`);
    }
    setShowDeleteConfirm(false);
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      try {
        await db.resetAllData();
        window.location.reload();
      } catch (error) {
        console.error('Error resetting data:', error);
      }
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Create loading overlay
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
      loadingEl.innerHTML = `
        <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p class="text-gray-700 dark:text-gray-300">Importing backup...</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">This may take a few moments</p>
        </div>
      `;
      document.body.appendChild(loadingEl);

      const startTime = Date.now();

      if (file.name.endsWith('.zip')) {
        // Process ZIP file
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);

        // Check if collections.json exists
        const collectionsFile = zipContent.file("data/collections.json");
        if (!collectionsFile) {
          throw new Error("Invalid backup file: missing collections.json");
        }

        // Load collections data
        const collectionsJson = await collectionsFile.async("string");
        const collectionsData = JSON.parse(collectionsJson);

        // Validate format
        if (!collectionsData.collections) {
          throw new Error("Invalid backup format");
        }

        // Count collections and cards
        const collectionCount = Object.keys(collectionsData.collections).length;
        let totalCards = 0;
        Object.values(collectionsData.collections).forEach(cards => {
          if (Array.isArray(cards)) {
            totalCards += cards.length;
          }
        });

        // Extract images
        const imagePromises = [];
        let imageCount = 0;
        zipContent.folder("images")?.forEach((relativePath, file) => {
          if (!file.dir) {
            const promise = (async () => {
              const content = await file.async("blob");
              const fileName = relativePath.split("/").pop();
              const serialNumber = fileName.split(".")[0];

              if (serialNumber) {
                await db.saveImage(serialNumber, content);
                imageCount++;
              }
            })();
            imagePromises.push(promise);
          }
        });

        // Wait for all images to be processed
        await Promise.all(imagePromises);

        // Save collections data
        await db.saveCollections(collectionsData.collections);

        // Refresh collections
        refreshCollections();

        // Switch to "All Cards" view
        localStorage.setItem('selectedCollection', 'All Cards');

        // Ensure minimum loading time
        const elapsedTime = Date.now() - startTime;
        const minimumLoadingTime = 3000; // 3 seconds
        if (elapsedTime < minimumLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
        }

        // Remove loading overlay
        document.body.removeChild(loadingEl);

        // Show detailed success message
        toast.success(`Successfully imported ${collectionCount} collections with ${totalCards} cards and ${imageCount} images!`);
        
        // Close settings modal
        onClose();

        // Reload the page to ensure everything is fresh
        window.location.reload();
      } else if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            await onImportCollection(data);
            
            // Count imported items
            const collectionCount = Object.keys(data).length;
            let totalCards = 0;
            Object.values(data).forEach(cards => {
              if (Array.isArray(cards)) {
                totalCards += cards.length;
              }
            });

            // Switch to "All Cards" view
            localStorage.setItem('selectedCollection', 'All Cards');
            
            toast.success(`Successfully imported ${collectionCount} collections with ${totalCards} cards!`);
            refreshCollections();
            document.body.removeChild(loadingEl);
            onClose();
            
            // Reload the page to ensure everything is fresh
            window.location.reload();
          } catch (error) {
            document.body.removeChild(loadingEl);
            toast.error('Failed to import data: Invalid file format');
          }
        };
        reader.readAsText(file);
      } else {
        document.body.removeChild(loadingEl);
        throw new Error("Unsupported file format. Please upload a .zip backup file or .json file.");
      }
    } catch (error) {
      console.error("Import error:", error);
      // Remove loading overlay if it exists
      const loadingEl = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-70');
      if (loadingEl) {
        document.body.removeChild(loadingEl);
      }
      toast.error(`Error importing backup: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-[#1B2131] rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            <span className="material-icons">close</span>
          </button>

          <div className="flex border-b border-gray-200 dark:border-gray-700/50">
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors
                ${activeTab === 'general' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium transition-colors
                ${activeTab === 'profile' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
          </div>

          {activeTab === 'general' ? (
            <div className="p-6">
              <div className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    style={{ backgroundColor: isDarkMode ? '#22c55e' : '#e5e7eb' }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isDarkMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Export/Import Data */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Export/Import Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Export your data to a file or import data from a backup
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isExporting ? 'Exporting...' : 'Export Data'}
                    </button>
                    <label className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                      Import Data
                      <input
                        type="file"
                        accept=".zip,.json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Reset Data */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reset Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Clear all data and reset the application to its initial state
                  </p>
                  <button
                    onClick={handleResetData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Profile onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 