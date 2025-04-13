import React, { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { toast } from 'react-hot-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * SubscriptionStatus component that displays premium subscription details
 * This is used in the Settings > Account tab
 */
export default function SubscriptionStatus() {
  const { subscriptionStatus } = useSubscription();
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  
  if (subscriptionStatus.status !== 'active') {
    return null;
  }

  // Function to create and redirect to Stripe Customer Portal
  const handleManageSubscription = async () => {
    setIsCreatingPortalSession(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createPortalSession = httpsCallable(functions, 'createCustomerPortalSession');
      
      // Get the current URL origin for the return URL
      const baseUrl = window.location.origin;
      console.log('Using base URL for portal return:', baseUrl);
      
      // Call the Cloud Function to get a fresh session URL with the baseUrl
      const { data } = await createPortalSession({ 
        baseUrl,
        returnUrl: `${baseUrl}/dashboard`
      });
      
      if (data && data.url) {
        console.log('Portal session created successfully, redirecting to:', data.url);
        // Redirect to the Stripe Customer Portal
        window.open(data.url, '_blank');
      } else {
        console.error('No portal URL returned from function:', data);
        // Use a custom toast style that's more visible
        toast.error('Could not access subscription management portal', {
          style: {
            background: '#f44336',
            color: '#fff',
            fontWeight: 'bold'
          },
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      
      // Get more detailed error information
      let errorMessage = 'Failed to access subscription management portal';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      // Use a custom toast style that's more visible
      toast.error(errorMessage, {
        style: {
          background: '#f44336',
          color: '#fff',
          fontWeight: 'bold'
        },
        duration: 4000
      });
    } finally {
      setIsCreatingPortalSession(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1B2131] rounded-lg shadow-sm p-6 mb-6">
      <div className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-4">
        <span className="material-icons text-green-600 dark:text-green-400 text-3xl">check_circle</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        You're all set with Premium!
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Thanks for being a premium subscriber. You have access to all premium features.
      </p>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700 dark:text-gray-300">Current Plan:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{subscriptionStatus.plan || 'Premium'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Status:</span>
          <span className="inline-flex items-center font-semibold text-green-600 dark:text-green-400">
            <span className="material-icons mr-1 text-sm">check_circle</span> Active
          </span>
        </div>
      </div>
      <div className="mt-6">
        <button 
          onClick={handleManageSubscription}
          disabled={isCreatingPortalSession}
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          {isCreatingPortalSession ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
              Loading...
            </>
          ) : (
            <>
              <span className="material-icons text-sm mr-1">settings</span>
              Manage Your Subscription
            </>
          )}
        </button>
      </div>
    </div>
  );
} 