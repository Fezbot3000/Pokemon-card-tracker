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
import { stripDebugProps } from '../../utils/stripDebugProps';
import DataManagementSection from '../../components/DataManagementSection';

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
  const [cloudSyncProgress, setCloudSyncProgress] = useState(0);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('');
  const [importStep, setImportStep] = useState(0); // 0 = not importing, 1-4 = import steps
  const [importProgress, setImportProgress] = useState(0);
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
    setCloudSyncProgress(10);
    setCloudSyncStatus('Preparing...');

    try {
      // Show uploading toast with percentage
      toastService.loading('Creating cloud backup... (10%)', { duration: 20000, id: 'cloud-backup' });
      
      // Get the exportData function that handles the ZIP creation
      if (!onExportData) {
        throw new Error('Export functionality not available');
      }
      
      // Update status
      setCloudSyncStatus('Creating backup...');
      
      // Call the export function with returnBlob option to get the data without triggering a download
      const blob = await onExportData({ 
        returnBlob: true,
        optimizeForMobile: true // Add optimization hint
      });
      
      if (!blob) {
        throw new Error('Failed to generate backup data');
      }
      
      // Update progress
      setCloudSyncProgress(50);
      setCloudSyncStatus('Uploading to cloud...');
      
      // Update toast
      toastService.loading('Uploading backup to cloud... (50%)', { duration: 20000, id: 'cloud-backup' });
      
      // Upload to Firebase Storage with simple uploadBytes for better mobile compatibility
      const backupRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      await uploadBytes(backupRef, blob);
      
      // Update progress
      setCloudSyncProgress(100);
      setCloudSyncStatus('Complete!');
      
      // Update last backup timestamp in localStorage
      const timestamp = new Date().toISOString();
      localStorage.setItem('lastCloudSync', timestamp);
      
      // Show success message
      toastService.success('Backup successfully uploaded to cloud (100%)', { id: 'cloud-backup' });
    } catch (error) {
      console.error('Error backing up to cloud:', error);
      
      // More specific error messages
      if (error.code === 'storage/retry-limit-exceeded') {
        toastService.error('Backup file too large for mobile. Try on desktop or reduce collection size.', 
          { id: 'cloud-backup' });
      } else if (error.code === 'storage/unauthorized') {
        toastService.error('Unauthorized: Please log in again.', { id: 'cloud-backup' });
      } else {
        toastService.error(`Cloud backup failed: ${error.message}`, { id: 'cloud-backup' });
      }
      
      setCloudSyncStatus('Failed');
    } finally {
      setTimeout(() => {
        setIsCloudBackingUp(false);
        setCloudSyncStatus('');
      }, 3000); // Keep the status visible briefly after completion
    }
  };

  // Handle cloud restore
  const handleCloudRestore = async () => {
    if (!currentUser) {
      toastService.error('You must be logged in to restore from cloud');
      return;
    }

    setIsCloudRestoring(true);
    setCloudSyncProgress(10);
    setCloudSyncStatus('Preparing...');

    try {
      // Create a reference to the backup in Firebase Storage
      const backupRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      // Show loading toast
      toastService.loading('Checking for backups... (10%)', { duration: 20000, id: 'cloud-restore' });
      
      // Get download URL
      let url;
      try {
        url = await getDownloadURL(backupRef);
        setCloudSyncProgress(30);
        setCloudSyncStatus('Found backup, preparing download...');
        toastService.loading('Found backup, preparing download... (30%)', { id: 'cloud-restore' });
      } catch (urlError) {
        if (urlError.code === 'storage/object-not-found') {
          throw new Error('No backup found in cloud');
        } else {
          throw urlError;
        }
      }
      
      // Use XHR for more reliable downloads especially on Safari
      const downloadPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        
        // Add progress monitoring
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 50) + 30;
            setCloudSyncProgress(percentComplete);
            setCloudSyncStatus(`Downloading: ${percentComplete}%`);
            // Update toast with current progress
            toastService.loading(`Downloading backup... (${percentComplete}%)`, { id: 'cloud-restore' });
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Failed to download: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };
        
        xhr.open('GET', url);
        xhr.send();
      });
      
      // Wait for download to complete
      const blob = await downloadPromise;
      
      setCloudSyncProgress(80);
      setCloudSyncStatus('Processing data...');
      toastService.loading('Processing downloaded data... (80%)', { id: 'cloud-restore' });
      
      // Create a file object that can be passed to the import function
      const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
      
      // Use the import function to handle the restore
      if (!onImportCollection) {
        throw new Error('Import functionality not available');
      }
      
      // Instead of passing directly to onImportCollection, handle it in this component
      // This allows us to show the import progress without the separate overlay
      await handleImportWithProgress(file);
      
      // Update last sync timestamp
      localStorage.setItem('lastCloudSync', new Date().toISOString());
      
      // Refresh collections if needed
      if (refreshCollections) {
        refreshCollections();
      }
      
      // Show success message
      toastService.success('Successfully restored from cloud backup (100%)', { id: 'cloud-restore' });
    } catch (error) {
      console.error('Error restoring from cloud:', error);
      
      // More specific error messages
      if (error.message === 'No backup found in cloud') {
        toastService.error('No backup found in cloud. Please create a backup first.', { id: 'cloud-restore' });
      } else if (error.code === 'storage/quota-exceeded') {
        toastService.error('Storage quota exceeded. Please contact support.', { id: 'cloud-restore' });
      } else {
        toastService.error(`Cloud restore failed: ${error.message}`, { id: 'cloud-restore' });
      }
      
      setCloudSyncStatus('Failed');
    } finally {
      // Don't reset right away - allow time to see the completion or error state
      setTimeout(() => {
        setIsCloudRestoring(false);
        setCloudSyncStatus('');
        setImportStep(0);
        setImportProgress(0);
      }, 3000);
    }
  };

  // Function to handle import with progress tracking
  const handleImportWithProgress = async (file) => {
    try {
      // Set import status to step 1
      setImportStep(1);
      setImportProgress(10);
      setCloudSyncProgress(80); // Continue from cloud download progress
      setCloudSyncStatus('Processing download...');
      
      // Call the import function but tell it NOT to show the overlay
      await onImportCollection(file, {
        noOverlay: true, // Critical flag to prevent the full-page overlay
        // Define callbacks for progress tracking
        onProgress: (step, percent, message) => {
          // Map the import steps (1-4) to the 80-100% range of our progress bar
          const mappedPercent = 80 + (percent / 100) * 20;
          setCloudSyncProgress(mappedPercent);
          setCloudSyncStatus(message || `Step ${step} of 4: ${percent}%`);
        }
      });
      
      // After successful import
      setCloudSyncProgress(100);
      setCloudSyncStatus('Import completed successfully!');
      
      // Show success message
      toastService.success('Data imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      toastService.error(`Import failed: ${error.message}`);
      setCloudSyncStatus('Import failed: ' + error.message);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        footer={
          <div className="flex items-center justify-end w-full">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        }
        position="right"
        className={`max-w-screen-lg mx-auto ${className}`}
        ariaLabel="Settings"
        size="full"
        closeOnClickOutside={false}
        {...stripDebugProps(props)}
      >
        <div className="flex flex-col lg:flex-row h-full" {...stripDebugProps(props)}>
          {/* Navigation sidebar */}
          <nav className="w-full lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-indigo-900/20 mb-4 lg:mb-0 lg:pr-4">
            <div className="flex flex-row lg:flex-col space-x-4 lg:space-x-0 lg:space-y-2 p-4">
              <SettingsNavItem 
                icon="settings" 
                label="General" 
                isActive={activeTab === 'general'}
                onClick={() => setActiveTab('general')}
              />
              <SettingsNavItem 
                icon="account_circle" 
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
            </div>
          </nav>

          {/* Content area */}
          <div className="w-full lg:flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50 dark:bg-[#1A1A1A]" {...stripDebugProps(props)}>
            {activeTab === 'general' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Appearance"
                  description="Choose your preferred light or dark theme."
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div 
                      className={`
                        flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${!isDarkMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-gray-700'}
                      `}
                      onClick={() => toggleTheme('light')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Light Mode</h4>
                        {!isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-md p-2">
                        <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
                        <div className="h-2 w-16 bg-gray-300 rounded mb-2"></div>
                        <div className="h-2 w-10 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                    
                    <div 
                      className={`
                        flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-gray-200 dark:border-gray-700'}
                      `}
                      onClick={() => toggleTheme('dark')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">Dark Mode</h4>
                        {isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
                      </div>
                      <div className="bg-gray-900 border border-gray-700 rounded-md p-2">
                        <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
                        <div className="h-2 w-16 bg-gray-700 rounded mb-2"></div>
                        <div className="h-2 w-10 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Application Settings"
                  description="Configure general application settings."
                >
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      iconLeft={<Icon name="attach_money" />}
                      onClick={handleUpdatePrices}
                      disabled={isUpdatingPrices}
                      fullWidth
                    >
                      {isUpdatingPrices ? 'Updating Prices...' : 'Update Card Prices'}
                    </Button>
                    
                    {onStartTutorial && (
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="help_outline" />}
                        onClick={onStartTutorial}
                        fullWidth
                      >
                        Start Tutorial
                      </Button>
                    )}
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
              </div>
            )}
            
            {activeTab === 'account' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Personal Information"
                  description="Update your personal information and profile settings."
                >
                  {/* Profile form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      id="firstName"
                      label="First Name"
                      type="text"
                      name="firstName"
                      value={profile.firstName || ''}
                      onChange={handleProfileChange}
                    />
                    <FormField
                      id="lastName"
                      label="Last Name"
                      type="text"
                      name="lastName"
                      value={profile.lastName || ''}
                      onChange={handleProfileChange}
                    />
                    <FormField
                      id="companyName"
                      label="Company Name (Optional)"
                      type="text"
                      name="companyName"
                      value={profile.companyName || ''}
                      onChange={handleProfileChange}
                    />
                    <FormField
                      id="mobileNumber"
                      label="Mobile Number (Optional)"
                      type="tel"
                      name="mobileNumber"
                      value={profile.mobileNumber || ''}
                      onChange={handleProfileChange}
                    />
                    <div className="md:col-span-2">
                      <FormField
                        id="address"
                        label="Address (Optional)"
                        type="text"
                        name="address"
                        value={profile.address || ''}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="primary"
                      onClick={handleProfileSave}
                    >
                      Save Profile
                    </Button>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Sign Out"
                  description="Sign out of your account and return to the login screen."
                  expandable={undefined}
                >
                  {userData && (
                    <div className="flex items-center space-x-4 mb-6 bg-[#0a101c] p-4 rounded-lg">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                        {userData.firstName ? userData.firstName.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {userData.firstName} {userData.lastName}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {currentUser ? currentUser.email : 'Not signed in'}
                        </div>
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
                  title="Data Management"
                  description="Analyze and manage your card data storage to ensure everything is up to date."
                >
                  <DataManagementSection />
                </SettingsPanel>

                <SettingsPanel
                  title="Data Backup & Restore"
                  description="Backup and restore your card collection data."
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="cloud_download" />}
                        fullWidth
                        onClick={handleCloudRestore}
                        disabled={isCloudRestoring || !currentUser}
                      >
                        {isCloudRestoring ? 'Restoring...' : 'Restore from Cloud'}
                      </Button>
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="cloud_upload" />}
                        fullWidth
                        onClick={handleCloudBackup}
                        disabled={isCloudBackingUp || !currentUser}
                      >
                        {isCloudBackingUp ? 'Backing up...' : 'Backup to Cloud'}
                      </Button>
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="restore" />}
                        onClick={handleImport}
                        disabled={isExporting}
                        fullWidth
                      >
                        Restore from File
                      </Button>
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="backup" />}
                        onClick={handleExport}
                        disabled={isExporting}
                        fullWidth
                      >
                        {isExporting ? 'Backing up...' : 'Backup to File'}
                      </Button>
                    </div>
                    
                    {(isCloudBackingUp || isCloudRestoring) && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{cloudSyncStatus}</span>
                          <span>{Math.round(cloudSyncProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${cloudSyncProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Advanced Actions"
                  description="Be careful with these options as they may affect your data."
                >
                  <div className="space-y-4">
                    <Button
                      variant="danger"
                      iconLeft={<Icon name="delete_forever" />}
                      onClick={handleResetData}
                      fullWidth
                    >
                      Reset All Data
                    </Button>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Development Resources"
                  description="Access development tools and resources for the Pokemon Card Tracker app."
                >
                  <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <Icon name="widgets" className="text-indigo-400 mr-2" />
                      Component Library
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
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
