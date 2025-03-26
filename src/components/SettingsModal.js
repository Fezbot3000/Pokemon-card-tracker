import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  selectedCollection,
  collections = [],
  onRenameCollection, 
  onDeleteCollection,
  refreshCollections,
  onExportData,
  onImportCollection
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { currentUser, signOut } = useAuth();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: ''
  });

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const savedProfile = await db.getProfile();
        if (savedProfile) {
          setProfile(savedProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      }
    };

    loadProfile();
  }, []);

  // Handle profile changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile
  const handleProfileSave = async () => {
    try {
      await db.saveProfile(profile);
      toast.success('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    }
  };

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!collectionToDelete) {
      toast.error('Please select a collection to delete');
      return;
    }

    if (collections.length <= 1) {
      toast.error('Cannot delete the last collection');
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    try {
      onDeleteCollection(collectionToDelete);
      toast.success('Collection deleted successfully!');
      setCollectionToDelete('');
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error(`Failed to delete collection: ${error.message}`);
    }
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
    <div className="settings-modal">
      <div className="settings-modal-content">
        <div className="settings-header">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252B3B] transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Settings Tabs */}
          <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('general')}
                className={`pb-2 px-1 ${
                  activeTab === 'general'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-2 px-1 ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`pb-2 px-1 ${
                  activeTab === 'account'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Account
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Theme
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleTheme()}
                    className={`flex-1 p-3 rounded-xl border ${
                      !isDarkMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <SunIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">Light</span>
                    </div>
                  </button>
                  <button
                    onClick={() => toggleTheme()}
                    className={`flex-1 p-3 rounded-xl border ${
                      isDarkMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MoonIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">Dark</span>
                    </div>
                  </button>
                </div>
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

              {/* Danger Zone */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700/50">
                <h3 className="text-lg font-medium text-red-600 dark:text-red-500">Danger Zone</h3>
                <div className="mt-4 space-y-4">
                  {/* Delete Collection */}
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Collection</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Once you delete a collection, there is no going back. Please be certain.
                    </p>
                    <div className="mt-3">
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full px-4 py-2 rounded-lg
                                   bg-[#252B3B] dark:bg-[#252B3B]
                                   border border-gray-700/50 dark:border-gray-700/50
                                   text-gray-200 dark:text-gray-200
                                   focus:outline-none focus:ring-2 focus:ring-red-500/20
                                   cursor-pointer flex items-center justify-between"
                        >
                          <span className={collectionToDelete ? 'text-gray-200' : 'text-gray-400'}>
                            {collectionToDelete || 'Select a collection'}
                          </span>
                          <span className="material-icons text-gray-400">
                            expand_more
                          </span>
                        </button>
                        
                        {isDropdownOpen && (
                          <div className="absolute z-[100] w-full mt-1 bg-[#252B3B] border border-gray-700/50 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {collections
                              .filter(collection => collection !== 'All Cards')
                              .map((collection) => (
                                <div
                                  key={collection}
                                  className="px-4 py-2 cursor-pointer text-gray-200 hover:bg-[#323B4B] first:rounded-t-lg last:rounded-b-lg"
                                  onClick={() => {
                                    setCollectionToDelete(collection);
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  {collection}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <button 
                        onClick={handleDeleteCollection}
                        disabled={!collectionToDelete || collections.length <= 1}
                        className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/20 
                                 text-red-600 dark:text-red-400 rounded-lg 
                                 hover:bg-red-200 dark:hover:bg-red-900/30 
                                 transition-colors disabled:opacity-50 
                                 disabled:cursor-not-allowed"
                      >
                        Delete Collection
                      </button>
                    </div>
                  </div>

                  {/* Reset Data */}
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Reset Application</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      This will permanently delete all your collections, cards, and settings. This action cannot be undone.
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={handleResetData}
                        className="w-full px-4 py-2 bg-red-200 dark:bg-red-900/30 
                                 text-red-700 dark:text-red-400 rounded-lg 
                                 hover:bg-red-300 dark:hover:bg-red-900/40 
                                 transition-colors font-medium"
                      >
                        Reset All Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                             bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={profile.mobileNumber}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={profile.companyName}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={profile.address}
                  onChange={handleProfileChange}
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-[#1B2131] text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter address"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleProfileSave}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="material-icons text-gray-400">account_circle</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currentUser?.displayName || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    onClose();
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Error signing out:', error);
                    toast.error('Failed to sign out');
                  }
                }}
                className="w-full px-4 py-2 mt-4 bg-gray-100 dark:bg-gray-800 
                         text-gray-700 dark:text-gray-300 rounded-lg 
                         hover:bg-gray-200 dark:hover:bg-gray-700 
                         transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-icons text-gray-600 dark:text-gray-400">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-[#1B2131] rounded-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the collection "{collectionToDelete}"? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg
                         bg-gray-100 dark:bg-[#252B3B] 
                         text-gray-700 dark:text-gray-300
                         hover:bg-gray-200 dark:hover:bg-[#323B4B]
                         transition-colors"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg
                         bg-red-600 text-white
                         hover:bg-red-700
                         transition-colors"
                onClick={confirmDelete}
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