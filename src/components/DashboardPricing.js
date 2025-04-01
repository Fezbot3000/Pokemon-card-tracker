import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/**
 * DashboardPricing - A pricing component for use inside the dashboard for logged-in users
 * This provides a similar UI to the standalone Pricing page but is integrated with the dashboard layout
 */
function DashboardPricing() {
  const { currentUser } = useAuth();
  const { subscriptionStatus, isLoading: isLoadingSubscription, refreshSubscriptionStatus, fixSubscription } = useSubscription();
  const [tableError, setTableError] = useState(false);
  const [isPostPayment, setIsPostPayment] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Add handleSubscribeClick function
  const handleSubscribeClick = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to subscribe');
      return;
    }

    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      // Get the current URL origin for success/cancel URLs
      const baseUrl = window.location.origin;
      
      const { data } = await createCheckoutSession({
        baseUrl,
        successUrl: `${baseUrl}/dashboard?checkout_success=true`,
        cancelUrl: `${baseUrl}/dashboard/pricing`,
        productId: 'prod_S2EYR7XWZewDLv',
        priceData: {
          currency: 'usd',
          unit_amount: 1299, // $12.99
          recurring: {
            interval: 'month'
          }
        }
      });
      
      if (data && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error('Could not create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start subscription process');
    }
  };

  // Detect if user is coming from a successful payment
  useEffect(() => {
    const isFromPayment = location.search.includes('checkout_success=true') || 
      localStorage.getItem('recentPayment') === 'true';
      
    if (isFromPayment) {
      console.log('Detected checkout_success parameter in DashboardPricing');
      setIsPostPayment(true);
    }
  }, [location.search]);

  // Log when this component is mounted
  useEffect(() => {
    console.log("DashboardPricing component mounted", { 
      subscriptionStatus, 
      isLoading: isLoadingSubscription,
      isPostPayment,
      uid: currentUser?.uid
    });
  }, [subscriptionStatus, isLoadingSubscription, currentUser, isPostPayment]);

  // Function to safely navigate back to dashboard
  const goToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };
  
  // If user has active subscription, redirect to dashboard
  useEffect(() => {
    if (subscriptionStatus.status === 'active' && !isLoadingSubscription) {
      console.log("User has active subscription, redirecting to dashboard");
      goToDashboard();
    }
  }, [subscriptionStatus, isLoadingSubscription]);
  
  // Updated Stripe billing URL - only this one is valid and working
  const stripeBillingUrl = "https://billing.stripe.com/p/login/28o5kZeRc9lHdHydQQ";

  // Add function to handle the "Manage Your Subscription" button click
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  
  const handleManageSubscription = async () => {
    setIsCreatingPortalSession(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createPortalSession = httpsCallable(functions, 'createCustomerPortalSession');
      
      // Call the Cloud Function to get a fresh session URL
      const { data } = await createPortalSession();
      
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

  // Show loading state when checking subscription
  if (isLoadingSubscription) {
    return (
      <div className="p-6 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300">Checking your subscription status...</p>
      </div>
    );
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

  // If user already has a subscription, show a different message
  if (subscriptionStatus.status === 'active') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-4">
            <span className="material-icons text-green-600 dark:text-green-400 text-3xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            You're all set with Premium!
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            Thanks for being a premium subscriber. You have access to all premium features.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-300">Current Plan:</span>
              <span className="font-semibold text-gray-900 dark:text-white">Premium</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Status:</span>
              <span className="inline-flex items-center font-semibold text-green-600 dark:text-green-400">
                <span className="material-icons mr-1 text-sm">check_circle</span> Active
              </span>
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-4">
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
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              <span className="material-icons text-sm mr-1">dashboard</span>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show the pricing section for non-subscribers
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">Premium Plan</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">$12.99<span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span></span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-2">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Track unlimited cards</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-2">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Advanced analytics</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-2">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Unlimited collections</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-2">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Automatic cloud backup</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-2">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Sync across all devices</span>
              </li>
              <li className="flex items-center">
                <span className="material-icons text-green-500 mr-2">check_circle</span>
                <span className="text-gray-700 dark:text-gray-300">Priority customer support</span>
              </li>
            </ul>
            <button
              onClick={handleSubscribeClick}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
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