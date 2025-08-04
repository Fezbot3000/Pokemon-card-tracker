/**
 * PSA Database Manager Service
 * 
 * Provides functions to manage and analyze PSA card data across
 * both collections (psa-cards and psa_cards). Handles data retrieval,
 * conflict detection, and collection management operations.
 * 
 * Note: Due to Firestore security rules, only psa-cards (hyphen) collection
 * is directly accessible. psa_cards (underscore) requires admin access or
 * cloud functions.
 */

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import logger from '../utils/logger';

// Get Firestore instance
const db = getFirestore();

// Collection names
const PSA_CARDS_HYPHEN = 'psa-cards';
const PSA_CARDS_UNDERSCORE = 'psa_cards';

/**
 * Get all PSA records from a specific collection
 * @param {string} collectionName - Name of the PSA collection
 * @param {number} limitCount - Optional limit for number of records
 * @returns {Promise<Array>} - Array of PSA records
 */
export const getAllPSARecords = async (collectionName, limitCount = null) => {
  try {
    logger.debug(`Fetching PSA records from collection: ${collectionName}`);
    
    const collectionRef = collection(db, collectionName);
    let snapshot;
    
    // For psa_cards collection, skip orderBy and use simple query directly
    if (collectionName === 'psa_cards') {
      if (limitCount) {
        const q = query(collectionRef, limit(limitCount));
        snapshot = await getDocs(q);
      } else {
        snapshot = await getDocs(collectionRef);
      }
    } else {
      // For other collections, try orderBy first, fallback to simple query
      try {
        let q = query(collectionRef, orderBy('lastUpdated', 'desc'));
        if (limitCount) {
          q = query(collectionRef, orderBy('lastUpdated', 'desc'), limit(limitCount));
        }
        snapshot = await getDocs(q);
      } catch (orderError) {
        logger.warn(`OrderBy failed for ${collectionName}, falling back to simple query:`, orderError);
        if (limitCount) {
          const q = query(collectionRef, limit(limitCount));
          snapshot = await getDocs(q);
        } else {
          snapshot = await getDocs(collectionRef);
        }
      }
    }
    const records = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to JavaScript Date or ISO string
      let lastUpdatedValue = null;
      if (data.lastUpdated) {
        // Check if it's a Firestore Timestamp object
        if (data.lastUpdated && typeof data.lastUpdated === 'object' && data.lastUpdated.seconds) {
          lastUpdatedValue = new Date(data.lastUpdated.seconds * 1000).toISOString();
        } else {
          lastUpdatedValue = data.lastUpdated;
        }
      } else if (data.timestamp) {
        // Check if it's a Firestore Timestamp object
        if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp.seconds) {
          lastUpdatedValue = new Date(data.timestamp.seconds * 1000).toISOString();
        } else {
          lastUpdatedValue = data.timestamp;
        }
      }
      
      records.push({
        id: doc.id,
        certNumber: doc.id,
        collection: collectionName,
        ...data,
        // Extract key PSA data for display
        cardName: data.cardData?.PSACert?.Subject || 'Unknown',
        brand: data.cardData?.PSACert?.Brand || 'Unknown',
        grade: data.cardData?.PSACert?.CardGrade || 'Unknown',
        totalPopulation: data.cardData?.PSACert?.TotalPopulation || 0,
        lastUpdated: lastUpdatedValue,
        accessCount: data.accessCount || 0,
      });
    });
    
    // Sort by lastUpdated (most recent first) for psa_cards collection
    if (collectionName === 'psa_cards') {
      records.sort((a, b) => {
        const aDate = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
        const bDate = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
        return bDate - aDate; // Descending order (newest first)
      });
    }
    
    logger.debug(`Retrieved ${records.length} PSA records from ${collectionName}`);
    return records;
  } catch (error) {
    logger.error(`Error fetching PSA records from ${collectionName}:`, error);
    console.error(`🔍 Debug: Error fetching from ${collectionName}:`, error);
    
    // If this is a permission error, return empty array instead of throwing
    if (error.code === 'permission-denied') {
      logger.warn(`Permission denied for collection ${collectionName}, returning empty result`);
      console.warn(`🔍 Debug: Permission denied for ${collectionName}, returning empty array`);
      return [];
    }
    
    throw error;
  }
};

/**
 * Get PSA database statistics
 * @returns {Promise<Object>} - Statistics object
 */
export const getPSADatabaseStatistics = async () => {
  try {
    logger.debug('Calculating PSA database statistics...');
    console.log('🔍 Debug: Getting statistics for both collections...');
    
    // Get counts from both collections
    const [psaCardsSnapshot, psa_cardsSnapshot] = await Promise.all([
      getDocs(collection(db, PSA_CARDS_HYPHEN)),
      getDocs(collection(db, PSA_CARDS_UNDERSCORE))
    ]);
    
    const psaCardsCount = psaCardsSnapshot.size;
    const psa_cardsCount = psa_cardsSnapshot.size;
    
    console.log(`🔍 Debug: Statistics found ${psaCardsCount} records in ${PSA_CARDS_HYPHEN}`);
    console.log(`🔍 Debug: Statistics found ${psa_cardsCount} records in ${PSA_CARDS_UNDERSCORE}`);
    
    // Debug: Log first few document IDs from psa_cards
    const psa_cardsDocIds = [];
    psa_cardsSnapshot.forEach(doc => psa_cardsDocIds.push(doc.id));
    console.log(`🔍 Debug: psa_cards document IDs:`, psa_cardsDocIds.slice(0, 10));
    
    // Get all cert numbers to find duplicates
    const psaCardsIds = new Set();
    const psa_cardsIds = new Set();
    
    psaCardsSnapshot.forEach(doc => psaCardsIds.add(doc.id));
    psa_cardsSnapshot.forEach(doc => psa_cardsIds.add(doc.id));
    
    // Find duplicates (cert numbers that exist in both collections)
    const duplicates = [...psaCardsIds].filter(id => psa_cardsIds.has(id));
    const duplicatesCount = duplicates.length;
    
    // Calculate unique records
    const uniqueRecords = new Set([...psaCardsIds, ...psa_cardsIds]);
    const totalUniqueRecords = uniqueRecords.size;
    
    const stats = {
      psaCardsCount,
      psa_cardsCount,
      duplicatesCount,
      totalRecords: psaCardsCount + psa_cardsCount,
      totalUniqueRecords,
      duplicateCertNumbers: duplicates,
      lastChecked: new Date().toISOString(),
      permissionIssue: false, // Both collections should now be accessible
      accessibleCollections: [PSA_CARDS_HYPHEN, PSA_CARDS_UNDERSCORE],
      inaccessibleCollections: [],
    };
    
    logger.debug('PSA database statistics calculated:', stats);
    return stats;
  } catch (error) {
    logger.error('Error calculating PSA database statistics:', error);
    throw error;
  }
};

/**
 * Find duplicate PSA records across both collections
 * @returns {Promise<Array>} - Array of duplicate record pairs
 */
export const findDuplicatePSARecords = async () => {
  try {
    logger.debug('Finding duplicate PSA records...');
    
    const [psaCardsRecords, psa_cardsRecords] = await Promise.all([
      getAllPSARecords(PSA_CARDS_HYPHEN),
      getAllPSARecords(PSA_CARDS_UNDERSCORE)
    ]);
    
    const duplicates = [];
    
    // Create a map of psa_cards records for quick lookup
    const psa_cardsMap = new Map();
    psa_cardsRecords.forEach(record => {
      psa_cardsMap.set(record.certNumber, record);
    });
    
    // Find duplicates
    psaCardsRecords.forEach(psaCardsRecord => {
      const psa_cardsRecord = psa_cardsMap.get(psaCardsRecord.certNumber);
      if (psa_cardsRecord) {
        duplicates.push({
          certNumber: psaCardsRecord.certNumber,
          psaCardsRecord,
          psa_cardsRecord,
          conflicts: compareRecords(psaCardsRecord, psa_cardsRecord)
        });
      }
    });
    
    logger.debug(`Found ${duplicates.length} duplicate PSA records`);
    return duplicates;
  } catch (error) {
    logger.error('Error finding duplicate PSA records:', error);
    throw error;
  }
};

/**
 * Compare two PSA records and identify differences
 * @param {Object} record1 - First PSA record
 * @param {Object} record2 - Second PSA record
 * @returns {Array} - Array of differences
 */
const compareRecords = (record1, record2) => {
  const conflicts = [];
  
  // Compare key fields
  const fieldsToCompare = [
    'cardName',
    'brand', 
    'grade',
    'totalPopulation',
    'lastUpdated',
    'accessCount'
  ];
  
  fieldsToCompare.forEach(field => {
    const value1 = record1[field];
    const value2 = record2[field];
    
    if (value1 !== value2) {
      conflicts.push({
        field,
        psaCardsValue: value1,
        psa_cardsValue: value2
      });
    }
  });
  
  return conflicts;
};

/**
 * Get recent PSA activity across both collections
 * @param {number} limitCount - Number of recent records to return
 * @returns {Promise<Array>} - Array of recent PSA records
 */
export const getRecentPSAActivity = async (limitCount = 10) => {
  try {
    logger.debug(`Fetching ${limitCount} most recent PSA records...`);
    
    const [psaCardsRecords, psa_cardsRecords] = await Promise.all([
      getAllPSARecords(PSA_CARDS_HYPHEN, limitCount),
      getAllPSARecords(PSA_CARDS_UNDERSCORE, limitCount)
    ]);
    
    // Combine and sort by lastUpdated
    const allRecords = [...psaCardsRecords, ...psa_cardsRecords];
    
    // Sort by lastUpdated (most recent first)
    allRecords.sort((a, b) => {
      const aDate = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
      const bDate = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
      return bDate - aDate;
    });
    
    return allRecords.slice(0, limitCount);
  } catch (error) {
    logger.error('Error fetching recent PSA activity:', error);
    throw error;
  }
};

/**
 * Search PSA records across both collections
 * @param {string} searchTerm - Search term (cert number, card name, etc.)
 * @returns {Promise<Array>} - Array of matching PSA records
 */
export const searchPSARecords = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }
    
    logger.debug(`Searching PSA records for: ${searchTerm}`);
    
    const [psaCardsRecords, psa_cardsRecords] = await Promise.all([
      getAllPSARecords(PSA_CARDS_HYPHEN),
      getAllPSARecords(PSA_CARDS_UNDERSCORE)
    ]);
    
    const allRecords = [...psaCardsRecords, ...psa_cardsRecords];
    const searchTermLower = searchTerm.toLowerCase();
    
    // Filter records that match the search term
    const matchingRecords = allRecords.filter(record => {
      return (
        record.certNumber.toLowerCase().includes(searchTermLower) ||
        record.cardName.toLowerCase().includes(searchTermLower) ||
        record.brand.toLowerCase().includes(searchTermLower) ||
        record.grade.toLowerCase().includes(searchTermLower)
      );
    });
    
    logger.debug(`Found ${matchingRecords.length} matching PSA records`);
    return matchingRecords;
  } catch (error) {
    logger.error('Error searching PSA records:', error);
    throw error;
  }
};

/**
 * Delete a PSA record from a specific collection
 * @param {string} collectionName - Collection to delete from
 * @param {string} certNumber - PSA certification number
 * @returns {Promise<boolean>} - Success status
 */
export const deletePSARecord = async (collectionName, certNumber) => {
  try {
    logger.debug(`Deleting PSA record ${certNumber} from ${collectionName}`);
    
    const docRef = doc(db, collectionName, certNumber);
    await deleteDoc(docRef);
    
    logger.debug(`Successfully deleted PSA record ${certNumber} from ${collectionName}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting PSA record ${certNumber} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Move a PSA record from one collection to another
 * @param {string} fromCollection - Source collection
 * @param {string} toCollection - Destination collection
 * @param {string} certNumber - PSA certification number
 * @returns {Promise<boolean>} - Success status
 */
export const movePSARecord = async (fromCollection, toCollection, certNumber) => {
  try {
    logger.debug(`Moving PSA record ${certNumber} from ${fromCollection} to ${toCollection}`);
    
    // Get the record from source collection
    const records = await getAllPSARecords(fromCollection);
    const recordToMove = records.find(r => r.certNumber === certNumber);
    
    if (!recordToMove) {
      throw new Error(`PSA record ${certNumber} not found in ${fromCollection}`);
    }
    
    // Create in destination collection
    const destDocRef = doc(db, toCollection, certNumber);
    await setDoc(destDocRef, recordToMove);
    
    // Delete from source collection
    await deletePSARecord(fromCollection, certNumber);
    
    logger.debug(`Successfully moved PSA record ${certNumber} from ${fromCollection} to ${toCollection}`);
    return true;
  } catch (error) {
    logger.error(`Error moving PSA record ${certNumber}:`, error);
    throw error;
  }
};

/**
 * Bulk merge all unique PSA records from one collection to another
 * This moves ALL records (both unique and duplicates) from source to destination
 * @param {string} fromCollection - Source collection to merge from
 * @param {string} toCollection - Destination collection to merge into
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} - Results summary
 */
const bulkMergePSACollections = async (fromCollection, toCollection, progressCallback = null) => {
  try {
    logger.info(`Starting bulk merge from ${fromCollection} to ${toCollection}`);
    
    // Get all records from both collections
    const [fromRecords, toRecords] = await Promise.all([
      getAllPSARecords(fromCollection),
      getAllPSARecords(toCollection)
    ]);
    
    // Create a set of existing cert numbers in destination
    const existingCertNumbers = new Set(toRecords.map(record => record.certNumber));
    
    // Identify records to move (all records from source)
    const recordsToMove = fromRecords;
    const uniqueRecords = fromRecords.filter(record => !existingCertNumbers.has(record.certNumber));
    const duplicateRecords = fromRecords.filter(record => existingCertNumbers.has(record.certNumber));
    
    logger.info(`Found ${fromRecords.length} total records to process:`);
    logger.info(`- ${uniqueRecords.length} unique records to move`);
    logger.info(`- ${duplicateRecords.length} duplicate records to handle`);
    
    let moved = 0;
    let errors = 0;
    const results = {
      totalProcessed: 0,
      uniquesMoved: 0,
      duplicatesSkipped: 0,
      duplicatesOverwritten: 0,
      errors: 0,
      errorDetails: []
    };
    
    // Process each record
    for (let i = 0; i < recordsToMove.length; i++) {
      const record = recordsToMove[i];
      const isUnique = !existingCertNumbers.has(record.certNumber);
      
      try {
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: recordsToMove.length,
            currentRecord: record.certNumber,
            isUnique
          });
        }
        
        // Create the record in destination collection (overwrites if exists)
        const destDocRef = doc(db, toCollection, record.certNumber);
        await setDoc(destDocRef, record);
        
        // Delete from source collection
        await deletePSARecord(fromCollection, record.certNumber);
        
        if (isUnique) {
          results.uniquesMoved++;
        } else {
          results.duplicatesOverwritten++;
        }
        
        moved++;
        results.totalProcessed++;
        
      } catch (error) {
        logger.error(`Error processing PSA record ${record.certNumber}:`, error);
        results.errors++;
        results.errorDetails.push({
          certNumber: record.certNumber,
          error: error.message
        });
      }
    }
    
    const summary = {
      ...results,
      success: results.errors === 0,
      fromCollection,
      toCollection,
      summary: `Moved ${results.uniquesMoved} unique records and overwrote ${results.duplicatesOverwritten} duplicates. ${results.errors} errors occurred.`
    };
    
    logger.info(`Bulk merge completed:`, summary);
    return summary;
    
  } catch (error) {
    logger.error(`Error during bulk merge from ${fromCollection} to ${toCollection}:`, error);
    throw error;
  }
};

/**
 * Get a preview of what a bulk merge would do without executing it
 * @param {string} fromCollection - Source collection 
 * @param {string} toCollection - Destination collection
 * @returns {Promise<Object>} - Preview summary
 */
const previewBulkMerge = async (fromCollection, toCollection) => {
  try {
    logger.info(`Generating bulk merge preview from ${fromCollection} to ${toCollection}`);
    
    // Add detailed debugging
    console.log(`🔍 Debug: Starting preview for ${fromCollection} -> ${toCollection}`);
    
    const [fromRecords, toRecords] = await Promise.all([
      getAllPSARecords(fromCollection),
      getAllPSARecords(toCollection)
    ]);
    
    console.log(`🔍 Debug: Found ${fromRecords.length} records in ${fromCollection}`);
    console.log(`🔍 Debug: Found ${toRecords.length} records in ${toCollection}`);
    console.log(`🔍 Debug: Sample from records:`, fromRecords.slice(0, 3));
    console.log(`🔍 Debug: Sample to records:`, toRecords.slice(0, 3));
    
    const existingCertNumbers = new Set(toRecords.map(record => record.certNumber));
    const uniqueRecords = fromRecords.filter(record => !existingCertNumbers.has(record.certNumber));
    const duplicateRecords = fromRecords.filter(record => existingCertNumbers.has(record.certNumber));
    
    console.log(`🔍 Debug: Unique records: ${uniqueRecords.length}`);
    console.log(`🔍 Debug: Duplicate records: ${duplicateRecords.length}`);
    console.log(`🔍 Debug: Existing cert numbers sample:`, [...existingCertNumbers].slice(0, 5));
    
    const preview = {
      fromCollection,
      toCollection,
      totalRecordsInSource: fromRecords.length,
      totalRecordsInDestination: toRecords.length,
      uniqueRecordsToMove: uniqueRecords.length,
      duplicateRecordsToOverwrite: duplicateRecords.length,
      finalRecordCount: toRecords.length + uniqueRecords.length,
      uniqueCertNumbers: uniqueRecords.map(r => r.certNumber),
      duplicateCertNumbers: duplicateRecords.map(r => r.certNumber),
      // Add debug info
      debug: {
        fromRecordsSample: fromRecords.slice(0, 3),
        toRecordsSample: toRecords.slice(0, 3),
        fromCertNumbers: fromRecords.map(r => r.certNumber).slice(0, 10),
        toCertNumbers: toRecords.map(r => r.certNumber).slice(0, 10)
      }
    };
    
    logger.info('Bulk merge preview generated:', preview);
    console.log(`🔍 Debug: Final preview:`, preview);
    return preview;
    
  } catch (error) {
    logger.error('Error generating bulk merge preview:', error);
    console.error(`🔍 Debug: Preview error:`, error);
    throw error;
  }
};

// Export collection names for use in components
/**
 * Search PSA cards by card name for autocomplete functionality
 * @param {string} searchTerm - Card name search term
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} - Array of matching PSA cards with essential data
 */
const searchPSACardsByName = async (searchTerm, limit = 20) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return []; // Require at least 2 characters
    }

    logger.debug(`Searching PSA cards by name: "${searchTerm}"`);
    
    // Get all PSA records from the main collection
    const allRecords = await getAllPSARecords(PSA_CARDS_HYPHEN);
    
    // Filter records by card name (case-insensitive, partial match)
    const searchTermLower = searchTerm.toLowerCase();
    const matchingRecords = allRecords
      .filter(record => {
        const cardName = record.cardName?.toLowerCase() || '';
        return cardName.includes(searchTermLower);
      })
      .slice(0, limit) // Limit results
      .map(record => ({
        // Essential data for autocomplete
        certNumber: record.certNumber,
        cardName: record.cardName,
        brand: record.brand,
        grade: record.grade,
        totalPopulation: record.totalPopulation,
        // Include all original data for form population
        originalData: record
      }));

    logger.debug(`Found ${matchingRecords.length} matching PSA cards for "${searchTerm}"`);
    return matchingRecords;
    
  } catch (error) {
    logger.error(`Error searching PSA cards by name "${searchTerm}":`, error);
    return [];
  }
};

export { PSA_CARDS_HYPHEN, PSA_CARDS_UNDERSCORE, bulkMergePSACollections, previewBulkMerge, searchPSACardsByName };
