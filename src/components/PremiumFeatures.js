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
  if (subscriptionStatus.status !== 'active') {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

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
          <Link to="/dashboard" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PremiumFeatures;
