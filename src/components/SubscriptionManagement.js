import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import { toast } from 'react-hot-toast';
import SubscriptionStatus from './SubscriptionStatus';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * SubscriptionManagement component for displaying subscription status
 * and managing subscriptions in the Settings modal.
 */
const SubscriptionManagement = ({ isMobile, onClose }) => {
  const { subscriptionStatus, isLoading, refreshSubscriptionStatus, fixSubscription } = useSubscription();
  const { currentUser } = useAuth();
  const [isFixing, setIsFixing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const navigate = useNavigate();
  
  // Handler for upgrading to premium - directly creates a Stripe checkout session
  const handleUpgradeClick = useCallback(async () => {
    if (!currentUser) {
      toast.error('You must be logged in to upgrade');
      return;
    }
    
    // Close the settings modal if provided
    if (onClose) {
      onClose();
    }
    
    // Navigate to the pricing page
    navigate('/dashboard/pricing');
    
  }, [currentUser, onClose, navigate]);

  // Prevent unnecessary renders by memoizing callback functions
  const handleFixSubscription = useCallback(async () => {
    if (!currentUser) return;
    
    setIsFixing(true);
    try {
      const result = await fixSubscription();
      
      if (result.success) {
        toast.success('Subscription status fixed successfully!');
      } else {
        toast.error(result.message || 'Could not fix subscription status');
      }
    } catch (error) {
      console.error('Error fixing subscription:', error);
      toast.error('Failed to fix subscription status');
    } finally {
      setIsFixing(false);
    }
  }, [currentUser, fixSubscription]);

  // Memoized handler for manual refresh
  const handleRefreshStatus = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshSubscriptionStatus();
      toast.success('Subscription status updated');
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      toast.error('Failed to refresh subscription status');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshSubscriptionStatus, isRefreshing]);

  // Simple loading state
  if (isLoading) {
    return (
      <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Subscription Status</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Subscription Status</h3>
      
      {subscriptionStatus.status === 'active' ? (
        <SubscriptionStatus />
      ) : (
        /* Subscription Status Card for non-premium users */
        <div className="rounded-lg border p-4 mb-6 bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/30">
          <div className="flex items-start">
            <span className="material-icons text-gray-400 mr-3">workspace_premium</span>
            
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-300">
                Subscription Required
              </h4>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                A premium subscription is required to access features like cloud backup and multi-device sync.
              </p>

              {subscriptionStatus.status === 'error' && (
                <div className="mt-3">
                  <button 
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <span className="material-icons mr-1 text-sm">refresh</span>
                    {isRefreshing ? 'Checking...' : 'Retry subscription check'}
                  </button>
                  <p className="text-xs text-red-500 mt-1">
                    {subscriptionStatus.message || 'An error occurred checking your subscription'}
                  </p>
                </div>
              )}

              {/* Fix Subscription Button - only show when user is logged in but subscription is not active */}
              {currentUser && subscriptionStatus.status !== 'active' && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    If you believe you should have premium access, click below to fix subscription issues:
                  </p>
                  <button
                    onClick={handleFixSubscription}
                    disabled={isFixing}
                    className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    <span className="material-icons mr-1 text-sm">{isFixing ? 'sync' : 'build'}</span>
                    {isFixing ? 'Fixing Subscription...' : 'Fix Subscription Issues'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Premium Feature Banner - similar to what's in General tab */}
      {subscriptionStatus.status !== 'active' && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-yellow-300 opacity-10">
            <span className="material-icons" style={{ fontSize: '6rem' }}>star</span>
          </div>
          
          <div className="flex items-start">
            <div className="mr-3 p-2 bg-white/20 rounded-full">
              <span className="material-icons text-yellow-300">workspace_premium</span>
            </div>
            
            <div className="flex-grow">
              <h4 className="text-lg font-semibold mb-1">Premium Features</h4>
              <p className="text-sm opacity-90 mb-3">
                Cloud backup and other premium features require an active subscription. Upgrade to unlock full access!
              </p>
              
              <button
                onClick={handleUpgradeClick}
                disabled={isCreatingCheckout}
                className="inline-flex items-center bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isCreatingCheckout ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900 mr-2"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm mr-1">upgrade</span>
                    Upgrade Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement; 