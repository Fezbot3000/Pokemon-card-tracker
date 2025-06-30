import React from 'react';
import { useAuth } from '../design-system/contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

/**
 * SubscriptionDebug Component
 * 
 * Debug component to show subscription state - only for development
 */
const SubscriptionDebug = () => {
  const { user, subscriptionData } = useAuth();
  const subscription = useSubscription();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50 opacity-90">
      <div className="font-bold mb-2">🐛 Subscription Debug</div>
      <div className="space-y-1">
        <div><strong>User:</strong> {user?.email || 'Not logged in'}</div>
        <div><strong>Status:</strong> {subscriptionData.status}</div>
        <div><strong>Plan:</strong> {subscriptionData.planType}</div>
        <div><strong>Days Remaining:</strong> {subscriptionData.daysRemaining}</div>
        <div><strong>Trial Ends:</strong> {subscriptionData.trialEndsAt ? new Date(subscriptionData.trialEndsAt).toLocaleDateString() : 'N/A'}</div>
        <div><strong>Is On Trial:</strong> {subscription.isOnTrial ? 'Yes' : 'No'}</div>
        <div><strong>Is Premium:</strong> {subscription.isPremium ? 'Yes' : 'No'}</div>
        <div><strong>Is Free:</strong> {subscription.isFree ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
};

export default SubscriptionDebug; 
