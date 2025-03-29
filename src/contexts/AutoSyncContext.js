import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { ref, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '../services/firebase';

const AutoSyncContext = createContext();

export function useAutoSync() {
  return useContext(AutoSyncContext);
}

export function AutoSyncProvider({ children, onImportCollection }) {
  const { currentUser } = useAuth();
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncError, setSyncError] = useState(null);
  const [lastSyncDate, setLastSyncDate] = useState(null);
  
  // Check if sync on startup is enabled (read from localStorage)
  const isSyncEnabled = useCallback(() => {
    const syncEnabled = localStorage.getItem('syncOnStartup');
    // Default to true if the value doesn't exist
    return syncEnabled === null ? true : syncEnabled === 'true';
  }, []);
  
  // Get the timestamp of the last local sync
  const getLastLocalSyncTime = useCallback(() => {
    const lastSync = localStorage.getItem('lastCloudSync');
    return lastSync ? new Date(lastSync) : null;
  }, []);

  // Function to check and perform auto sync on startup
  const performAutoSync = useCallback(async () => {
    // Exit if user is not logged in or sync is disabled
    if (!currentUser || !isSyncEnabled()) {
      return;
    }

    try {
      setSyncInProgress(true);
      setSyncProgress(0);
      setSyncError(null);
      
      // Show initial sync toast with longer duration
      toast.loading('Auto Sync: Checking for cloud updates...', { 
        id: 'cloud-sync',
        duration: 5000
      });
      
      // Create a reference to the backup file
      const backupRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      try {
        // Get metadata to check if cloud backup exists and its timestamp
        const metadata = await getMetadata(backupRef);
        const cloudBackupDate = new Date(metadata.updated);
        
        // Get local backup date
        const localBackupDate = getLastLocalSyncTime();
        
        // If no local backup or cloud backup is newer, download it
        if (!localBackupDate || cloudBackupDate > localBackupDate) {
          // Update toast to show download is starting
          toast.loading('Auto Sync: Downloading cloud backup...', { 
            id: 'cloud-sync',
            duration: 10000 
          });
          
          // Get the download URL
          const downloadURL = await getDownloadURL(backupRef);
          
          // Download the backup file
          const response = await fetch(downloadURL);
          
          if (!response.ok) {
            throw new Error('Failed to download backup');
          }
          
          // Get total size and set up progress tracking
          const contentLength = response.headers.get('content-length');
          const total = parseInt(contentLength, 10);
          const reader = response.body.getReader();
          let receivedLength = 0;
          let chunks = [];
          
          // Read the data with progress updates
          while(true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }
            
            chunks.push(value);
            receivedLength += value.length;
            
            // Update progress
            const progress = Math.round((receivedLength / total) * 100);
            setSyncProgress(progress);
            
            // Update the loading toast
            toast.loading(`Syncing: ${progress}%`, { id: 'cloud-sync' });
          }
          
          // Combine chunks into a single Uint8Array
          let chunksAll = new Uint8Array(receivedLength);
          let position = 0;
          for(let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
          }
          
          // Create a blob and file from the data
          const blob = new Blob([chunksAll]);
          const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
          
          // Import the downloaded backup
          if (onImportCollection) {
            await onImportCollection(file);
          } else {
            console.error('Import function not available');
            throw new Error('Import function not available');
          }
          
          // Update last sync time
          localStorage.setItem('lastCloudSync', new Date().toISOString());
          setLastSyncDate(new Date());
          
          // Show success message with longer duration
          toast.success('Auto Sync: Successfully synced with cloud backup', { 
            id: 'cloud-sync',
            duration: 5000
          });
        } else {
          // Local data is up to date
          console.log('Local data is up to date, no sync needed');
          setSyncProgress(100);
          toast.success('Auto Sync: Your data is already up to date', { 
            id: 'cloud-sync',
            duration: 5000
          });
        }
      } catch (error) {
        // No backup exists yet or other error
        console.log('No cloud backup exists yet or error checking:', error);
        toast.error('Auto Sync: No cloud backup found or error checking for updates', { 
          id: 'cloud-sync',
          duration: 5000 
        });
      }
    } catch (error) {
      console.error('Auto sync error:', error);
      setSyncError(error.message);
      toast.error(`Auto Sync failed: ${error.message}`, { 
        id: 'cloud-sync',
        duration: 5000
      });
    } finally {
      setSyncInProgress(false);
    }
  }, [currentUser, isSyncEnabled, getLastLocalSyncTime, onImportCollection]);

  // Run auto sync when component mounts if enabled
  useEffect(() => {
    const checkAndSync = async () => {
      if (currentUser && isSyncEnabled()) {
        await performAutoSync();
      }
    };
    
    checkAndSync();
  }, [currentUser, isSyncEnabled, performAutoSync]);

  const value = {
    syncInProgress,
    syncProgress,
    syncError,
    lastSyncDate,
    performAutoSync
  };

  return (
    <AutoSyncContext.Provider value={value}>
      {children}
    </AutoSyncContext.Provider>
  );
} 