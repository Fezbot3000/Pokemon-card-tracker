const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize Firestore
const db = admin.firestore();

// Send welcome email when user is created
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  try {
    const { email, displayName } = user;
    
    if (email) {
      await emailService.sendWelcomeEmail(email, displayName);
  
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
});

// Send marketplace message notification
exports.sendMarketplaceMessageEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipientEmail, senderName, message, listingTitle } = data;
    await emailService.sendMarketplaceMessage(recipientEmail, senderName, message, listingTitle);

    return { success: true, message: 'Marketplace message email sent successfully' };
  } catch (error) {
    console.error('Error sending marketplace message email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Send listing sold notification
exports.sendListingSoldEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userEmail, userName, listingTitle, salePrice } = data;
    await emailService.sendListingSold(userEmail, userName, listingTitle, salePrice);

    return { success: true, message: 'Listing sold email sent successfully' };
  } catch (error) {
    console.error('Error sending listing sold email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Send email verification
exports.sendEmailVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userEmail, verificationLink } = data;
    await emailService.sendEmailVerification(userEmail, verificationLink);

    return { success: true, message: 'Email verification sent successfully' };
  } catch (error) {
    console.error('Error sending email verification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Send marketplace message notification
exports.sendMarketplaceMessageNotification = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message = snap.data();
      const chatId = context.params.chatId;
      
      // Skip system messages
      if (message.type === 'system') {
        return;
      }

      // Get chat details
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (!chatDoc.exists) {
        return;
      }

      const chat = chatDoc.data();
      const senderId = message.senderId;
      const recipientId = chat.buyerId === senderId ? chat.sellerId : chat.buyerId;

      // Get sender and recipient details
      const [senderDoc, recipientDoc] = await Promise.all([
        db.collection('users').doc(senderId).get(),
        db.collection('users').doc(recipientId).get()
      ]);

      if (!senderDoc.exists || !recipientDoc.exists) {
        return;
      }

      const sender = senderDoc.data();
      const recipient = recipientDoc.data();

      if (!recipient.email) {
        return;
      }
      
      const senderName = sender.displayName || sender.username || 'Someone';
      const cardName = chat.cardTitle || 'a card';
      const messagePreview = message.text ? message.text.substring(0, 100) : 'sent you a message';

      await emailService.sendMarketplaceMessage(
        recipient.email,
        recipient.displayName || recipient.username,
        senderName,
        cardName,
        messagePreview
      );

  
    } catch (error) {
      console.error('Error sending marketplace message notification:', error);
    }
  });

// Send listing sold notification (Firestore trigger)
exports.sendListingSoldNotificationTrigger = functions.firestore
  .document('marketplaceItems/{listingId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Check if status changed to 'sold'
      if (before.status !== 'sold' && after.status === 'sold') {
        const sellerId = after.sellerId;
        
        if (!sellerId) {
          return;
        }

        const sellerDoc = await db.collection('users').doc(sellerId).get();
        if (!sellerDoc.exists) {
          return;
        }

        const seller = sellerDoc.data();
        if (!seller.email) {
          return;
        }

        const cardName = after.cardName || after.card?.name || 'Your card';
        const salePrice = after.priceAUD || after.price || 'N/A';

        await emailService.sendListingSold(
          seller.email,
          seller.displayName || seller.username,
          cardName,
          `$${salePrice} AUD`
        );

    
      }
    } catch (error) {
      console.error('Error sending listing sold notification:', error);
    }
  });

// Manual email sending function (for admin use)
exports.sendCustomEmail = functions.https.onCall(async (data, context) => {
  // Verify admin access
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { to, subject, htmlContent, textContent } = data;

  try {
    await emailService.sendCustomEmail(to, subject, htmlContent, textContent);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
