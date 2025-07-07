import { useAuth } from '../design-system/contexts/AuthContext';

// Define which features require premium subscription
const SUBSCRIPTION_FEATURES = {
  MULTIPLE_COLLECTIONS: 'premium',
  MARKETPLACE_SELLING: 'premium',
  INVOICING: 'premium',
  PSA_SEARCH: 'premium',
  SOLD_ITEMS: 'premium',
  CLOUD_SYNC: 'premium', // If you want to make this premium
  COLLECTION_SHARING: 'premium', // If you want to make this premium
};

/**
 * Custom hook for subscription management
 *
 * Provides easy access to subscription status and feature checking
 */
export const useSubscription = () => {
  const { subscriptionData } = useAuth();

  /**
   * Check if user has access to a specific feature
   * @param {string} feature - Feature name from SUBSCRIPTION_FEATURES
   * @returns {boolean} - Whether user has access to the feature
   */
  const hasFeature = feature => {
    const { status } = subscriptionData;

    // Premium users have everything
    if (status === 'premium') return true;

    // Free trial users have everything during trial
    if (status === 'free_trial') {
      const daysRemaining = subscriptionData.daysRemaining || 0;
      return daysRemaining > 0;
    }

    // Free users have limited features
    if (status === 'free') {
      return SUBSCRIPTION_FEATURES[feature] !== 'premium';
    }

    // Loading or unknown status - deny access to be safe
    return false;
  };

  /**
   * Check if user needs to upgrade for a feature
   * @param {string} feature - Feature name from SUBSCRIPTION_FEATURES
   * @returns {boolean} - Whether user needs to upgrade
   */
  const requiresUpgrade = feature => {
    return !hasFeature(feature);
  };

  /**
   * Check if trial has expired
   * @returns {boolean} - Whether trial has expired
   */
  const isTrialExpired = () => {
    return (
      subscriptionData.status === 'free_trial' &&
      (subscriptionData.daysRemaining || 0) <= 0
    );
  };

  /**
   * Get days remaining in trial
   * @returns {number} - Days remaining in trial
   */
  const getTrialDaysRemaining = () => {
    return subscriptionData.daysRemaining || 0;
  };

  /**
   * Get user-friendly status message
   * @returns {string} - Status message
   */
  const getStatusMessage = () => {
    const { status, daysRemaining } = subscriptionData;

    switch (status) {
      case 'free_trial':
        if (daysRemaining > 0) {
          return `Free trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
        }
        return 'Free trial expired';
      case 'premium':
        return 'Premium subscription active';
      case 'free':
        return 'Free plan';
      case 'loading':
        return 'Loading subscription status...';
      default:
        return 'Unknown subscription status';
    }
  };

  /**
   * Get upgrade urgency level
   * @returns {string} - 'high', 'medium', 'low', or 'none'
   */
  const getUpgradeUrgency = () => {
    const { status, daysRemaining } = subscriptionData;

    if (status === 'premium') return 'none';

    if (status === 'free_trial') {
      if (daysRemaining <= 1) return 'high';
      if (daysRemaining <= 3) return 'medium';
      return 'low';
    }

    if (status === 'free') return 'medium';

    return 'low';
  };

  return {
    // Subscription data
    subscription: subscriptionData,

    // Feature checking
    hasFeature,
    requiresUpgrade,

    // Trial status
    isTrialExpired,
    getTrialDaysRemaining,

    // Convenience booleans
    isOnTrial: subscriptionData.status === 'free_trial',
    isPremium: subscriptionData.status === 'premium',
    isFree: subscriptionData.status === 'free',
    isLoading: subscriptionData.status === 'loading',

    // Helper methods
    getStatusMessage,
    getUpgradeUrgency,

    // Feature constants for reference
    FEATURES: SUBSCRIPTION_FEATURES,
  };
};

export default useSubscription;
