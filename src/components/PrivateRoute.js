import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';

/**
 * PrivateRoute component that redirects to login if user is not authenticated
 * Can optionally check for subscription status as well
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The protected content to render
 * @param {boolean} props.requireSubscription - Whether a subscription is required
 * @returns {React.ReactNode}
 */
export default function PrivateRoute({ 
  children, 
  requireSubscription = false 
}) {
  const { currentUser, loading: authLoading } = useAuth();
  const { subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();
  const location = useLocation();

  // Show loading indicator while auth state is being determined
  if (authLoading || (requireSubscription && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check subscription if required
  if (requireSubscription && subscriptionStatus.status !== 'active') {
    // Redirect to pricing page
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  // Render the protected content if authenticated and subscription check passes
  return children;
} 