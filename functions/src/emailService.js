const functions = require('firebase-functions');
const admin = require('firebase-admin'); // Add this line
const sgMail = require('@sendgrid/mail');

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

if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('SendGrid API key not configured. Please set using: firebase functions:config:set sendgrid.api_key="YOUR_KEY" or SENDGRID_API_KEY environment variable');
}

// Email templates - Updated with real SendGrid template IDs
const EMAIL_TEMPLATES = {
  WELCOME: 'd-e480237baa62442b9bae651a8333b25d',
  EMAIL_VERIFICATION: 'd-80d372d269dc479697fbf3cfec743d1c',
  MARKETPLACE_MESSAGE: 'd-a3ec6f68150c4f469bebc920910993f9',
  LISTING_SOLD: 'd-a3ec6f68150c4f469bebc920910993f9'
};

class EmailService {
  constructor() {
    this.fromEmail = 'noreply@mycardtracker.com.au';
    this.fromName = 'MyCardTracker';
  }

  async sendEmail(to, templateId, dynamicTemplateData = {}, subject = null) {

    
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        templateId,
        dynamicTemplateData: {
          ...dynamicTemplateData,
          app_name: 'MyCardTracker',
          app_url: 'https://mycardtracker.com.au',
          support_email: 'support@mycardtracker.com.au'
        }
      };

      // Add subject if provided (for non-template emails)
      if (subject) {
        msg.subject = subject;
      }

      const result = await sgMail.send(msg);

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(userEmail, userName) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.WELCOME,
      {
        user_name: userName || 'Card Collector',
        login_url: 'https://mycardtracker.com.au/login'
      }
    );
  }

  // Email verification
  async sendEmailVerification(userEmail, verificationLink) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.EMAIL_VERIFICATION,
      {
        verification_link: verificationLink,
        app_name: 'MyCardTracker'
      }
    );
  }

  // Marketplace message
  async sendMarketplaceMessage(userEmail, senderName, message, listingTitle) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.MARKETPLACE_MESSAGE,
      {
        sender_name: senderName,
        message: message,
        listing_title: listingTitle,
        marketplace_url: 'https://mycardtracker.com.au/marketplace'
      }
    );
  }

  // Listing sold notification
  async sendListingSold(userEmail, userName, listingTitle, salePrice) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.LISTING_SOLD,
      {
        user_name: userName,
        listing_title: listingTitle,
        sale_price: salePrice,
        dashboard_url: 'https://mycardtracker.com.au/dashboard'
      }
    );
  }

  // Custom email method (for sending HTML emails without templates)
  async sendCustomEmail(to, subject, htmlContent) {
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html: htmlContent
      };

      const result = await sgMail.send(msg);

      return result;
    } catch (error) {
      console.error('Error sending custom email:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
