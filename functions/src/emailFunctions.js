const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Initialize Firestore
const db = admin.firestore();

// Send welcome email when user is created
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  try {
    const { email, displayName } = user;
    
    if (email) {
      await emailService.sendWelcomeEmail(email, displayName);
      console.log(`Welcome email sent to ${email}`);
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
});

// Send subscription confirmation email
exports.sendSubscriptionEmail = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userEmail, userName, planName, type } = data;

    if (type === 'confirmed') {
      await emailService.sendSubscriptionConfirmed(userEmail, userName, planName);
    } else if (type === 'cancelled') {
      const { endDate } = data;
      await emailService.sendSubscriptionCancelled(userEmail, userName, endDate);
    }

    return { success: true, message: `Subscription ${type} email sent successfully` };
  } catch (error) {
    console.error('Error sending subscription email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Send payment failed email
exports.sendPaymentFailedEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userEmail, userName, amount } = data;
    await emailService.sendPaymentFailed(userEmail, userName, amount);

    return { success: true, message: 'Payment failed email sent successfully' };
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    throw new functions.https.HttpsError('internal', error.message);
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

// Generic custom email function
exports.sendCustomEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { to, subject, htmlContent } = data;
    await emailService.sendCustomEmail(to, subject, htmlContent);

    return { success: true, message: 'Custom email sent successfully' };
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Handle Stripe webhook events for subscription emails
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
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
      const participants = chat.participants || [];
      const senderId = message.senderId;
      
      // Find recipient (the participant who didn't send the message)
      const recipientId = participants.find(id => id !== senderId);
      if (!recipientId) {
        return;
      }

      // Get recipient user data
      const recipientDoc = await db.collection('users').doc(recipientId).get();
      if (!recipientDoc.exists) {
        return;
      }

      const recipient = recipientDoc.data();
      if (!recipient.email) {
        return;
      }

      // Get sender data
      const senderDoc = await db.collection('users').doc(senderId).get();
      const sender = senderDoc.exists ? senderDoc.data() : {};
      
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

      console.log(`Marketplace message notification sent to ${recipient.email}`);
    } catch (error) {
      console.error('Error sending marketplace message notification:', error);
    }
  });

// Send listing sold notification
exports.sendListingSoldNotification = functions.firestore
  .document('marketplaceItems/{listingId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      
      // Check if status changed to 'sold'
      if (before.status !== 'sold' && after.status === 'sold') {
        const sellerId = after.userId;
        
        // Get seller data
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

        console.log(`Listing sold notification sent to ${seller.email}`);
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

// Helper functions for Stripe webhook handling
async function handleSubscriptionCreated(subscription) {
  try {
    const customerId = subscription.customer;
    const planName = subscription.items.data[0]?.price?.nickname || 'Premium Plan';
    const amount = (subscription.items.data[0]?.price?.unit_amount / 100) || 0;

    // Find user by Stripe customer ID
    const usersSnapshot = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log('No user found for customer ID:', customerId);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();

    if (user.email) {
      await emailService.sendSubscriptionConfirmed(
        user.email,
        user.displayName || user.username,
        planName,
        `$${amount}`
      );
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    const customerId = subscription.customer;
    const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();

    // Find user by Stripe customer ID
    const usersSnapshot = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();

    if (user.email) {
      await emailService.sendSubscriptionCancelled(
        user.email,
        user.displayName || user.username,
        endDate
      );
    }
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;
    const amount = (invoice.amount_due / 100) || 0;
    const retryUrl = invoice.hosted_invoice_url || 'https://mycardtracker.com.au/dashboard/settings';

    // Find user by Stripe customer ID
    const usersSnapshot = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();

    if (user.email) {
      await emailService.sendPaymentFailed(
        user.email,
        user.displayName || user.username,
        `$${amount}`,
        retryUrl
      );
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  // Optional: Send payment confirmation email
  console.log('Payment succeeded for invoice:', invoice.id);
}
