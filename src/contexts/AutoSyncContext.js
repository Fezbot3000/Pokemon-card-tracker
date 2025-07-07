import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { toast } from 'react-hot-toast';
import logger from '../utils/logger';

const AutoSyncContext = createContext({
  isAutoSyncEnabled: false,
  setIsAutoSyncEnabled: () => {},
  lastSyncTime: null,
  triggerCloudRestore: () => {},
  isRestoring: false,
});

export const useAutoSync = () => useContext(AutoSyncContext);

export const AutoSyncProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(
    localStorage.getItem('autoRestoreEnabled') === 'true'
  );
  const [lastSyncTime, setLastSyncTime] = useState(
    localStorage.getItem('lastCloudSync') || null
  );
  const [isRestoring, setIsRestoring] = useState(false);

  // When settings change, update localStorage
  useEffect(() => {
    localStorage.setItem('autoRestoreEnabled', isAutoSyncEnabled.toString());
  }, [isAutoSyncEnabled]);

  // Effect to check for cloud backup on login if auto-restore is enabled
  useEffect(() => {
    const checkForAutoRestore = async () => {
      try {
        // Only run if user is logged in and auto-restore is enabled
        if (!currentUser || !isAutoSyncEnabled) {
          return;
        }

        // Check if we've restored recently to avoid duplicate restores
        const lastRestore = localStorage.getItem('lastCloudRestore');
        const noRecentRestores =
          !lastRestore || Date.now() - parseInt(lastRestore) > 1000 * 60 * 60; // 1 hour cooldown

        if (!noRecentRestores) {
          logger.info('Auto-restore: Skipping - restored within the last hour');
          return;
        }

        logger.info('Auto-restore: Checking for cloud backup');

        // Reference to the backup file in Firebase Storage
        const storageRef = ref(
          storage,
          `users/${currentUser.uid}/backups/latest-backup.zip`
        );

        try {
          // Verify backup exists without downloading it
          await getDownloadURL(storageRef);

          // Set timestamp to avoid rapid consecutive restores
          localStorage.setItem('lastCloudRestore', Date.now().toString());

          // Wait for app to fully initialize
          setTimeout(() => {
            logger.info('Auto-restore: Backup found, initiating restore');
            toast.success(
              'Auto-restore: Found cloud backup, restoring your collection'
            );

            // Get the CloudSync component's restore function
            if (window.handleCloudRestore) {
              window.handleCloudRestore();
            } else {
              // If reference isn't available, inform user they need to manually restore
              toast.error(
                'Auto-restore: Please use the Restore from Cloud button in Settings'
              );
            }
          }, 3000);
        } catch (error) {
          logger.info('Auto-restore: No cloud backup found or error', error);
        }
      } catch (error) {
        logger.error('Error in auto-restore check:', error);
      }
    };

    checkForAutoRestore();
  }, [currentUser, isAutoSyncEnabled]);

  // Function to manually trigger cloud restore (can be called from other components)
  const triggerCloudRestore = () => {
    if (window.handleCloudRestore) {
      window.handleCloudRestore();
    } else {
      toast.error('Cloud restore function not available');
    }
  };

  // Update last sync time when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setLastSyncTime(localStorage.getItem('lastCloudSync'));
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const value = {
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    lastSyncTime,
    triggerCloudRestore,
    isRestoring,
  };

  return (
    <AutoSyncContext.Provider value={value}>
      {children}
    </AutoSyncContext.Provider>
  );
};

export default AutoSyncContext;
