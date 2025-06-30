const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Trigger when a new user is created
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    
    // Send welcome email
    if (user.email) {
      await emailService.sendWelcomeEmail(
        user.email, 
        user.displayName || 'Card Collector'
      );

    }
    
    // Send email verification if email is not verified
    if (user.email && !user.emailVerified) {
      // Note: Firebase automatically sends verification emails, 
      // but we can send our custom branded one
      const verificationLink = `https://mycardtracker.com.au/verify-email?uid=${user.uid}`;
      await emailService.sendEmailVerification(user.email, verificationLink);

    }
    
  } catch (error) {
    console.error('Error in onUserCreate trigger:', error);
    // Don't throw error to avoid blocking user creation
  }
});

// Trigger when user is deleted
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {

    
    // Clean up user data in Firestore
    const userDoc = admin.firestore().doc(`users/${user.uid}`);
    await userDoc.delete();

    
  } catch (error) {
    console.error('Error in onUserDelete trigger:', error);
  }
});
