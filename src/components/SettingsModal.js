import React, { useState, useRef, useEffect } from 'react';
import { useAuth, useTheme } from '../design-system';
import { useTutorial } from '../contexts/TutorialContext';
import db from '../services/db';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import CloudSync from './CloudSync';
import SubscriptionManagement from './SubscriptionManagement';
import { Link } from 'react-router-dom';
import { preventBodyScroll, restoreBodyScroll } from '../utils/modalUtils';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  selectedCollection,
  collections = [],
  onRenameCollection, 
  onDeleteCollection,
  refreshCollections,
  onExportData,
  onImportCollection,
  onUpdatePrices,
  onImportBaseData
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { currentUser, signOut } = useAuth();
  const { startTutorial } = useTutorial();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [isImportingBaseData, setIsImportingBaseData] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [collectionToRename, setCollectionToRename] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint in Tailwind
    };
    
    checkMobile(); // Check on initial load
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

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

  // Initialize collection to rename 
  useEffect(() => {
    if (collections.length > 0) {
      const firstCollection = collections.find(c => c !== 'All Cards') || collections[0];
      setCollectionToRename(firstCollection);
    }
  }, [collections]);

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
    if (newCollectionName && newCollectionName !== collectionToRename) {
      onRenameCollection(collectionToRename, newCollectionName);
      setIsRenaming(false);
      toast.success('Collection renamed successfully!');
    }
  };

  const handleStartRenaming = () => {
    setNewCollectionName(collectionToRename);
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
    handleClose();
  };

  // Use effect to control modal open/close and body scroll
  useEffect(() => {
    if (isOpen) {
      setModalOpen(true);
      preventBodyScroll(); // Prevent background scrolling
    } else {
      setModalOpen(false);
      restoreBodyScroll(); // Restore background scrolling
    }
  }, [isOpen]);

  // Add handle close with animation
  const handleClose = () => {
    setModalOpen(false);
    restoreBodyScroll(); // Restore background scrolling
    
    // Add a slight delay before fully closing to allow for animation
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Return null if not open to prevent rendering
  if (!isOpen && !modalOpen) return null;

  // Render different layouts based on screen size
  return (
    <>
      {/* Semi-transparent overlay - only shown on desktop */}
      {!isMobile && (
        <div 
          className={`card-details-overlay settings-overlay ${modalOpen ? 'open' : ''}`}
          onClick={handleClose}
        />
      )}
      
      {/* Settings content */}
      <div 
        className={`settings-modal-content ${modalOpen ? 'open' : ''} ${isMobile ? 'settings-mobile-page settings-fullscreen settings-direct-page settings-with-nav' : ''}`}
        onWheel={(e) => e.stopPropagation()} 
        onTouchMove={(e) => e.stopPropagation()}
        onScroll={(e) => e.stopPropagation()}
      >
        {/* Mobile header with tabs - removing fixed positioning */}
        {isMobile && (
          <div className="bg-white dark:bg-[#1B2131] border-b border-gray-200 dark:border-gray-700/50">
            <div className="max-w-xl mx-auto px-4 sm:px-6 w-full">
              <div className="flex items-center h-16">
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink min-w-0 max-w-[45%] sm:max-w-[60%] md:max-w-[70%]">
                  <img src="/favicon-192x192.png" alt="Pokemon Card Tracker" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain" />
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[180px] md:max-w-[250px]">
                      {selectedCollection ? selectedCollection : 'Settings'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Settings tabs in top bar */}
            <div className="border-t border-gray-200 dark:border-gray-700/50">
              <div className="max-w-xl mx-auto px-4 sm:px-6 w-full">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`py-3 px-3 transition-colors ${
                      activeTab === 'general'
                        ? 'text-primary font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-3 px-4 transition-colors ${
                      activeTab === 'profile'
                        ? 'text-primary font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`py-3 px-4 transition-colors ${
                      activeTab === 'account'
                        ? 'text-primary font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Account
                  </button>
                  <button
                    onClick={() => setActiveTab('development')}
                    className={`py-3 px-4 transition-colors ${
                      activeTab === 'development'
                        ? 'text-primary font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Development
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="settings-header">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
              <button 
                onClick={handleClose}
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
                  className={`pb-2 px-1 transition-colors ${
                    activeTab === 'general'
                      ? 'text-primary font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-2 px-1 transition-colors ${
                    activeTab === 'profile'
                      ? 'text-primary font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`pb-2 px-1 transition-colors ${
                    activeTab === 'account'
                      ? 'text-primary font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Account
                </button>
                <button
                  onClick={() => setActiveTab('development')}
                  className={`pb-2 px-1 transition-colors ${
                    activeTab === 'development'
                      ? 'text-primary font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Development
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className={`${isMobile ? 'p-4 sm:p-6 pt-0 max-w-xl mx-auto w-full space-y-6 mobile-settings-scrollable' : 'p-6 space-y-6'} overflow-y-auto flex-1`}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          {activeTab === 'general' && (
            <div className={`space-y-6 ${isMobile ? 'mobile-settings-content' : ''}`}>
              {/* Theme Section */}
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Appearance</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (isDarkMode) toggleTheme();
                    }}
                    className={`flex-1 ${
                      !isDarkMode 
                        ? 'btn btn-secondary'
                        : 'btn btn-tertiary'
                    }`}
                  >
                    <span className="material-icons">light_mode</span>
                    <span className="font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!isDarkMode) toggleTheme();
                    }}
                    className={`flex-1 ${
                      isDarkMode 
                        ? 'btn btn-secondary'
                        : 'btn btn-tertiary'
                    }`}
                  >
                    <span className="material-icons">dark_mode</span>
                    <span className="font-medium">Dark</span>
                  </button>
                </div>
              </div>
              
              {/* Collection Management */}
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Manage Collections</h3>
                <div className="space-y-3 mt-2">
                  {/* Rename Collection */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Rename Collection</h4>
                    </div>
                    {isRenaming ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                                   bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="New name"
                        />
                        <button
                          onClick={handleRenameConfirm}
                          className="btn btn-primary"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsRenaming(false)}
                          className="btn btn-tertiary"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {collections.filter(c => c !== 'All Cards').length > 0 ? (
                          <div className="flex-1 relative">
                            <div 
                              onClick={() => setDropdownOpen(!dropdownOpen)}
                              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 rounded-lg flex items-center justify-between cursor-pointer text-gray-700 dark:text-gray-300"
                            >
                              <div className="flex items-center">
                                <span className="material-icons text-sm mr-2 text-blue-500">collections_bookmark</span>
                                <span className="truncate">{collectionToRename}</span>
                              </div>
                              <span className="material-icons text-sm flex-shrink-0 ml-1">
                                {dropdownOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                              </span>
                            </div>
                            
                            {dropdownOpen && (
                              <div className="collection-rename-dropdown absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                                {collections
                                  .filter(c => c !== 'All Cards')
                                  .map(collection => (
                                    <div 
                                      key={collection} 
                                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${collection === collectionToRename ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                      onClick={() => {
                                        setCollectionToRename(collection);
                                        setDropdownOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="truncate">{collection}</span>
                                        {collection === collectionToRename && (
                                          <span className="material-icons text-primary text-sm flex-shrink-0 ml-1">check</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <span className="text-gray-500 dark:text-gray-400">
                              No collections available to rename
                            </span>
                          </div>
                        )}
                        <button
                          onClick={handleStartRenaming}
                          disabled={collections.filter(c => c !== 'All Cards').length === 0}
                          className="btn btn-sm btn-secondary flex-shrink-0 collection-rename-btn"
                        >
                          <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Delete Collection */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Delete Collection</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Select a collection to delete. (Note: You must always have at least one collection.)
                    </p>
                    {/* Collection Selection */}
                    <div className={`mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg ${isMobile ? 'max-h-40 overflow-y-auto' : ''}`}>
                      {collections.length > 1 ? (
                        <div className="space-y-2">
                          {collections
                            .filter(c => c !== 'All Cards')
                            .map(collection => (
                              <div key={collection} className="flex items-center">
                                <input
                                  type="radio"
                                  id={`collection-${collection}`}
                                  name="collectionToDelete"
                                  value={collection}
                                  checked={collectionToDelete === collection}
                                  onChange={() => setCollectionToDelete(collection)}
                                  className="w-4 h-4 text-primary focus:ring-primary border-primary"
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
                      className="w-full btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center w-full gap-2">
                        <span className="material-icons">delete</span>
                        <span>Delete Collection</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Import & Export Section */}
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Card Data Tools</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Update your card prices or import new cards
                </p>
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex gap-2'}`}>
                  <button
                    onClick={async () => {
                      try {
                        setIsUpdatingPrices(true);
                        await onUpdatePrices();
                        toast.success('Card prices updated successfully!');
                      } catch (error) {
                        console.error('Failed to update prices:', error);
                        toast.error('Failed to update prices: ' + error.message);
                      } finally {
                        setIsUpdatingPrices(false);
                      }
                    }}
                    disabled={isUpdatingPrices}
                    className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
                  >
                    {isUpdatingPrices ? (
                      <span>Updating Prices...</span>
                    ) : (
                      <div className="flex items-center justify-center w-full gap-2">
                        <span className="material-icons">update</span>
                        <span>Update Prices</span>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        setIsImportingBaseData(true);
                        await onImportBaseData();
                        toast.success('Cards imported successfully!');
                      } catch (error) {
                        console.error('Failed to import base data:', error);
                        toast.error('Failed to import base data: ' + error.message);
                      } finally {
                        setIsImportingBaseData(false);
                      }
                    }}
                    disabled={isImportingBaseData}
                    className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
                  >
                    {isImportingBaseData ? (
                      <span>Importing Cards...</span>
                    ) : (
                      <div className="flex items-center justify-center w-full gap-2">
                        <span className="material-icons">upload_file</span>
                        <span>Import Cards</span>
                      </div>
                    )}
                  </button>
                </div>
                
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 p-2 rounded">
                  <div className="flex items-start">
                    <span className="material-icons text-primary text-xs mr-1">info</span>
                    <p>You can upload multiple CSV files at once when updating prices. Cards will be matched by their Serial Number across all collections.</p>
                  </div>
                </div>
              </div>
              
              {/* Backup & Restore */}
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Backup & Restore</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Save your collection data or restore from a previous backup
                </p>
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex gap-2'}`}>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
                  >
                    {isExporting ? (
                      <>Exporting...</>
                    ) : (
                      <>
                        <span className="material-icons">download</span>
                        <span>Backup Data</span>
                      </>
                    )}
                  </button>
                  
                  <label className={`${isMobile ? 'w-full' : 'flex-1'}`}>
                    <div className="btn btn-primary w-full cursor-pointer text-center">
                      <span className="material-icons">upload</span>
                      <span>Restore Backup</span>
                    </div>
                    <input
                      type="file"
                      accept=".zip,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Help Section */}
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Help & Guidance</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Learn how to use the app with our step-by-step tutorial
                </p>
                <button 
                  onClick={handleStartTutorial}
                  className="w-full btn btn-custom-purple"
                >
                  <span className="material-icons">help_outline</span>
                  <span className="font-medium">Start Tutorial</span>
                </button>
              </div>

              {/* Reset Application */}
              <div className={`rounded-lg border border-red-200 dark:border-red-900/50 p-4 ${isMobile ? 'bg-white dark:bg-[#1B2131] shadow-sm mb-20' : ''}`}>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Reset Application</h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Start fresh by deleting all your collections and settings. Warning: This cannot be undone.
                </p>
                <button
                  onClick={handleResetData}
                  className="w-full btn btn-danger"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={`space-y-6 ${isMobile ? 'mobile-settings-content' : ''}`}>
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Your Information</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  This information is used when generating sale invoices and receipts
                </p>
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

                  <div className={`flex justify-end ${isMobile ? 'mb-20' : ''}`}>
                    <button
                      onClick={handleProfileSave}
                      className="btn btn-primary"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className={`space-y-6 ${isMobile ? 'mobile-settings-content' : ''}`}>
              {/* Subscription Management */}
              <SubscriptionManagement isMobile={isMobile} onClose={handleClose} />
              
              {/* User Info */}
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Account Information</h3>
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
                className={`w-full btn btn-tertiary mt-4 ${isMobile ? 'mb-20' : ''}`}
              >
                <span className="material-icons text-gray-600 dark:text-gray-400">logout</span>
                Sign Out
              </button>
            </div>
          )}

          {activeTab === 'development' && (
            <div className={`space-y-6 ${isMobile ? 'mobile-settings-content' : ''}`}>
              <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Development Resources</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Access development tools and resources for the Pokemon Card Tracker app.
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-white dark:bg-[#252B3B] rounded-lg shadow-sm">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <span className="material-icons text-primary mr-2">widgets</span>
                      Component Library
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      View and reference all design system components used throughout the application.
                    </p>
                    <div className="flex justify-end">
                      <Link 
                        to="/component-library" 
                        className="btn btn-primary"
                        onClick={handleClose}
                      >
                        <span className="material-icons text-sm mr-1">launch</span>
                        Open Library
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SettingsModal; 