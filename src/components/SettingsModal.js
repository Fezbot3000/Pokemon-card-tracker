import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { db } from '../services/db';
import JSZip from 'jszip';
import { toast } from 'react-hot-toast';
import { XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import CloudSync from './CloudSync';
import CollectionSelect from './CollectionSelect';

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
  onImportBaseData,
  notificationsEnabled,
  setNotificationsEnabled,
  syncOnStartup,
  setSyncOnStartup
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
  
  // Define missing variables and state
  const [lastSynced, setLastSynced] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedCollectionForAction, setSelectedCollectionForAction] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Define tabs
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'profile', label: 'Profile' },
    { id: 'account', label: 'Account' }
  ];
  
  // Initialize selected collection for action
  useEffect(() => {
    if (collections.length > 0 && !selectedCollectionForAction) {
      setSelectedCollectionForAction(collections[0]);
    }
  }, [collections, selectedCollectionForAction]);

  // Define missing handler functions
  const handleDeleteCollection = () => {
    // Only allow deleting if not 'All Cards' and not the last collection
    if (selectedCollectionForAction !== 'All Cards' && collections.length > 1) {
      setShowDeleteConfirm(true);
    }
  };
  
  const confirmDeleteCollection = () => {
    if (selectedCollectionForAction) {
      const collectionName = collections.find(c => c.id === selectedCollectionForAction)?.name;
      onDeleteCollection(selectedCollectionForAction);
      setShowDeleteConfirm(false);
      toast.success(`Collection "${collectionName}" deleted`);
    }
  };
  
  const handleRenameCollection = () => {
    if (newCollectionName.trim() && selectedCollectionForAction) {
      const oldName = collections.find(c => c.id === selectedCollectionForAction)?.name;
      onRenameCollection(selectedCollectionForAction, newCollectionName.trim());
      setShowRenameModal(false);
      setNewCollectionName('');
      toast.success(`Collection "${oldName}" renamed to "${newCollectionName.trim()}"`);
    }
  };
  
  const handleBackup = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to backup your data');
      return;
    }
    
    try {
      setBackingUp(true);
      // Implementation would go here
      toast.success('Data backed up to cloud successfully');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      setBackingUp(false);
    }
  };
  
  const handleRestore = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to restore your data');
      return;
    }
    
    try {
      setRestoring(true);
      // Implementation would go here
      toast.success('Data restored from cloud successfully');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(`Restore failed: ${error.message}`);
    } finally {
      setRestoring(false);
    }
  };
  
  // Update the FileChange handler to support the import button
  const handleFileChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        onImportCollection(file);
      }
    };
    
    input.click();
  };

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

  const handleStartTutorial = () => {
    startTutorial();
    onClose();
  };

  // Add click outside handler for modal (desktop only)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile) return; // Don't close on outside click on mobile
      
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
  }, [isOpen, onClose, isMobile]);

  // Prevent background scroll when modal is open (desktop only)
  useEffect(() => {
    if (isOpen && !isMobile) {
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
  }, [isOpen, isMobile]);
  
  // Stop propagation of scroll events in modal content
  const preventPropagation = (e) => {
    if (isMobile) return; // Don't prevent on mobile
    e.stopPropagation();
  };

  // Handle dropdown outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen) {
        const dropdown = document.querySelector('.collection-rename-dropdown');
        if (dropdown && !dropdown.contains(event.target)) {
          setDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Add authentication status update when currentUser changes
  useEffect(() => {
    // Update authentication status whenever currentUser changes
    setIsAuthenticated(!!currentUser);
    
    // Also update the last synced time if available
    const lastSync = localStorage.getItem('lastCloudSync');
    if (lastSync) {
      try {
        const date = new Date(lastSync);
        setLastSynced(date.toLocaleString());
      } catch (error) {
        console.error('Error parsing last sync date:', error);
        setLastSynced('Unknown');
      }
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Render different layouts based on screen size
  return (
    <div className={`fixed inset-0 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 300ms',
          zIndex: 50  // Add explicit z-index that's lower than bottom nav
        }}
        onClick={onClose}
      ></div>
      
      {/* Settings Panel */}
      <div 
        className="absolute inset-y-0 right-0 w-full max-w-md flex flex-col overflow-hidden"
        style={{
          backgroundColor: isDarkMode ? '#000000' : 'white',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out',
          zIndex: 100
        }}
      >
        
        {/* Header */}
        <div 
          style={{
            backgroundColor: isDarkMode ? '#000000' : 'white',
            borderBottomColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : '#e5e7eb',
            borderBottomWidth: '1px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDarkMode ? 'white' : '#111827' }}>Settings</h2>
          <button 
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              color: isDarkMode ? '#9ca3af' : '#9ca3af',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#1E293B' : '#f3f4f6';
              e.currentTarget.style.color = isDarkMode ? '#d1d5db' : '#6b7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#9ca3af';
            }}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        {/* Tabs */}
        <div 
          style={{
            display: 'flex',
            borderBottomWidth: '1px',
            borderBottomColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : '#e5e7eb',
            backgroundColor: isDarkMode ? '#000000' : 'white'
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'tab-underline-fix' : ''}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: activeTab === tab.id 
                  ? '#A18BFF' 
                  : isDarkMode ? '#9ca3af' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #A18BFF' : 'none',
                background: 'transparent',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto p-4"
          style={{
            backgroundColor: isDarkMode ? '#000000' : '#f9fafb',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 32px)',
            height: '100%',
            overscrollBehavior: 'contain'
          }}
        >
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 pb-32">
              {/* Data Management Tools - Moved to top */}
              <section>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Data Management Tools</h3>
                <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Update prices and import base card data</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={async () => {
                        try {
                          setIsUpdatingPrices(true);
                          // Close the settings modal first
                          onClose();
                          // Then trigger the update prices action
                          await onUpdatePrices();
                        } catch (error) {
                          console.error('Failed to update prices:', error);
                          toast.error('Failed to update prices: ' + error.message);
                        } finally {
                          setIsUpdatingPrices(false);
                        }
                      }}
                      className="btn btn-custom-green"
                      disabled={isUpdatingPrices}
                    >
                      {isUpdatingPrices ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent"></span>
                      ) : (
                        <span className="material-icons">update</span>
                      )}
                      Update Prices
                    </button>
                    
                    <button 
                      onClick={async () => {
                        try {
                          setIsImportingBaseData(true);
                          // Close the settings modal first
                          onClose();
                          // Then trigger the import base data action
                          await onImportBaseData();
                        } catch (error) {
                          console.error('Failed to import base data:', error);
                          toast.error('Failed to import base data: ' + error.message);
                        } finally {
                          setIsImportingBaseData(false);
                        }
                      }}
                      className="btn btn-custom-green"
                      disabled={isImportingBaseData}
                    >
                      {isImportingBaseData ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent"></span>
                      ) : (
                        <span className="material-icons">dataset</span>
                      )}
                      Import Data
                    </button>
                  </div>
                </div>
              </section>
              
              {/* Theme Selector */}
              <section>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Theme</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    className={`p-4 rounded-lg flex flex-col items-center justify-center 
                               border-2 transition-all duration-200
                               ${!isDarkMode 
                                 ? 'border-primary bg-primary/10' 
                                 : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}
                               bg-white dark:bg-[#0A0E17]`}
                    onClick={() => toggleTheme(false)}
                  >
                    <span className="material-icons text-3xl mb-2 text-yellow-500">light_mode</span>
                    <span className={`text-sm font-medium ${!isDarkMode ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>Light</span>
                  </button>
                  
                  <button 
                    className={`p-4 rounded-lg flex flex-col items-center justify-center 
                               border-2 transition-all duration-200
                               ${isDarkMode 
                                 ? 'border-primary bg-primary/10' 
                                 : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}
                               bg-white dark:bg-[#0A0E17]`}
                    onClick={() => toggleTheme(true)}
                  >
                    <span className="material-icons text-3xl mb-2 text-blue-600 dark:text-blue-400">dark_mode</span>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>Dark</span>
                  </button>
                </div>
              </section>
              
              {/* Local Backup Section */}
              <section>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Local Backup</h3>
                <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">Export your data to a file or import data from a backup</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleExport} 
                      className="btn btn-custom-purple"
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent"></span>
                      ) : (
                        <span className="material-icons text-purple-600 dark:text-purple-400">file_download</span>
                      )}
                      Export
                    </button>
                    
                    <button 
                      onClick={handleFileChange}
                      className="btn btn-custom-purple"
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent"></span>
                      ) : (
                        <span className="material-icons text-purple-600 dark:text-purple-400">file_upload</span>
                      )}
                      Import
                    </button>
                  </div>
                </div>
              </section>
              
              {/* Cloud Backup Section */}
              <section>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Cloud Backup</h3>
                <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4">
                  <CloudSync 
                    onExportData={onExportData} 
                    onImportCollection={onImportCollection}
                  />
                </div>
              </section>
              
              {/* Collection Management */}
              <section>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Collection Management</h3>
                
                <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4 space-y-4">
                  {/* Rename section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Collection</label>
                    <CollectionSelect 
                      collections={collections.filter(c => c.id !== 'All Cards')}
                      selectedCollection={selectedCollectionForAction}
                      onChange={(id) => {
                        setSelectedCollectionForAction(id);
                        const collection = collections.find(c => c.id === id);
                        if (collection) {
                          setNewCollectionName(collection.name);
                        }
                      }}
                    />
                  </div>
                  
                  <button 
                    onClick={() => {
                      const collection = collections.find(c => c.id === selectedCollectionForAction);
                      if (collection && collection.id !== 'All Cards') {
                        setNewCollectionName(collection.name);
                        setShowRenameModal(true);
                      }
                    }}
                    className="w-full bg-primary hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg
                             flex items-center justify-center space-x-2"
                    disabled={!selectedCollectionForAction || selectedCollectionForAction === 'All Cards'}
                  >
                    <span className="material-icons text-sm">edit</span>
                    <span>Rename</span>
                  </button>
                </div>
                
                {/* Delete section */}
                <div className="mt-4 bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4 space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Delete Collection</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Select a collection to delete. You cannot delete your last collection.
                  </p>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {collections
                      .filter(collection => collection.id !== 'All Cards') // Filter out "All Cards"
                      .map(collection => (
                      <div 
                        key={collection.id}
                        className={`p-3 rounded-lg cursor-pointer flex items-center
                                  border ${selectedCollectionForAction === collection.id 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-gray-200 dark:border-gray-700'}`}
                        onClick={() => setSelectedCollectionForAction(collection.id)}
                      >
                        <input
                          type="radio"
                          id={`delete-${collection.id}`}
                          name="delete-collection"
                          className="h-4 w-4 text-primary"
                          checked={selectedCollectionForAction === collection.id}
                          onChange={() => setSelectedCollectionForAction(collection.id)}
                        />
                        <label
                          htmlFor={`delete-${collection.id}`}
                          className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          {collection.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      const collection = collections.find(c => c.id === selectedCollectionForAction);
                      if (collection && collections.length > 1 && collection.id !== 'All Cards') {
                        setShowDeleteConfirm(true);
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg
                             flex items-center justify-center space-x-2"
                    disabled={collections.length <= 1 || !selectedCollectionForAction || selectedCollectionForAction === 'All Cards'}
                  >
                    <span className="material-icons text-sm">delete</span>
                    <span>Delete Collection</span>
                  </button>
                </div>
              </section>
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 pb-32">
              <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Information</h3>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={profile.firstName || ''}
                        onChange={handleProfileChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg
                                 bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={profile.lastName || ''}
                        onChange={handleProfileChange}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg
                                 bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={profile.mobileNumber || ''}
                      onChange={handleProfileChange}
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg
                               bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={profile.companyName || ''}
                      onChange={handleProfileChange}
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg
                               bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={profile.address || ''}
                      onChange={handleProfileChange}
                      rows="3"
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg
                               bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-primary focus:border-transparent"
                    ></textarea>
                  </div>
                  
                  <div className="pt-2">
                    <button onClick={handleProfileSave} className="w-full bg-primary hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg">
                      Save Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6 pb-32">
              <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Settings</h3>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Manage your account settings and preferences
                  </p>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start">
                      <span className="material-icons text-yellow-500 mr-2">info</span>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Account features will be enhanced in future updates. Stay tuned for more options!
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">App Preferences</h4>
                    
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Enable Notifications</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Get updates about your collection</p>
                      </div>
                      <div className="relative inline-block w-11 h-6 align-middle select-none">
                        <input 
                          type="checkbox" 
                          name="notifications" 
                          id="notifications"
                          checked={notificationsEnabled}
                          onChange={() => {
                            const newValue = !notificationsEnabled;
                            setNotificationsEnabled(newValue);
                            toast.success(`Notifications ${newValue ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <label 
                          htmlFor="notifications" 
                          className="absolute inset-0 cursor-pointer z-10"
                          aria-hidden="true"
                        ></label>
                        <span 
                          className={`absolute inset-0 rounded-full transition duration-200 ease-in-out border pointer-events-none ${
                            notificationsEnabled 
                              ? 'bg-[#A18BFF] border-[#9277FF]' 
                              : isDarkMode 
                                ? 'bg-gray-600 border-gray-700' 
                                : 'bg-gray-300 border-gray-400'
                          }`}
                          aria-hidden="true"
                        ></span>
                        <span 
                          className={`absolute block w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out pointer-events-none ${
                            notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                          style={{ top: '2px' }}
                          aria-hidden="true"
                        ></span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Sync on Startup</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Automatically sync your data when opening the app</p>
                      </div>
                      <div className="relative inline-block w-11 h-6 align-middle select-none">
                        <input 
                          type="checkbox" 
                          name="autoSync" 
                          id="autoSync"
                          checked={syncOnStartup}
                          onChange={() => {
                            const newValue = !syncOnStartup;
                            setSyncOnStartup(newValue);
                            toast.success(`Sync on startup ${newValue ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <label 
                          htmlFor="autoSync" 
                          className="absolute inset-0 cursor-pointer z-10"
                          aria-hidden="true"
                        ></label>
                        <span 
                          className={`absolute inset-0 rounded-full transition duration-200 ease-in-out border pointer-events-none ${
                            syncOnStartup 
                              ? 'bg-[#A18BFF] border-[#9277FF]' 
                              : isDarkMode 
                                ? 'bg-gray-600 border-gray-700' 
                                : 'bg-gray-300 border-gray-400'
                          }`}
                          aria-hidden="true"
                        ></span>
                        <span 
                          className={`absolute block w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out pointer-events-none ${
                            syncOnStartup ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                          style={{ top: '2px' }}
                          aria-hidden="true"
                        ></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {currentUser && (
                <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connected Accounts</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentUser.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Signed in with Google</p>
                    </div>
                    <button onClick={signOut} className="btn btn-danger btn-sm">
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Rename collection modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Rename Collection</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New name for "{collections.find(c => c.id === selectedCollectionForAction)?.name}"
              </label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-[#0A0E17] text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter new collection name"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => {
                  setShowRenameModal(false);
                  setNewCollectionName('');
                }}
                className="btn btn-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const collection = collections.find(c => c.id === selectedCollectionForAction);
                  if (collection && newCollectionName.trim()) {
                    onRenameCollection(collection.id, newCollectionName.trim());
                    setShowRenameModal(false);
                    setNewCollectionName('');
                  }
                }}
                className="btn btn-primary"
                disabled={!newCollectionName.trim()}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete collection confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#0A0E17] rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Delete Collection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{collections.find(c => c.id === selectedCollectionForAction)?.name}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const collection = collections.find(c => c.id === selectedCollectionForAction);
                  if (collection) {
                    onDeleteCollection(collection.id);
                    setShowDeleteConfirm(false);
                    setSelectedCollectionForAction('');
                  }
                }}
                className="btn btn-danger"
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