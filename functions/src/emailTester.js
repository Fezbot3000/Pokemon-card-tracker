const functions = require('firebase-functions');
const emailService = require('./emailService');

// Test all email types by sending them to a specified email
exports.testAllEmails = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { testEmail } = data;
    if (!testEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'Test email address is required');
    }

    const results = [];

    // 1. Welcome Email
    try {
      await emailService.sendCustomEmail(
        testEmail,
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
        testEmail,
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
        testEmail,
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
        testEmail,
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
        testEmail,
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
        testEmail,
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
        testEmail,
        '📧 Verify Your Email Address',
        generateEmailVerificationHTML('https://mycardtracker.com.au/verify?token=sample123')
      );
      results.push({ type: 'Email Verification', status: 'sent' });
    } catch (error) {
      results.push({ type: 'Email Verification', status: 'failed', error: error.message });
    }

    return {
      success: true,
      message: `Sent ${results.filter(r => r.status === 'sent').length} test emails to ${testEmail}`,
      results
    };

  } catch (error) {
    console.error('Error sending test emails:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Email HTML Templates
function generateWelcomeEmailHTML(userName) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🎉 Welcome to MyCardTracker!</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Welcome to the ultimate Pokémon card tracking platform! We're excited to have you join our community of collectors.
          </p>
          
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">🚀 Get Started:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Add your first cards to your collection</li>
              <li>Set up price tracking for valuable cards</li>
              <li>Explore the marketplace to buy and sell</li>
              <li>Connect with other collectors</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mycardtracker.com.au/dashboard" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Start Tracking Your Cards
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            Happy collecting!<br>
            The MyCardTracker Team
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateSubscriptionConfirmedHTML(userName, planName) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0; font-size: 28px;">✅ Subscription Confirmed!</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your <strong>${planName}</strong> subscription has been successfully activated! You now have access to all premium features.
          </p>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">🎯 Premium Features Unlocked:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Advanced price tracking and alerts</li>
              <li>Unlimited card collection storage</li>
              <li>Priority marketplace listings</li>
              <li>Detailed analytics and insights</li>
              <li>Premium customer support</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mycardtracker.com.au/dashboard" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Access Your Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            Thank you for supporting MyCardTracker!
          </p>
        </div>
      </body>
    </html>
  `;
}

function generatePaymentFailedHTML(userName, amount) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 28px;">⚠️ Payment Failed</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We were unable to process your payment of <strong>${amount}</strong> for your MyCardTracker subscription.
          </p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #b91c1c; margin-top: 0;">🔧 What you can do:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Check that your payment method is valid</li>
              <li>Ensure sufficient funds are available</li>
              <li>Update your billing information</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mycardtracker.com.au/billing" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Update Payment Method
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            Need help? Contact us at support@mycardtracker.com.au
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateSubscriptionCancelledHTML(userName, endDate) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">😢 Subscription Cancelled</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We're sorry to see you go! Your subscription has been cancelled and will remain active until <strong>${endDate}</strong>.
          </p>
          
          <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="color: #6b21a8; margin-top: 0;">📝 What happens next:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>You'll keep premium access until ${endDate}</li>
              <li>Your data will be safely preserved</li>
              <li>You can reactivate anytime</li>
              <li>We'd love your feedback on how to improve</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mycardtracker.com.au/pricing" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reactivate Subscription
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            We hope to see you back soon!
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateMarketplaceMessageHTML(senderName, message, listingTitle) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0891b2; margin: 0; font-size: 28px;">💬 New Marketplace Message</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            You have a new message about your listing: <strong>${listingTitle}</strong>
          </p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2;">
            <h3 style="color: #0c4a6e; margin-top: 0;">Message from ${senderName}:</h3>
            <p style="color: #374151; font-style: italic; margin: 0; font-size: 16px; line-height: 1.6;">
              "${message}"
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mycardtracker.com.au/marketplace" style="background-color: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reply to Message
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            Happy trading!
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateListingSoldHTML(userName, listingTitle, salePrice) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0; font-size: 28px;">🎉 Your Listing Sold!</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Congratulations ${userName}!
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your listing "<strong>${listingTitle}</strong>" has been sold for <strong>${salePrice}</strong>!
          </p>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">📦 Next Steps:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>Package your card securely</li>
              <li>Ship to the buyer's address</li>
              <li>Provide tracking information</li>
              <li>Funds will be released after delivery</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mycardtracker.com.au/dashboard" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Sale Details
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            Thank you for using MyCardTracker Marketplace!
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateEmailVerificationHTML(verificationLink) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">📧 Verify Your Email</h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Welcome to MyCardTracker! Please verify your email address to complete your account setup.
          </p>
          
          <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.6;">
              Click the button below to verify your email address. This link will expire in 24 hours.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;
}
