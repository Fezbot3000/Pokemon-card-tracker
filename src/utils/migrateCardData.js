/**
 * Card Data Structure Migration Script
 * 
 * This script standardizes card data structure across all records in Firestore,
 * addressing legacy data issues and ensuring consistent field naming.
 * 
 * It performs the following operations:
 * 1. Simplifies verbose card names
 * 2. Removes redundant PSA metadata fields
 * 3. Standardizes image paths
 * 4. Removes unused fields
 * 5. Ensures consistency in required fields
 */

import { db as firestoreDb } from '../services/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import { auth } from '../services/firebase';
import logger from './logger';

// Configuration
const BATCH_SIZE = 250; // Process this many documents at a time
let DRY_RUN = true;   // Set to false to actually update the database

// Legacy fields to remove
const LEGACY_FIELDS_TO_REMOVE = [
  '_rawPsaData',
  '_forceImageRefresh',
  'Brand',
  'CardGrade',
  'GradeDescription',
  'IsDualCert',
  'ReverseBarCode',
  'SpecID',
  'SpecNumber',
  'Variety',
  'PopulationHigher',
  'TotalPopulationWithQualifier',
  'psaData',
  'variation',
  'varietyType',
  'certificationDate',
  'isPSAAuthenticated'
];

// Required fields that should always be present
const REQUIRED_FIELDS = [
  'card',
  'player',
  'name',
  'setName',
  'collection',
  'year',
  'grade',
  'gradingCompany',
  'quantity',
  'userId'
];

/**
 * Main migration function
 */
export async function migrateCardData() {
  // Ensure user is authenticated
  const currentUser = auth.currentUser;
  if (!currentUser) {
    logger.error('No authenticated user found. Please log in first.');
    return {
      success: false,
      message: 'Authentication required',
      stats: null
    };
  }

  const userId = currentUser.uid;
  logger.info(`Starting card data migration for user: ${userId}`);
  
  // Statistics to track progress
  const stats = {
    docsScanned: 0,
    docsUpdated: 0,
    docsSkipped: 0,
    fieldsRemoved: 0,
    errors: []
  };

  try {
    // Get all cards for the current user
    const cardsRef = collection(firestoreDb, 'users', userId, 'cards');
    const cardsSnapshot = await getDocs(cardsRef);
    
    const totalDocs = cardsSnapshot.size;
    logger.info(`Found ${totalDocs} card documents to process`);
    
    // Process in batches
    const allDocs = cardsSnapshot.docs;
    const batches = [];
    
    for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
      batches.push(allDocs.slice(i, i + BATCH_SIZE));
    }
    
    logger.info(`Processing in ${batches.length} batches of up to ${BATCH_SIZE} documents each`);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing batch ${batchIndex + 1} of ${batches.length}`);
      
      const writeBatchObj = writeBatch(firestoreDb);
      let batchUpdates = 0;
      
      for (const document of batch) {
        stats.docsScanned++;
        const cardId = document.id;
        const cardData = document.data();
        
        // Skip if no data
        if (!cardData) {
          logger.warn(`Skipping document ${cardId}: No data found`);
          stats.docsSkipped++;
          continue;
        }
        
        // Create a copy of the data to modify
        const updatedData = { ...cardData };
        let needsUpdate = false;
        let fieldsRemovedCount = 0;
        
        // 1. Simplify card field if it contains more than 3 words
        if (updatedData.card && typeof updatedData.card === 'string') {
          const words = updatedData.card.split(' ').filter(word => word.trim().length > 0);
          
          if (words.length > 3) {
            // Store the verbose value in fullTitle if different
            updatedData.fullTitle = updatedData.card;
            
            // Use cardName, player, or Subject as the simplified card name
            const simplifiedName = 
              updatedData.cardName || 
              updatedData.player || 
              (updatedData._rawPsaData && updatedData._rawPsaData.Subject) || 
              words[words.length - 1]; // Last word as fallback
            
            updatedData.card = simplifiedName;
            needsUpdate = true;
            logger.debug(`Simplified card name for ${cardId}: "${cardData.card}" -> "${simplifiedName}"`);
          }
        }
        
        // 2. Remove legacy fields
        for (const fieldToRemove of LEGACY_FIELDS_TO_REMOVE) {
          if (fieldToRemove in updatedData) {
            delete updatedData[fieldToRemove];
            fieldsRemovedCount++;
            needsUpdate = true;
          }
        }
        
        // 3. Standardize image paths
        if (updatedData.imageUrl && typeof updatedData.imageUrl === 'string' && 
            updatedData.imageUrl.includes('googleapis.com/storage/')) {
          const imagePath = `images/${cardId}.jpeg`;
          updatedData.imagePath = imagePath;
          needsUpdate = true;
          logger.debug(`Standardized image path for ${cardId}`);
        }
        
        // 4. Ensure consistency in required fields
        for (const requiredField of REQUIRED_FIELDS) {
          if (!updatedData[requiredField]) {
            // Try to derive the field from other data
            switch (requiredField) {
              case 'card':
                if (updatedData.cardName) {
                  updatedData.card = updatedData.cardName;
                  needsUpdate = true;
                } else if (updatedData.player) {
                  updatedData.card = updatedData.player;
                  needsUpdate = true;
                }
                break;
              
              case 'player':
                if (updatedData.card) {
                  updatedData.player = updatedData.card;
                  needsUpdate = true;
                } else if (updatedData.cardName) {
                  updatedData.player = updatedData.cardName;
                  needsUpdate = true;
                }
                break;
              
              case 'name':
                if (updatedData.fullTitle) {
                  updatedData.name = updatedData.fullTitle;
                  needsUpdate = true;
                } else if (updatedData.card) {
                  updatedData.name = updatedData.card;
                  needsUpdate = true;
                }
                break;
              
              case 'quantity':
                updatedData.quantity = 1;
                needsUpdate = true;
                break;
              
              case 'userId':
                updatedData.userId = userId;
                needsUpdate = true;
                break;
            }
            
            // If we still couldn't derive the field, log it
            if (!updatedData[requiredField]) {
              logger.warn(`Missing required field ${requiredField} for card ${cardId} and couldn't derive it`);
            }
          }
        }
        
        // Update the document if needed
        if (needsUpdate) {
          if (!DRY_RUN) {
            const docRef = doc(firestoreDb, 'users', userId, 'cards', cardId);
            writeBatchObj.update(docRef, updatedData);
            batchUpdates++;
          }
          
          stats.docsUpdated++;
          stats.fieldsRemoved += fieldsRemovedCount;
          
          logger.debug(`Updated document ${cardId} (removed ${fieldsRemovedCount} fields)`);
        } else {
          stats.docsSkipped++;
        }
      }
      
      // Commit the batch if not a dry run
      if (!DRY_RUN && batchUpdates > 0) {
        await writeBatchObj.commit();
        logger.info(`Committed batch ${batchIndex + 1} with ${batchUpdates} updates`);
      } else if (DRY_RUN) {
        logger.info(`DRY RUN: Would have updated ${batchUpdates} documents in batch ${batchIndex + 1}`);
      }
    }
    
    // Process sold items as well
    await migrateSoldItems(userId, stats);
    
    // Log summary
    const summary = `
      Migration ${DRY_RUN ? 'DRY RUN' : 'COMPLETE'}:
      - Documents scanned: ${stats.docsScanned}
      - Documents updated: ${stats.docsUpdated}
      - Documents skipped: ${stats.docsSkipped}
      - Fields removed: ${stats.fieldsRemoved}
      - Errors: ${stats.errors.length}
    `;
    
    logger.info(summary);
    
    return {
      success: true,
      message: DRY_RUN ? 'Dry run completed successfully' : 'Migration completed successfully',
      stats
    };
  } catch (error) {
    logger.error('Error during card data migration:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      stats
    };
  }
}

/**
 * Migrate sold items data structure
 */
async function migrateSoldItems(userId, stats) {
  logger.info(`Starting sold items data migration for user: ${userId}`);
  
  try {
    // Get all sold items for the current user
    const soldItemsRef = collection(firestoreDb, 'users', userId, 'sold-items');
    const soldItemsSnapshot = await getDocs(soldItemsRef);
    
    const totalDocs = soldItemsSnapshot.size;
    logger.info(`Found ${totalDocs} sold item documents to process`);
    
    // Process in batches
    const allDocs = soldItemsSnapshot.docs;
    const batches = [];
    
    for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
      batches.push(allDocs.slice(i, i + BATCH_SIZE));
    }
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing sold items batch ${batchIndex + 1} of ${batches.length}`);
      
      const writeBatchObj = writeBatch(firestoreDb);
      let batchUpdates = 0;
      
      for (const document of batch) {
        stats.docsScanned++;
        const cardId = document.id;
        const cardData = document.data();
        
        // Skip if no data
        if (!cardData) {
          logger.warn(`Skipping sold item ${cardId}: No data found`);
          stats.docsSkipped++;
          continue;
        }
        
        // Create a copy of the data to modify
        const updatedData = { ...cardData };
        let needsUpdate = false;
        let fieldsRemovedCount = 0;
        
        // Apply the same transformations as for regular cards
        // 1. Simplify card field if it contains more than 3 words
        if (updatedData.card && typeof updatedData.card === 'string') {
          const words = updatedData.card.split(' ').filter(word => word.trim().length > 0);
          
          if (words.length > 3) {
            // Store the verbose value in fullTitle if different
            updatedData.fullTitle = updatedData.card;
            
            // Use cardName, player, or Subject as the simplified card name
            const simplifiedName = 
              updatedData.cardName || 
              updatedData.player || 
              (updatedData._rawPsaData && updatedData._rawPsaData.Subject) || 
              words[words.length - 1]; // Last word as fallback
            
            updatedData.card = simplifiedName;
            needsUpdate = true;
          }
        }
        
        // 2. Remove legacy fields
        for (const fieldToRemove of LEGACY_FIELDS_TO_REMOVE) {
          if (fieldToRemove in updatedData) {
            delete updatedData[fieldToRemove];
            fieldsRemovedCount++;
            needsUpdate = true;
          }
        }
        
        // 3. Standardize image paths
        if (updatedData.imageUrl && typeof updatedData.imageUrl === 'string' && 
            updatedData.imageUrl.includes('googleapis.com/storage/')) {
          const imagePath = `images/${cardId}.jpeg`;
          updatedData.imagePath = imagePath;
          needsUpdate = true;
        }
        
        // Update the document if needed
        if (needsUpdate) {
          if (!DRY_RUN) {
            const docRef = doc(firestoreDb, 'users', userId, 'sold-items', cardId);
            writeBatchObj.update(docRef, updatedData);
            batchUpdates++;
          }
          
          stats.docsUpdated++;
          stats.fieldsRemoved += fieldsRemovedCount;
        } else {
          stats.docsSkipped++;
        }
      }
      
      // Commit the batch if not a dry run
      if (!DRY_RUN && batchUpdates > 0) {
        await writeBatchObj.commit();
        logger.info(`Committed sold items batch ${batchIndex + 1} with ${batchUpdates} updates`);
      } else if (DRY_RUN) {
        logger.info(`DRY RUN: Would have updated ${batchUpdates} sold items in batch ${batchIndex + 1}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error during sold items migration:', error);
    stats.errors.push(`Sold items migration: ${error.message}`);
    return false;
  }
}

// Export a function to run the migration from a UI component
export function runCardDataMigration(isDryRun = true) {
  // Set the dry run flag
  DRY_RUN = isDryRun;
  
  return migrateCardData();
}

export default {
  migrateCardData,
  runCardDataMigration
};
