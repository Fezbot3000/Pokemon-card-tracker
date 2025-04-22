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
      const backupRef = ref(storage, `backups/${userId}`);

      // List items in the user's backup directory
      addRestoreLog('Listing backup files in Firebase Storage...');
      const listResult = await listAll(backupRef);
      
      // Check if metadata.json exists to determine backup format
      const metadataFile = listResult.items.find(item => item.name === 'metadata.json');
      let isNewFormat = !!metadataFile;
      addRestoreLog(`Backup format detected: ${isNewFormat ? 'New (Unzipped)' : 'Old (Zip)'}`);

      if (isNewFormat) {
        // --- New Restore Logic (Unzipped Files) --- 
        addRestoreLog('Starting restore using new unzipped format...');

        // 1. Download and process metadata.json
        setRestoreStatus('Downloading metadata...');
        addRestoreLog('Downloading metadata.json...');
        const metadataUrl = await getDownloadURL(metadataFile);
        const metadataResponse = await fetch(metadataUrl);
        if (!metadataResponse.ok) throw new Error('Failed to download metadata.json');
        const backupMetadata = await metadataResponse.json();
        addRestoreLog(`Metadata downloaded. Backup Timestamp: ${backupMetadata.timestamp}, Collections: ${backupMetadata.collectionCount}, Images: ${backupMetadata.imageCount}`);
        setRestoreProgress(10);

        // 2. Download and process collections.json
        setRestoreStatus('Downloading collections data...');
        addRestoreLog('Downloading collections.json...');
        const collectionsFile = listResult.items.find(item => item.name === 'collections.json');
        if (!collectionsFile) throw new Error('collections.json not found in backup.');
        const collectionsUrl = await getDownloadURL(collectionsFile);
        const collectionsResponse = await fetch(collectionsUrl);
        if (!collectionsResponse.ok) throw new Error('Failed to download collections.json');
        const collectionsData = await collectionsResponse.json();
        addRestoreLog('Collections data downloaded.');
        setRestoreProgress(20);

        // 3. Clear existing local data (collections and images)
        setRestoreStatus('Clearing local data...');
        addRestoreLog('Clearing local collections...');
        await db.clearCollections();
        addRestoreLog('Clearing local images...');
        await db.clearImages();
        addRestoreLog('Local data cleared.');
        setRestoreProgress(30);

        // 4. Import collections into IndexedDB
        setRestoreStatus('Importing collections...');
        addRestoreLog(`Importing ${collectionsData.length} collections into IndexedDB...`);
        await db.importCollections(collectionsData);
        addRestoreLog('Collections imported successfully.');
        setRestoreProgress(40);

        // 5. List and download images
        setRestoreStatus('Listing images...');
        addRestoreLog('Listing images in backup...');
        const imagesRef = ref(storage, `backups/${userId}/images`);
        const imageListResult = await listAll(imagesRef);
        const totalImagesToDownload = imageListResult.items.length;
        addRestoreLog(`Found ${totalImagesToDownload} images to download.`);
        setRestoreProgress(50);

        // 6. Download and import images one by one
        setRestoreStatus(`Downloading ${totalImagesToDownload} images...`);
        addRestoreLog('Starting image downloads and import...');
        let imagesImportedCount = 0;
        const imageImportPromises = [];

        for (let i = 0; i < totalImagesToDownload; i++) {
          const imageItemRef = imageListResult.items[i];
          const progress = 50 + Math.round(((i + 1) / totalImagesToDownload) * 45); // Images take 45% progress
          setRestoreProgress(progress);
          setRestoreStatus(`Downloading/Importing image ${i + 1} of ${totalImagesToDownload}`);
          addRestoreLog(`Downloading image ${i + 1}/${totalImagesToDownload}: ${imageItemRef.name}`);
          
          try {
            const imageUrl = await getDownloadURL(imageItemRef);
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              addRestoreLog(`Failed to download image: ${imageItemRef.name}, Status: ${imageResponse.status}`);
              continue; // Skip this image if download fails
            }
            const imageBlob = await imageResponse.blob();
            addRestoreLog(`Image ${imageItemRef.name} downloaded (${(imageBlob.size / 1024).toFixed(2)} KB). Importing...`);
            
            // Extract ID and format from filename (e.g., 'cardId.png')
            const nameParts = imageItemRef.name.split('.');
            const imageId = nameParts.slice(0, -1).join('.'); // Handle potential dots in ID
            const imageFormat = nameParts.pop();

            // Create image object structure expected by db.importImage
            const imageData = {
              id: imageId,
              format: imageFormat,
              data: imageBlob,
              userId: userId, // Ensure we use the current user's ID
              blob: imageBlob // Add the blob property as well for compatibility
            };
            
            // Import image into IndexedDB
            await db.importImage(imageData); // Changed from batch to individual
            imagesImportedCount++;
            addRestoreLog(`Image ${imageItemRef.name} imported successfully.`);

            // Update the UI immediately after each image is imported
            if (refreshCollections && i % 5 === 0) { // Refresh every 5 images to avoid too many refreshes
              await refreshCollections();
            }

          } catch (imgError) {
              addRestoreLog(`Error processing image ${imageItemRef.name}: ${imgError.message}`);
          }
        }

        addRestoreLog(`Image download and import process finished. Successfully imported ${imagesImportedCount}/${totalImagesToDownload} images.`);
        setRestoreProgress(95);

        // 7. Finalize and refresh
        setRestoreStatus('Finalizing restore...');
        addRestoreLog('Finalizing restore process...');
        
        // Refresh collections from the database instead of calling the prop directly
        try {
          addRestoreLog('Refreshing collections from database...');
          const savedCollections = await db.getCollections();
          if (savedCollections && Object.keys(savedCollections).length > 0) {
            addRestoreLog(`Retrieved ${Object.keys(savedCollections).length} collections from database.`);
            // If refreshCollections prop is available, use it
            if (typeof refreshCollections === 'function') {
              refreshCollections();
            }
          } else {
            addRestoreLog('No collections found in database after restore.');
          }
        } catch (refreshError) {
          addRestoreLog(`Error refreshing collections: ${refreshError.message}`);
        }
        
        setRestoreProgress(100);
        setRestoreStatus('Restore complete!');
        addRestoreLog('Cloud restore completed successfully!');
        toastService.success('Cloud restore completed successfully!');
        
        // Complete the restore process
        completeRestore();

      } else {
        // --- Legacy Restore Logic (Zip File) --- 
        addRestoreLog('Starting restore using legacy zip format...');
        const zipFile = listResult.items.find(item => item.name.endsWith('.zip'));
        if (!zipFile) {
          throw new Error('No backup zip file found.');
        }
        addRestoreLog(`Found backup zip file: ${zipFile.name}`);

        // Step 1: Get Download URL for the zip file
        setRestoreStatus('Getting backup download URL...');
        addRestoreLog('Getting download URL for zip file...');
        const url = await getDownloadURL(zipFile);
        addRestoreLog('Download URL obtained.');
        setRestoreProgress(10);

        // Step 2: Download the zip file
        setRestoreStatus('Downloading backup file...');
        addRestoreLog('Downloading zip file...');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download backup file: ${response.statusText}`);
        }
        const zipBlob = await response.blob();
        addRestoreLog(`Zip file downloaded (${(zipBlob.size / (1024*1024)).toFixed(2)} MB).`);
        setRestoreProgress(30);

        // Step 3: Unzip the file
        setRestoreStatus('Unzipping backup file...');
        addRestoreLog('Unzipping backup file...');
        const zip = new JSZip();
        const contents = await zip.loadAsync(zipBlob);
        addRestoreLog('Zip file loaded into JSZip.');

        // Assuming collections are in 'collections.json' and images in 'images/' directory within the zip
        const collectionFile = contents.file('collections.json');
        if (!collectionFile) {
          throw new Error('collections.json not found in the zip file.');
        }
        addRestoreLog('Found collections.json in zip.');

        const collectionsDataString = await collectionFile.async('string');
        const collectionsData = JSON.parse(collectionsDataString);
        addRestoreLog('Parsed collections data from zip.');
        setRestoreProgress(50);

        // Step 4: Clear existing local data
        setRestoreStatus('Clearing local data...');
        addRestoreLog('Clearing local collections and images...');
        await db.clearCollections();
        await db.clearImages();
        addRestoreLog('Local data cleared.');
        setRestoreProgress(60);

        // Step 5: Import collections
        setRestoreStatus('Importing collections...');
        addRestoreLog('Importing collections into IndexedDB...');
        await db.importCollections(collectionsData);
        addRestoreLog('Collections imported.');
        setRestoreProgress(70);

        // Step 6: Import images from zip
        setRestoreStatus('Importing images...');
        addRestoreLog('Importing images from zip...');
        const imageFiles = contents.folder('images').file(/\.(png|jpg|jpeg|gif|webp)$/i);
        addRestoreLog(`Found ${imageFiles.length} images in zip's images/ folder.`);
        let imagesImportedCount = 0;
        const imageImportPromises = [];

        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i];
          const progress = 70 + Math.round(((i + 1) / imageFiles.length) * 25); // Images take 25% progress
          setRestoreProgress(progress);
          setRestoreStatus(`Importing image ${i + 1} of ${imageFiles.length}`);
          addRestoreLog(`Processing image ${i+1}/${imageFiles.length}: ${imageFile.name}`);
          
          try {
            const imageBlob = await imageFile.async('blob');
            const fileNameParts = imageFile.name.split('/').pop().split('.'); // Get filename and split by dot
            const imageId = fileNameParts.slice(0, -1).join('.'); // ID is everything before the last dot
            const imageFormat = fileNameParts.pop(); // Format is after the last dot

            const imageData = {
              id: imageId,
              format: imageFormat,
              data: imageBlob,
              userId: userId, // Ensure we use the current user's ID
              blob: imageBlob // Add the blob property as well for compatibility
            };
            
            // Queue the import promise
            imageImportPromises.push(db.importImage(imageData).then(() => {
              imagesImportedCount++;
              addRestoreLog(`Successfully imported image: ${imageFile.name}`);
            }).catch(err => {
              addRestoreLog(`Failed to import image ${imageFile.name}: ${err.message}`);
            }));
          } catch (imgError) {
            addRestoreLog(`Error processing image file ${imageFile.name} from zip: ${imgError.message}`);
          }
        }

        // Wait for all image imports to complete
        await Promise.all(imageImportPromises);
        addRestoreLog(`Finished processing all images from zip. Imported ${imagesImportedCount}/${imageFiles.length}.`);
        setRestoreProgress(95);

        // Step 7: Finalize and refresh
        setRestoreStatus('Finalizing restore...');
        addRestoreLog('Finalizing restore process...');
        
        // Refresh collections from the database instead of calling the prop directly
        try {
          addRestoreLog('Refreshing collections from database...');
          const savedCollections = await db.getCollections();
          if (savedCollections && Object.keys(savedCollections).length > 0) {
            addRestoreLog(`Retrieved ${Object.keys(savedCollections).length} collections from database.`);
            // If refreshCollections prop is available, use it
            if (typeof refreshCollections === 'function') {
              refreshCollections();
            }
          } else {
            addRestoreLog('No collections found in database after restore.');
          }
        } catch (refreshError) {
          addRestoreLog(`Error refreshing collections: ${refreshError.message}`);
        }
        
        setRestoreProgress(100);
        setRestoreStatus('Restore complete!');
        addRestoreLog('Cloud restore completed successfully!');
      }

      // Step 8: Verify data security after restore
      setRestoreStatus('Verifying data security...');
      addRestoreLog('Verifying data security after restore...');
      const securityCheckResult = await db.verifyDataSecurity(userId);
      
      if (securityCheckResult.secure) {
        addRestoreLog('Data security verification passed: All restored data is properly isolated to your account.');
        toastService.success('Data security verified: All restored data is properly secured with your user ID.', { duration: 8000 });
      } else {
        addRestoreLog('Data security verification failed: Some restored data may not be properly secured.');
        
        // Log detailed information about security issues
        if (securityCheckResult.details.collections?.unsecured > 0) {
          addRestoreLog(`Security issue: ${securityCheckResult.details.collections.unsecured} collections not properly secured.`);
        }
        if (securityCheckResult.details.images?.unsecured > 0) {
          addRestoreLog(`Security issue: ${securityCheckResult.details.images.unsecured} images not properly secured.`);
        }
        if (securityCheckResult.details.crossUserAccess?.leaked?.length > 0) {
          addRestoreLog('CRITICAL: Data isolation failure detected!');
          securityCheckResult.details.crossUserAccess.leaked.forEach(leak => {
            addRestoreLog(`Security issue: ${leak.count} ${leak.store} accessible to other users.`);
          });
        }
        
        // Prompt user to fix security issues
        toastService.error(
          'Security issues detected with restored data. Please click "Verify Data Security" in the settings to see details and fix the issues.',
          { duration: 15000 }
        );
      }

    } catch (error) {
      console.error('Cloud restore failed:', error);
      addRestoreLog(`Cloud restore failed: ${error.message}`);
      setRestoreStatus(`Error: ${error.message}`);
      toastService.error(`Cloud restore failed: ${error.message}`);
    } finally {
      setIsCloudRestoring(false);
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
