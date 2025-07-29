import React, { useState } from 'react';
import { useAuth } from '../../design-system/contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import Button from '../../design-system/atoms/Button';
import Icon from '../../design-system/atoms/Icon';
import { toast } from 'react-hot-toast';
import LoggingService from '../../services/LoggingService';

/**
 * SubscriptionStatus Component
 *
 * Displays user's subscription status and provides access to Stripe customer portal
 */
const SubscriptionStatus = () => {
  const { user } = useAuth();
  const {
    subscription,
    getStatusMessage,
    isPremium,
    isOnTrial,
    getTrialDaysRemaining,
  } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!user) {
      toast.error('Please log in to manage billing');
      return;
    }

    setLoading(true);

    try {
      LoggingService.info('🔗 Starting billing portal process');
      LoggingService.info('🔗 User ID:', user?.uid);

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../firebase');

      LoggingService.info('🔗 Functions instance:', functions);

      // Create a customer portal session using the same pattern as checkout
      const createPortalSession = httpsCallable(
        functions,
        'createPortalSession'
      );

      LoggingService.info('🔗 Calling createPortalSession function');

      const result = await createPortalSession({
        userId: user?.uid,
      });

      LoggingService.info('✅ Portal session created:', result);
      LoggingService.info('✅ Portal URL:', result.data?.url);

      // Redirect directly to the portal URL (no need for Stripe SDK here)
      if (result.data?.url) {
        window.open(result.data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      LoggingService.error('❌ Error creating portal session:', error);
      LoggingService.error('❌ Error message:', error.message);
      LoggingService.error('❌ Error code:', error.code);

      // Show user-friendly error message
      toast.error(
        'Unable to open billing portal. Please contact support at support@mycardtracker.com.au'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (isPremium) return 'text-green-600 dark:text-green-400';
    if (isOnTrial) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getStatusBadgeColor = () => {
    if (isPremium)
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (isOnTrial)
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    return 'bg-gray-100 dark:bg-[#0F0F0F] text-gray-800 dark:text-gray-200';
  };

  const getPlanName = () => {
    if (isPremium) return 'Premium';
    if (isOnTrial) return 'Free Trial';
    return 'Free';
  };

  const getStatusIcon = () => {
    if (isPremium) return 'check_circle';
    if (isOnTrial) return 'schedule';
    return 'info';
  };

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0F0F0F]">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Current Plan
          </h4>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor()}`}
          >
            {getPlanName()}
          </span>
        </div>

        <div className="mb-2 flex items-center space-x-2">
          <Icon
            name={getStatusIcon()}
            className={`text-lg ${getStatusColor()}`}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {getStatusMessage()}
          </span>
        </div>

        {/* Trial specific info */}
        {isOnTrial && (
          <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <div className="flex items-center space-x-2">
              <Icon
                name="schedule"
                className="text-sm text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {getTrialDaysRemaining()} day
                {getTrialDaysRemaining() !== 1 ? 's' : ''} remaining in your
                free trial
              </span>
            </div>
          </div>
        )}

        {/* Premium benefits */}
        {isPremium && (
          <div className="mt-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <div className="flex items-center space-x-2">
              <Icon
                name="check_circle"
                className="text-sm text-green-600 dark:text-green-400"
              />
              <span className="text-sm text-green-700 dark:text-green-300">
                All premium features unlocked
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Billing Management */}
      {(isPremium || subscription?.customerId) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#0F0F0F]">
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
            Billing Management
          </h4>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Manage your subscription, update payment methods, view billing
            history, or cancel your subscription.
          </p>

          <Button
            variant="outline"
            onClick={handleManageBilling}
            loading={loading}
            iconLeft={<Icon name="credit_card" />}
            className="w-full sm:w-auto"
          >
            Manage Billing
          </Button>
        </div>
      )}

      {/* Upgrade Section for Free Users */}
      {!isPremium && !isOnTrial && (
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
          <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Upgrade to Premium
          </h4>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Unlock all features including unlimited collections, marketplace
            selling, and advanced tools.
          </p>

          <Button
            variant="primary"
            onClick={() => (window.location.href = '/upgrade')}
            iconLeft={<Icon name="upgrade" />}
            className="w-full sm:w-auto"
          >
            Upgrade Now
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;
