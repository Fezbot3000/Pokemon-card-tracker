const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Trigger when a new user is created
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    console.log('New user created:', user.uid, user.email);
    
    // Send welcome email
    if (user.email) {
      await emailService.sendWelcomeEmail(
        user.email, 
        user.displayName || 'Card Collector'
      );
      console.log('Welcome email sent to:', user.email);
    }
    
    // Send email verification if email is not verified
    if (user.email && !user.emailVerified) {
      // Note: Firebase automatically sends verification emails, 
      // but we can send our custom branded one
      const verificationLink = `https://mycardtracker.com.au/verify-email?uid=${user.uid}`;
      await emailService.sendEmailVerification(user.email, verificationLink);
      console.log('Email verification sent to:', user.email);
    }
    
  } catch (error) {
    console.error('Error in onUserCreate trigger:', error);
    // Don't throw error to avoid blocking user creation
  }
});

// Trigger when user is deleted
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    console.log('User deleted:', user.uid, user.email);
    
    // Clean up user data in Firestore
    const userDoc = admin.firestore().doc(`users/${user.uid}`);
    await userDoc.delete();
    console.log('User document deleted for:', user.uid);
    
  } catch (error) {
    console.error('Error in onUserDelete trigger:', error);
  }
});
