import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useAuth } from '../design-system';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import logger from '../utils/logger';

const CloudSync = ({ onExportData, onImportCollection }) => {
  const { currentUser } = useAuth();
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

    setIsImporting(true);
    setSyncProgress(10);
    
    try {
      toast.loading('Checking for backups... (10%)', { id: 'cloud-restore' });
      
      // Reference to the latest backup
      const storageRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      try {
        // First check if file exists by trying to get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        setSyncProgress(20);
        toast.loading('Found backup, starting download... (20%)', { id: 'cloud-restore' });
        
        // Use XMLHttpRequest for better mobile compatibility and progress monitoring
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        
        // Set up progress monitoring
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            // Scale progress from 20% to 70%
            const percent = 20 + (event.loaded / event.total) * 50;
            setSyncProgress(percent);
            const percentRounded = Math.round(percent);
            toast.loading(`Downloading backup... (${percentRounded}%)`, { id: 'cloud-restore' });
          }
        };
        
        xhr.onload = function() {
          if (this.status === 200) {
            const blob = new Blob([this.response], { type: 'application/zip' });
            
            // Create a File object from the Blob for compatibility
            const file = new File([blob], 'backup.zip', { type: 'application/zip' });
            
            setSyncProgress(70);
            toast.loading(`Processing backup... (70%)`, { id: 'cloud-restore' });
            
            // Pass the file to the import function
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
              setIsImporting(false);
            }).catch(error => {
              logger.error('Import error:', error);
              toast.error(`Import failed: ${error.message}`, { id: 'cloud-restore' });
              setIsImporting(false);
            });
          } else {
            throw new Error(`HTTP error: ${this.status}`);
          }
        };
        
        xhr.onerror = function() {
          throw new Error('Network error occurred while downloading backup');
        };
        
        // Start the request
        xhr.open('GET', downloadURL);
        xhr.send();
        
      } catch (error) {
        // If file not found, handle gracefully
        if (error.code === 'storage/object-not-found') {
          toast.error('No backup found in cloud storage', { id: 'cloud-restore' });
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

  return (
    <div className="space-y-4 py-4">
      <div className="mb-4 flex flex-col gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last synced: {getLastSyncTime()}
        </p>
        {(isSyncing || isImporting) && (
          <p className="animate-pulse text-sm text-blue-600 dark:text-blue-400">
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
          disabled={isSyncing || !currentUser}
          className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
          style={{ minWidth: '110px' }}
        >
          {isSyncing ? (
            <>Creating backup...</>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '20px' }}>cloud_upload</span>
              <span>Backup to Cloud</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleImportFromCloud}
          disabled={isImporting || !currentUser}
          className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
          style={{ minWidth: '110px' }}
        >
          {isImporting ? (
            <>Restoring data...</>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '20px' }}>cloud_download</span>
              <span>Restore from Cloud</span>
            </>
          )}
        </button>
      </div>
      
      {(isSyncing || isImporting) && (
        <div className="mt-4 w-full">
          <div className="mb-1 flex items-center justify-between">
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
          <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-2.5 rounded-full bg-blue-600 transition-all duration-300 ease-in-out" 
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
        <p className="mt-2 text-sm text-amber-500 dark:text-amber-400">
          You need to be logged in to use cloud sync features.
        </p>
      )}
    </div>
  );
};

export default CloudSync;
