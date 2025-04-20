import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionBanner from './SubscriptionBanner';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import logger from '../utils/logger';

const CloudSync = ({ onExportData, onImportCollection }) => {
  const { currentUser } = useAuth();
  const { subscriptionStatus, isLoading: isLoadingSubscription } = useSubscription();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

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

  // Simplified cloud backup function
  const handleSyncToCloud = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to use cloud sync');
      return;
    }

    // Check if user has premium subscription
    if (subscriptionStatus.status !== 'active') {
      toast.error('Cloud sync requires a premium subscription');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(10); // Initial progress indicator
    
    try {
      toast.loading('Creating backup... (10%)', { id: 'cloud-backup' });
      setSyncProgress(10);
      
      // Get data blob using export function with smaller chunks
      const exportedZip = await onExportData({ 
        returnBlob: true,
        optimizeForMobile: true  // Add hint for export function to optimize if it supports it
      });
      
      setSyncProgress(50);
      toast.loading('Uploading to cloud... (50%)', { id: 'cloud-backup' });
      
      // Reference to storage
      const storageRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      // Use simpler uploadBytes instead of uploadBytesResumable for better compatibility
      await uploadBytes(storageRef, exportedZip);
      
      setSyncProgress(100);
      
      // Store timestamp of latest backup
      localStorage.setItem('lastCloudSync', new Date().toISOString());
      
      toast.success('Backup completed successfully! (100%)', { id: 'cloud-backup' });
    } catch (error) {
      logger.error('Cloud backup error:', error);
      
      // Show more helpful error messages based on error type
      if (error.code === 'storage/retry-limit-exceeded') {
        toast.error('Backup file too large for mobile. Try on desktop or reduce collection size.', 
          { id: 'cloud-backup' });
      } else if (error.code === 'storage/unauthorized') {
        toast.error('Unauthorized: Please log in again.', { id: 'cloud-backup' });
      } else {
        toast.error(`Cloud backup failed: ${error.message}`, { id: 'cloud-backup' });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Simplified cloud restore function
  const handleImportFromCloud = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to import from cloud');
      return;
    }

    // Check if user has premium subscription
    if (subscriptionStatus.status !== 'active') {
      toast.error('Cloud sync requires a premium subscription');
      return;
    }

    setIsImporting(true);
    setSyncProgress(10);
    
    try {
      toast.loading('Checking for backups... (10%)', { id: 'cloud-restore' });
      
      // Reference to the latest backup
      const storageRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      try {
        // First check if file exists by trying to get download URL
        logger.log('Attempting to get download URL for cloud backup');
        const downloadURL = await getDownloadURL(storageRef);
        logger.log('Successfully obtained download URL');
        
        setSyncProgress(20);
        toast.loading('Found backup, starting download... (20%)', { id: 'cloud-restore' });
        
        // Use fetch API instead of XMLHttpRequest for better compatibility
        logger.log('Starting download using fetch API');
        
        // Create an AbortController to handle timeouts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        
        try {
          const response = await fetch(downloadURL, { 
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          
          logger.log('Download response received, getting blob data');
          
          // Get the blob data
          const blob = await response.blob();
          logger.log(`Received blob data: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
          
          // Create a File object from the Blob for compatibility
          const file = new File([blob], 'backup.zip', { type: 'application/zip' });
          
          setSyncProgress(70);
          toast.loading(`Processing backup... (70%)`, { id: 'cloud-restore' });
          
          // Pass the file to the import function
          logger.log('Starting import process with downloaded file');
          onImportCollection(file, {
            noOverlay: true, // Don't show full-page overlay
            onProgress: (step, percent, message) => {
              // Scale progress from 70% to 100%
              const scaledPercent = 70 + (percent / 100) * 30;
              setSyncProgress(scaledPercent);
              toast.loading(`${message || `Step ${step}: ${Math.round(scaledPercent)}%`}`, { id: 'cloud-restore' });
            }
          }).then(() => {
            setSyncProgress(100);
            toast.success('Restore completed successfully! (100%)', { id: 'cloud-restore' });
            // Update last sync time
            localStorage.setItem('lastCloudSync', new Date().toISOString());
            setIsImporting(false);
          }).catch(error => {
            logger.error('Import error:', error);
            toast.error(`Import failed: ${error.message}`, { id: 'cloud-restore' });
            setIsImporting(false);
          });
        } catch (fetchError) {
          logger.error('Fetch error:', fetchError);
          
          if (fetchError.name === 'AbortError') {
            throw new Error('Download timed out. Please try again on a more stable connection.');
          } else {
            throw fetchError;
          }
        }
      } catch (error) {
        // If file not found, handle gracefully
        if (error.code === 'storage/object-not-found') {
          toast.error('No backup found in cloud storage', { id: 'cloud-restore' });
        } else if (error.code === 'storage/retry-limit-exceeded') {
          toast.error('Download failed: Firebase retry limit exceeded. Try again later or on a different network.', { id: 'cloud-restore' });
          logger.error('Firebase retry limit exceeded:', error);
        } else {
          // Re-throw other errors to be caught by outer handler
          throw error;
        }
      }
    } catch (error) {
      logger.error('Cloud restore error:', error);
      
      // Show more helpful error messages based on error type
      if (error.code === 'storage/quota-exceeded') {
        toast.error('Storage quota exceeded. Please contact support.', { id: 'cloud-restore' });
      } else if (error.code === 'storage/unauthorized') {
        toast.error('Unauthorized: Please log in again.', { id: 'cloud-restore' });
      } else if (error.code === 'storage/retry-limit-exceeded') {
        toast.error('Download failed: Firebase retry limit exceeded. Try again later or on a different network.', { id: 'cloud-restore' });
      } else if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        toast.error('Download timed out. Please try again on a more stable connection.', { id: 'cloud-restore' });
      } else {
        toast.error(`Cloud restore failed: ${error.message}`, { id: 'cloud-restore' });
      }
      
      setIsImporting(false);
    }
  };

  const getLastSyncTime = () => {
    const lastSync = localStorage.getItem('lastCloudSync');
    if (!lastSync) return 'Never';
    
    try {
      const date = new Date(lastSync);
      return date.toLocaleString();
    } catch (e) {
      return 'Unknown';
    }
  };

  if (!currentUser || subscriptionStatus.status !== 'active') {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 text-white relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-yellow-300 opacity-10">
          <span className="material-icons" style={{ fontSize: '6rem' }}>star</span>
        </div>
        
        <div className="flex items-start">
          <div className="mr-3 p-2 bg-white/20 rounded-full">
            <span className="material-icons text-yellow-300">workspace_premium</span>
          </div>
          
          <div className="flex-grow">
            <h4 className="text-lg font-semibold mb-1">Premium Feature</h4>
            <p className="text-sm opacity-90 mb-3">
              Cloud backup requires a premium subscription. Upgrade to access cloud backup and more!
            </p>
            
            <Link
              to="/dashboard/pricing"
              className="inline-flex items-center bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span className="material-icons text-sm mr-1">upgrade</span>
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col gap-2 mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last synced: {getLastSyncTime()}
        </p>
        {(isSyncing || isImporting) && (
          <p className="text-sm text-blue-600 dark:text-blue-400 animate-pulse">
            {isSyncing 
              ? `Backup in progress: ${Math.round(syncProgress)}% complete`
              : `Restore in progress: ${Math.round(syncProgress)}% complete`
            }
          </p>
        )}
      </div>
      
      <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex gap-2'}`}>
        <button
          onClick={handleSyncToCloud}
          disabled={isSyncing || !currentUser || isLoadingSubscription || subscriptionStatus.status !== 'active'}
          className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
          style={{ minWidth: '110px' }}
        >
          {isSyncing ? (
            <>Creating backup...</>
          ) : isLoadingSubscription ? (
            <>Checking subscription...</>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '20px' }}>cloud_upload</span>
              <span>Backup to Cloud</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleImportFromCloud}
          disabled={isImporting || !currentUser || isLoadingSubscription || subscriptionStatus.status !== 'active'}
          className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
          style={{ minWidth: '110px' }}
        >
          {isImporting ? (
            <>Restoring data...</>
          ) : isLoadingSubscription ? (
            <>Checking subscription...</>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '20px' }}>cloud_download</span>
              <span>Restore from Cloud</span>
            </>
          )}
        </button>
      </div>
      
      {(isSyncing || isImporting) && (
        <div className="w-full mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isSyncing 
                ? `Creating backup (${Math.round(syncProgress)}%)` 
                : `Restoring from backup (${Math.round(syncProgress)}%)`
              }
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {`${Math.round(syncProgress)}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {syncProgress < 30 && "Preparing data..."}
            {syncProgress >= 30 && syncProgress < 50 && "Connecting to cloud..."}
            {syncProgress >= 50 && syncProgress < 80 && (isSyncing ? "Uploading files..." : "Downloading files...")}
            {syncProgress >= 80 && syncProgress < 100 && "Processing data..."}
            {syncProgress >= 100 && "Completed!"}
          </div>
        </div>
      )}
      
      {!currentUser && (
        <p className="text-sm text-amber-500 dark:text-amber-400 mt-2">
          You need to be logged in to use cloud sync features.
        </p>
      )}
    </div>
  );
};

export default CloudSync;