import JSZip from 'jszip';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../services/firebase';
import { db as firebaseDb } from '../services/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import CardRepository from '../repositories/CardRepository';
import { openDB } from 'idb';

// Function to get data from IndexedDB
async function getDataFromIndexedDB() {
  let db = null;
  try {
    db = await openDB('pokemon-card-tracker', 1, {
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
    
    return { collections, profile };
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return { collections: {}, profile: null };
  } finally {
    // Close the database connection in finally block if it was opened
    if (db) {
      try {
        await db.close();
      } catch (closeError) {
        console.error('Error closing database:', closeError);
      }
    }
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
  let db = null;
  try {
    const repository = new CardRepository(userId);
    let totalImportedCards = 0;
    let totalErrorCards = 0;
    const collectionMapping = {};

    // Add delay function to help with transaction timing
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function to retry operations
    const retryOperation = async (operation, maxRetries = 3, delayMs = 300) => {
      let lastError;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          console.log(`Attempt ${attempt + 1} failed:`, error);
          lastError = error;
          if (error.message && error.message.includes('database connection is closing')) {
            // Wait longer if we have a database connection issue
            await delay(delayMs * 2);
          } else {
            await delay(delayMs);
          }
        }
      }
      throw lastError;
    };

    if (zipFile.name.endsWith('.zip')) {
      // Process ZIP file
      const zip = await JSZip.loadAsync(zipFile);
      
      // Check for legacy data.json file first
      const dataFile = zip.file('data.json');
      if (dataFile) {
        const dataJson = await dataFile.async('string');
        const jsonData = JSON.parse(dataJson);
        
        // Import profile if it exists
        if (jsonData.profile) {
          try {
            await retryOperation(() => repository.saveProfile(jsonData.profile));
          } catch (error) {
            console.error('Error importing profile:', error);
          }
        }
        
        // Look for sold cards directly
        if (jsonData.soldCards && Array.isArray(jsonData.soldCards)) {
          try {
            await retryOperation(() => repository.importSoldCards(jsonData.soldCards));
          } catch (error) {
            console.error('Error importing sold cards:', error);
          }
        } else {
          // Check if sold cards might be in collections object
          try {
            // Process any cards that might be in a 'sold' collection
            const soldCollections = Object.entries(jsonData.collections || {})
              .filter(([name]) => name.toLowerCase() === 'sold');
            
            if (soldCollections.length > 0) {
              console.log("Found sold collection in legacy format");
              const processedSoldItems = soldCollections
                .flatMap(([_, cards]) => cards)
                .map(card => ({
                  ...card,
                  saleDate: card.saleDate || new Date().toISOString()
                }));
              
              // Get existing sold cards to check duplicates
              const existingSoldCards = await retryOperation(() => repository.getSoldCards());
              const existingIds = new Set(
                existingSoldCards.map(card => card.slabSerial || card.id)
              );
              
              // Filter out duplicates
              const newSoldItems = processedSoldItems.filter(
                item => !existingIds.has(item.slabSerial || item.id)
              );
              
              console.log(`Adding ${newSoldItems.length} new sold items (filtered out ${processedSoldItems.length - newSoldItems.length} duplicates)`);
              
              // Merge with existing sold cards
              const mergedSoldCards = [...existingSoldCards, ...newSoldItems];
              
              // Save to database with retry
              await retryOperation(() => repository.saveSoldCards(mergedSoldCards));
              console.log(`Successfully saved ${mergedSoldCards.length} sold items to IndexedDB`);
            }
          } catch (error) {
            console.error('Error checking for sold items in collections:', error);
          }
        }
        
        // Process all card files
        const cardFiles = zip.folder('data/cards');
        if (!cardFiles) {
          throw new Error('Invalid backup file: missing cards data');
        }
        
        // Process cards in smaller batches to avoid transaction timeouts
        const batchSize = 20; // Smaller batch size for mobile
        const batches = [];
        
        for (let i = 0; i < cardFiles.length; i += batchSize) {
          batches.push(cardFiles.slice(i, i + batchSize));
        }
        
        for (const batch of batches) {
          const cardsToImport = [];
          
          for (const file of batch) {
            try {
              const cardData = JSON.parse(await file.async('string'));
              const newCardData = {
                ...cardData,
                collectionId: collectionMapping[cardData.collectionId] || null
              };
              
              if (newCardData.collectionId) {
                cardsToImport.push(newCardData);
              } else {
                totalErrorCards++;
              }
            } catch (error) {
              console.error(`Error preparing card for import:`, error);
              totalErrorCards++;
            }
          }
          
          if (cardsToImport.length > 0) {
            try {
              // Add a small delay between batches to prevent overwhelming the database
              await delay(100);
              await retryOperation(() => repository.importCards(cardsToImport));
              totalImportedCards += cardsToImport.length;
            } catch (error) {
              console.error(`Error importing batch of cards:`, error);
              totalErrorCards += cardsToImport.length;
            }
          }
        }
        
        return {
          success: true,
          message: `Import complete. ${totalImportedCards} cards imported successfully, ${totalErrorCards} failed.`
        };
      } else {
        // Process collections and cards from ZIP
        // Check the structure of collections - could be an array or in jsonData.collections
        const collections = zip.folder('data/collections');
        if (!collections) {
          throw new Error('Invalid backup file: missing collections data');
        }
        
        // Process collections
        const collectionFiles = collections.filter(relativePath => relativePath.endsWith('.json'));
        
        for (const file of collectionFiles) {
          try {
            const collectionData = JSON.parse(await file.async('string'));
            const newCollection = await retryOperation(() => repository.createCollection(collectionData.name));
            collectionMapping[collectionData.id] = newCollection.id;
          } catch (error) {
            console.error(`Error importing collection ${file.name}:`, error);
          }
        }
        
        // Process all card files
        const cardFiles = zip.folder('data/cards');
        if (!cardFiles) {
          throw new Error('Invalid backup file: missing cards data');
        }
        
        // Process cards in smaller batches to avoid transaction timeouts
        const batchSize = 20; // Smaller batch size for mobile
        const batches = [];
        
        for (let i = 0; i < cardFiles.length; i += batchSize) {
          batches.push(cardFiles.slice(i, i + batchSize));
        }
        
        for (const batch of batches) {
          const cardsToImport = [];
          
          for (const file of batch) {
            try {
              const cardData = JSON.parse(await file.async('string'));
              const newCardData = {
                ...cardData,
                collectionId: collectionMapping[cardData.collectionId] || null
              };
              
              if (newCardData.collectionId) {
                cardsToImport.push(newCardData);
              } else {
                totalErrorCards++;
              }
            } catch (error) {
              console.error(`Error preparing card for import:`, error);
              totalErrorCards++;
            }
          }
          
          if (cardsToImport.length > 0) {
            try {
              // Add a small delay between batches to prevent overwhelming the database
              await delay(100);
              await retryOperation(() => repository.importCards(cardsToImport));
              totalImportedCards += cardsToImport.length;
            } catch (error) {
              console.error(`Error importing batch of cards:`, error);
              totalErrorCards += cardsToImport.length;
            }
          }
        }
        
        // Import sold cards if they exist
        const soldCardsFile = zip.file('data/soldCards.json');
        if (soldCardsFile) {
          try {
            const soldCardsJson = await soldCardsFile.async('string');
            const soldCards = JSON.parse(soldCardsJson);
            if (Array.isArray(soldCards)) {
              console.log(`Found ${soldCards.length} sold cards to import`);
              const { success, count, errorCount } = await repository.importSoldCards(soldCards);
              console.log(`Imported ${count} sold cards (${errorCount} errors)`);
            }
          } catch (error) {
            console.error('Error importing sold cards:', error);
          }
        }
        
        return {
          success: true,
          message: `Import complete. ${totalImportedCards} cards imported successfully, ${totalErrorCards} failed.`
        };
      }
    } else {
      throw new Error('Unsupported file format. Please use .zip or .json files.');
    }
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`
    };
  }
}