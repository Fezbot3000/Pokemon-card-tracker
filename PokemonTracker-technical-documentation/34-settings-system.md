# Settings System Technical Documentation

## Overview

The Settings System provides a comprehensive modal interface for managing user preferences, collections, data operations, and application settings. It uses a modular tabbed architecture with deep integration across multiple system contexts.

## Core Architecture

### 1. Component Structure

```
SettingsModal (Main Component)
├── Modal State Management
│   ├── isOpen/onClose props
│   ├── activeTab state
│   └── Body class management ('settings-open')
├── Tab Navigation
│   ├── General
│   ├── Profile
│   ├── Data
│   ├── Appearance
│   ├── Collections
│   └── Marketplace
└── Sub-components
    ├── CollectionManagement
    ├── ProfileSettings
    ├── AppearanceSettings
    ├── MarketplaceProfile
    └── MarketplaceReviews
```

### 2. Modal Opening Mechanism

#### Settings Manager Utility
```javascript
// utils/settingsManager.js
export const settingsManager = {
  openSettings: (isMobile, setCurrentView, setShowSettings, navigate = null) => {
    // Add body class for styling
    document.body.classList.add('settings-open');
    
    // Mobile: Navigate to settings route
    if (isMobile && navigate) {
      navigate('/dashboard/settings');
      return;
    }
    
    // Mobile without navigation: Use view state
    if (isMobile) {
      setCurrentView('settings');
    }
    
    // Show settings modal
    setShowSettings(true);
  },
  
  closeSettings: (isMobile, currentView, setCurrentView, setShowSettings) => {
    document.body.classList.remove('settings-open');
    setShowSettings(false);
    
    // Mobile: Return to cards view
    if (isMobile && currentView === 'settings') {
      setCurrentView('cards');
    }
  }
};
```

#### Integration in App.js
```javascript
// State management
const [showSettings, setShowSettings] = useState(false);

// Handler functions
const handleSettingsClick = () => {
  settingsManager.openSettings(isMobile, setCurrentView, setShowSettings, navigate);
};

const handleCloseSettings = () => {
  settingsManager.closeSettings(isMobile, currentView, setCurrentView, setShowSettings);
};

// Render conditional
{showSettings && (
  <SettingsModal
    isOpen={showSettings}
    onClose={handleCloseSettings}
    selectedCollection={selectedCollection}
    collections={collections}
    onRenameCollection={handleRenameCollection}
    onDeleteCollection={handleDeleteCollection}
    onImportCollection={handleImportCollection}
    onImportBaseData={handleImportBaseData}
    userData={userData}
    onSignOut={handleSignOut}
    onResetData={handleResetData}
    onStartTutorial={checkAndStartTutorial}
    onImportAndCloudMigrate={handleImportAndCloudMigrate}
    onUploadImagesFromZip={handleUploadImagesFromZip}
    onExportData={handleExportData}
    onImportSoldItemsFromZip={handleImportSoldItemsFromZip}
  />
)}
```

### 3. State Management

#### Internal State
```javascript
// Tab navigation
const [activeTab, setActiveTab] = useState('general');

// Collection operations
const [isRenaming, setIsRenaming] = useState(false);
const [newCollectionName, setNewCollectionName] = useState('');
const [collectionToRename, setCollectionToRename] = useState('');
const [collectionToDelete, setCollectionToDelete] = useState('');

// Data operations
const [cloudSyncProgress, setCloudSyncProgress] = useState(0);
const [cloudSyncStatus, setCloudSyncStatus] = useState('');
const [isImportingBaseData, setIsImportingBaseData] = useState(false);
const [isForceSyncing, setIsForceSyncing] = useState(false);
const [isCloudMigrating, setIsCloudMigrating] = useState(false);
const [isUploadingImages, setIsUploadingImages] = useState(false);

// Reset confirmation
const [showResetConfirm, setShowResetConfirm] = useState(false);
const [resetConfirmText, setResetConfirmText] = useState('');

// Profile management
const [profileData, setProfileData] = useState({
  displayName: userData?.displayName || '',
  email: userData?.email || '',
  photoURL: userData?.photoURL || ''
});
```

#### Context Dependencies
```javascript
// Theme context
const { theme, toggleTheme } = useTheme();

// Authentication context
const { user } = useAuth();

// User preferences
const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();

// Restore context
const { 
  isRestoring, restoreProgress, restoreStatus, 
  addRestoreLog, startRestore, completeRestore, 
  cancelRestore, setRestoreProgress, setRestoreStatus
} = useRestore();

// Backup context
const {
  isBackingUp, backupProgress, backupStatus,
  startBackup, completeBackup, cancelBackup,
  setBackupProgress, setBackupStatus, addBackupLog
} = useBackup();
```

## Key Functions and Operations

### 1. Profile Management

#### Profile Update
```javascript
const handleProfileSave = async () => {
  try {
    // Update Firestore
    await updateDoc(doc(firestoreDb, 'users', user.uid), {
      displayName: profileData.displayName,
      photoURL: profileData.photoURL,
      updatedAt: new Date()
    });
    
    // Update IndexedDB
    await db.updateUserProfile({
      uid: user.uid,
      displayName: profileData.displayName,
      email: profileData.email,
      photoURL: profileData.photoURL
    });
    
    toastService.success('Profile updated successfully');
  } catch (error) {
    logger.error('Failed to save profile:', error);
    toastService.error('Failed to save profile');
  }
};
```

### 2. Collection Operations

#### Rename Collection
```javascript
const handleRenameConfirm = async () => {
  if (onRenameCollection) {
    await onRenameCollection(collectionToRename, newCollectionName);
    setIsRenaming(false);
    setNewCollectionName('');
    setCollectionToRename('');
  }
};
```

#### Collection Protection
- "All Cards" and "sold" collections are protected from rename/delete
- Delete functionality is completely disabled with UI indication
- Case-insensitive filtering for protected collections

### 3. Data Import/Export Operations

#### Force Cloud Sync
```javascript
const handleForceSyncToCloud = async () => {
  setIsForceSyncing(true);
  setCloudSyncProgress(0);
  setCloudSyncStatus('Starting cloud sync...');
  
  try {
    // Get all local data
    const localCards = await db.getAllCards();
    const localSoldItems = await db.getAllSoldItems();
    const localPurchaseInvoices = await db.getAllPurchaseInvoices();
    
    // Upload to Firestore with progress tracking
    await shadowSync.syncLocalToCloud(
      localCards, 
      localSoldItems, 
      localPurchaseInvoices,
      (progress, status) => {
        setCloudSyncProgress(progress);
        setCloudSyncStatus(status);
      }
    );
    
    toastService.success('Cloud sync completed successfully');
  } catch (error) {
    logger.error('Cloud sync failed:', error);
    toastService.error('Cloud sync failed');
  } finally {
    setIsForceSyncing(false);
  }
};
```

#### Cloud Migration
```javascript
const handleCloudMigration = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsCloudMigrating(true);
      try {
        await onImportAndCloudMigrate(file, (step, percent, message) => {
          setCloudSyncProgress(percent);
          setCloudSyncStatus(message);
        });
      } catch (error) {
        logger.error('Cloud migration failed:', error);
      } finally {
        setIsCloudMigrating(false);
      }
    }
  };
  input.click();
};
```

#### Image Upload from ZIP
```javascript
const handleImageUploadChange = async (e) => {
  const file = e.target.files[0];
  if (file && file.name.endsWith('.zip')) {
    setIsUploadingImages(true);
    try {
      await onUploadImagesFromZip(file, (step, percent, message) => {
        setCloudSyncProgress(percent);
        setCloudSyncStatus(message);
      });
      toastService.success('Images uploaded successfully');
    } catch (error) {
      logger.error('Image upload failed:', error);
      toastService.error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
    }
  }
};
```

### 4. Cloud Backup Verification
```javascript
const handleVerifyCloudBackup = async () => {
  try {
    startBackup();
    setBackupStatus('Verifying cloud backup...');
    
    // List all backup files
    const backupRef = ref(storage, `backups/${user.uid}`);
    const backupList = await listAll(backupRef);
    
    if (backupList.items.length === 0) {
      addBackupLog('No backups found in cloud storage', 'warning');
      return;
    }
    
    // Get latest backup
    const latestBackup = backupList.items[backupList.items.length - 1];
    const url = await getDownloadURL(latestBackup);
    
    // Download and verify
    const response = await fetch(url);
    const backupData = await response.json();
    
    // Verify structure
    const isValid = backupData.cards && 
                   backupData.soldItems && 
                   backupData.purchaseInvoices &&
                   backupData.metadata;
    
    if (isValid) {
      addBackupLog(`Backup verified: ${backupData.metadata.timestamp}`, 'success');
      addBackupLog(`Cards: ${backupData.cards.length}`, 'info');
      addBackupLog(`Sold Items: ${backupData.soldItems.length}`, 'info');
    }
    
    completeBackup();
  } catch (error) {
    addBackupLog(`Verification failed: ${error.message}`, 'error');
    cancelBackup();
  }
};
```

### 5. Data Reset
```javascript
const handleConfirmReset = async () => {
  if (resetConfirmText === 'RESET') {
    setShowResetConfirm(false);
    setResetConfirmText('');
    await onResetData();
  }
};
```

## Integration Points

### 1. Firebase Services
- **Firestore**: Profile updates, data sync
- **Storage**: Image uploads, backup storage
- **Functions**: Cloud operations, data processing
- **Auth**: User authentication state

### 2. Local Storage
- **IndexedDB**: Local data operations via dbAdapter
- **Navigation State**: Collection selection persistence
- **Theme**: Dark/light mode preference
- **Currency**: Preferred currency setting

### 3. Context Providers
```javascript
// Theme Context
- theme state
- toggleTheme function

// Auth Context  
- user object
- authentication state

// User Preferences Context
- preferredCurrency
- updatePreferredCurrency
- availableCurrencies

// Restore Context
- Restore operation state
- Progress tracking
- Log management

// Backup Context
- Backup operation state
- Progress tracking
- Log management
```

### 4. External Services
- **Shadow Sync**: Local to cloud synchronization
- **Cloud Sync**: Bidirectional data sync
- **PSA Search**: Card verification
- **Card Repository**: Data operations

## Tab Components

### 1. General Tab
- Tutorial restart
- App information
- Version details

### 2. Profile Tab
- Display name management
- Email display (read-only)
- Photo URL management
- Save functionality

### 3. Data Tab
- Import/Export operations
- Cloud sync controls
- Backup verification
- Data reset with confirmation

### 4. Appearance Tab
- Theme toggle (dark/light)
- Currency selection
- Visual preferences

### 5. Collections Tab
- Collection management component
- Rename operations
- Delete operations (disabled)
- Protected collection handling

### 6. Marketplace Tab
- Marketplace profile management
- Review system
- Seller information

## Error Handling

### 1. Operation Failures
```javascript
try {
  // Operation code
} catch (error) {
  logger.error('Operation failed:', error);
  toastService.error('User-friendly error message');
  // Reset operation state
} finally {
  // Clean up loading states
}
```

### 2. Validation
- File type validation for imports
- Collection name validation
- Reset confirmation validation
- Profile data validation

### 3. Progress Tracking
- Real-time progress updates
- Status messages
- Operation cancellation
- Error recovery

## Performance Optimizations

### 1. Lazy Loading
- Tab content loaded on demand
- File inputs created dynamically
- Modal content rendered conditionally

### 2. State Management
- Minimal re-renders with proper state updates
- useCallback for handler functions
- Proper cleanup in useEffect

### 3. Resource Management
- File readers properly closed
- Event listeners cleaned up
- Memory management for large files

## Security Considerations

### 1. Authentication
- User authentication required
- UID-based data isolation
- Secure Firebase operations

### 2. Data Validation
- Input sanitization
- File type verification
- Size limits enforcement

### 3. Protected Operations
- Collection protection logic
- Confirmation for destructive actions
- Audit logging for operations

## Mobile Considerations

### 1. Responsive Design
- Mobile-specific modal rendering
- Touch-friendly controls
- Appropriate spacing

### 2. Navigation
- Route-based navigation on mobile
- View state management
- Back button handling

### 3. Performance
- Reduced animations on mobile
- Optimized file handling
- Progressive loading

## Testing Strategies

### 1. Unit Tests
- Individual function testing
- State management verification
- Error handling validation

### 2. Integration Tests
- Context integration
- Firebase operations
- File handling

### 3. E2E Tests
- Complete user flows
- Tab navigation
- Data operations

## Future Enhancements

1. **Batch Operations**
   - Multiple collection operations
   - Bulk data import/export
   - Parallel processing

2. **Advanced Settings**
   - Granular permissions
   - API key management
   - Advanced debugging tools

3. **Improved UX**
   - Keyboard shortcuts
   - Drag-and-drop support
   - Progress persistence

4. **Analytics**
   - Usage tracking
   - Performance metrics
   - Error reporting

## Troubleshooting

### Common Issues

1. **Modal Not Opening**
   - Check showSettings state
   - Verify settingsManager integration
   - Check body class application

2. **Operations Failing**
   - Verify authentication
   - Check network connectivity
   - Review console errors

3. **Progress Not Updating**
   - Verify callback implementation
   - Check state updates
   - Review async operations

### Debug Tools
```javascript
// Enable debug logging
logger.setLevel('debug');

// Check feature flags
featureFlags.isEnabled('feature_name');

// Verify state
console.log('Settings state:', { showSettings, activeTab });
