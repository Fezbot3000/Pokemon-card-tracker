/**
 * Notification Service
 * 
 * Provides a centralized way to handle notifications in the application.
 */

import { toast } from 'react-hot-toast';

const NotificationService = {
  showLoadingNotification() {
    toast.loading('Searching PSA database...');
  },

  showLookupNotification(type, details = {}) {
    toast.dismiss(); // Clear any existing notifications
    
    switch (type) {
      case 'SUCCESS':
        toast.success('PSA data loaded successfully');
        break;
      case 'ERROR':
        toast.error(details.message || 'Error searching PSA database');
        break;
      case 'RATE_LIMIT':
        toast.error(
          details.hoursUntilReset
            ? `PSA API rate limit reached. Limit will reset in ${details.hoursUntilReset} hours.`
            : 'PSA lookup temporarily unavailable. Please try again later.'
        );
        break;
      case 'FETCH_ERROR':
        toast.error(details.message || 'Error fetching PSA data');
        break;
      case 'NOT_FOUND':
        toast.error('No PSA data found for this serial number');
        break;
      case 'AUTH_ERROR':
        toast.error('PSA authentication error');
        break;
      default:
        toast.error('An unknown error occurred');
    }
  }
};

export default NotificationService;
