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
import { useRestore } from '../contexts/RestoreContext';
import { useBackup } from '../contexts/BackupContext';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import JSZip from 'jszip';
import db from '../../services/db';
import cloudSync from '../../services/cloudSync';

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
  const { 
    isRestoring, 
    restoreProgress, 
    restoreStatus, 
    addRestoreLog, 
    startRestore, 
    completeRestore, 
    cancelRestore,
    setRestoreProgress,
    setRestoreStatus
  } = useRestore();
  const {
    isBackingUp,
    backupProgress,
    backupStatus,
    startBackup,
    completeBackup,
    cancelBackup,
    setBackupProgress,
    setBackupStatus,
    addBackupLog
  } = useBackup();
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
  const [activeTab, setActiveTab] = useState('general');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [devLogs, setDevLogs] = useState([]); // Add state for logs
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: ''
  });
  const [collectionToRename, setCollectionToRename] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false); // Add state for restore confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const importBaseDataRef = useRef(null);

  // Function to add logs to the state and console
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setDevLogs(prevLogs => [...prevLogs, logEntry]);
    console.log(message); // Keep console logging as well
  };

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

  // Handle cloud backup
  const handleCloudBackup = async () => {
    if (!currentUser) {
      addLog('User not signed in for cloud backup.');
      toastService.error('You must be signed in to use cloud backup.');
      return;
    }

    try {
      // Use the global backup context instead of local state
      startBackup();
      addBackupLog('Starting cloud backup process...');
      
      // Get the current user ID
      const userId = currentUser.uid;
      addBackupLog(`User ID: ${userId}`);
      
      // Inform the user they can close the settings modal
      toastService.success('Backup process started. You can close this window and the backup will continue in the background.');

      // Use the new incremental backup service
      const result = await cloudSync.incrementalBackup(
        userId,
        setBackupProgress,
        setBackupStatus,
        addBackupLog
      );

      if (result.success) {
        toastService.success('Cloud backup completed successfully!');
        addBackupLog(`Backup completed: ${result.collections} collections, ${result.addedImages} new images uploaded, ${result.removedImages} deleted images removed.`);
        completeBackup();
      }
    } catch (error) {
      console.error('Cloud backup failed:', error);
      addBackupLog(`Cloud backup failed: ${error.message}`);
      setBackupStatus(`Error: ${error.message}`);
      toastService.error(`Cloud backup failed: ${error.message}`);
      cancelBackup();
    } finally {
      setIsCloudBackingUp(false);
    }
  };

  // Handle cloud restore
  const handleCloudRestore = async () => {
    if (!currentUser) {
      addLog('User not signed in for cloud restore.');
      toastService.error('You must be signed in to use cloud restore.');
      return;
    }

    // Show custom confirmation dialog instead of using window.confirm
    setShowRestoreConfirm(true);
  };

  // This function will be called when the user confirms the restore
  const handleConfirmRestore = async () => {
    setShowRestoreConfirm(false); // Close the dialog
    addRestoreLog('Cloud restore confirmed by user.');
    
    // Start the restore process using the global context
    startRestore();
    
    // Inform the user they can close the settings modal
    toastService.success('Restore process started. You can close this window and the restore will continue in the background.');
    
    try {
      const userId = currentUser.uid;
      addRestoreLog(`User ID: ${userId}`);
      
      // Use the cloud function to list backup files instead of directly accessing Firebase Storage
      addRestoreLog('Listing backup files using cloud function...');
      const listBackupFiles = httpsCallable(functions, 'listBackupFiles');
      const listResult = await listBackupFiles();
      
      if (!listResult.data.success) {
        throw new Error('Failed to list backup files');
      }
      
      const files = listResult.data.files;
      addRestoreLog(`Found ${files.length} files in backup directory.`);
      
      // Check if metadata.json exists to determine backup format
      const metadataFile = files.find(file => file.name === 'metadata.json');
      let isNewFormat = !!metadataFile;
      addRestoreLog(`Backup format detected: ${isNewFormat ? 'New (Unzipped)' : 'Old (Zip)'}`);

      if (isNewFormat) {
        // --- New Restore Logic (Unzipped Files) --- 
        addRestoreLog('Starting restore using new unzipped format...');

        try {
          // 1. Download and process metadata.json
          setRestoreStatus('Downloading metadata...');
          addRestoreLog('Downloading metadata.json...');
          
          // Use the cloud function to get file content
          const getBackupFileContent = httpsCallable(functions, 'getBackupFileContent');
          const metadataResult = await getBackupFileContent({ fileName: 'metadata.json' });
          
          if (!metadataResult.data.success || metadataResult.data.contentType !== 'json') {
            throw new Error('Failed to download metadata.json');
          }
          
          const metadata = JSON.parse(metadataResult.data.content);
          
          addRestoreLog(`Metadata loaded: Backup created on ${new Date(metadata.timestamp).toLocaleString()}`);
          addRestoreLog(`Collections: ${metadata.collectionCount}, Images: ${metadata.imageCount}`);
          
          // 2. Download collections.json
          setRestoreStatus('Downloading collections...');
          setRestoreProgress(10);
          addRestoreLog('Downloading collections.json...');
          
          const collectionsResult = await getBackupFileContent({ fileName: 'collections.json' });
          
          if (!collectionsResult.data.success || collectionsResult.data.contentType !== 'json') {
            throw new Error('Failed to download collections.json');
          }
          
          const collections = JSON.parse(collectionsResult.data.content);
          addRestoreLog(`Collections loaded: ${collections.length} collections`);
          
          // 3. Clear the database before restoration
          setRestoreStatus('Clearing database...');
          setRestoreProgress(20);
          addRestoreLog('Clearing the database before restoration...');
          await db.clearAllData();
          addRestoreLog('Database cleared successfully.');
          
          // 4. Restore collections
          setRestoreStatus('Restoring collections...');
          setRestoreProgress(30);
          addRestoreLog(`Restoring ${collections.length} collections...`);
          await db.bulkAddCollections(collections);
          addRestoreLog('Collections restored successfully.');
          
          // 5. Download and restore images
          setRestoreStatus('Restoring images...');
          
          // Get image files
          const imageFiles = files.filter(file => file.name.startsWith('images/'));
          addRestoreLog(`Found ${imageFiles.length} image files to restore.`);
          
          if (imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
              const imageFile = imageFiles[i];
              const progress = 40 + Math.round(((i + 1) / imageFiles.length) * 50); // Images take 50% of progress (40-90%)
              setRestoreProgress(progress);
              
              const fileName = imageFile.name.replace('images/', '');
              setRestoreStatus(`Restoring image ${i + 1}/${imageFiles.length}: ${fileName}`);
              
              try {
                // Download image content
                const imageResult = await getBackupFileContent({ fileName: imageFile.name });
                
                if (!imageResult.data.success || imageResult.data.contentType !== 'binary') {
                  addRestoreLog(`Error downloading image ${fileName}: Invalid content or response`);
                  continue;
                }
                
                const imageData = imageResult.data.content; // Base64 encoded
                
                // Extract image ID from filename (remove extension)
                const imageId = fileName.split('.')[0];
                
                // Add image to IndexedDB
                await db.addImage({
                  id: imageId,
                  data: imageData,
                  base64: true
                });
                
                addRestoreLog(`Restored image: ${fileName}`);
              } catch (imageError) {
                addRestoreLog(`Error restoring image ${fileName}: ${imageError.message}`);
                // Continue with the next image rather than failing the entire restore
              }
            }
          } else {
            addRestoreLog('No images to restore.');
          }
          
          setRestoreProgress(95);
          setRestoreStatus('Finalizing restore...');
          
          // 6. Update app state
          setRestoreProgress(100);
          setRestoreStatus('Restore complete!');
          addRestoreLog('Cloud restore completed successfully!');
          toastService.success('Cloud restore completed successfully!');
          
          // 7. Complete the restore
          completeRestore();
        } catch (error) {
          console.error('Error in new format restore:', error);
          addRestoreLog(`Error during new format restore: ${error.message}`);
          throw error; // Let the outer catch handle it
        }
      } else {
        // --- Legacy Zip File Restore Logic ---
        addRestoreLog('Starting restore using legacy zip format...');
        
        // Use the downloadUrl cloud function to get a signed URL
        const getBackupDownloadUrl = httpsCallable(functions, 'getBackupDownloadUrl');
        const downloadUrlResult = await getBackupDownloadUrl();
        
        if (!downloadUrlResult.data.downloadUrl) {
          throw new Error('Failed to get backup download URL');
        }
        
        const downloadUrl = downloadUrlResult.data.downloadUrl;
        addRestoreLog('Generated download URL for backup.zip');
        
        // Download the zip file
        setRestoreStatus('Downloading backup.zip...');
        setRestoreProgress(10);
        addRestoreLog('Downloading backup.zip...');
        
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download backup: ${response.statusText}`);
        }
        
        const backupData = await response.arrayBuffer();
        addRestoreLog(`Downloaded backup.zip (${Math.round(backupData.byteLength / 1024)} KB)`);
        
        // Extract the zip file
        setRestoreStatus('Extracting backup archive...');
        setRestoreProgress(30);
        addRestoreLog('Extracting backup archive...');
        
        // Assuming JSZip is imported correctly at the top of the file
        const zip = await JSZip.loadAsync(backupData);
        addRestoreLog('Backup archive loaded successfully.');
        
        // Extract collections.json first
        setRestoreStatus('Reading collections from backup...');
        setRestoreProgress(40);
        addRestoreLog('Reading collections from backup...');
        
        const collectionsFile = zip.file('collections.json');
        if (!collectionsFile) {
          throw new Error('Invalid backup: collections.json not found in archive');
        }
        
        const collectionsJson = await collectionsFile.async('string');
        const collections = JSON.parse(collectionsJson);
        addRestoreLog(`Found ${collections.length} collections in backup.`);
        
        // Extract images if they exist
        const imageFiles = Object.keys(zip.files).filter(filename => 
          filename.startsWith('images/') && !zip.files[filename].dir
        );
        
        addRestoreLog(`Found ${imageFiles.length} images in backup.`);
        
        // Clear database before restoration
        setRestoreStatus('Clearing database...');
        setRestoreProgress(50);
        addRestoreLog('Clearing the database before restoration...');
        await db.clearAllData();
        addRestoreLog('Database cleared successfully.');
        
        // Restore collections
        setRestoreStatus('Restoring collections...');
        setRestoreProgress(60);
        addRestoreLog(`Restoring ${collections.length} collections...`);
        await db.bulkAddCollections(collections);
        addRestoreLog('Collections restored successfully.');
        
        // Restore images if they exist
        if (imageFiles.length > 0) {
          setRestoreStatus('Restoring images...');
          addRestoreLog(`Restoring ${imageFiles.length} images...`);
          
          for (let i = 0; i < imageFiles.length; i++) {
            const filename = imageFiles[i];
            const progress = 70 + Math.round(((i + 1) / imageFiles.length) * 25); // Images take 25% of progress (70-95%)
            setRestoreProgress(progress);
            
            // Extract image ID from filename
            const imageName = filename.replace('images/', '');
            const imageId = imageName.split('.')[0]; // Remove file extension
            
            setRestoreStatus(`Restoring image ${i + 1}/${imageFiles.length}: ${imageName}`);
            
            try {
              // Get image data as base64
              const imageFile = zip.file(filename);
              const imageData = await imageFile.async('base64');
              
              // Save image to IndexedDB
              await db.addImage({
                id: imageId,
                data: imageData,
                base64: true
              });
              
              addRestoreLog(`Restored image: ${imageName}`);
            } catch (imageError) {
              addRestoreLog(`Error restoring image ${imageName}: ${imageError.message}`);
              // Continue with next image
            }
          }
        }
        
        // Finalize restore
        setRestoreProgress(100);
        setRestoreStatus('Restore complete!');
        addRestoreLog('Cloud restore completed successfully!');
        toastService.success('Cloud restore completed successfully!');
        
        // Complete the restore in the global context
        completeRestore();
      }
    } catch (error) {
      console.error('Cloud restore failed:', error);
      addRestoreLog(`Cloud restore failed: ${error.message}`);
      setRestoreStatus(`Error: ${error.message}`);
      toastService.error(`Cloud restore failed: ${error.message}`);
      cancelRestore();
    } finally {
      setIsRestoring(false);
      setShowConfirmDialog(false);
    }
  };

  // Handle reset data
  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    if (onResetData) {
      onResetData();
    }
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
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
                          onClick={() => handleCloudBackup()}
                          disabled={isBackingUp || isCloudRestoring}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="cloud_upload" />}
                        >
                          {isBackingUp ? 'Backing up...' : 'Backup to Cloud'}
                        </Button>
                        
                        <Button
                          onClick={() => handleCloudRestore()}
                          disabled={isBackingUp || isCloudRestoring}
                          variant="outline"
                          size="md"
                          className="w-full"
                          leftIcon={<Icon name="cloud_download" />}
                        >
                          {isCloudRestoring ? 'Restoring...' : 'Restore from Cloud'}
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
                      {(isBackingUp || isCloudRestoring) && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                              style={{ width: `${backupProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{backupStatus}</p>
                        </div>
                      )}
                    </div>
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
                  
                  {/* Log Viewer Section */}
                  <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20 mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <Icon name="description" className="text-indigo-400 mr-2" />
                      Development Logs
                    </h4>
                    <textarea
                      readOnly
                      className="w-full h-48 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300 resize-none"
                      value={devLogs.join('\n')}
                      placeholder="Logs will appear here..."
                    />
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDevLogs([])} // Clear logs on click
                        className="mt-2"
                        iconLeft={<Icon name="delete" />}
                      >
                        Clear Logs
                      </Button>
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

      {/* Custom ConfirmDialog for Cloud Restore */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          addRestoreLog('Cloud restore cancelled by user.');
        }}
        onConfirm={handleConfirmRestore}
        title="Restore from Cloud"
        message="Restoring from the cloud will overwrite your current local data. Are you sure you want to proceed?"
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
