const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Test function to send a simple email (for testing purposes)
exports.testEmail = functions.https.onCall(async (data, context) => {
  try {
    // Initialize SendGrid with API key from environment variables with optional Firebase config fallback
    let apiKey = process.env.SENDGRID_API_KEY;
    
    // Try to get API key from Firebase functions config as fallback (if available)
    try {
      const config = functions?.config?.();
      if (config?.sendgrid?.api_key) {
        apiKey = config.sendgrid.api_key;
      }
    } catch (e) {
      console.warn('Skipping functions.config() fallback for SendGrid API, using process.env instead:', e.message);
    }
    
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'SendGrid API key not configured');
    }
    
    sgMail.setApiKey(apiKey);
    
    const { to, subject = 'Test Email from MyCardTracker' } = data;
    
    if (!to) {
      throw new functions.https.HttpsError('invalid-argument', 'Email address is required');
    }

    // Send email directly with sgMail
    const msg = {
      to,
      from: {
        email: 'noreply@mycardtracker.com.au',
        name: 'MyCardTracker'
      },
      subject,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h1 style="color: #333; text-align: center;">🎉 Email Service is Working!</h1>
              <p style="color: #666; font-size: 16px;">
                Congratulations! Your SendGrid email service has been successfully configured for MyCardTracker.
              </p>
              <p style="color: #666; font-size: 16px;">
                This test email confirms that:
              </p>
              <ul style="color: #666; font-size: 16px;">
                <li>✅ SendGrid API integration is working</li>
                <li>✅ Email delivery is functional</li>
                <li>✅ Your domain authentication is valid</li>
              </ul>
              <p style="color: #666; font-size: 16px;">
                You can now use the email service for user notifications, welcome emails, and other communications.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://mycardtracker.com.au" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                  Visit MyCardTracker
                </a>
              </div>
            </div>
          </body>
        </html>
      `
    };

    const result = await sgMail.send(msg);
    console.log('Test email sent successfully:', { to, subject });
    
    return {
      success: true,
      message: 'Test email sent successfully',
      messageId: result[0].headers['x-message-id']
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test email: ' + error.message);
  }
});
