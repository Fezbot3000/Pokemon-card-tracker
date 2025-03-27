import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { db } from '../services/db';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import CloudSync from './CloudSync';

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
  const { startTutorial } = useTutorial();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [collectionToDelete, setCollectionToDelete] = useState('');
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Pass the file to the parent handler
    onImportCollection(file);
  };

  const handleStartTutorial = () => {
    startTutorial();
    onClose();
  };

  // Add click outside handler for modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      const modalContent = document.querySelector('.settings-modal-content');
      if (modalContent && !modalContent.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      // Prevent background scrolling but compensate for scrollbar width
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      // Cleanup function to restore scrolling when modal closes
      return () => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
    }
  }, [isOpen]);
  
  // Stop propagation of scroll events in modal content
  const preventPropagation = (e) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal" 
      onWheel={preventPropagation} 
      onTouchMove={preventPropagation}>
      <div 
        className="settings-modal-content"
        onScroll={preventPropagation}
      >
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
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1"
          onWheel={preventPropagation}
          onTouchMove={preventPropagation}>
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Help Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Help</h3>
                <button
                  onClick={handleStartTutorial}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                >
                  <span className="material-icons">help_outline</span>
                  Start Tutorial
                </button>
              </div>

              {/* Theme Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Theme</h3>
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

              {/* Data Management Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Management</h3>
                
                {/* Local Backup */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Local Backup</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Export your data to a file or import data from a backup
                  </p>
                  <div className="flex gap-2">
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

                {/* Cloud Storage */}
                <div>
                  <CloudSync onExportData={onExportData} onImportCollection={onImportCollection} />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700/50">
                <h3 className="text-lg font-medium text-red-600 dark:text-red-500 mb-4">Danger Zone</h3>
                
                {/* Delete Collection */}
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Collection</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Once you delete a collection, there is no going back. Please be certain.
                  </p>
                  
                  {/* Collection Selection */}
                  <div className="mb-4">
                    {collections && collections.length > 0 ? (
                      <div className="space-y-2">
                        {collections
                          .filter(collection => collection !== 'All Cards' && collection !== 'Default Collection')
                          .map((collection) => (
                            <div key={collection} className="flex items-center">
                              <input
                                type="radio"
                                id={`collection-${collection}`}
                                name="collectionToDelete"
                                value={collection}
                                checked={collectionToDelete === collection}
                                onChange={() => setCollectionToDelete(collection)}
                                className="w-4 h-4 text-primary focus:ring-primary"
                              />
                              <label
                                htmlFor={`collection-${collection}`}
                                className="ml-2 block text-sm text-gray-700 dark:text-gray-200"
                              >
                                {collection}
                              </label>
                            </div>
                          ))
                      }
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-2">
                        No collections available to delete
                      </div>
                    )}
                  </div>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={async () => {
                      if (!collectionToDelete) {
                        toast.error("Please select a collection to delete");
                        return;
                      }

                      // Confirm before deletion
                      if (window.confirm(`Are you sure you want to delete collection "${collectionToDelete}"? This cannot be undone.`)) {
                        try {
                          // Get current collections from IndexedDB
                          const savedCollections = await db.getCollections();
                          console.log("Current collections:", savedCollections);
                          
                          if (savedCollections[collectionToDelete]) {
                            // Delete the collection
                            delete savedCollections[collectionToDelete];
                            
                            // Save back to IndexedDB
                            await db.saveCollections(savedCollections);
                            console.log("Collection deleted successfully");
                            
                            // Check if we need to update selected collection in localStorage
                            const currentSelected = localStorage.getItem('selectedCollection');
                            if (currentSelected === collectionToDelete) {
                              // Select first available collection
                              const newSelected = Object.keys(savedCollections)[0] || 'Default Collection';
                              localStorage.setItem('selectedCollection', newSelected);
                            }
                            
                            toast.success('Collection deleted successfully!');
                            setCollectionToDelete('');
                            
                            // Force reload to ensure everything is in sync
                            window.location.reload();
                          } else {
                            throw new Error(`Collection "${collectionToDelete}" not found`);
                          }
                        } catch (error) {
                          console.error("Error deleting collection:", error);
                          toast.error(`Failed to delete collection: ${error.message}`);
                        }
                      }
                    }}
                    disabled={!collectionToDelete || collections.length <= 1}
                    className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 
                             text-red-600 dark:text-red-400 rounded-lg 
                             hover:bg-red-100 dark:hover:bg-red-900/30 
                             transition-colors disabled:opacity-50 
                             disabled:cursor-not-allowed"
                  >
                    Delete Collection
                  </button>
                </div>

                {/* Reset Application */}
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Reset Application</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    This will permanently delete all your collections, cards, and settings. This action cannot be undone.
                  </p>
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
    </div>
  );
};

export default SettingsModal; 