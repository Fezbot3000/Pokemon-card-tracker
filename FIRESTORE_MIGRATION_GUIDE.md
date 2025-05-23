# Firestore Migration Guide

## Overview

This guide explains how to migrate from the complex IndexedDB + shadow sync pattern to direct Firestore usage.

## Architecture Changes

### Before (Complex)
```
User Action → db.js (IndexedDB) → shadowSync.js → Firestore
                     ↓
              4,258 lines of code
```

### After (Simple)
```
User Action → firestoreService.js → Firestore (with offline persistence)
                     ↓
               ~400 lines of code
```

## Migration Steps

### Step 1: Replace Imports

Replace all imports of `db` with the adapter:

```javascript
// Before
import db from '../services/db';

// After
import db from '../services/firestore/dbAdapter';
```

### Step 2: Test Existing Functionality

The adapter maintains the same API, so existing code should work without changes:

```javascript
// These calls work the same with the adapter
const collections = await db.getCollections();
await db.saveCollection('my-collection', cards);
const cards = await db.getCards('my-collection');
```

### Step 3: Gradually Migrate to Direct Firestore Usage

For new code or when refactoring, use the Firestore service directly:

```javascript
import firestoreService from '../services/firestore/firestoreService';

// Direct usage
const collections = await firestoreService.getCollections();
await firestoreService.saveCollection('my-collection', cards);
```

## Key Benefits

1. **Simplified Architecture**: Remove 4,000+ lines of complex sync code
2. **Better Offline Support**: Firestore's built-in offline persistence
3. **Real-time Updates**: Native Firestore listeners work automatically
4. **Reduced Bugs**: No more sync conflicts between two databases
5. **Better Performance**: Direct Firestore operations are optimized

## Data Structure in Firestore

```
users/
  └── {userId}/
      ├── collections/
      │   ├── {collectionName}/
      │   │   ├── name: string
      │   │   ├── data: array (cards)
      │   │   └── updatedAt: timestamp
      │   └── ...
      ├── sold-items/
      │   ├── {itemId}/
      │   │   ├── ...card data
      │   │   └── updatedAt: timestamp
      │   └── ...
      ├── profile/
      │   └── data/
      │       ├── ...profile fields
      │       └── updatedAt: timestamp
      └── purchaseInvoices/
          ├── {invoiceId}/
          │   ├── ...invoice data
          │   └── updatedAt: timestamp
          └── ...
```

## Testing

Run the test script in the browser console:

```javascript
// Load the test script
import('./services/firestore/testFirestore.js');

// Run tests
window.testFirestore();
```

## Rollback Plan

If issues arise, simply revert the import changes to use the original db.js:

```javascript
// Revert to original
import db from '../services/db';
```

## Next Steps

1. Run the migration script to update all imports
2. Test the application thoroughly
3. Monitor for any issues
4. Once stable, remove db.js and shadowSync.js
5. Update remaining code to use Firestore service directly

## Notes

- Images should be migrated to Firebase Storage (not included in this migration)
- PSA results functionality may need separate migration
- Subscription data is now stored in the user profile
