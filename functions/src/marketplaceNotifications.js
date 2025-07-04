const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Send email notification for marketplace messages
exports.sendEmailNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { chatId, senderId, message } = data;

  if (!chatId || !senderId || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Get chat details
    const chatDoc = await admin.firestore().doc(`chats/${chatId}`).get();
    if (!chatDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Chat not found');
    }

    const chatData = chatDoc.data();
    const { buyerId, sellerId, cardTitle, cardId } = chatData;

    // Determine recipient (the other person in the chat)
    const recipientId = senderId === buyerId ? sellerId : buyerId;

    // Get recipient user data
    const recipientDoc = await admin.firestore().doc(`users/${recipientId}`).get();
    if (!recipientDoc.exists) {
      console.log('Recipient user not found');
      return { success: false, reason: 'Recipient not found' };
    }

    const recipientData = recipientDoc.data();
    const recipientEmail = recipientData.email;

    if (!recipientEmail) {
      console.log('Recipient email not found');
      return { success: false, reason: 'Recipient email not found' };
    }

    // Get sender user data
    const senderDoc = await admin.firestore().doc(`users/${senderId}`).get();
    const senderData = senderDoc.exists ? senderDoc.data() : {};
    const senderName = senderData.displayName || 'A user';

    // Send marketplace message email
    await emailService.sendMarketplaceMessageEmail(
      recipientEmail,
      senderName,
      message,
      cardTitle || 'Card Listing',
      `https://mycardtracker.com.au/marketplace/messages?chat=${chatId}`
    );

    console.log(`Marketplace message email sent to ${recipientEmail}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending marketplace message email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email notification');
  }
});

// Send email when listing is sold (manual trigger)
exports.sendListingSoldNotificationManual = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { listingId, buyerId, sellerId } = data;

  if (!listingId || !buyerId || !sellerId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  try {
    // Get listing details
    const listingDoc = await admin.firestore().doc(`marketplaceItems/${listingId}`).get();
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Listing not found');
    }

    const listingData = listingDoc.data();
    
    // Get seller user data
    const sellerDoc = await admin.firestore().doc(`users/${sellerId}`).get();
    if (!sellerDoc.exists) {
      console.log('Seller user not found');
      return { success: false, reason: 'Seller not found' };
    }

    const sellerData = sellerDoc.data();
    const sellerEmail = sellerData.email;

    if (!sellerEmail) {
      console.log('Seller email not found');
      return { success: false, reason: 'Seller email not found' };
    }

    // Get buyer user data
    const buyerDoc = await admin.firestore().doc(`users/${buyerId}`).get();
    const buyerData = buyerDoc.exists ? buyerDoc.data() : {};
    const buyerName = buyerData.displayName || 'A buyer';

    // Send listing sold email to seller
    await emailService.sendListingSoldEmail(
      sellerEmail,
      buyerName,
      listingData.card?.name || 'Card',
      listingData.listingPrice || 0,
      listingData.currency || 'USD'
    );

    console.log(`Listing sold email sent to seller ${sellerEmail}`);
    return { success: true };

  } catch (error) {
    console.error('Error sending listing sold email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email notification');
  }
});
