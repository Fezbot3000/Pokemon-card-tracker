const functions = require('firebase-functions');
const admin = require('firebase-admin');
const psaDatabase = require('./psaDatabase');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export PSA database functions
exports.cleanupPSADatabase = psaDatabase.cleanupPSADatabase;
exports.getPSADatabaseStats = psaDatabase.getPSADatabaseStats;

// Add a function to handle PSA lookups with caching
exports.psaLookupWithCache = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { certNumber, forceRefresh } = data;
  
  if (!certNumber) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Certification number is required'
    );
  }
  
  try {
    const db = admin.firestore();
    const PSA_COLLECTION = 'psa_cards';
    
    // Check if we have this card in our database already
    const docRef = db.collection(PSA_COLLECTION).doc(certNumber);
    const docSnap = await docRef.get();
    
    // If we have the card and it's not too old, return it
    if (!forceRefresh && docSnap.exists) {
      const data = docSnap.data();
      
      // Check if data is fresh (less than 30 days old)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (data.timestamp && (Date.now() - data.timestamp) < thirtyDaysInMs) {
        console.log(`Serving PSA data from database for cert #${certNumber}`);
        
        // Update access count
        await docRef.update({
          accessCount: admin.firestore.FieldValue.increment(1),
          lastAccessed: Date.now()
        });
        
        return {
          success: true,
          fromCache: true,
          data: data.cardData
        };
      }
    }
    
    // If we don't have the card or it's too old, call the original function
    // This would be your existing PSA lookup function
    // For now, we'll return a placeholder error
    throw new functions.https.HttpsError(
      'unimplemented',
      'Direct PSA API lookup not implemented in this example'
    );
  } catch (error) {
    console.error('Error in PSA lookup with cache:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
