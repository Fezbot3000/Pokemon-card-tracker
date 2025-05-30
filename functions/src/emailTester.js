const admin = require('firebase-admin');
const functions = require('firebase-functions');
const emailService = require('./emailService');

// Test all email types by sending them to a specified email
exports.testAllEmails = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { to } = data;
    if (!to) {
      throw new functions.https.HttpsError('invalid-argument', 'Test email address is required');
    }

    const results = [];

    // 1. Welcome Email - Use SendGrid template
    try {
      await emailService.sendWelcomeEmail(to, 'Test User');
      results.push({ type: 'Welcome Email', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Welcome Email', status: 'failed', error: error.message });
    }

    // 2. Email Verification - Use SendGrid template
    try {
      await emailService.sendEmailVerification(to, 'https://mycardtracker.com.au/verify?token=sample123');
      results.push({ type: 'Email Verification', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Email Verification', status: 'failed', error: error.message });
    }

    // 3. Marketplace Message - Use SendGrid template
    try {
      await emailService.sendMarketplaceMessage(to, 'John Buyer', 'Is this card still available? I\'m very interested!', 'Charizard Base Set Shadowless');
      results.push({ type: 'Marketplace Message', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Marketplace Message', status: 'failed', error: error.message });
    }

    // 4. Listing Sold - Use SendGrid template
    try {
      await emailService.sendListingSold(to, 'Test User', 'Pikachu First Edition', '$250.00');
      results.push({ type: 'Listing Sold', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Listing Sold', status: 'failed', error: error.message });
    }

    return {
      success: true,
      message: `Sent ${results.filter(r => r.status === 'sent').length} test emails to ${to}`,
      results
    };

  } catch (error) {
    console.error('Error in testAllEmails:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test emails: ' + error.message);
  }
});
