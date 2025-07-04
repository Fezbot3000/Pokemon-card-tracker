import React, { useState } from 'react';
import { useAuth } from '../../design-system/contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import Button from '../../design-system/atoms/Button';
import Icon from '../../design-system/atoms/Icon';
import { toast } from 'react-hot-toast';

/**
 * SubscriptionStatus Component
 * 
 * Displays user's subscription status and provides access to Stripe customer portal
 */
const SubscriptionStatus = () => {
  const { user } = useAuth();
  const { subscription, getStatusMessage, isPremium, isOnTrial, getTrialDaysRemaining } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleManageBilling = async () => {
    if (!user) {
      toast.error('Please log in to manage billing');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔗 Starting billing portal process');
      console.log('🔗 User ID:', user?.uid);
      
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../firebase');
      
      console.log('🔗 Functions instance:', functions);
      
      // Create a customer portal session using the same pattern as checkout
      const createPortalSession = httpsCallable(functions, 'createPortalSession');
      
      console.log('🔗 Calling createPortalSession function');
      
      const result = await createPortalSession({
        userId: user?.uid
      });
      
      console.log('✅ Portal session created:', result);
      console.log('✅ Portal URL:', result.data?.url);
      
      // Redirect directly to the portal URL (no need for Stripe SDK here)
      if (result.data?.url) {
        window.open(result.data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
      
    } catch (error) {
      console.error('❌ Error creating portal session:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      
      // Show user-friendly error message
      toast.error('Unable to open billing portal. Please contact support at support@mycardtracker.com.au');
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
    if (isPremium) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (isOnTrial) return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
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
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Current Plan</h4>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor()}`}>
            {getPlanName()}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 mb-2">
          <Icon name={getStatusIcon()} className={`text-lg ${getStatusColor()}`} />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {getStatusMessage()}
          </span>
        </div>

        {/* Trial specific info */}
        {isOnTrial && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="schedule" className="text-blue-600 dark:text-blue-400 text-sm" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {getTrialDaysRemaining()} day{getTrialDaysRemaining() !== 1 ? 's' : ''} remaining in your free trial
              </span>
            </div>
          </div>
        )}

        {/* Premium benefits */}
        {isPremium && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="check_circle" className="text-green-600 dark:text-green-400 text-sm" />
              <span className="text-sm text-green-700 dark:text-green-300">
                All premium features unlocked
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Billing Management */}
      {(isPremium || subscription?.customerId) && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Billing Management</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage your subscription, update payment methods, view billing history, or cancel your subscription.
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
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Upgrade to Premium</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Unlock all features including unlimited collections, marketplace selling, and advanced tools.
          </p>
          
          <Button
            variant="primary"
            onClick={() => window.location.href = '/upgrade'}
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