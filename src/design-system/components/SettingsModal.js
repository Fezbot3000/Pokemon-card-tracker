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
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
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
      toastService.error('You must be logged in to backup to cloud');
      return;
    }

    setIsCloudBackingUp(true);
    setCloudSyncProgress(0);
    setCloudSyncStatus('Starting cloud backup...');
    
    // Show a simple loading toast
    toastService.loading('Backing up to cloud...', { duration: 60000, id: 'cloud-backup' });

    try {
      // Get all collections
      const collections = await db.getCollections();
      const collectionNames = Object.keys(collections);
      
      // Get all images
      const images = await db.getAllImages();
      
      // Total items to backup (collections + images)
      const totalItems = collectionNames.length + images.length;
      let processedItems = 0;
      
      // Get the user ID
      const userId = currentUser.uid;
      
      // Create a metadata object with timestamp
      const backupMetadata = {
        timestamp: new Date().toISOString(),
        userId: userId,
        collectionCount: collectionNames.length,
        imageCount: images.length,
        version: '2.0' // Using version 2.0 for the new unzipped format
      };
      
      // Upload metadata first
      setCloudSyncStatus('Uploading backup metadata...');
      const metadataRef = ref(storage, `users/${userId}/backups/metadata.json`);
      await uploadBytes(metadataRef, new Blob([JSON.stringify(backupMetadata)], { type: 'application/json' }));
      
      // Upload collections one by one
      for (let i = 0; i < collectionNames.length; i++) {
        const collectionName = collectionNames[i];
        const collectionData = collections[collectionName];
        
        setCloudSyncStatus(`Backing up collection: ${collectionName}...`);
        
        // Create a reference to the collection file
        const collectionRef = ref(storage, `users/${userId}/backups/collections/${collectionName}.json`);
        
        // Upload the collection data
        await uploadBytes(collectionRef, new Blob([JSON.stringify(collectionData)], { type: 'application/json' }));
        
        // Update progress
        processedItems++;
        setCloudSyncProgress(Math.floor((processedItems / totalItems) * 100));
      }
      
      // Upload images one by one
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        setCloudSyncStatus(`Backing up image ${i+1} of ${images.length}...`);
        
        // Create a reference to the image file
        const imageRef = ref(storage, `users/${userId}/backups/images/${image.id}.blob`);
        
        // Upload the image data
        await uploadBytes(imageRef, image.blob);
        
        // Update progress
        processedItems++;
        setCloudSyncProgress(Math.floor((processedItems / totalItems) * 100));
      }
      
      // Update last sync timestamp
      localStorage.setItem('lastCloudBackup', Date.now().toString());
      
      // Complete
      setCloudSyncProgress(100);
      setCloudSyncStatus('Backup complete!');
      toastService.success('Backup complete!', { id: 'cloud-backup' });
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
    setCloudSyncProgress(0);
    setCloudSyncStatus('Starting cloud restore...');
    
    // Show a simple loading toast
    toastService.loading('Restoring from cloud...', { duration: 60000, id: 'cloud-restore' });

    // Set up a timeout to detect if the process hangs
    let timeoutId = setTimeout(() => {
      console.log('Cloud restore process taking longer than expected...');
      setCloudSyncStatus('Process taking longer than expected. Please wait...');
      toastService.loading('Still working on restore...', { duration: 60000, id: 'cloud-restore' });
    }, 15000); // 15 seconds timeout

    try {
      // Get the user ID
      const userId = currentUser.uid;
      
      // Check if we have the new format (metadata.json exists)
      const metadataRef = ref(storage, `users/${userId}/backups/metadata.json`);
      let isNewFormat = false;
      
      try {
        // Try to get the download URL for metadata.json
        await getDownloadURL(metadataRef);
        isNewFormat = true;
        console.log('Found new format backup (unzipped)');
      } catch (error) {
        console.log('No metadata.json found, assuming old format (zip)');
        isNewFormat = false;
      }
      
      if (isNewFormat) {
        // --- NEW FORMAT RESTORE (UNZIPPED) ---
        
        // Get the metadata
        const metadataUrl = await getDownloadURL(metadataRef);
        const metadataResponse = await fetch(metadataUrl);
        const metadata = await metadataResponse.json();
        
        console.log('Backup metadata:', metadata);
        setCloudSyncStatus(`Found backup from ${new Date(metadata.timestamp).toLocaleString()}`);
        setCloudSyncProgress(5);
        
        // First, get all collection names
        const collectionsRef = ref(storage, `users/${userId}/backups/collections`);
        const collectionsResult = await listAll(collectionsRef);
        
        // Calculate total items to restore
        const totalCollections = collectionsResult.items.length;
        const totalImages = metadata.imageCount || 0;
        const totalItems = totalCollections + totalImages;
        let processedItems = 0;
        
        // Prepare collections object
        const restoredCollections = {};
        
        // Restore collections one by one
        for (const collectionRef of collectionsResult.items) {
          const collectionName = collectionRef.name.replace('.json', '');
          setCloudSyncStatus(`Restoring collection: ${collectionName}...`);
          
          // Get the download URL
          const collectionUrl = await getDownloadURL(collectionRef);
          
          // Fetch the collection data
          const collectionResponse = await fetch(collectionUrl);
          const collectionData = await collectionResponse.json();
          
          // Add to restored collections
          restoredCollections[collectionName] = collectionData;
          
          // Update progress
          processedItems++;
          setCloudSyncProgress(5 + Math.floor((processedItems / totalItems) * 90));
        }
        
        // Save the collections to IndexedDB
        await db.saveCollections(restoredCollections);
        
        // Now restore images one by one
        const imagesRef = ref(storage, `users/${userId}/backups/images`);
        const imagesResult = await listAll(imagesRef);
        
        for (const imageRef of imagesResult.items) {
          const imageId = imageRef.name.replace('.blob', '');
          setCloudSyncStatus(`Restoring image: ${imageId}...`);
          
          // Get the download URL
          const imageUrl = await getDownloadURL(imageRef);
          
          // Fetch the image data
          const imageResponse = await fetch(imageUrl);
          const imageBlob = await imageResponse.blob();
          
          // Save the image to IndexedDB
          await db.saveImage(imageId, imageBlob);
          
          // Update progress
          processedItems++;
          setCloudSyncProgress(5 + Math.floor((processedItems / totalItems) * 90));
        }
        
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
        
      } else {
        // --- OLD FORMAT RESTORE (ZIP) ---
        console.log('Using legacy zip format restore...');
        setCloudSyncStatus('Using legacy format (zip)...');
        
        // Create a reference to the backup file in Firebase Storage
        const backupPath = `users/${userId}/backups/latest-backup.zip`;
        const storageRef = ref(storage, backupPath);
        
        try {
          // Get the download URL directly from Firebase Storage
          console.log('Getting download URL from Firebase Storage...');
          
          const downloadURL = await getDownloadURL(storageRef);
          
          console.log('Download URL generated successfully:', downloadURL);
          
          // Increment progress
          setCloudSyncProgress(30);
          
          // Detect if we're on iOS
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (isIOS) {
            console.log('iOS device detected, using modified approach for better compatibility');
            toastService.error('Legacy zip backups are not supported on iOS. Please create a new backup first.', { id: 'cloud-restore' });
            throw new Error('Legacy zip backups are not supported on iOS. Please create a new backup first.');
          }
          
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
          
          // Clear the timeout since we're making progress
          clearTimeout(timeoutId);
          
          // Set a new timeout for the import process
          timeoutId = setTimeout(() => {
            console.log('Import process taking longer than expected...');
            setCloudSyncStatus('Import taking longer than expected. This is normal for large collections.');
            toastService.loading('Processing large backup...', { duration: 60000, id: 'cloud-restore' });
          }, 10000); // 10 seconds timeout
          
          // Import the backup with a progress callback
          console.log('Calling onImportCollection with file...');
          try {
            await onImportCollection(file, (progress) => {
              // This assumes onImportCollection accepts a progress callback
              // If it doesn't, you'll need to modify that function too
              if (progress) {
                setCloudSyncProgress(70 + Math.floor(progress * 30)); // Scale from 70-100%
                setCloudSyncStatus(`Importing data: ${Math.floor(progress * 100)}%`);
              }
            });
            console.log('Import completed successfully');
          } catch (importError) {
            console.error('Error during import process:', importError);
            // Check for specific iOS memory errors
            if (isIOS && (importError.message.includes('memory') || 
                importError.message.includes('quota') || 
                importError.message.includes('storage') ||
                importError.message.includes('allocation'))) {
              throw new Error('iOS memory limit reached. Try restoring on a desktop browser for large backups.');
            }
            throw importError;
          }
          
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
      }
      
    } catch (error) {
      console.error('Cloud restore error:', error);
      toastService.error(`Restore failed: ${error.message}`, { id: 'cloud-restore' });
      setCloudSyncStatus('Failed');
    } finally {
      // Clear any remaining timeouts
      clearTimeout(timeoutId);
      
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
