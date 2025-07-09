import { useEffect, useRef } from 'react';
import { useRestore } from '../design-system/contexts/RestoreContext';
import { useBackup } from '../design-system/contexts/BackupContext';
import logger from '../utils/logger';

/**
 * A component that listens for restore/backup completion events and refreshes the app state
 * This component doesn't render anything visible
 */
const RestoreListener = ({ onRefreshData }) => {
  const { isRestoring, restoreProgress } = useRestore();
  const { isBackingUp, backupProgress } = useBackup();
  const hasTriggeredRestoreRef = useRef(false);
  const hasTriggeredBackupRef = useRef(false);

  // Listen for restore completion
  useEffect(() => {
    // Check if restore just completed (progress is 100%)
    if (
      !isRestoring &&
      restoreProgress === 100 &&
      !hasTriggeredRestoreRef.current
    ) {
      logger.log('RestoreListener: Restore completed, refreshing app data');
      hasTriggeredRestoreRef.current = true;

      // Small delay to ensure all DB operations are complete
      setTimeout(() => {
        if (typeof onRefreshData === 'function') {
          onRefreshData();
        }
      }, 1000);
    } else if (isRestoring) {
      // Reset the flag when a new restore starts
      hasTriggeredRestoreRef.current = false;
    }
  }, [isRestoring, restoreProgress, onRefreshData]);

  // Listen for backup completion
  useEffect(() => {
    // Check if backup just completed (progress is 100%)
    if (
      !isBackingUp &&
      backupProgress === 100 &&
      !hasTriggeredBackupRef.current
    ) {
      logger.log('RestoreListener: Backup completed');
      hasTriggeredBackupRef.current = true;
    } else if (isBackingUp) {
      // Reset the flag when a new backup starts
      hasTriggeredBackupRef.current = false;
    }
  }, [isBackingUp, backupProgress]);

  // This component doesn't render anything visible
  return null;
};

export default RestoreListener;
