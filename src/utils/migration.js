import JSZip from 'jszip';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../services/firebase';
import { db as firebaseDb } from '../services/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import CardRepository from '../repositories/CardRepository';
import { openDB } from 'idb';

// Function to get data from IndexedDB
async function getDataFromIndexedDB() {
  try {
    const db = await openDB('pokemon-card-tracker', 1, {
      upgrade(db) {
        // Define object stores if they don't exist
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections');
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile');
        }
      },
    });

    // Get collections
    const collections = await db.get('collections', 'collections') || {};
    
    // Get profile
    const profile = await db.get('profile', 'profile') || null;

    await db.close();
    
    return { collections, profile };
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return { collections: {}, profile: null };
  }
}

export async function migrateToFirebase(userId) {
  try {
    // Get data from IndexedDB
    const { collections, profile } = await getDataFromIndexedDB();
    const soldCards = JSON.parse(localStorage.getItem('soldCards') || '[]');

    // Initialize Firebase repository
    const repository = new CardRepository(userId);

    // Create collections in Firebase
    for (const [collectionName, cards] of Object.entries(collections)) {
      try {
        // Create collection
        const newCollection = await repository.createCollection(collectionName);

        // Process cards in batches
        const batchSize = 500;
        for (let i = 0; i < cards.length; i += batchSize) {
          const batch = cards.slice(i, i + batchSize);
          await repository.importCards(batch, newCollection.id);
        }
      } catch (error) {
        console.error(`Error migrating collection ${collectionName}:`, error);
      }
    }

    // Migrate sold cards
    if (soldCards.length > 0) {
      try {
        const batchSize = 500;
        for (let i = 0; i < soldCards.length; i += batchSize) {
          const batch = soldCards.slice(i, i + batchSize);
          await repository.importCards(batch, 'sold');
        }
      } catch (error) {
        console.error('Error migrating sold cards:', error);
      }
    }

    // Save profile data
    if (profile) {
      try {
        await repository.saveProfile(profile);
      } catch (error) {
        console.error('Error migrating profile:', error);
      }
    }

    // Clear localStorage
    localStorage.removeItem('soldCards');
    localStorage.removeItem('cardListSortField');
    localStorage.removeItem('cardListSortDirection');
    localStorage.removeItem('cardListDisplayMetric');
    localStorage.removeItem('theme');

    // Mark migration as complete
    localStorage.setItem('hasMigratedToFirebase', 'true');

    return {
      success: true,
      message: 'Migration completed successfully'
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`
    };
  }
}

export async function exportToZip(userId) {
  try {
    const repository = new CardRepository(userId);
    
    // Get all data
    const collections = await repository.getAllCollections();
    const profile = await repository.getProfile();
    const soldCards = await repository.getSoldCards(1000); // Get up to 1000 sold cards

    // Create ZIP file
    const zip = new JSZip();
    const dataFolder = zip.folder('data');
    const imagesFolder = zip.folder('images');

    // Add collections data
    dataFolder.file('collections.json', JSON.stringify(collections, null, 2));

    // Add profile data
    if (profile) {
      dataFolder.file('profile.json', JSON.stringify(profile, null, 2));
    }

    // Add sold cards data
    dataFolder.file('soldCards.json', JSON.stringify(soldCards, null, 2));

    // Add README
    const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/collections.json: All collections and card data
- /data/profile.json: User profile data
- /data/soldCards.json: Sold cards history
- /images/: All card images

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your data will be restored`;
    
    zip.file('README.txt', readme);

    // Generate ZIP file
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });

    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `pokemon-card-tracker-backup-${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }, 100);

    return {
      success: true,
      message: 'Backup created successfully'
    };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      message: `Export failed: ${error.message}`
    };
  }
}

export async function importFromZip(userId, zipFile) {
  try {
    const repository = new CardRepository(userId);
    
    // Initialize counters
    let totalImportedCards = 0;
    let totalErrorCards = 0;
    let collectionMapping = {};
    
    // Check file type to determine processing method
    const fileName = zipFile.name.toLowerCase();
    
    if (fileName.endsWith('.json')) {
      console.log('Processing JSON file import');
      const reader = new FileReader();
      
      // Use a promise to handle the file reader
      const fileContent = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read JSON file'));
        reader.readAsText(zipFile);
      });
      
      // Parse the JSON data
      const jsonData = JSON.parse(fileContent);
      
      // Get existing collections
      console.log('Getting existing collections before import...');
      const existingCollections = await repository.getAllCollections();
      const existingCollectionsByName = {};
      existingCollections.forEach(c => {
        if (c && c.name) {
          existingCollectionsByName[c.name.toLowerCase()] = c;
        }
      });
      
      // Check if the JSON is in the right format
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid JSON format: not an object');
      }
      
      // Get a collection to import into
      let targetCollectionId = null;
      
      // Use first real collection as target
      for (const collection of existingCollections) {
        if (collection.id !== 'all-cards') {
          targetCollectionId = collection.id;
          console.log(`Using existing collection for import: ${collection.name} (${targetCollectionId})`);
          break;
        }
      }
      
      // If no collection found, create one
      if (!targetCollectionId) {
        const newCollection = await repository.createCollection('Imported Cards');
        targetCollectionId = newCollection.id;
        console.log(`Created new collection for import: Imported Cards (${targetCollectionId})`);
      }
      
      // Process cards from JSON
      let cardsToImport = [];
      
      // If the JSON has cards directly
      if (Array.isArray(jsonData)) {
        cardsToImport = jsonData.map(card => ({
          ...card,
          collectionId: targetCollectionId
        }));
        console.log(`Found ${cardsToImport.length} cards in JSON array`);
      } 
      // If the JSON has a cards property
      else if (jsonData.cards && Array.isArray(jsonData.cards)) {
        cardsToImport = jsonData.cards.map(card => ({
          ...card,
          collectionId: targetCollectionId
        }));
        console.log(`Found ${cardsToImport.length} cards in JSON.cards array`);
      } 
      // If the JSON is a nested structure with collections
      else {
        // Look for structure with collections and cards
        const collections = [];
        let cardCount = 0;
        
        // Check if it's the export format
        if (jsonData.collections && typeof jsonData.collections === 'object') {
          // Old format - collections are an object with name keys
          for (const [collectionName, cards] of Object.entries(jsonData.collections)) {
            if (Array.isArray(cards)) {
              // Create a new collection
              try {
                // Create or use existing collection
                let collectionId;
                const existingCollection = existingCollectionsByName[collectionName.toLowerCase()];
                
                if (existingCollection) {
                  collectionId = existingCollection.id;
                  console.log(`Using existing collection "${collectionName}" (ID: ${collectionId})`);
                } else {
                  const newCollection = await repository.createCollection(collectionName);
                  collectionId = newCollection.id;
                  console.log(`Created new collection "${collectionName}" (ID: ${collectionId})`);
                }
                
                // Add cards with this collection ID
                const collectionCards = cards.map(card => ({
                  ...card,
                  collectionId
                }));
                
                cardsToImport.push(...collectionCards);
                cardCount += collectionCards.length;
                
                collections.push({
                  id: collectionId,
                  name: collectionName,
                  cardCount: collectionCards.length
                });
              } catch (error) {
                console.error(`Error processing collection ${collectionName}:`, error);
              }
            }
          }
          
          console.log(`Processed ${collections.length} collections with ${cardCount} total cards`);
        } else {
          // Just add all cards to the target collection
          for (const key in jsonData) {
            if (Array.isArray(jsonData[key])) {
              const cards = jsonData[key].map(card => ({
                ...card,
                collectionId: targetCollectionId
              }));
              cardsToImport.push(...cards);
              console.log(`Added ${cards.length} cards from ${key}`);
            }
          }
        }
      }
      
      if (cardsToImport.length === 0) {
        throw new Error('No cards found in the JSON file');
      }
      
      // Import the cards
      console.log(`Importing ${cardsToImport.length} cards to Firebase`);
      const result = await repository.importCardsForBackup(cardsToImport, targetCollectionId);
      
      console.log(`Imported ${result.count} cards with ${result.errorCount} errors`);
      totalImportedCards = result.count;
      totalErrorCards = result.errorCount;
      
      // Update collection card count
      await repository.updateCollectionCardCount(targetCollectionId);
      
      // Update local storage
      localStorage.setItem('selectedCollection', 'All Cards');
      
      return {
        success: true,
        message: `Successfully imported ${totalImportedCards} cards`
      };
    } 
    else if (fileName.endsWith('.zip')) {
      console.log('Processing ZIP file import');
      
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      
      // Get existing collections first to avoid duplicates
      console.log('Getting existing collections before import...');
      const existingCollections = await repository.getAllCollections();
      const existingCollectionsByName = {};
      existingCollections.forEach(c => {
        if (c && c.name) {
          existingCollectionsByName[c.name.toLowerCase()] = c;
        }
      });
      console.log(`Found ${Object.keys(existingCollectionsByName).length} existing collections`);
      
      // First pass - Process collections from backup
      console.log('Processing collections from backup...');
      const collectionsFile = zipContent.file('data/collections.json');
      let importedCollections = [];
      if (collectionsFile) {
        try {
          const collectionsContent = await collectionsFile.async('string');
          console.log('Loaded collections JSON content:', collectionsContent.slice(0, 100) + '...');
          
          const collectionsData = JSON.parse(collectionsContent);
          console.log('Parsed collections data type:', typeof collectionsData);
          
          // Handle different possible formats of the collections data
          let collectionsArray = [];
          
          if (Array.isArray(collectionsData)) {
            console.log(`Found ${collectionsData.length} collections in array format`);
            collectionsArray = collectionsData;
          } else if (collectionsData.collections && Array.isArray(collectionsData.collections)) {
            console.log(`Found ${collectionsData.collections.length} collections in nested array format`);
            collectionsArray = collectionsData.collections;
          } else if (typeof collectionsData === 'object') {
            // Object format with collection properties
            console.log(`Found collection data in object format`);
            // Try to extract collections
            if (collectionsData.collections && typeof collectionsData.collections === 'object') {
              // Convert object format into array format
              collectionsArray = Object.entries(collectionsData.collections).map(([name, cards]) => ({
                id: name,
                name: name,
                cards: Array.isArray(cards) ? cards : []
              }));
              console.log(`Converted object to ${collectionsArray.length} collections`);
            } else {
              // Direct object with collections
              collectionsArray = Object.keys(collectionsData).map(name => ({
                id: name,
                name: name,
                cards: Array.isArray(collectionsData[name]) ? collectionsData[name] : []
              }));
              console.log(`Extracted ${collectionsArray.length} collections from direct object`);
            }
          }
          
          if (collectionsArray.length === 0) {
            console.warn('Could not extract collections from backup data. Format not recognized.');
            console.log('Data structure:', JSON.stringify(collectionsData).slice(0, 200) + '...');
          }
          
          // Create or reuse collections
          for (const collection of collectionsArray) {
            try {
              if (!collection || !collection.name) {
                console.warn('Skipping invalid collection without a name');
                continue;
              }
              
              let collectionId;
              let collectionName = collection.name.trim();
              
              // Check if collection already exists by name
              const existingCollection = existingCollectionsByName[collectionName.toLowerCase()];
              if (existingCollection) {
                console.log(`Using existing collection "${collectionName}" (ID: ${existingCollection.id})`);
                collectionId = existingCollection.id;
              } else {
                // Create new collection
                try {
                  const newCollection = await repository.createCollection(collectionName);
                  collectionId = newCollection.id;
                  importedCollections.push(newCollection);
                  console.log(`Created new collection "${collectionName}" (ID: ${collectionId})`);
                  
                  // Add to existing collections map for future lookups
                  existingCollectionsByName[collectionName.toLowerCase()] = { 
                    id: collectionId, 
                    name: collectionName 
                  };
                } catch (createError) {
                  console.error(`Error creating collection "${collectionName}":`, createError);
                  continue;
                }
              }
              
              // Store mapping between original collection ID and new/existing one
              if (collection.id && collectionId) {
                collectionMapping[collection.id] = collectionId;
              }
            } catch (collectionError) {
              console.error(`Error processing collection ${collection.name || 'unnamed'}:`, collectionError);
            }
          }
          
          console.log(`Processed ${Object.keys(collectionMapping).length} collections with mapping`);
          console.log(`Created ${importedCollections.length} new collections`);
          
          // Now import cards with updated collection IDs
          for (const collection of collectionsArray) {
            if (!collection || !collection.id || !collection.cards || !Array.isArray(collection.cards) || collection.cards.length === 0) {
              console.log(`Skipping collection without valid cards array: ${collection?.name || 'unnamed'}`);
              continue;
            }
            
            try {
              // Get the mapped collection ID
              const targetCollectionId = collectionMapping[collection.id];
              if (!targetCollectionId) {
                console.error(`No target collection ID found for original ID ${collection.id}`);
                continue;
              }
              
              // Extract cards from collection - handle different formats
              let cardsToImport = [];
              
              if (collection.cards && Array.isArray(collection.cards)) {
                // Collection has a cards array property
                cardsToImport = collection.cards;
              } else if (Array.isArray(collection)) {
                // Collection itself is an array of cards
                cardsToImport = collection;
              } else if (typeof collection === 'object') {
                // Try to extract cards from collection object
                const possibleCardArrays = Object.values(collection).filter(val => Array.isArray(val));
                if (possibleCardArrays.length > 0) {
                  // Use the first array found
                  cardsToImport = possibleCardArrays[0];
                }
              }
              
              if (cardsToImport.length === 0) {
                console.log(`No cards found for collection "${collection.name}" (ID: ${collection.id})`);
                continue;
              }
              
              // Update collection IDs in cards to match new ones
              const updatedCards = cardsToImport.map(card => ({
                ...card,
                collectionId: targetCollectionId
              }));
              
              console.log(`Importing ${updatedCards.length} cards for collection "${collection.name}" (Target ID: ${targetCollectionId})`);
              
              // Import cards with appropriate collection ID
              const result = await repository.importCardsForBackup(updatedCards, targetCollectionId);
              
              console.log(`Imported ${result.count} cards (${result.errorCount} errors) for collection "${collection.name}"`);
              totalImportedCards += result.count;
              totalErrorCards += result.errorCount;
              
              // Verify the import
              const finalCount = await repository.getCardCount(targetCollectionId);
              console.log(`Collection "${collection.name}" (ID: ${targetCollectionId}) now has ${finalCount} cards total`);
              
              // Update collection card count to ensure accuracy
              await repository.updateCollectionCardCount(targetCollectionId);
            } catch (cardsError) {
              console.error(`Error importing cards for collection ${collection.name || 'unnamed'}:`, cardsError);
            }
          }
          
          console.log(`Total imported cards: ${totalImportedCards}, Total errors: ${totalErrorCards}`);
        } catch (parseError) {
          console.error('Error parsing collections JSON:', parseError);
          throw new Error(`Failed to parse collections data: ${parseError.message}`);
        }
      } else {
        console.warn('No collections.json file found in backup');
      }

      // Process profile
      const profileFile = zipContent.file('data/profile.json');
      if (profileFile) {
        try {
          const profileData = JSON.parse(await profileFile.async('string'));
          await repository.updateUserProfile(profileData);
          console.log('Imported user profile data');
        } catch (profileError) {
          console.error('Error importing profile data:', profileError);
        }
      }

      // Process sold cards
      const soldCardsFile = zipContent.file('data/soldCards.json');
      if (soldCardsFile) {
        try {
          const soldCardsData = JSON.parse(await soldCardsFile.async('string'));
          let soldCardsToImport = [];
          
          if (Array.isArray(soldCardsData)) {
            // Direct array of sold cards
            soldCardsToImport = soldCardsData;
          } else if (soldCardsData.soldCards && Array.isArray(soldCardsData.soldCards)) {
            // Nested under soldCards property
            soldCardsToImport = soldCardsData.soldCards;
          } else {
            console.warn('Invalid sold cards data format in backup');
          }

          if (soldCardsToImport.length > 0) {
            // Save to IndexedDB
            await db.saveSoldCards(soldCardsToImport);
            console.log(`Imported ${soldCardsToImport.length} sold cards to IndexedDB`);
          }
        } catch (soldCardsError) {
          console.error('Error importing sold cards:', soldCardsError);
        }
      }

      // Try legacy format where sold cards might be in collections.json
      try {
        const collectionsFile = zipContent.file('data/collections.json');
        if (collectionsFile) {
          const collectionsData = JSON.parse(await collectionsFile.async('string'));
          if (collectionsData.soldCards && Array.isArray(collectionsData.soldCards)) {
            // Save to IndexedDB
            await db.saveSoldCards(collectionsData.soldCards);
            console.log(`Imported ${collectionsData.soldCards.length} sold cards from collections data to IndexedDB`);
          }
        }
      } catch (legacyError) {
        console.error('Error checking legacy sold cards format:', legacyError);
      }

      // Process images
      console.log('Processing images from backup...');
      const imagePromises = [];
      let imageCount = 0;
      let imageErrorCount = 0;
      
      zipContent.folder('images')?.forEach((relativePath, file) => {
        if (!file.dir) {
          const promise = (async () => {
            try {
              const content = await file.async('blob');
              const fileName = relativePath.split('/').pop();
              const cardId = fileName.split('.')[0];
              
              if (cardId) {
                const storageRef = ref(storage, `users/${userId}/cards/${cardId}.jpg`);
                await uploadBytes(storageRef, content);
                imageCount++;
              }
            } catch (imageError) {
              console.error(`Error uploading image ${relativePath}:`, imageError);
              imageErrorCount++;
            }
          })();
          imagePromises.push(promise);
        }
      });

      await Promise.all(imagePromises);
      console.log(`Imported ${imageCount} images (${imageErrorCount} errors) from backup`);
    }
    else {
      throw new Error(`Unsupported file type: ${fileName}. Please use .zip or .json files.`);
    }

    // After import, force a full page reload to refresh all data
    localStorage.setItem('selectedCollection', 'All Cards');
    
    return {
      success: true,
      message: `Backup imported successfully: processed ${Object.keys(collectionMapping).length} collections with ${totalImportedCards} cards`
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`
    };
  }
} 