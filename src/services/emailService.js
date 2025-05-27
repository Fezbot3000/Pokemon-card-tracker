import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Email service helper for frontend
class EmailServiceHelper {
  constructor() {
    // Initialize all email functions
    this.testEmail = httpsCallable(functions, 'testEmail');
    this.sendSubscriptionEmail = httpsCallable(functions, 'sendSubscriptionEmail');
    this.sendPaymentFailedEmail = httpsCallable(functions, 'sendPaymentFailedEmail');
    this.sendMarketplaceMessageEmail = httpsCallable(functions, 'sendMarketplaceMessageEmail');
    this.sendListingSoldEmail = httpsCallable(functions, 'sendListingSoldEmail');
    this.sendEmailVerificationEmail = httpsCallable(functions, 'sendEmailVerificationEmail');
    this.sendCustomEmail = httpsCallable(functions, 'sendCustomEmail');
  }

  // Send test email
  async sendTestEmail(to, subject = 'Test Email from MyCardTracker') {
    try {
      const result = await this.testEmail({ to, subject });
      return result.data;
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }

  // Send subscription confirmation/cancellation email
  async sendSubscriptionNotification(userEmail, userName, planName, type, endDate = null) {
    try {
      const data = { userEmail, userName, planName, type };
      if (endDate) data.endDate = endDate;
      
      const result = await this.sendSubscriptionEmail(data);
      return result.data;
    } catch (error) {
      console.error('Error sending subscription email:', error);
      throw error;
    }
  }

  // Send payment failed notification
  async sendPaymentFailedNotification(userEmail, userName, amount) {
    try {
      const result = await this.sendPaymentFailedEmail({ userEmail, userName, amount });
      return result.data;
    } catch (error) {
      console.error('Error sending payment failed email:', error);
      throw error;
    }
  }

  // Send marketplace message notification
  async sendMarketplaceNotification(recipientEmail, senderName, message, listingTitle) {
    try {
      const result = await this.sendMarketplaceMessageEmail({
        recipientEmail,
        senderName,
        message,
        listingTitle
      });
      return result.data;
    } catch (error) {
      console.error('Error sending marketplace message email:', error);
      throw error;
    }
  }

  // Send listing sold notification
  async sendListingSoldNotification(userEmail, userName, listingTitle, salePrice) {
    try {
      const result = await this.sendListingSoldEmail({
        userEmail,
        userName,
        listingTitle,
        salePrice
      });
      return result.data;
    } catch (error) {
      console.error('Error sending listing sold email:', error);
      throw error;
    }
  }

  // Send email verification
  async sendEmailVerification(userEmail, verificationLink) {
    try {
      const result = await this.sendEmailVerificationEmail({ userEmail, verificationLink });
      return result.data;
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  // Send custom email
  async sendCustomEmailMessage(to, subject, htmlContent) {
    try {
      const result = await this.sendCustomEmail({ to, subject, htmlContent });
      return result.data;
    } catch (error) {
      console.error('Error sending custom email:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new EmailServiceHelper();
