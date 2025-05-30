import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

const ProtectedRoute = ({ children, requireSubscription = false }) => {
  const { currentUser, loading } = useAuth();
  const { status: subscriptionStatus, isLoading: subscriptionLoading } = useSubscriptionStatus();

  // Show loading while checking auth or subscription
  if (loading || (requireSubscription && subscriptionLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If subscription is required, check subscription status
  if (requireSubscription && subscriptionStatus !== 'active') {
    return <Navigate to="/subscribe" replace />;
  }

  return children;
};

export default ProtectedRoute;
