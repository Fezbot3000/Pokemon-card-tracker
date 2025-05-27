const functions = require('firebase-functions');
const admin = require('firebase-admin'); // Add this line
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key from Firebase config (proper v1 approach)
const apiKey = functions.config().sendgrid?.api_key;
if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('SendGrid API key not configured. Please set using: firebase functions:config:set sendgrid.api_key="YOUR_KEY"');
}

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'd-welcome-template-id', // Replace with actual SendGrid template IDs
  EMAIL_VERIFICATION: 'd-verification-template-id',
  SUBSCRIPTION_CONFIRMED: 'd-subscription-confirmed-id',
  PAYMENT_FAILED: 'd-payment-failed-id',
  SUBSCRIPTION_CANCELLED: 'd-subscription-cancelled-id',
  MARKETPLACE_MESSAGE: 'd-marketplace-message-id',
  LISTING_SOLD: 'd-listing-sold-id'
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
      console.log('Email sent successfully:', { to, templateId });
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

  // Subscription confirmed
  async sendSubscriptionConfirmed(userEmail, userName, planName) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED,
      {
        user_name: userName,
        plan_name: planName,
        dashboard_url: 'https://mycardtracker.com.au/dashboard'
      }
    );
  }

  // Payment failed
  async sendPaymentFailed(userEmail, userName, amount) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.PAYMENT_FAILED,
      {
        user_name: userName,
        amount: amount,
        billing_url: 'https://mycardtracker.com.au/billing'
      }
    );
  }

  // Subscription cancelled
  async sendSubscriptionCancelled(userEmail, userName, endDate) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.SUBSCRIPTION_CANCELLED,
      {
        user_name: userName,
        end_date: endDate,
        resubscribe_url: 'https://mycardtracker.com.au/pricing'
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
      console.log('Custom email sent successfully:', { to, subject });
      return result;
    } catch (error) {
      console.error('Error sending custom email:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
