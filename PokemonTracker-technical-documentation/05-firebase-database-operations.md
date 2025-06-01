# Firebase Database Operations - Technical Documentation

## Overview
The Firebase Database Operations system provides a comprehensive data access layer for the Pokemon Card Tracker app. It handles Firestore operations, Firebase Storage management, and provides a unified interface for all database interactions including cards, collections, images, and user data.

## File Location
- **Primary Service**: `src/services/firestore/dbAdapter.js`
- **Supporting Files**: 
  - `src/services/firestore/firestoreConfig.js`
  - `src/services/auth/authUtils.js`

## Architecture Overview

### Database Adapter Class
The `DatabaseAdapter` class serves as the main interface between the app and Firebase services:

```javascript
class DatabaseAdapter {
  constructor() {
    this.firestore = getFirestore();
    this.storage = getStorage();
    this.auth = getAuth();
    
    // Collection references
    this.collectionsRef = 'userCollections';
    this.cardsRef = 'userCards';
    this.soldCardsRef = 'soldCards';
    this.psaCacheRef = 'psaCache';
    this.userPreferencesRef = 'userPreferences';
    this.purchaseInvoicesRef = 'purchaseInvoices';
  }
}
```

## Core Database Operations

### 1. User Authentication Integration

#### Current User Verification
```javascript
getCurrentUser() {
  return this.auth.currentUser;
}

async ensureAuthenticated() {
  const user = this.getCurrentUser();
  if (!user) {
    throw new Error('User must be authenticated to perform this operation');
  }
  return user;
}

getUserId() {
  const user = this.getCurrentUser();
  return user ? user.uid : null;
}
```

### 2. Collections Management

#### Fetch User Collections
```javascript
async getCollections() {
  try {
    const user = await this.ensureAuthenticated();
    const userCollectionsDoc = doc(this.firestore, this.collectionsRef, user.uid);
    const docSnap = await getDoc(userCollectionsDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.collections || {};
    } else {
      // Return default collections if none exist
      const defaultCollections = {
        'Raw Cards': { name: 'Raw Cards', cardCount: 0, createdAt: new Date().toISOString() },
        'PSA Cards': { name: 'PSA Cards', cardCount: 0, createdAt: new Date().toISOString() },
        'BGS Cards': { name: 'BGS Cards', cardCount: 0, createdAt: new Date().toISOString() }
      };
      
      await this.saveCollections(defaultCollections);
      return defaultCollections;
    }
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw new Error(`Failed to fetch collections: ${error.message}`);
  }
}
```

#### Save Collections
```javascript
async saveCollections(collections) {
  try {
    const user = await this.ensureAuthenticated();
    const userCollectionsDoc = doc(this.firestore, this.collectionsRef, user.uid);
    
    const collectionsData = {
      collections: collections,
      lastModified: new Date().toISOString(),
      userId: user.uid
    };
    
    await setDoc(userCollectionsDoc, collectionsData, { merge: true });
    console.log('Collections saved successfully');
    
    return collections;
  } catch (error) {
    console.error('Error saving collections:', error);
    throw new Error(`Failed to save collections: ${error.message}`);
  }
}
```

#### Collection Operations
```javascript
async createCollection(collectionName) {
  try {
    const collections = await this.getCollections();
    
    if (collections[collectionName]) {
      throw new Error(`Collection "${collectionName}" already exists`);
    }
    
    collections[collectionName] = {
      name: collectionName,
      cardCount: 0,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    await this.saveCollections(collections);
    return collections;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw new Error(`Failed to create collection: ${error.message}`);
  }
}

async deleteCollection(collectionName) {
  try {
    // Prevent deletion of default collections
    const protectedCollections = ['Raw Cards', 'PSA Cards', 'BGS Cards', 'Sold'];
    if (protectedCollections.includes(collectionName)) {
      throw new Error(`Cannot delete protected collection: ${collectionName}`);
    }
    
    const collections = await this.getCollections();
    
    if (!collections[collectionName]) {
      throw new Error(`Collection "${collectionName}" does not exist`);
    }
    
    // Check if collection has cards
    const cards = await this.getCards();
    const cardsInCollection = cards.filter(card => 
      (card.collection || card.collectionId) === collectionName
    );
    
    if (cardsInCollection.length > 0) {
      throw new Error(`Cannot delete collection "${collectionName}" - it contains ${cardsInCollection.length} cards`);
    }
    
    delete collections[collectionName];
    await this.saveCollections(collections);
    
    return collections;
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw new Error(`Failed to delete collection: ${error.message}`);
  }
}

async renameCollection(oldName, newName) {
  try {
    if (oldName === newName) return;
    
    // Prevent renaming of default collections
    const protectedCollections = ['Raw Cards', 'PSA Cards', 'BGS Cards', 'Sold'];
    if (protectedCollections.includes(oldName)) {
      throw new Error(`Cannot rename protected collection: ${oldName}`);
    }
    
    const collections = await this.getCollections();
    
    if (!collections[oldName]) {
      throw new Error(`Collection "${oldName}" does not exist`);
    }
    
    if (collections[newName]) {
      throw new Error(`Collection "${newName}" already exists`);
    }
    
    // Update collection object
    collections[newName] = {
      ...collections[oldName],
      name: newName,
      lastModified: new Date().toISOString()
    };
    delete collections[oldName];
    
    // Update all cards in this collection
    const cards = await this.getCards();
    const updatedCards = cards.map(card => {
      if ((card.collection || card.collectionId) === oldName) {
        return {
          ...card,
          collection: newName,
          collectionId: newName,
          lastModified: new Date().toISOString()
        };
      }
      return card;
    });
    
    // Save both collections and updated cards
    await Promise.all([
      this.saveCollections(collections),
      this.saveCards(updatedCards)
    ]);
    
    return collections;
  } catch (error) {
    console.error('Error renaming collection:', error);
    throw new Error(`Failed to rename collection: ${error.message}`);
  }
}
```

### 3. Card Management Operations

#### Fetch Cards
```javascript
async getCards() {
  try {
    const user = await this.ensureAuthenticated();
    const userCardsDoc = doc(this.firestore, this.cardsRef, user.uid);
    const docSnap = await getDoc(userCardsDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.cards || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw new Error(`Failed to fetch cards: ${error.message}`);
  }
}
```

#### Save Cards (Bulk Operation)
```javascript
async saveCards(cards) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }
    
    // Validate and normalize card data
    const normalizedCards = cards.map(card => this.normalizeCardData(card));
    
    const userCardsDoc = doc(this.firestore, this.cardsRef, user.uid);
    const cardsData = {
      cards: normalizedCards,
      lastModified: new Date().toISOString(),
      userId: user.uid,
      cardCount: normalizedCards.length
    };
    
    await setDoc(userCardsDoc, cardsData);
    console.log(`Successfully saved ${normalizedCards.length} cards`);
    
    return normalizedCards;
  } catch (error) {
    console.error('Error saving cards:', error);
    throw new Error(`Failed to save cards: ${error.message}`);
  }
}
```

#### Save Individual Card
```javascript
async saveCard(card) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!card) {
      throw new Error('Card data is required');
    }
    
    // Normalize the card data
    const normalizedCard = this.normalizeCardData(card);
    
    // Get existing cards
    const existingCards = await this.getCards();
    
    // Find if card already exists
    const cardIndex = existingCards.findIndex(c => 
      (c.id && c.id === normalizedCard.id) || 
      (c.slabSerial && c.slabSerial === normalizedCard.slabSerial)
    );
    
    if (cardIndex >= 0) {
      // Update existing card
      existingCards[cardIndex] = {
        ...existingCards[cardIndex],
        ...normalizedCard,
        lastModified: new Date().toISOString()
      };
    } else {
      // Add new card
      normalizedCard.addedAt = new Date().toISOString();
      normalizedCard.lastModified = new Date().toISOString();
      existingCards.push(normalizedCard);
    }
    
    await this.saveCards(existingCards);
    return normalizedCard;
  } catch (error) {
    console.error('Error saving card:', error);
    throw new Error(`Failed to save card: ${error.message}`);
  }
}
```

#### Delete Cards
```javascript
async deleteCard(cardToDelete) {
  try {
    const cards = await this.getCards();
    const cardId = cardToDelete.id || cardToDelete.slabSerial;
    
    if (!cardId) {
      throw new Error('Card must have an ID or slab serial number');
    }
    
    // Filter out the card to delete
    const updatedCards = cards.filter(card => {
      const currentCardId = card.id || card.slabSerial;
      return currentCardId !== cardId;
    });
    
    if (updatedCards.length === cards.length) {
      throw new Error('Card not found');
    }
    
    // Delete associated image
    try {
      await this.deleteImage(cardId);
    } catch (imageError) {
      console.warn('Failed to delete card image:', imageError);
      // Continue with card deletion even if image deletion fails
    }
    
    await this.saveCards(updatedCards);
    console.log(`Card ${cardId} deleted successfully`);
    
    return updatedCards;
  } catch (error) {
    console.error('Error deleting card:', error);
    throw new Error(`Failed to delete card: ${error.message}`);
  }
}

async deleteCards(cardsToDelete) {
  try {
    if (!Array.isArray(cardsToDelete) || cardsToDelete.length === 0) {
      return await this.getCards();
    }
    
    const cards = await this.getCards();
    const cardIdsToDelete = new Set(
      cardsToDelete.map(card => card.id || card.slabSerial).filter(Boolean)
    );
    
    // Filter out cards to delete
    const updatedCards = cards.filter(card => {
      const cardId = card.id || card.slabSerial;
      return !cardIdsToDelete.has(cardId);
    });
    
    // Delete associated images
    const imageDeletePromises = cardsToDelete.map(card => {
      const cardId = card.id || card.slabSerial;
      return cardId ? this.deleteImage(cardId).catch(error => {
        console.warn(`Failed to delete image for card ${cardId}:`, error);
      }) : Promise.resolve();
    });
    
    await Promise.all(imageDeletePromises);
    await this.saveCards(updatedCards);
    
    console.log(`Successfully deleted ${cardsToDelete.length} cards`);
    return updatedCards;
  } catch (error) {
    console.error('Error deleting cards:', error);
    throw new Error(`Failed to delete cards: ${error.message}`);
  }
}
```

#### Card Data Normalization
```javascript
normalizeCardData(card) {
  if (!card) return null;
  
  return {
    // Required fields
    id: card.id || card.slabSerial || this.generateCardId(),
    slabSerial: card.slabSerial || card.id || '',
    
    // Card identification
    cardName: String(card.cardName || '').trim(),
    player: String(card.player || '').trim(),
    set: String(card.set || card.setName || '').trim(),
    setName: String(card.setName || card.set || '').trim(),
    year: card.year ? parseInt(card.year) : null,
    
    // Collection information
    collection: String(card.collection || card.collectionId || '').trim(),
    collectionId: String(card.collectionId || card.collection || '').trim(),
    
    // Card details
    category: String(card.category || '').trim(),
    condition: String(card.condition || '').trim(),
    variety: String(card.variety || '').trim(),
    certificationNumber: String(card.certificationNumber || '').trim(),
    
    // Financial data
    quantity: Math.max(1, parseInt(card.quantity) || 1),
    investmentAUD: Math.max(0, parseFloat(card.investmentAUD) || 0),
    currentValueAUD: Math.max(0, parseFloat(card.currentValueAUD) || 0),
    investmentUSD: Math.max(0, parseFloat(card.investmentUSD) || 0),
    currentValueUSD: Math.max(0, parseFloat(card.currentValueUSD) || 0),
    
    // Dates
    datePurchased: card.datePurchased || null,
    addedAt: card.addedAt || new Date().toISOString(),
    lastModified: new Date().toISOString(),
    
    // Image information
    hasImage: Boolean(card.hasImage),
    imageUrl: card.imageUrl || null,
    imageUpdatedAt: card.imageUpdatedAt || null,
    
    // PSA data
    psaData: card.psaData || null,
    psaSearched: Boolean(card.psaSearched),
    lastPSAUpdate: card.lastPSAUpdate || null
  };
}

generateCardId() {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 4. Image Management Operations

#### Image Upload
```javascript
async saveImage(cardId, imageFile) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!cardId) {
      throw new Error('Card ID is required for image upload');
    }
    
    if (!imageFile) {
      throw new Error('Image file is required');
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB.');
    }
    
    // Create storage reference
    const imageRef = ref(this.storage, `card-images/${user.uid}/${cardId}`);
    
    // Upload file with metadata
    const metadata = {
      contentType: imageFile.type,
      customMetadata: {
        cardId: cardId,
        userId: user.uid,
        uploadedAt: new Date().toISOString()
      }
    };
    
    console.log(`Uploading image for card ${cardId}...`);
    const uploadResult = await uploadBytes(imageRef, imageFile, metadata);
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log(`Image uploaded successfully for card ${cardId}`);
    return downloadURL;
    
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}
```

#### Image Retrieval
```javascript
async getCardImage(cardId) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!cardId) {
      return null;
    }
    
    const imageRef = ref(this.storage, `card-images/${user.uid}/${cardId}`);
    
    try {
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        return null; // Image doesn't exist
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting card image:', error);
    return null;
  }
}
```

#### Image Deletion
```javascript
async deleteImage(cardId) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!cardId) {
      return false;
    }
    
    const imageRef = ref(this.storage, `card-images/${user.uid}/${cardId}`);
    
    try {
      await deleteObject(imageRef);
      console.log(`Image deleted successfully for card ${cardId}`);
      return true;
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        console.log(`No image found for card ${cardId} to delete`);
        return true; // Consider it successful if image doesn't exist
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}
```

#### Bulk Image Operations
```javascript
async getCardImages(cardIds) {
  try {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return {};
    }
    
    const imagePromises = cardIds.map(async (cardId) => {
      try {
        const imageUrl = await this.getCardImage(cardId);
        return { cardId, imageUrl };
      } catch (error) {
        console.warn(`Failed to get image for card ${cardId}:`, error);
        return { cardId, imageUrl: null };
      }
    });
    
    const results = await Promise.all(imagePromises);
    
    // Convert to object format
    const imageMap = {};
    results.forEach(({ cardId, imageUrl }) => {
      if (imageUrl) {
        imageMap[cardId] = imageUrl;
      }
    });
    
    return imageMap;
  } catch (error) {
    console.error('Error getting card images:', error);
    return {};
  }
}
```

### 5. Sold Cards Management

#### Save Sold Cards
```javascript
async saveSoldCards(soldCards) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!Array.isArray(soldCards)) {
      throw new Error('Sold cards must be an array');
    }
    
    const soldCardsDoc = doc(this.firestore, this.soldCardsRef, user.uid);
    const soldCardsData = {
      soldCards: soldCards,
      lastModified: new Date().toISOString(),
      userId: user.uid,
      totalSoldCards: soldCards.length
    };
    
    await setDoc(soldCardsDoc, soldCardsData);
    console.log(`Successfully saved ${soldCards.length} sold cards`);
    
    return soldCards;
  } catch (error) {
    console.error('Error saving sold cards:', error);
    throw new Error(`Failed to save sold cards: ${error.message}`);
  }
}
```

#### Get Sold Cards
```javascript
async getSoldCards() {
  try {
    const user = await this.ensureAuthenticated();
    const soldCardsDoc = doc(this.firestore, this.soldCardsRef, user.uid);
    const docSnap = await getDoc(soldCardsDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.soldCards || [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching sold cards:', error);
    throw new Error(`Failed to fetch sold cards: ${error.message}`);
  }
}
```

### 6. User Preferences Management

#### Save User Preferences
```javascript
async saveUserPreferences(preferences) {
  try {
    const user = await this.ensureAuthenticated();
    
    const userPreferencesDoc = doc(this.firestore, this.userPreferencesRef, user.uid);
    const preferencesData = {
      ...preferences,
      lastModified: new Date().toISOString(),
      userId: user.uid
    };
    
    await setDoc(userPreferencesDoc, preferencesData, { merge: true });
    console.log('User preferences saved successfully');
    
    return preferencesData;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw new Error(`Failed to save user preferences: ${error.message}`);
  }
}
```

#### Get User Preferences
```javascript
async getUserPreferences() {
  try {
    const user = await this.ensureAuthenticated();
    const userPreferencesDoc = doc(this.firestore, this.userPreferencesRef, user.uid);
    const docSnap = await getDoc(userPreferencesDoc);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return default preferences
      const defaultPreferences = {
        preferredCurrency: 'AUD',
        defaultViewMode: 'grid',
        defaultSortField: 'currentValueAUD',
        defaultSortDirection: 'desc',
        autoBackup: true,
        showStatistics: true
      };
      
      await this.saveUserPreferences(defaultPreferences);
      return defaultPreferences;
    }
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return {};
  }
}
```

## Error Handling and Recovery

### Connection Management
```javascript
async testConnection() {
  try {
    const user = await this.ensureAuthenticated();
    
    // Test Firestore connection
    const testDoc = doc(this.firestore, 'connectionTest', user.uid);
    await setDoc(testDoc, { 
      timestamp: new Date().toISOString(),
      test: true 
    });
    await deleteDoc(testDoc);
    
    return { firestore: true, storage: true };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { firestore: false, storage: false, error: error.message };
  }
}
```

### Data Backup and Recovery
```javascript
async createBackup() {
  try {
    const user = await this.ensureAuthenticated();
    
    // Gather all user data
    const [cards, collections, soldCards, preferences] = await Promise.all([
      this.getCards(),
      this.getCollections(),
      this.getSoldCards(),
      this.getUserPreferences()
    ]);
    
    const backup = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      userId: user.uid,
      data: {
        cards,
        collections,
        soldCards,
        preferences
      }
    };
    
    // Save backup to Firestore
    const backupDoc = doc(this.firestore, 'backups', `${user.uid}_${Date.now()}`);
    await setDoc(backupDoc, backup);
    
    console.log('Backup created successfully');
    return backup;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error(`Failed to create backup: ${error.message}`);
  }
}

async restoreFromBackup(backupData) {
  try {
    const user = await this.ensureAuthenticated();
    
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup data');
    }
    
    const { cards, collections, soldCards, preferences } = backupData.data;
    
    // Restore data in parallel
    const restorePromises = [];
    
    if (cards) {
      restorePromises.push(this.saveCards(cards));
    }
    
    if (collections) {
      restorePromises.push(this.saveCollections(collections));
    }
    
    if (soldCards) {
      restorePromises.push(this.saveSoldCards(soldCards));
    }
    
    if (preferences) {
      restorePromises.push(this.saveUserPreferences(preferences));
    }
    
    await Promise.all(restorePromises);
    
    console.log('Data restored successfully from backup');
    return true;
  } catch (error) {
    console.error('Error restoring from backup:', error);
    throw new Error(`Failed to restore from backup: ${error.message}`);
  }
}
```

## Performance Optimizations

### Batched Operations
```javascript
async performBatchOperation(operations) {
  try {
    const user = await this.ensureAuthenticated();
    const batch = writeBatch(this.firestore);
    
    operations.forEach(({ operation, collection, docId, data }) => {
      const docRef = doc(this.firestore, collection, docId);
      
      switch (operation) {
        case 'set':
          batch.set(docRef, data);
          break;
        case 'update':
          batch.update(docRef, data);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    });
    
    await batch.commit();
    console.log(`Batch operation completed with ${operations.length} operations`);
    
  } catch (error) {
    console.error('Error in batch operation:', error);
    throw new Error(`Batch operation failed: ${error.message}`);
  }
}
```

### Caching Layer
```javascript
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }
  
  set(key, value) {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }
  
  get(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
  
  clear() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

// Usage in DatabaseAdapter
const cacheManager = new CacheManager();
```

## Security and Data Validation

### Input Sanitization
```javascript
sanitizeCardData(card) {
  const sanitized = {};
  
  // String fields
  const stringFields = ['cardName', 'player', 'set', 'category', 'condition'];
  stringFields.forEach(field => {
    if (card[field]) {
      sanitized[field] = String(card[field])
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML
        .substring(0, 200); // Limit length
    }
  });
  
  // Numeric fields
  const numericFields = ['investmentAUD', 'currentValueAUD', 'quantity'];
  numericFields.forEach(field => {
    if (card[field] !== undefined) {
      const num = parseFloat(card[field]);
      sanitized[field] = isNaN(num) ? 0 : Math.max(0, num);
    }
  });
  
  return sanitized;
}
```

### Access Control
```javascript
async verifyUserAccess(documentUserId) {
  const currentUser = await this.ensureAuthenticated();
  
  if (currentUser.uid !== documentUserId) {
    throw new Error('Access denied: User can only access their own data');
  }
  
  return true;
}
```

## Future Enhancement Opportunities

1. **Offline Support**: Implement offline-first with sync capabilities
2. **Real-time Updates**: Add Firestore real-time listeners for multi-device sync
3. **Data Compression**: Compress large card collections for storage efficiency
4. **Advanced Querying**: Implement complex queries with indexes
5. **Automated Backups**: Schedule regular backups with retention policies
6. **Data Migration**: Version-aware data migration system
7. **Performance Monitoring**: Add telemetry for database operations
8. **Conflict Resolution**: Handle concurrent edits across devices
