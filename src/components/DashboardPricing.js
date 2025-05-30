import React, { useState, useEffect, useMemo } from 'react';
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
  // or just completed payment, redirect them back to dashboard.
  useEffect(() => {
    if (subscriptionStatus.status === 'active' && !isLoadingSubscription) {
      if (isPostPayment) { // Only show toast if coming from payment
        toast.success('Subscription active - Redirecting to dashboard', {
          id: 'subscription-check', // Use a consistent ID to allow dismissal or update
          duration: 2000
        });
        // Clear the post-payment flag after showing the toast
        localStorage.removeItem('recentPayment'); 
        // No need to change isPostPayment state directly, as location.search won't change until navigation
      }
      
      // Redirect to dashboard
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500); // Delay allows toast to be seen if shown
      
      return () => clearTimeout(timer);
    }
  }, [subscriptionStatus, isLoadingSubscription, navigate, isPostPayment]); // Added navigate and isPostPayment

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
  const handleSubscribeClick = async () => {
    console.log('Subscribe button clicked');
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      console.error('No user logged in');
      toast.error('Please log in to subscribe');
      return;
    }

    if (!currentUser.uid || !currentUser.email) {
      console.error('User missing required properties:', {
        uid: currentUser.uid,
        email: currentUser.email
      });
      toast.error('User information incomplete. Please try logging out and back in.');
      return;
    }

    console.log('User authenticated, proceeding to checkout');
    
    try {
      // Import Firebase functions
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      // Get the price ID from environment variable
      const priceId = process.env.REACT_APP_STRIPE_PRICE_ID;
      
      if (!priceId) {
        console.error('Stripe price ID not configured');
        toast.error('Payment system not configured. Please contact support.');
        return;
      }
      
      console.log('Creating checkout session with price ID:', priceId);
      
      // Call the Firebase function to create a checkout session
      const result = await createCheckoutSession({
        priceId: priceId,
        baseUrl: window.location.origin,
        successUrl: `${window.location.origin}/?checkout_success=true`,
        cancelUrl: `${window.location.origin}/dashboard/pricing`
      });
      
      console.log('Checkout session created:', result.data);
      
      if (result.data.success && result.data.url) {
        console.log('Redirecting to checkout:', result.data.url);
        window.location.href = result.data.url;
      } else {
        console.error('Failed to create checkout session:', result.data);
        toast.error('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process. Please try again.');
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F0F] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header with Sign Out */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-2xl text-gray-600 dark:text-gray-400">credit_card</span>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <span className="material-icons text-sm mr-1">logout</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full mb-4">
            <span className="material-icons text-blue-600 dark:text-blue-400 text-2xl">star</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Complete Your Setup
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Subscribe to unlock all features including cloud backup, multi-device sync, and unlimited card tracking!
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white dark:bg-[#1B2131] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Popular Badge */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-2 px-4">
            <span className="text-sm font-semibold">Most Popular Plan</span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Plan Header */}
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Premium Plan
              </h3>
              <div className="flex items-baseline justify-center space-x-1">
                <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">$12.99</span>
                <span className="text-lg text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Cancel anytime • 30-day money-back guarantee
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/20 rounded-full p-1">
                  <span className="material-icons text-green-600 dark:text-green-400 text-lg">check</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Unlimited Card Tracking</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Track as many cards as you want across multiple collections</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/20 rounded-full p-1">
                  <span className="material-icons text-green-600 dark:text-green-400 text-lg">check</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Cloud Backup & Sync</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automatic backups and sync across all your devices</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/20 rounded-full p-1">
                  <span className="material-icons text-green-600 dark:text-green-400 text-lg">check</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Advanced Analytics</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Detailed insights into your collection's performance</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/20 rounded-full p-1">
                  <span className="material-icons text-green-600 dark:text-green-400 text-lg">check</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Priority Support</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get help faster with priority customer support</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/20 rounded-full p-1">
                  <span className="material-icons text-green-600 dark:text-green-400 text-lg">check</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Unlimited Collections</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Organize your cards into as many collections as you need</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleSubscribeClick}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
            >
              Subscribe Now
            </button>

            {/* Security Notice */}
            <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="material-icons text-sm">lock</span>
              <span>Secure payment processed by Stripe</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Questions? Contact us at{' '}
            <a href="mailto:support@mycardtracker.com.au" className="text-blue-600 dark:text-blue-400 hover:underline">
              support@mycardtracker.com.au
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPricing; 