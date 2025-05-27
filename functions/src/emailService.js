const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key from environment variables
sgMail.setApiKey(functions.config().sendgrid.api_key);

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
  async sendSubscriptionConfirmed(userEmail, userName, planName, amount) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.SUBSCRIPTION_CONFIRMED,
      {
        user_name: userName,
        plan_name: planName,
        amount: amount,
        billing_portal_url: 'https://mycardtracker.com.au/dashboard/settings'
      }
    );
  }

  // Payment failed
  async sendPaymentFailed(userEmail, userName, amount, retryUrl) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.PAYMENT_FAILED,
      {
        user_name: userName,
        amount: amount,
        retry_url: retryUrl,
        support_email: 'support@mycardtracker.com.au'
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

  // Marketplace message notification
  async sendMarketplaceMessage(userEmail, userName, senderName, cardName, messagePreview) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.MARKETPLACE_MESSAGE,
      {
        user_name: userName,
        sender_name: senderName,
        card_name: cardName,
        message_preview: messagePreview,
        messages_url: 'https://mycardtracker.com.au/dashboard?view=marketplace-messages'
      }
    );
  }

  // Listing sold notification
  async sendListingSold(userEmail, userName, cardName, salePrice) {
    return this.sendEmail(
      userEmail,
      EMAIL_TEMPLATES.LISTING_SOLD,
      {
        user_name: userName,
        card_name: cardName,
        sale_price: salePrice,
        marketplace_url: 'https://mycardtracker.com.au/dashboard?view=marketplace-selling'
      }
    );
  }

  // Generic email for custom messages
  async sendCustomEmail(to, subject, htmlContent, textContent = null) {
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
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

module.exports = new EmailService();
