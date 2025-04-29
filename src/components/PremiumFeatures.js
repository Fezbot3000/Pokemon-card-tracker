import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';

function PremiumFeatures() {
  const { currentUser, loading: authLoading } = useAuth();
  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  const location = useLocation();

  // Show loading indicator while auth or subscription state is being determined
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to pricing if subscription is not active
  if (!subscriptionLoading && subscriptionStatus.status !== 'active') {
    // Force a refresh if we land here and are not active
    if (
      currentUser &&
      typeof subscriptionStatus.refreshSubscriptionStatus === 'function'
    ) {
      subscriptionStatus.refreshSubscriptionStatus();
    }
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  React.useEffect(() => {
    // If subscription status is not loading and not active, force a refresh
    if (
      currentUser &&
      !authLoading &&
      !subscriptionLoading &&
      subscriptionStatus.status !== 'active'
    ) {
      // Try to refresh subscription status if the user just signed in
      if (typeof window !== 'undefined' && window.localStorage) {
        const lastUser = window.localStorage.getItem('lastUserId');
        if (lastUser !== currentUser.uid) {
          // User has changed, force a refresh
          if (typeof subscriptionStatus.refreshSubscriptionStatus === 'function') {
            subscriptionStatus.refreshSubscriptionStatus();
          }
          window.localStorage.setItem('lastUserId', currentUser.uid);
        }
      }
    }
  }, [currentUser, authLoading, subscriptionLoading, subscriptionStatus]);

  // Render the premium content if authenticated and subscribed
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0F0F0F] p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#1B2131] rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Premium Features
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          This is a premium-only section. You have access because you're a premium subscriber!
        </p>
        {/* Placeholder for actual premium content */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <p className="text-center text-gray-500 dark:text-gray-400">Your premium features will appear here.</p>
        </div>
        <div className="flex justify-center mt-6">
          <Link to="/signup" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PremiumFeatures;
