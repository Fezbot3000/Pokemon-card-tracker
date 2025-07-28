const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Firestore
const db = admin.firestore();

// Function triggered when a user is created
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    // Create user profile document
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('User profile created for:', user.email);
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
});

// Function triggered when a user is deleted
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    // Delete user profile document
    await db.collection('users').doc(user.uid).delete();
    
    console.log('User profile deleted for:', user.email);
  } catch (error) {
    console.error('Error deleting user profile:', error);
  }
});
