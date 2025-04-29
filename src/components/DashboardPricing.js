import React, { useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/**
 * DashboardPricing - A pricing component for use inside the dashboard for logged-in users
 * This provides a similar UI to the standalone Pricing page but is integrated with the dashboard layout
 */
function DashboardPricing() {
  const { currentUser, signOut } = useAuth();
  const { subscriptionStatus, isLoading: isLoadingSubscription, refreshSubscriptionStatus, fixSubscription } = useSubscription();
  const [tableError, setTableError] = useState(false);
  const [isPostPayment, setIsPostPayment] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);

  // Show loading state when checking subscription
  useEffect(() => {
    if (isLoadingSubscription) {
      toast.loading('Checking subscription status...', {
        id: 'subscription-check',
        duration: 5000
      });
    }
    // Optionally, clear the toast when loading is done
    return () => {
      if (!isLoadingSubscription) {
        toast.dismiss('subscription-check');
      }
    };
  }, [isLoadingSubscription]);

  // Detect if user is coming from a successful payment
  useEffect(() => {
    const isFromPayment = location.search.includes('checkout_success=true') || 
      localStorage.getItem('recentPayment') === 'true';
      
    if (isFromPayment) {
      setIsPostPayment(true);
    }
  }, [location]);

  // Log when this component is mounted
  useEffect(() => {
    // Removed: console.log("DashboardPricing component mounted", { 
    //   subscriptionStatus, 
    //   isLoading: isLoadingSubscription,
    //   isPostPayment,
    //   uid: currentUser?.uid
    // });
  }, [subscriptionStatus, isLoadingSubscription, currentUser, isPostPayment]);

  // If user has active subscription and manually navigates to pricing, 
  // redirect them back to dashboard after a short delay
  useEffect(() => {
    if (subscriptionStatus.status === 'active' && !isLoadingSubscription) {
      // Show a toast instead of the full screen
      toast.success('Subscription active - Redirecting to dashboard', {
        id: 'subscription-check',
        duration: 2000
      });
      
      // Redirect immediately to dashboard
      const timer = setTimeout(() => {
        // Removed: console.log("User has active subscription, redirecting to dashboard");
        const goToDashboard = () => {
          navigate('/dashboard', { replace: true });
        };
        goToDashboard();
      }, 500); // Shorter delay, since we're using a toast now
      
      return () => clearTimeout(timer);
    }
  }, [subscriptionStatus, isLoadingSubscription]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
      navigate('/');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  // Add handleSubscribeClick function
  const handleSubscribeClick = () => {
    if (!currentUser) {
      toast.error('You must be logged in to subscribe');
      return;
    }
    
    // Redirect to Stripe checkout
    window.location.href = `https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${currentUser.uid}&prefilled_email=${currentUser.email}`;
  };

  // Function to safely navigate back to dashboard
  const goToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  // Updated Stripe billing URL - only this one is valid and working
  const stripeBillingUrl = "https://billing.stripe.com/p/login/28o5kZeRc9lHdHydQQ";

  // Add function to handle the "Manage Your Subscription" button click
  const handleManageSubscription = async () => {
    setIsCreatingPortalSession(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createPortalSession = httpsCallable(functions, 'createCustomerPortalSession');
      
      // Call the Cloud Function to get a fresh session URL
      const { data } = await createPortalSession();
      
      if (data && data.url) {
        // Removed: console.log('Portal session created successfully, redirecting to:', data.url);
        // Redirect to the Stripe Customer Portal
        window.open(data.url, '_blank');
      } else {
        // Removed: console.error('No portal URL returned from function:', data);
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
      // Removed: console.error('Error creating portal session:', error);
      
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

  // Early return after all hooks
  if (isLoadingSubscription) {
    return null;
  }

  // If we detected checkout_success but verification failed, show a special message
  if (isPostPayment && subscriptionStatus.status !== 'active') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-full mb-4">
            <span className="material-icons text-yellow-600 dark:text-yellow-400 text-3xl">info</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Received
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            Your payment was successful, but we're still verifying your subscription status. 
            This can take a few moments to process.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-300">Current Status:</span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">Processing</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors mb-3 sm:mb-0"
            >
              <span className="material-icons text-sm mr-1">refresh</span>
              Refresh Page
            </button>
            <button
              onClick={goToDashboard}
              className="inline-flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              <span className="material-icons text-sm mr-1">dashboard</span>
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user already has a subscription, don't show the full screen - just return null
  // We're handling this with the useEffect and toast above
  if (subscriptionStatus.status === 'active') {
    return null;
  }

  // Show the pricing section for non-subscribers
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-end items-center mb-4">
        <button
          onClick={handleSignOut}
          className="inline-flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <span className="material-icons text-sm mr-1">logout</span>
          Sign Out
        </button>
      </div>

      <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Upgrade to Premium
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Get access to all premium features including cloud backup, multi-device sync, and more!
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg p-8 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">Premium Plan</span>
              <div className="text-right">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$12.99</span>
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-3">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Track unlimited cards</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-3">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Advanced analytics</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-3">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Unlimited collections</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-3">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Automatic cloud backup</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-3">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Sync across all devices</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-3">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Priority customer support</span>
              </li>
            </ul>
            <button
              onClick={handleSubscribeClick}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold py-4 px-6 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1"
            >
              Subscribe Now
            </button>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              Secure payment processed by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPricing; 