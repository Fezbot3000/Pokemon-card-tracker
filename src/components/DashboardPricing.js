import React, { useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
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
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Log when this component is mounted
  useEffect(() => {
    console.log('DashboardPricing component mounted');
  }, []);

  // If user has active subscription and manually navigates to pricing, 
  // or just completed payment, redirect them back to dashboard.
  useEffect(() => {
    if (subscriptionStatus.status === 'active' && !isLoadingSubscription) {
      navigate('/dashboard', { replace: true });
    }
  }, [subscriptionStatus, isLoadingSubscription, navigate]);

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
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      const result = await createCheckoutSession({
        priceId: process.env.REACT_APP_STRIPE_PRICE_ID,
        baseUrl: window.location.origin,
        successUrl: `${window.location.origin}/post-checkout`,
        cancelUrl: `${window.location.origin}/dashboard/pricing`
      });

      if (result.data && result.data.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      let errorMessage = 'Failed to create checkout session. Please try again.';
      
      if (error.code === 'unauthenticated') {
        errorMessage = 'Please log in to subscribe.';
        navigate('/login');
        return;
      } else if (error.message?.includes('price')) {
        errorMessage = 'Invalid pricing configuration. Please contact support.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
      const createPortalSession = httpsCallable(functions, 'createCustomerPortalSession');
      
      // Call the Cloud Function to get a fresh session URL
      const { data } = await createPortalSession();
      
      if (data && data.url) {
        // Redirect to the Stripe Customer Portal
        window.open(data.url, '_blank');
      } else {
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