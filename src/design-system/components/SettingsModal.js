import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../atoms/Icon';
import { Modal, Button, ConfirmDialog } from '../';
import FormField from '../molecules/FormField';
import toastService from '../utils/toast';
import SettingsPanel from '../molecules/SettingsPanel';
import SettingsNavItem from '../atoms/SettingsNavItem';
import '../styles/animations.css';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAuth } from '../contexts/AuthContext';
import JSZip from 'jszip';

/**
 * SettingsModal Component
 * 
 * A comprehensive settings modal that provides access to app settings,
 * user profile, data management, and theme controls.
 */
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
  userData = null,
  onSignOut,
  onResetData,
  onStartTutorial,
  className = '',
  ...props 
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { currentUser } = useAuth();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isCloudBackingUp, setIsCloudBackingUp] = useState(false);
  const [isCloudRestoring, setIsCloudRestoring] = useState(false);
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
  const [collectionToRename, setCollectionToRename] = useState('');
  const fileInputRef = useRef(null);
  const importBaseDataRef = useRef(null);

  // Initialize collection to rename 
  useEffect(() => {
    if (collections.length > 0) {
      const firstCollection = collections.find(c => c !== 'All Cards') || collections[0];
      setCollectionToRename(firstCollection);
    }
  }, [collections]);

  // Load profile data from props
  useEffect(() => {
    if (userData) {
      setProfile(userData);
    }
  }, [userData]);

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
      // This would call a provided callback for saving the profile
      // For now, we'll just show a toast
      toastService.success('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toastService.error('Failed to save profile');
    }
  };

  const handleRenameConfirm = () => {
    if (newCollectionName && newCollectionName !== collectionToRename) {
      onRenameCollection(collectionToRename, newCollectionName);
      setIsRenaming(false);
      toastService.success('Collection renamed successfully!');
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
      toastService.success('Data exported successfully!');
    } catch (error) {
      toastService.error('Failed to export data: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportBaseData = () => {
    if (importBaseDataRef.current) {
      importBaseDataRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCollection(file);
      e.target.value = '';
    }
  };

  const handleUpdatePrices = async () => {
    setIsUpdatingPrices(true);
    try {
      await onUpdatePrices();
      toastService.success('Prices updated successfully!');
    } catch (error) {
      toastService.error('Failed to update prices: ' + error.message);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const handleImportBaseDataChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImportingBaseData(true);
      onImportBaseData(file)
        .then(() => {
          toastService.success('Base data imported successfully!');
        })
        .catch((error) => {
          toastService.error('Failed to import base data: ' + error.message);
        })
        .finally(() => {
          setIsImportingBaseData(false);
          e.target.value = '';
        });
    }
  };
  
  // --- State for custom reset confirmation dialog ---
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    console.log('[SettingsModal] handleConfirmReset called');
    setShowResetConfirm(false);
    if (onResetData) {
      try {
        await onResetData();
        console.log('[SettingsModal] onResetData completed');
      } catch (err) {
        console.error('[SettingsModal] Error in onResetData:', err);
      }
    } else {
      console.warn('[SettingsModal] onResetData is not defined');
    }
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  // Handle cloud backup
  const handleCloudBackup = async () => {
    if (!currentUser) {
      toastService.error('You must be logged in to use cloud backup');
      return;
    }

    setIsCloudBackingUp(true);

    try {
      // Show uploading toast
      toastService.loading('Creating cloud backup...', { duration: 10000, id: 'cloud-backup' });
      
      // Get the exportData function that handles the ZIP creation
      if (!onExportData) {
        throw new Error('Export functionality not available');
      }
      
      // Call the export function with returnBlob option to get the data without triggering a download
      const blob = await onExportData({ returnBlob: true });
      
      if (!blob) {
        throw new Error('Failed to generate backup data');
      }
      
      // Update toast
      toastService.loading('Uploading backup to cloud...', { duration: 10000, id: 'cloud-backup' });
      
      // Upload to Firebase Storage
      const backupRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      await uploadBytes(backupRef, blob);
      
      // Update last backup timestamp in localStorage
      const timestamp = new Date().toISOString();
      localStorage.setItem('lastCloudSync', timestamp);
      
      // Show success message
      toastService.success('Backup successfully uploaded to cloud', { id: 'cloud-backup' });
    } catch (error) {
      console.error('Error backing up to cloud:', error);
      toastService.error(`Cloud backup failed: ${error.message}`);
    } finally {
      setIsCloudBackingUp(false);
    }
  };

  // Handle cloud restore
  const handleCloudRestore = async () => {
    if (!currentUser) {
      toastService.error('You must be logged in to restore from cloud');
      return;
    }

    setIsCloudRestoring(true);

    try {
      // Create a reference to the backup in Firebase Storage
      const backupRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      // Show loading toast
      toastService.loading('Downloading backup from cloud...', { duration: 10000, id: 'cloud-restore' });
      
      // Get download URL
      const url = await getDownloadURL(backupRef);
      
      // Fetch the file
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to download backup from cloud');
      }
      
      // Convert to blob
      const blob = await response.blob();
      
      // Create a file object that can be passed to the import function
      const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
      
      // Update toast
      toastService.loading('Restoring data from cloud backup...', { duration: 10000, id: 'cloud-restore' });
      
      // Use the import function to handle the restore
      if (!onImportCollection) {
        throw new Error('Import functionality not available');
      }
      
      await onImportCollection(file);
      
      // Update last sync timestamp
      localStorage.setItem('lastCloudSync', new Date().toISOString());
      
      // Refresh collections if needed
      if (refreshCollections) {
        refreshCollections();
      }
      
      // Show success message
      toastService.success('Successfully restored from cloud backup', { id: 'cloud-restore' });
    } catch (error) {
      console.error('Error restoring from cloud:', error);
      toastService.error(`Cloud restore failed: ${error.message}`);
    } finally {
      setIsCloudRestoring(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        footer={
          <div className="flex justify-end w-full">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        }
        position="right"
        className={window.innerWidth < 640 ? 'w-full max-w-full h-full rounded-none m-0' : className}
        ariaLabel="Settings"
        size="fullscreen"
        closeOnClickOutside={window.innerWidth >= 640} // Only allow closing on click outside on desktop
      >
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
          {/* Navigation sidebar */}
          <nav
            className={`w-full lg:w-64 lg:flex-shrink-0 bg-white dark:bg-[#0F0F0F] border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700/30 ${window.innerWidth < 1024 ? 'overflow-visible' : 'overflow-y-auto lg:h-full'} p-4 space-y-2`}
          >
            <SettingsNavItem 
              icon="settings" 
              label="General"
              isActive={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            />
            <SettingsNavItem 
              icon="person" 
              label="Profile" 
              isActive={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
            />
            <SettingsNavItem 
              icon="account_balance_wallet" 
              label="Account" 
              isActive={activeTab === 'account'}
              onClick={() => setActiveTab('account')}
            />
            <SettingsNavItem 
              icon="code" 
              label="Development" 
              isActive={activeTab === 'development'}
              onClick={() => setActiveTab('development')}
            />
          </nav>

          {/* Content area */}
          <div className="w-full lg:flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50 dark:bg-[#1A1A1A]">
            {activeTab === 'general' && (
              <div className="space-y-2">
                <SettingsPanel
                  title="Cloud Backup"
                  description="Sync your collection to the cloud to access it anywhere."
                >
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Last synced: Never</p>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      iconLeft={<Icon name="cloud_upload" />}
                      onClick={handleCloudBackup}
                      isLoading={isCloudBackingUp}
                      disabled={isCloudBackingUp || !currentUser}
                      fullWidth
                    >
                      Backup to Cloud
                    </Button>
                    <Button
                      variant="outline"
                      iconLeft={<Icon name="cloud_download" />}
                      onClick={handleCloudRestore}
                      isLoading={isCloudRestoring}
                      disabled={isCloudRestoring || !currentUser}
                      fullWidth
                    >
                      Restore from Cloud
                    </Button>
                  </div>
                </SettingsPanel>
                
                <SettingsPanel
                  title="Appearance"
                  description="Choose your preferred light or dark theme."
                >
                  <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-[#0F0F0F] border-[#ffffff1a]' : 'bg-gray-100 border-gray-300'}`}>
                    <button
                      className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md transition-colors ${
                        !isDarkMode 
                          ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                          : 'bg-transparent text-gray-400 hover:text-white'
                      }`}
                      onClick={() => isDarkMode && toggleTheme()}
                    >
                      <Icon name="light_mode" size="sm" color={!isDarkMode ? 'white' : undefined} />
                      <span>Light</span>
                    </button>
                    <button
                      className={`flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-md transition-colors ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white' 
                          : 'bg-transparent text-gray-400 hover:text-white'
                      }`}
                      onClick={() => !isDarkMode && toggleTheme()}
                    >
                      <Icon name="dark_mode" size="sm" color={isDarkMode ? 'white' : undefined} />
                      <span>Dark</span>
                    </button>
                  </div>
                </SettingsPanel>
                
                <SettingsPanel
                  title="Currency Settings"
                  description="Select the default currency for display."
                >
                  <div className="w-full">
                    <select 
                      className={`w-full rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        isDarkMode 
                          ? 'bg-[#0F0F0F] text-white border border-[#ffffff1a]' 
                          : 'bg-white text-gray-800 border border-gray-300'
                      }`}
                      defaultValue="AUD (A$)"
                    >
                      <option>AUD (A$)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>JPY (¥)</option>
                    </select>
                  </div>
                </SettingsPanel>
                
                {(collections.length > 1 || collections.some(c => c !== 'All Cards')) && (
                <SettingsPanel
                  title="Manage Collections"
                  description="Delete a collection (must have at least one)."
                >
                  {collections.length <= 1 ? (
                    <p className={`text-center py-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No collections available to delete.
                    </p>
                  ) : (
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
                        <option value="">Select Collection...</option>
                        {collections
                          .filter(name => name !== 'All Cards')
                          .map((collection) => (
                            <option key={collection} value={collection}>
                              {collection}
                            </option>
                          ))
                        }
                      </select>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (collectionToDelete) {
                            onDeleteCollection(collectionToDelete);
                            setCollectionToDelete('');
                            refreshCollections?.();
                          }
                        }}
                        disabled={!collectionToDelete}
                        fullWidth
                      >
                        Delete Selected Collection
                      </Button>
                    </div>
                  )}
                </SettingsPanel>
                )}
                
                <SettingsPanel
                  title="Data Management"
                  description="Backup and restore your card collection data."
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="restore" />}
                        onClick={handleImport}
                        disabled={isExporting}
                        fullWidth
                      >
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="backup" />}
                        onClick={handleExport}
                        disabled={isExporting}
                        fullWidth
                      >
                        {isExporting ? 'Backing up...' : 'Backup'}
                      </Button>
                    </div>
                  </div>
                </SettingsPanel>
                
                <Button
                  variant="outline"
                  iconLeft={<Icon name="attach_money" />}
                  onClick={handleUpdatePrices}
                  disabled={isUpdatingPrices}
                  fullWidth
                >
                  {isUpdatingPrices ? 'Updating Prices...' : 'Update Card Prices'}
                </Button>
                <Button
                  variant="outline"
                  iconLeft={<Icon name="school" />}
                  onClick={onStartTutorial}
                  fullWidth
                >
                  Start Tutorial
                </Button>
                <Button
                  variant="danger"
                  iconLeft={<Icon name="delete_forever" />}
                  onClick={handleResetData}
                  fullWidth
                >
                  Reset All Data
                </Button>
              </div>
            )}
            
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Personal Information"
                  description="Update your personal details."
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        id="firstName"
                        label="First Name"
                        name="firstName"
                        value={profile.firstName || ''}
                        onChange={handleProfileChange}
                      />
                      <FormField
                        id="lastName"
                        label="Last Name"
                        name="lastName"
                        value={profile.lastName || ''}
                        onChange={handleProfileChange}
                      />
                    </div>
                    
                    <FormField
                      id="mobileNumber"
                      label="Mobile Number"
                      name="mobileNumber"
                      value={profile.mobileNumber || ''}
                      onChange={handleProfileChange}
                    />
                    
                    <FormField
                      id="address"
                      label="Address"
                      name="address"
                      value={profile.address || ''}
                      onChange={handleProfileChange}
                      multiline
                      rows={3}
                    />
                    
                    <FormField
                      id="companyName"
                      label="Company Name"
                      name="companyName"
                      value={profile.companyName || ''}
                      onChange={handleProfileChange}
                    />
                    
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={handleProfileSave}
                      >
                        Save Profile
                      </Button>
                    </div>
                  </div>
                </SettingsPanel>
              </div>
            )}
            
            {activeTab === 'account' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Account Details"
                  description="Manage your account information and sign out."
                >
                  {userData && (
                    <div className="flex items-center space-x-4 mb-6 bg-[#0a101c] p-4 rounded-lg">
                      <div className="flex-shrink-0 bg-indigo-600 rounded-full p-2">
                        <Icon name="account_circle" className="text-2xl text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {userData.displayName || 'User'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {userData.email}
                        </p>
                      </div>
                    </div>
                  )}
                  {onSignOut && (
                    <Button
                      variant="outline"
                      onClick={onSignOut}
                      iconLeft={<Icon name="logout" />}
                      fullWidth
                    >
                      Sign Out
                    </Button>
                  )}
                </SettingsPanel>
              </div>
            )}
            
            {activeTab === 'development' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Development Resources"
                  description="Access development tools and resources for the Pokemon Card Tracker app."
                >
                  <div className="bg-[#0e1525] rounded-lg p-4 border border-indigo-900/20">
                    <h4 className="font-medium text-white mb-2 flex items-center">
                      <Icon name="widgets" className="text-indigo-400 mr-2" />
                      Component Library
                    </h4>
                    <p className="text-sm text-gray-400 mb-3">
                      View and reference all design system components used throughout the application.
                    </p>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.location.href = '/component-library';
                          onClose();
                        }}
                        iconLeft={<Icon name="launch" />}
                      >
                        Open Library
                      </Button>
                    </div>
                  </div>
                </SettingsPanel>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Custom ConfirmDialog for Reset All Data */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        title="Reset All Data"
        message="Are you sure you want to reset all data? This action cannot be undone."
      />

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={importBaseDataRef}
        onChange={handleImportBaseDataChange}
        accept=".zip,.json"
        className="hidden"
      />
    </>
  );
};

SettingsModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Function to close the modal */
  onClose: PropTypes.func.isRequired,
  /** Currently selected collection */
  selectedCollection: PropTypes.string,
  /** Array of available collections */
  collections: PropTypes.arrayOf(PropTypes.string),
  /** Function to rename a collection */
  onRenameCollection: PropTypes.func,
  /** Function to delete a collection */
  onDeleteCollection: PropTypes.func,
  /** Function to refresh the collections list */
  refreshCollections: PropTypes.func,
  /** Function to export data */
  onExportData: PropTypes.func,
  /** Function to import a collection */
  onImportCollection: PropTypes.func,
  /** Function to update card prices */
  onUpdatePrices: PropTypes.func,
  /** Function to import base data */
  onImportBaseData: PropTypes.func,
  /** Function to reset all data */
  onResetData: PropTypes.func,
  /** Function to start the tutorial */
  onStartTutorial: PropTypes.func,
  /** User data object */
  userData: PropTypes.object,
  /** Function to sign out */
  onSignOut: PropTypes.func,
  /** Additional class names */
  className: PropTypes.string
};

export default SettingsModal;
