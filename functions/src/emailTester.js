const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');
const { generateWelcomeEmailHTML, generateSubscriptionConfirmedHTML, generatePaymentFailedHTML, generateSubscriptionCancelledHTML, generateMarketplaceMessageHTML, generateListingSoldHTML, generateEmailVerificationHTML } = require('./emailTemplates');

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

    // 1. Welcome Email
    try {
      await emailService.sendCustomEmail(
        to,
        '🎉 Welcome to MyCardTracker!',
        generateWelcomeEmailHTML('Test User')
      );
      results.push({ type: 'Welcome Email', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Welcome Email', status: 'failed', error: error.message });
    }

    // 2. Subscription Confirmed
    try {
      await emailService.sendCustomEmail(
        to,
        '✅ Subscription Confirmed - MyCardTracker Pro',
        generateSubscriptionConfirmedHTML('Test User', 'Pro Plan')
      );
      results.push({ type: 'Subscription Confirmed', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Subscription Confirmed', status: 'failed', error: error.message });
    }

    // 3. Payment Failed
    try {
      await emailService.sendCustomEmail(
        to,
        '⚠️ Payment Failed - Action Required',
        generatePaymentFailedHTML('Test User', '$9.99')
      );
      results.push({ type: 'Payment Failed', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Payment Failed', status: 'failed', error: error.message });
    }

    // 4. Subscription Cancelled
    try {
      await emailService.sendCustomEmail(
        to,
        '😢 Subscription Cancelled - We\'ll Miss You',
        generateSubscriptionCancelledHTML('Test User', 'March 31, 2024')
      );
      results.push({ type: 'Subscription Cancelled', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Subscription Cancelled', status: 'failed', error: error.message });
    }

    // 5. Marketplace Message
    try {
      await emailService.sendCustomEmail(
        to,
        '💬 New Message About Your Listing',
        generateMarketplaceMessageHTML('John Buyer', 'Is this card still available? I\'m very interested!', 'Charizard Base Set Shadowless')
      );
      results.push({ type: 'Marketplace Message', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Marketplace Message', status: 'failed', error: error.message });
    }

    // 6. Listing Sold
    try {
      await emailService.sendCustomEmail(
        to,
        '🎉 Your Listing Sold!',
        generateListingSoldHTML('Test User', 'Pikachu First Edition', '$250.00')
      );
      results.push({ type: 'Listing Sold', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Listing Sold', status: 'failed', error: error.message });
    }

    // 7. Email Verification
    try {
      await emailService.sendCustomEmail(
        to,
        '📧 Verify Your Email Address',
        generateEmailVerificationHTML('https://mycardtracker.com.au/verify?token=sample123')
      );
      results.push({ type: 'Email Verification', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Email Verification', status: 'failed', error: error.message });
    }

    return {
      success: true,
      message: `Sent ${results.filter(r => r.status === 'sent').length} test emails to ${to}`,
      results
    };

  } catch (error) {
    console.error('Error sending test emails:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
