import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import logger from '../utils/logger';

const functions = getFunctions(getApp(), 'us-central1');

// Email service helper for frontend
class EmailServiceHelper {
  constructor() {
    // Initialize all email functions
    this.sendWelcomeEmail = httpsCallable(functions, 'sendWelcomeEmail');
    this.sendMarketplaceMessageEmail = httpsCallable(
      functions,
      'sendMarketplaceMessageEmail'
    );
    this.sendListingSoldEmail = httpsCallable(
      functions,
      'sendListingSoldEmail'
    );
    this.sendEmailVerificationEmail = httpsCallable(
      functions,
      'sendEmailVerificationEmail'
    );
    this.sendCustomEmail = httpsCallable(functions, 'sendCustomEmail');
    this.sendFeedbackEmail = httpsCallable(functions, 'sendFeedbackEmail');
  }

  // Send marketplace message notification
  async sendMarketplaceNotification(
    recipientEmail,
    senderName,
    message,
    listingTitle
  ) {
    try {
      const result = await this.sendMarketplaceMessageEmail({
        recipientEmail,
        senderName,
        message,
        listingTitle,
      });
      return result.data;
    } catch (error) {
      logger.error('Error sending marketplace message email:', error, { context: { file: 'emailService', purpose: 'marketplace-notification' } });
      throw error;
    }
  }

  // Send listing sold notification
  async sendListingSoldNotification(
    userEmail,
    userName,
    listingTitle,
    salePrice
  ) {
    try {
      const result = await this.sendListingSoldEmail({
        userEmail,
        userName,
        listingTitle,
        salePrice,
      });
      return result.data;
    } catch (error) {
      logger.error('Error sending listing sold email:', error, { context: { file: 'emailService', purpose: 'listing-sold-notification' } });
      throw error;
    }
  }

  // Send email verification
  async sendEmailVerification(userEmail, verificationLink) {
    try {
      const result = await this.sendEmailVerificationEmail({
        userEmail,
        verificationLink,
      });
      return result.data;
    } catch (error) {
      logger.error('Error sending email verification:', error, { context: { file: 'emailService', purpose: 'email-verification' } });
      throw error;
    }
  }

  // Send custom email
  async sendCustomEmailMessage(to, subject, htmlContent) {
    try {
      const result = await this.sendCustomEmail({ to, subject, htmlContent });
      return result.data;
    } catch (error) {
      logger.error('Error sending custom email:', error, { context: { file: 'emailService', purpose: 'custom-email' } });
      throw error;
    }
  }

  // Send feedback email
  async sendFeedbackEmailMessage(to, subject, htmlContent) {
    try {
      const result = await this.sendFeedbackEmail({ to, subject, htmlContent });
      return result.data;
    } catch (error) {
      logger.error('Error sending feedback email:', error, { context: { file: 'emailService', purpose: 'feedback-email' } });
      throw error;
    }
  }
}

// Export singleton instance
export default new EmailServiceHelper();
