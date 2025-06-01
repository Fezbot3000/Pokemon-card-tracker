# Backup & Restore System

## Overview

The Pokemon Card Tracker features a comprehensive backup and restore system with manual and automatic options. The system provides real-time progress tracking, detailed logging, and automatic data refresh to ensure data integrity and seamless user experience.

## System Architecture

### Core Components

**Context Providers:**
- `BackupContext.js`: Manages backup operations and state
- `RestoreContext.js`: Handles restore operations and progress
- `AutoSyncContext.js`: Provides automatic cloud sync functionality

**Component Integration:**
- `RestoreListener.js`: Monitors backup/restore completion and triggers app refresh
- Progress bars and status indicators throughout the UI
- Integration with main data management systems

### State Management

**Backup Context Structure:**
```javascript
const BackupContext = createContext({
  isBackingUp: false,
  backupProgress: 0,
  backupLogs: [],
  startBackup: () => {},
  clearBackupLogs: () => {}
});

const BackupProvider = ({ children }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupLogs, setBackupLogs] = useState([]);
  
  const addBackupLog = (message) => {
    setBackupLogs(prev => [...prev, message]);
  };
};
```

**Restore Context Structure:**
```javascript
const RestoreContext = createContext({
  isRestoring: false,
  restoreProgress: 0,
  restoreLogs: [],
  startRestore: () => {},
  clearRestoreLogs: () => {}
});
```

## Backup System

### Manual Backup

**Backup Process Flow:**
1. User initiates backup from settings or dashboard
2. System validates user authentication
3. Data collection from all sources (Firestore, localStorage, IndexedDB)
4. Progress tracking with real-time updates
5. Upload to Firebase Storage
6. Completion notification and logging

**Core Backup Implementation:**
```javascript
const startBackup = async () => {
  try {
    setIsBackingUp(true);
    setBackupProgress(0);
    addBackupLog('Starting backup process...');
    
    // Step 1: Collect user data
    updateProgress(10, 'Collecting user profile data...');
    const userData = await getUserData(currentUser.uid);
    
    // Step 2: Collect collections
    updateProgress(30, 'Backing up collections...');
    const collections = await db.getCollections();
    
    // Step 3: Collect sold items
    updateProgress(50, 'Backing up sold items...');
    const soldItems = await db.getSoldItems();
    
    // Step 4: Collect preferences
    updateProgress(70, 'Backing up preferences...');
    const preferences = await getUserPreferences();
    
    // Step 5: Create backup package
    updateProgress(85, 'Creating backup package...');
    const backupData = {
      timestamp: new Date().toISOString(),
      userData,
      collections,
      soldItems,
      preferences,
      version: '1.0'
    };
    
    // Step 6: Upload to cloud storage
    updateProgress(95, 'Uploading to cloud storage...');
    await uploadBackup(backupData);
    
    updateProgress(100, 'Backup completed successfully!');
    toast.success('Backup completed successfully');
    
  } catch (error) {
    logger.error('Backup failed:', error);
    addBackupLog(`Backup failed: ${error.message}`);
    toast.error('Backup failed. Please try again.');
  } finally {
    setIsBackingUp(false);
  }
};
```

### Backup Data Structure

**Backup Package Format:**
```javascript
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0",
  "userData": {
    "uid": "user-firebase-uid",
    "email": "user@example.com",
    "displayName": "User Name",
    "preferences": {
      "currency": "USD",
      "theme": "dark"
    }
  },
  "collections": {
    "All Cards": [...cards],
    "Custom Collection": [...cards],
    "sold": [...soldCards]
  },
  "soldItems": [...soldItems],
  "preferences": {...userPreferences},
  "metadata": {
    "totalCards": 150,
    "totalCollections": 3,
    "backupSize": "2.5MB"
  }
}
```

### Cloud Storage Integration

**Firebase Storage Upload:**
```javascript
const uploadBackup = async (backupData) => {
  try {
    const backupJson = JSON.stringify(backupData, null, 2);
    const blob = new Blob([backupJson], { type: 'application/json' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    
    const storageRef = ref(storage, `backups/${currentUser.uid}/${filename}`);
    
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setBackupProgress(Math.round(85 + (progress * 0.15))); // 85-100%
        },
        (error) => {
          logger.error('Upload failed:', error);
          reject(error);
        },
        () => {
          addBackupLog(`Backup uploaded successfully: ${filename}`);
          resolve(uploadTask.snapshot);
        }
      );
    });
  } catch (error) {
    logger.error('Backup upload error:', error);
    throw error;
  }
};
```

## Restore System

### Manual Restore

**Restore Process Flow:**
1. User selects restore option
2. System lists available backups from cloud storage
3. User selects backup to restore
4. Download and validation of backup file
5. Data restoration with progress tracking
6. App state refresh and notification

**Core Restore Implementation:**
```javascript
const startRestore = async (backupFile) => {
  try {
    setIsRestoring(true);
    setRestoreProgress(0);
    addRestoreLog('Starting restore process...');
    
    // Step 1: Download backup file
    updateProgress(10, 'Downloading backup file...');
    const backupData = await downloadBackup(backupFile);
    
    // Step 2: Validate backup
    updateProgress(20, 'Validating backup data...');
    const isValid = validateBackupData(backupData);
    if (!isValid) {
      throw new Error('Invalid backup file format');
    }
    
    // Step 3: Clear existing data
    updateProgress(30, 'Clearing existing data...');
    await clearExistingData();
    
    // Step 4: Restore user profile
    updateProgress(40, 'Restoring user profile...');
    await restoreUserData(backupData.userData);
    
    // Step 5: Restore collections
    updateProgress(60, 'Restoring collections...');
    await restoreCollections(backupData.collections);
    
    // Step 6: Restore sold items
    updateProgress(80, 'Restoring sold items...');
    await restoreSoldItems(backupData.soldItems);
    
    // Step 7: Restore preferences
    updateProgress(95, 'Restoring preferences...');
    await restorePreferences(backupData.preferences);
    
    updateProgress(100, 'Restore completed successfully!');
    addRestoreLog('All data restored successfully');
    toast.success('Data restored successfully');
    
  } catch (error) {
    logger.error('Restore failed:', error);
    addRestoreLog(`Restore failed: ${error.message}`);
    toast.error('Restore failed. Please try again.');
  } finally {
    setIsRestoring(false);
  }
};
```

### Backup File Management

**Listing Available Backups:**
```javascript
const listBackups = async () => {
  try {
    const backupsRef = ref(storage, `backups/${currentUser.uid}`);
    const result = await listAll(backupsRef);
    
    const backups = await Promise.all(
      result.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const downloadURL = await getDownloadURL(item);
        
        return {
          name: item.name,
          size: metadata.size,
          created: metadata.timeCreated,
          downloadURL,
          fullPath: item.fullPath
        };
      })
    );
    
    // Sort by creation date (newest first)
    return backups.sort((a, b) => new Date(b.created) - new Date(a.created));
  } catch (error) {
    logger.error('Failed to list backups:', error);
    throw error;
  }
};
```

## Auto-Sync System

### AutoSyncContext Implementation

**Automatic Cloud Sync:**
```javascript
const AutoSyncContext = createContext({
  isAutoSyncEnabled: false,
  lastSyncTime: null,
  syncStatus: 'idle',
  enableAutoSync: () => {},
  disableAutoSync: () => {},
  triggerManualSync: () => {}
});

const AutoSyncProvider = ({ children }) => {
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [cooldownUntil, setCooldownUntil] = useState(null);
  
  // Cooldown logic to prevent frequent syncs
  const isCooldownActive = () => {
    if (!cooldownUntil) return false;
    return new Date() < new Date(cooldownUntil);
  };
  
  const triggerAutoRestore = useCallback(async () => {
    if (!isAutoSyncEnabled || isCooldownActive()) return;
    
    try {
      setSyncStatus('syncing');
      
      // Set cooldown (5 minutes)
      const cooldownTime = new Date(Date.now() + 5 * 60 * 1000);
      setCooldownUntil(cooldownTime.toISOString());
      
      // Perform automatic restore
      await performAutoRestore();
      
      setLastSyncTime(new Date().toISOString());
      setSyncStatus('success');
      
    } catch (error) {
      logger.error('Auto-sync failed:', error);
      setSyncStatus('error');
    }
  }, [isAutoSyncEnabled, cooldownUntil]);
};
```

### Auto-Restore Features

**Intelligent Sync Triggers:**
- App startup (if enabled)
- After manual data changes
- Periodic sync intervals
- Cross-device sync detection

**Cooldown Management:**
```javascript
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes

const checkCooldown = () => {
  const lastSync = localStorage.getItem('lastAutoSync');
  if (!lastSync) return false;
  
  const timeSinceLastSync = Date.now() - new Date(lastSync).getTime();
  return timeSinceLastSync < COOLDOWN_DURATION;
};
```

## Data Refresh System

### RestoreListener Component

**Automatic App Refresh:**
```javascript
const RestoreListener = ({ onRefreshData }) => {
  const { isRestoring, restoreProgress } = useRestore();
  const { isBackingUp, backupProgress } = useBackup();
  const hasTriggeredRestoreRef = useRef(false);
  const hasTriggeredBackupRef = useRef(false);

  // Listen for restore completion
  useEffect(() => {
    if (!isRestoring && restoreProgress === 100 && !hasTriggeredRestoreRef.current) {
      logger.log('RestoreListener: Restore completed, refreshing data');
      hasTriggeredRestoreRef.current = true;
      
      // Trigger app data refresh
      if (onRefreshData) {
        setTimeout(() => {
          onRefreshData();
        }, 1000); // Small delay to ensure restore is complete
      }
    } else if (isRestoring) {
      hasTriggeredRestoreRef.current = false;
    }
  }, [isRestoring, restoreProgress, onRefreshData]);

  return null; // This component doesn't render anything
};
```

### Data Synchronization

**Post-Restore Refresh:**
```javascript
const refreshAppData = async () => {
  try {
    logger.log('Refreshing app data after restore...');
    
    // Reload collections
    const collections = await db.getCollections();
    setCollections(collections);
    
    // Reload user preferences
    const preferences = await getUserPreferences();
    updateUserPreferences(preferences);
    
    // Reload sold items
    const soldItems = await db.getSoldItems();
    setSoldItems(soldItems);
    
    // Reset UI state
    setSelectedCollection('All Cards');
    
    // Clear caches
    cacheManager.clearAll();
    
    logger.log('App data refresh completed');
    toast.success('Data synchronized successfully');
    
  } catch (error) {
    logger.error('Failed to refresh app data:', error);
    toast.error('Failed to sync data. Please refresh the page.');
  }
};
```

## Progress Tracking & Logging

### Real-time Progress Updates

**Progress Management:**
```javascript
const updateProgress = (percentage, message) => {
  setBackupProgress(percentage);
  addBackupLog(`${percentage}% - ${message}`);
  
  // Emit progress event for UI components
  window.dispatchEvent(new CustomEvent('backupProgress', {
    detail: { percentage, message }
  }));
};
```

### Detailed Logging

**Log Categories:**
- **Info Logs**: General progress and status updates
- **Error Logs**: Failure details and error messages
- **Debug Logs**: Technical details for troubleshooting
- **User Logs**: User-friendly status messages

**Log Implementation:**
```javascript
const BackupLogger = {
  info: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] INFO: ${message}`;
    addBackupLog(logEntry);
    logger.log(logEntry);
  },
  
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${message}`;
    if (error) {
      logEntry += ` - ${error.message}`;
    }
    addBackupLog(logEntry);
    logger.error(logEntry, error);
  },
  
  warn: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] WARN: ${message}`;
    addBackupLog(logEntry);
    logger.warn(logEntry);
  }
};
```

## Error Handling & Recovery

### Backup Error Recovery

**Error Categories:**
1. **Network Errors**: Upload failures, connection issues
2. **Storage Errors**: Quota exceeded, permission denied
3. **Data Errors**: Corruption, validation failures
4. **User Errors**: Insufficient permissions, cancelled operations

**Recovery Strategies:**
```javascript
const handleBackupError = async (error, context) => {
  logger.error(`Backup error in ${context}:`, error);
  
  if (error.code === 'storage/quota-exceeded') {
    // Try to clean up old backups
    await cleanupOldBackups();
    toast.error('Storage quota exceeded. Old backups cleaned up. Please try again.');
  } else if (error.code === 'storage/unauthorized') {
    // Re-authenticate user
    toast.error('Authentication expired. Please sign in again.');
    // Redirect to login
  } else if (error.code === 'network-request-failed') {
    // Retry with exponential backoff
    await retryWithBackoff(() => startBackup(), 3);
  } else {
    // Generic error handling
    toast.error('Backup failed. Please check your connection and try again.');
  }
};
```

### Restore Error Recovery

**Validation and Rollback:**
```javascript
const validateAndRestore = async (backupData) => {
  try {
    // Create restore point before starting
    const currentData = await createRestorePoint();
    
    // Validate backup data structure
    if (!validateBackupFormat(backupData)) {
      throw new Error('Invalid backup format');
    }
    
    // Attempt restore
    await performRestore(backupData);
    
    // Verify restore success
    const restoredData = await verifyRestoreIntegrity();
    if (!restoredData.isValid) {
      // Rollback to previous state
      await rollbackRestore(currentData);
      throw new Error('Restore verification failed');
    }
    
  } catch (error) {
    logger.error('Restore failed:', error);
    throw error;
  }
};
```

## Performance Optimizations

### Incremental Backups

**Delta Backup Strategy:**
```javascript
const createIncrementalBackup = async () => {
  try {
    const lastBackupTime = localStorage.getItem('lastBackupTime');
    const changedData = await getChangedDataSince(lastBackupTime);
    
    if (changedData.isEmpty()) {
      toast.info('No changes detected since last backup');
      return;
    }
    
    // Create smaller backup with only changed data
    const incrementalBackup = {
      type: 'incremental',
      timestamp: new Date().toISOString(),
      baseBackup: lastBackupTime,
      changes: changedData
    };
    
    await uploadIncrementalBackup(incrementalBackup);
    
  } catch (error) {
    logger.error('Incremental backup failed:', error);
    // Fall back to full backup
    await startBackup();
  }
};
```

### Compression

**Data Compression:**
```javascript
const compressBackupData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = pako.gzip(jsonString);
    return compressed;
  } catch (error) {
    logger.error('Compression failed:', error);
    return JSON.stringify(data); // Fall back to uncompressed
  }
};
```

## Security Considerations

### Backup Encryption

**Client-side Encryption:**
```javascript
const encryptBackupData = async (data, userKey) => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: generateIV() },
      userKey,
      new TextEncoder().encode(jsonString)
    );
    return encrypted;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw error;
  }
};
```

### Access Control

**Backup Access Validation:**
- User authentication required for all operations
- User can only access their own backups
- Firebase Storage security rules enforce access control
- Backup file naming includes user ID for isolation

## Future Enhancements

### Planned Features

1. **Advanced Scheduling:**
   - Cron-like backup scheduling
   - Configurable retention policies
   - Smart backup timing based on usage patterns

2. **Multi-platform Sync:**
   - Cross-device synchronization
   - Conflict resolution
   - Real-time collaboration features

3. **Backup Analytics:**
   - Backup success rates
   - Storage usage tracking
   - Performance metrics

4. **Enhanced Recovery:**
   - Point-in-time recovery
   - Selective data restoration
   - Backup preview before restore

This backup and restore system provides comprehensive data protection with user-friendly interfaces and robust error handling, ensuring users never lose their valuable collection data.
