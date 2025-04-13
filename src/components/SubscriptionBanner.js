import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../design-system';
import { toast } from 'react-hot-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * SubscriptionBanner component shows a banner promoting premium features
 * Can be displayed in various contexts throughout the app
 * 
 * @param {Object} props - Component props 
 * @param {string} props.type - Banner type: 'compact', 'inline', or 'full'
 * @param {string} props.feature - Name of the premium feature being promoted
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onUpgrade - Optional callback when upgrade button is clicked
 * @returns {React.ReactNode}
 */
const SubscriptionBanner = ({ 
  type = 'full', 
  feature = 'Cloud Backup',
  className = '',
  onUpgrade
}) => {
  const { subscriptionStatus, isLoading } = useSubscription();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  
  // Handler for upgrading to premium with direct Stripe checkout
  const handleUpgradeClick = useCallback(async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('You must be logged in to upgrade');
      return;
    }
    
    // Call the onUpgrade callback if provided
    if (onUpgrade) {
      onUpgrade();
    }
    
    // Instead of creating a checkout session, simply redirect to the pricing page
    navigate('/dashboard/pricing');
    
  }, [currentUser, onUpgrade, navigate]);
  
  // Don't show if loading or if user already has premium
  if (isLoading || subscriptionStatus.status === 'active') {
    return null;
  }

  // Compact banner for small spaces
  if (type === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg px-4 py-2 shadow-md text-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-yellow-300 text-sm">⭐ Premium</span>
          <span className="hidden sm:inline">Upgrade for {feature} and more!</span>
          <button 
            onClick={handleUpgradeClick}
            disabled={isCreatingCheckout}
            className="whitespace-nowrap bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-medium transition-colors"
          >
            {isCreatingCheckout ? 'Loading...' : 'Upgrade'}
          </button>
        </div>
      </div>
    );
  }
  
  // Inline banner for sidebar or narrow columns
  if (type === 'inline') {
    return (
      <div className={`bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg p-3 shadow-md ${className}`}>
        <div className="flex items-center mb-2">
          <span className="material-icons text-yellow-300 mr-1 text-sm">star</span>
          <span className="font-medium text-sm">Premium Feature</span>
        </div>
        <p className="text-sm mb-2">
          {feature} requires a premium subscription.
        </p>
        <button 
          onClick={handleUpgradeClick}
          disabled={isCreatingCheckout}
          className="w-full bg-white/20 hover:bg-white/30 py-1.5 px-3 rounded font-medium transition-colors text-center block text-sm"
        >
          {isCreatingCheckout ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-2"></span>
              Loading...
            </span>
          ) : (
            'View Plans'
          )}
        </button>
      </div>
    );
  }
  
  // Full banner (default)
  return (
    <div className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 shadow-md ${className}`}>
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-3 md:mb-0">
          <span className="material-icons mr-2 text-yellow-300">star</span>
          <span className="font-medium">Premium Feature</span>
        </div>
        <div className="flex-grow text-center md:text-left md:ml-4 md:mr-4">
          <p>{feature} requires a premium subscription. Upgrade to access cloud backup and more!</p>
        </div>
        <button 
          onClick={handleUpgradeClick}
          disabled={isCreatingCheckout}
          className="mt-3 md:mt-0 px-4 py-2 bg-yellow-400 text-gray-900 font-medium rounded-lg hover:bg-yellow-300 transition-colors whitespace-nowrap"
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
};

export default SubscriptionBanner; 