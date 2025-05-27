const admin = require('firebase-admin');
const functions = require('firebase-functions');
const emailService = require('./emailService');

// Test function to send a simple email (for testing purposes)
exports.testEmail = functions.https.onCall(async (data, context) => {
  try {
    const { to, subject = 'Test Email from MyCardTracker' } = data;
    
    if (!to) {
      throw new functions.https.HttpsError('invalid-argument', 'Email address is required');
    }

    // Send a simple HTML email without templates for testing
    const htmlContent = `
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
              <li>✅ SendGrid API key is properly configured</li>
              <li>✅ Firebase Functions are deployed and working</li>
              <li>✅ Email service is ready to send notifications</li>
            </ul>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-weight: bold;">
                Next Steps:
              </p>
              <p style="margin: 5px 0 0 0; color: #1976d2;">
                1. Set up domain authentication in SendGrid<br>
                2. Create email templates for better formatting<br>
                3. Enable email verification for user signups
              </p>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
              Sent from MyCardTracker Email Service<br>
              <a href="https://mycardtracker.com.au" style="color: #1976d2;">mycardtracker.com.au</a>
            </p>
          </div>
        </body>
      </html>
    `;

    await emailService.sendCustomEmail(to, subject, htmlContent);
    
    return { 
      success: true, 
      message: `Test email sent successfully to ${to}` 
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    throw new functions.https.HttpsError('internal', `Failed to send test email: ${error.message}`);
  }
});
