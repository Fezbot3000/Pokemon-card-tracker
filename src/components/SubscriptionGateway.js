import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { toast } from 'react-hot-toast';
import { useAuth } from '../design-system';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * SubscriptionGateway - A component that checks if users have a valid subscription
 * before allowing access to premium features.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The protected content to render
 * @param {boolean} props.requireSubscription - Whether a subscription is required for access
 * @param {React.ReactNode} props.fallback - Optional custom fallback to show instead of redirecting
 * @returns {React.ReactNode}                                                                                             
 */
function SubscriptionGateway({ 
  children, 
  requireSubscription = true,
  fallback = null
}) {
  const location = useLocation();
  const { subscriptionStatus, isLoading } = useSubscription();
  
  // Show loading state while checking subscription
  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If subscription is not required, render children directly
  if (!requireSubscription) {
    return children;
  }
  
  // If user has an active subscription, render the protected content
  if (subscriptionStatus.status === 'active') {
    return children;
  }
  
  // If custom fallback is provided, render it
  if (fallback) {
    return fallback;
  }
  
  // Otherwise show a toast and redirect to pricing page
  toast.error('This feature requires a premium subscription');
  return <Navigate to="/dashboard/pricing" state={{ from: location }} replace />;
}

/**
 * SubscriptionBanner - A component to display when a feature requires a subscription.
 * Used as a fallback for SubscriptionGateway.
 * 
 * @returns {React.ReactNode}
 */
export function SubscriptionBanner() {
  const { currentUser } = useAuth();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  
  const handleUpgradeClick = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to upgrade');
      return;
    }
    
    // Simply navigate to the pricing page
    window.location.href = '/dashboard/pricing';
  };
  
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 shadow-md mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-3 md:mb-0">
          <span className="material-icons mr-2 text-yellow-300">star</span>
          <span className="font-medium">Premium Feature</span>
        </div>
        <div className="flex-grow text-center md:text-left md:ml-4 md:mr-4">
          <p>This feature requires a premium subscription. Upgrade to access cloud backup and more!</p>
        </div>
        <button 
          onClick={handleUpgradeClick}
          disabled={isCreatingCheckout}
          className="mt-3 md:mt-0 px-4 py-2 bg-yellow-400 text-gray-900 font-medium rounded-lg hover:bg-yellow-300 transition-colors"
        >
          {isCreatingCheckout ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900 mr-2"></span>
              Loading...
            </>
          ) : (
            'Upgrade Now'
          )}
        </button>
      </div>
    </div>
  );
}

export default SubscriptionGateway; 