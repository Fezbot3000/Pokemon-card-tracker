import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
// Import db only when used in verification functions

const SettingsModal = ({ 
  isOpen = true, 
  onClose, 
  selectedCollection, 
  onRenameCollection, 
  onDeleteCollection,
  refreshCollections,
  onExport,
  onImportCollection,
  onLogout,
  user
}) => {
  const { isDarkMode } = useTheme();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await onExport();
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
      toast.textContent = 'Export completed successfully!';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-red-500 text-white transition-opacity duration-300';
      toast.textContent = `Export failed: ${error.message || 'Unknown error'}`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCollection = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    try {
      onDeleteCollection(selectedCollection);
      setShowDeleteModal(false);
      // Close modal after successful deletion
      onClose();
    } catch (error) {
      console.error("Error deleting collection:", error);
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-red-500 text-white transition-opacity duration-300';
      toast.textContent = `Failed to delete collection: ${error.message}`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    }
  };

  const handleLogout = () => {
    onClose();
    if (onLogout) {
      onLogout();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-2xl mx-4 p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-[#1B2131]' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="space-y-8">
          {/* Collection Settings */}
          <div>
            <h3 className="text-xl font-light text-gray-700 dark:text-gray-300 mb-4">
              Collection Settings
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200">Collection Name</h4>
                {isRenaming ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="input"
                      autoFocus
                    />
                    <button
                      onClick={handleRenameConfirm}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">{selectedCollection}</p>
                )}
              </div>
              {!isRenaming && (
                <button
                  onClick={handleStartRenaming}
                  className="btn btn-secondary"
                >
                  Rename
                </button>
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

            {/* Backup Verification Section */}
            <div className="mb-6 p-4 bg-[#0D1321] rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-white">Backup Verification</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    try {
                      const firestore = await import('firebase/firestore').then(module => module.getFirestore());
                      const storage = await import('firebase/storage').then(module => module.getStorage());
                      const { collection, getDocs } = await import('firebase/firestore');
                      const { ref, listAll } = await import('firebase/storage');
                      
                      setIsLoading(true);
                      
                      // Check collections in Firestore
                      const collectionsData = {};
                      const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
                      const collectionsSnapshot = await getDocs(collectionsRef);
                      
                      let totalCards = 0;
                      collectionsSnapshot.forEach(doc => {
                        const data = doc.data();
                        const collectionName = doc.id;
                        const cardsCount = data.cards?.length || 0;
                        totalCards += cardsCount;
                        collectionsData[collectionName] = cardsCount;
                      });
                      
                      // Check images in Storage
                      const imagesRef = ref(storage, `users/${user.uid}/cards`);
                      let imagesList = [];
                      try {
                        const imageResults = await listAll(imagesRef);
                        imagesList = imageResults.items.map(item => item.name);
                      } catch (error) {
                        console.error("Error listing images:", error);
                      }
                      
                      // Create verification report
                      const verificationReport = {
                        collections: collectionsData,
                        totalCollections: collectionsSnapshot.size,
                        totalCards: totalCards,
                        totalImages: imagesList.length,
                        timestamp: new Date().toISOString(),
                        userId: user.uid
                      };
                      
                      console.log("Cloud Backup Verification Report:", verificationReport);
                      
                      // Show verification results to user
                      setIsLoading(false);
                      alert(`
Cloud Backup Verification:
• Total Collections: ${verificationReport.totalCollections}
• Total Cards: ${verificationReport.totalCards}
• Total Images: ${verificationReport.totalImages}
• Collection Details: ${Object.entries(collectionsData).map(([name, count]) => `\n  - ${name}: ${count} cards`).join('')}
              `);
                    } catch (error) {
                      console.error("Error verifying cloud backup:", error);
                      setIsLoading(false);
                      alert(`Error verifying cloud backup: ${error.message}`);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    "Verify Cloud Backup"
                  )}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { db } = await import('../services/db');
                      setIsLoading(true);
                      
                      // Show loading toast
                      const toast = document.createElement('div');
                      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-blue-500 text-white transition-opacity duration-300';
                      toast.textContent = 'Synchronizing images from Firebase Storage...';
                      document.body.appendChild(toast);
                      
                      // Sync images
                      const result = await db.syncImagesFromStorage(user.uid);
                      
                      // Update toast with results
                      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
                      toast.textContent = `Sync complete: ${result.synced} of ${result.total} images synchronized.`;
                      
                      // Remove toast after delay
                      setTimeout(() => {
                        toast.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(toast), 300);
                      }, 5000);
                      
                      setIsLoading(false);
                    } catch (error) {
                      console.error('Error synchronizing images:', error);
                      
                      // Show error toast
                      const toast = document.createElement('div');
                      toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-red-500 text-white transition-opacity duration-300';
                      toast.textContent = `Error synchronizing images: ${error.message}`;
                      document.body.appendChild(toast);
                      
                      // Remove toast after delay
                      setTimeout(() => {
                        toast.style.opacity = '0';
                        setTimeout(() => document.body.removeChild(toast), 300);
                      }, 5000);
                      
                      setIsLoading(false);
                    }
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    "Sync Images from Cloud"
                  )}
                </button>
                <p className="text-sm text-gray-400 mt-1">
                  Check if your data is properly backed up to Firebase and verify image synchronization.
                </p>
              </div>
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
          
          {/* Add Logout Section */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 dark:text-white">Account</h3>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 11-2 0V4H5v16h10v-1a1 1 0 112 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                <path d="M16.707 10.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L13.586 12H7a1 1 0 110-2h6.586l-1.293-1.293a1 1 0 111.414-1.414l3 3z" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl shadow-lg bg-[#1B2131]">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">Delete Collection</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete the collection "{selectedCollection}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-400 hover:text-gray-200"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal; 