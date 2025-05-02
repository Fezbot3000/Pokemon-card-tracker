const functions = require('firebase-functions');
const admin = require('firebase-admin');
const psaDatabase = require('./psaDatabase');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export PSA database functions
exports.cleanupPSADatabase = psaDatabase.cleanupPSADatabase;
exports.getPSADatabaseStats = psaDatabase.getPSADatabaseStats;

// Cloud Function to store card images in Firebase Storage
exports.storeCardImage = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  const { userId, cardId, imageBase64, isReplacement = false } = data;
  
  if (!userId || !cardId || !imageBase64) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameters: userId, cardId, or imageBase64'
    );
  }
  
  // Verify that the authenticated user matches the requested userId
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only upload images for your own user ID'
    );
  }
  
  try {
    // Get a reference to the Firebase Storage bucket
    const bucket = admin.storage().bucket();
    
    // Define the path where the image will be stored
    const imagePath = `images/${userId}/${cardId}.jpeg`;
    
    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Create a file in the bucket
    const file = bucket.file(imagePath);
    
    // Check if the file exists and if we should replace it
    if (!isReplacement) {
      try {
        const [exists] = await file.exists();
        if (exists) {
          console.log(`File ${imagePath} already exists and isReplacement is false`);
          
          // Get the download URL for the existing file
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Far future expiration
          });
          
          return {
            success: true,
            downloadUrl: url,
            message: 'File already exists, returning existing URL'
          };
        }
      } catch (existsError) {
        console.error('Error checking if file exists:', existsError);
        // Continue with upload if we can't check existence
      }
    }
    
    // Upload the file
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          userId: userId,
          cardId: cardId,
          uploadTimestamp: Date.now().toString(),
          isReplacement: isReplacement.toString()
        }
      }
    });
    
    console.log(`Successfully uploaded image to ${imagePath}`);
    
    // Get a download URL for the file
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Far future expiration
    });
    
    return {
      success: true,
      downloadUrl: url,
      path: imagePath
    };
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

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
