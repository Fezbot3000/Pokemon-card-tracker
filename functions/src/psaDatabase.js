const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// PSA database collection name
const PSA_COLLECTION = 'psa_cards';

/**
 * Scheduled function to clean up old PSA data
 * Runs once per week to remove very old entries (older than 1 year)
 */
exports.cleanupPSADatabase = functions.pubsub.schedule('0 3 * * 1') // Every Monday at 3 AM (cron format)
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Calculate timestamp for 1 year ago
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    
    try {
      // Get all PSA cards older than 1 year
      const snapshot = await db.collection(PSA_COLLECTION)
        .where('timestamp', '<', oneYearAgo)
        .get();
      
      if (snapshot.empty) {
        console.log('No old PSA records to clean up');
        return null;
      }
      
      // Delete old records in batches
      const batchSize = 500;
      let batch = db.batch();
      let count = 0;
      let totalDeleted = 0;
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
        totalDeleted++;
        
        // Commit when batch size is reached
        if (count >= batchSize) {
          batch.commit();
          batch = db.batch();
          count = 0;
        }
      });
      
      // Commit any remaining deletes
      if (count > 0) {
        await batch.commit();
      }
      
      console.log(`Cleaned up ${totalDeleted} old PSA records`);
      return { deleted: totalDeleted };
    } catch (error) {
      console.error('Error cleaning up PSA database:', error);
      return { error: error.message };
    }
  });

/**
 * HTTP function to get PSA database statistics
 * Can be called by admins to get detailed stats
 */
exports.getPSADatabaseStats = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to access PSA database statistics'
    );
  }
  
  try {
    const db = admin.firestore();
    const snapshot = await db.collection(PSA_COLLECTION).get();
    
    // Count total cards
    const totalCards = snapshot.size;
    
    // Count cards by grade
    const gradeDistribution = {};
    
    // Count cards updated in the last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let recentlyUpdated = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Count recently updated
      if (data.timestamp && data.timestamp > thirtyDaysAgo) {
        recentlyUpdated++;
      }
      
      // Track grade distribution
      if (data.cardData && data.cardData.grade) {
        const grade = data.cardData.grade;
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      }
    });
    
    return {
      totalCards,
      recentlyUpdated,
      gradeDistribution,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting PSA database stats:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
