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



