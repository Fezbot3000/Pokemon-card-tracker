import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { storage, functions, httpsCallable } from '../../services/firebase';
import { stripDebugProps } from '../../utils/stripDebugProps';
import { Modal, Button, ConfirmDialog, Icon, toast as toastService } from '../';
import FormField from '../molecules/FormField';
import SettingsPanel from '../molecules/SettingsPanel';
import SettingsNavItem from '../atoms/SettingsNavItem';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import JSZip from 'jszip';
import db from '../../services/db';

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
  const [isImporting, setIsImporting] = useState(false);
  const [isFixingSecurity, setIsFixingSecurity] = useState(false);
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
  const [showSecurityFixConfirm, setShowSecurityFixConfirm] = useState(false);
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

  // Handle file import
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      
      if (onImportCollection) {
        // Call the import function
        await onImportCollection(file);
        toastService.success('Data imported successfully!');
        
        // Refresh collections if needed
        if (refreshCollections) {
          refreshCollections();
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      toastService.error(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleUpdatePrices = async () => {
    try {
      await onUpdatePrices();
      toastService.success('Prices updated successfully!');
    } catch (error) {
      toastService.error('Failed to update prices: ' + error.message);
    }
  };

  const handleImportBaseDataChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBaseData(file)
        .then(() => {
          toastService.success('Base data imported successfully!');
        })
        .catch((error) => {
          toastService.error('Failed to import base data: ' + error.message);
        })
        .finally(() => {
          e.target.value = '';
        });
    }
  };

  // Verify data security
  const handleVerifyDataSecurity = async () => {
    setIsImportingBaseData(true);
    try {
      // Show a loading toast
      toastService.loading('Checking data security...', { duration: 10000, id: 'security-check' });
      
      // Get the current user ID
      const userId = currentUser?.uid;
      if (!userId) {
        throw new Error('User not logged in');
      }
      
      // Check if collections are stored with user ID
      const securityCheckResult = await db.verifyDataSecurity(userId);
      
      // Log detailed results to console for debugging
      console.log('Security check complete:', securityCheckResult);
      
      if (securityCheckResult.secure) {
        toastService.success(`Data security verified: All data is properly secured with your user ID. (${securityCheckResult.details.totalCollections} collections, ${securityCheckResult.details.totalImages} images)`, { id: 'security-check' });
      } else {
        // If data is not secure, show a warning with details and offer to fix it
        let detailMessage = '';
        
        if (securityCheckResult.details.unsecuredCollections?.length > 0) {
          detailMessage += `Collections: ${securityCheckResult.details.unsecuredCollections.map(c => c.name).join(', ')}. `;
        }
        
        if (securityCheckResult.details.unsecuredImages?.length > 0) {
          const imageCount = securityCheckResult.details.totalUnsecuredImages;
          detailMessage += `Images: ${imageCount} image${imageCount !== 1 ? 's' : ''} not secured.`;
        }
        
        toastService.error(
          `Security issue detected: ${securityCheckResult.message}. ${detailMessage} Click "Fix Security" to secure your data.`, 
          { 
            id: 'security-check',
            duration: 15000
          }
        );
        
        // Show confirmation dialog to fix security
        setShowSecurityFixConfirm(true);
      }
    } catch (error) {
      console.error('Error verifying data security:', error);
      toastService.error(`Security check failed: ${error.message}`, { id: 'security-check' });
    } finally {
      setIsImportingBaseData(false);
    }
  };

  // Fix data security issues
  const handleFixDataSecurity = async () => {
    setIsFixingSecurity(true);
    try {
      // Show a loading toast
      toastService.loading('Fixing data security...', { duration: 10000, id: 'security-fix' });
      
      // Get the current user ID
      const userId = currentUser?.uid;
      if (!userId) {
        throw new Error('User not logged in');
      }
      
      // Fix security by properly associating data with user ID
      await db.fixDataSecurity(userId);
      
      // Close the confirmation dialog
      setShowSecurityFixConfirm(false);
      
      // Show success message
      toastService.success('Data security has been fixed. Your data is now properly secured.', { id: 'security-fix' });
      
      // Refresh collections if needed
      if (refreshCollections) {
        refreshCollections();
      }
    } catch (error) {
      console.error('Error fixing data security:', error);
      toastService.error(`Failed to fix security: ${error.message}`, { id: 'security-fix' });
    } finally {
      setIsFixingSecurity(false);
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
    setCloudSyncStatus('Backing up to cloud...');
    
    // Show a simple loading toast
    toastService.loading('Backing up to cloud...', { duration: 60000, id: 'cloud-backup' });

    try {
      // Create the backup in the background
      if (!onExportData) {
        throw new Error('Export functionality not available');
      }
      
      // Log for debugging
      console.log('Starting cloud backup process...');
      console.log('onExportData available:', !!onExportData);
      console.log('Using direct Firebase Storage approach...');
      
      // Increment progress
      setCloudSyncProgress(30);
      
      // Create backup without showing UI or download dialog
      console.log('Calling onExportData with returnBlob: true');
      const blob = await onExportData({ returnBlob: true });
      
      console.log('Received blob from onExportData:', !!blob);
      
      if (!blob) {
        throw new Error('Failed to create backup file');
      }
      
      // Increment progress
      setCloudSyncProgress(50);
      
      try {
        // Upload directly to Firebase Storage
        console.log('Uploading directly to Firebase Storage...');
        
        // Create a reference to the backup file location
        const userId = currentUser.uid;
        const backupPath = `users/${userId}/backups/latest-backup.zip`;
        const storageRef = ref(storage, backupPath);
        
        // Upload the blob
        await uploadBytes(storageRef, blob, {
          contentType: 'application/zip',
          customMetadata: {
            uploadTime: new Date().toISOString(),
            userId: userId
          }
        });
        
        console.log('Upload completed successfully');
        
        // Update last sync timestamp
        localStorage.setItem('lastCloudSync', new Date().toISOString());
        
        // Complete
        setCloudSyncProgress(100);
        toastService.success('Backup complete', { id: 'cloud-backup' });
      } catch (uploadError) {
        console.error('Error uploading to Firebase Storage:', uploadError);
        
        // If the upload fails, save locally as a fallback
        if (process.env.NODE_ENV === 'development') {
          console.log('Upload failed, saving locally as fallback in development mode');
          
          // Create a download link for the backup file
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          const timestamp = new Date().toISOString().split('T')[0];
          link.download = `pokemon-card-tracker-backup-${timestamp}.zip`;
          
          // Trigger the download
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
          }, 100);
          
          // Update last sync timestamp
          localStorage.setItem('lastCloudSync', new Date().toISOString());
          
          // Complete
          setCloudSyncProgress(100);
          toastService.success('Backup saved locally (cloud upload failed)', { id: 'cloud-backup' });
        } else {
          // In production, propagate the error
          throw uploadError;
        }
      }
    } catch (error) {
      console.error('Cloud backup error:', error);
      toastService.error(`Backup failed: ${error.message}`, { id: 'cloud-backup' });
      setCloudSyncStatus('Failed');
    } finally {
      setTimeout(() => {
        setIsCloudBackingUp(false);
        setCloudSyncStatus('');
      }, 2000); // Keep the status visible briefly after completion
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
    setCloudSyncStatus('Restoring from cloud...');
    
    // Show a simple loading toast
    toastService.loading('Restoring from cloud...', { duration: 60000, id: 'cloud-restore' });

    try {
      // Log for debugging
      console.log('Starting cloud restore process...');
      console.log('Using direct Firebase Storage approach...');
      
      // Get the download URL in the background
      setCloudSyncProgress(30);
      
      // Create a reference to the backup file in Firebase Storage
      const userId = currentUser.uid;
      const backupPath = `users/${userId}/backups/latest-backup.zip`;
      const storageRef = ref(storage, backupPath);
      
      try {
        // Get the download URL directly from Firebase Storage
        console.log('Getting download URL from Firebase Storage...');
        
        const downloadURL = await getDownloadURL(storageRef);
        
        console.log('Download URL generated successfully:', downloadURL);
        
        // Increment progress
        setCloudSyncProgress(50);
        
        // Fetch the file in the background
        console.log('Fetching backup file...');
        const response = await fetch(downloadURL);
        if (!response.ok) {
          throw new Error(`Download failed (${response.status})`);
        }
        
        // Get the data as a blob
        console.log('Converting response to blob...');
        const blob = await response.blob();
        
        // Increment progress
        setCloudSyncProgress(70);
        
        // Create a File object from the blob
        console.log('Creating File object from blob...');
        const file = new File([blob], 'backup.zip', { type: 'application/zip' });
        
        // Use the import function to handle the restore
        if (!onImportCollection) {
          throw new Error('Import functionality not available');
        }
        
        // Import the backup
        console.log('Calling onImportCollection with file...');
        await onImportCollection(file);
        console.log('Import completed successfully');
        
        // Update last sync timestamp
        localStorage.setItem('lastCloudRestore', Date.now().toString());
        
        // Refresh collections if needed
        if (refreshCollections) {
          console.log('Refreshing collections...');
          refreshCollections();
        }
        
        // Complete
        setCloudSyncProgress(100);
        toastService.success('Restore complete', { id: 'cloud-restore' });
      } catch (storageError) {
        console.error('Firebase Storage error:', storageError);
        throw new Error(`Firebase Storage error: ${storageError.message}`);
      }
      
    } catch (error) {
      console.error('Cloud restore error:', error);
      toastService.error(`Restore failed: ${error.message}`, { id: 'cloud-restore' });
      setCloudSyncStatus('Failed');
    } finally {
      setTimeout(() => {
        setIsCloudRestoring(false);
        setCloudSyncStatus('');
      }, 2000); // Keep the status visible briefly after completion
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
                      fullWidth
                    >
                      Update Card Prices
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
                  <div className="space-y-6">
                    {/* Data Backup & Restore */}
                    <div>
                      <h4 className="font-medium mb-2">Data Backup & Restore</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Backup and restore your card collection data.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          onClick={() => handleCloudRestore()}
                          disabled={isCloudRestoring}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="cloud_download" />}
                        >
                          {isCloudRestoring ? 'Restoring...' : 'Restore from Cloud'}
                        </Button>
                        
                        <Button
                          onClick={() => handleCloudBackup()}
                          disabled={isCloudBackingUp}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="cloud_upload" />}
                        >
                          {isCloudBackingUp ? 'Backing up...' : 'Backup to Cloud'}
                        </Button>
                        
                        <Button
                          onClick={handleImport}
                          disabled={isImporting}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="upload_file" />}
                        >
                          {isImporting ? 'Restoring...' : 'Restore from File'}
                        </Button>
                        
                        <Button
                          onClick={handleExport}
                          disabled={isExporting}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="download" />}
                        >
                          {isExporting ? 'Exporting...' : 'Backup to File'}
                        </Button>
                      </div>
                      
                      {/* Progress bar for cloud operations */}
                      {(isCloudBackingUp || isCloudRestoring) && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                              style={{ width: `${cloudSyncProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{cloudSyncStatus}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Advanced Data Management */}
                    <div>
                      <h4 className="font-medium mb-2">Security & Maintenance</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Tools for data security verification and maintenance.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          onClick={handleVerifyDataSecurity}
                          disabled={isImportingBaseData}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="security" />}
                        >
                          {isImportingBaseData ? 'Checking...' : 'Verify Data Security'}
                        </Button>
                        
                        <Button
                          onClick={handleUpdatePrices}
                          disabled={isUpdatingPrices}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="update" />}
                        >
                          {isUpdatingPrices ? 'Updating...' : 'Update Prices'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Hidden file inputs */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                      accept=".zip,.json"
                    />
                    <input 
                      type="file" 
                      ref={importBaseDataRef} 
                      style={{ display: 'none' }} 
                      onChange={handleImportBaseDataChange}
                      accept=".json"
                    />
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

      {/* Custom ConfirmDialog for Fix Data Security */}
      <ConfirmDialog
        isOpen={showSecurityFixConfirm}
        onClose={() => setShowSecurityFixConfirm(false)}
        onConfirm={handleFixDataSecurity}
        title="Fix Data Security"
        message="Are you sure you want to fix the data security issue? This will re-associate your data with your user ID."
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
        accept=".json"
        className="hidden"
      />
    </>
  );
};

export default SettingsModal;
