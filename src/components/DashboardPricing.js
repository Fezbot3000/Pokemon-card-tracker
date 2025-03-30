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
  
  // If user has active subscription and manually navigates to pricing, 
  // redirect them back to dashboard after a short delay
  useEffect(() => {
    if (subscriptionStatus.status === 'active' && !isLoadingSubscription) {
      // Small delay to prevent immediate bounce
      const timer = setTimeout(() => {
        console.log("User has active subscription, redirecting to dashboard");
        goToDashboard();
      }, 2000); // 2 second delay before redirect
      
      return () => clearTimeout(timer);
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
              <span className="font-semibold text-gray-900 dark:text-white">{subscriptionStatus.plan || 'Premium'}</span>
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

  // Add a new function to create a checkout session using Firebase
  const createCheckoutSession = async () => {
    if (!currentUser) {
      console.error('No user is available for subscription');
      alert('Error: No user available for subscription. Please sign in again.');
      return;
    }
    
    try {
      // Show loading indication
      alert('Setting up your checkout... Please wait.');
      
      // Get the current URL base
      const baseUrl = window.location.origin;
      
      // Make sure we have a properly formatted success URL with the checkout_success parameter
      const successUrl = `${baseUrl}/dashboard?checkout_success=true`;
      const cancelUrl = `${baseUrl}/dashboard/pricing`;
      
      console.log('Using success URL:', successUrl);
      
      // Call the Firebase function to create a checkout session
      const functions = getFunctions(undefined, 'us-central1');
      const createCheckout = httpsCallable(functions, 'createCheckoutSession');
      
      console.log('Sending request with baseUrl:', baseUrl);
      
      // Call the function with the necessary parameters
      const result = await createCheckout({ 
        baseUrl,
        successUrl,
        cancelUrl,
        priceId: 'bIY2aL2oC2kBaXe9AA', // Use the pricing ID from your Stripe account
        productId: 'prod_S2EYR7XWZewDLv' // Use the known product ID
      });
      
      console.log('Checkout session created:', result.data);
      
      // Redirect to the Stripe checkout page
      if (result.data && result.data.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL was returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      
      // Extract the detailed error message from Firebase error
      let errorMessage = error.message || 'Unknown error';
      
      // Firebase HTTPs errors have a specific structure
      if (error.code === 'functions/internal') {
        // Try to parse the error details from the message if possible
        if (error.details && typeof error.details === 'string' && error.details.includes('Stripe Error:')) {
          errorMessage = error.details;
        }
      }
      
      // Show a user-friendly error message with instructions
      alert(`Error creating checkout: ${errorMessage}\n\n` + 
        'Please try these troubleshooting steps:\n' +
        '1. Try using the "Test Stripe Price ID" button below to check if the price exists\n' +
        '2. Try the "Try alternative checkout method" link above\n' +
        '3. If problems persist, please contact support');
    }
  };

  // Update the handleSubscribeClick function to work with the new approach
  const handleSubscribeClick = (e) => {
    // Only do this check in development mode
    if (process.env.NODE_ENV === 'development') {
      // Check if we have a valid user
      if (!currentUser) {
        console.error('ERROR: No user is available for subscription');
        e.preventDefault();
        alert('Error: No user available for subscription. Please sign in again.');
        return false;
      }
      
      console.log('Subscription click - User data being sent to Stripe:', {
        userId: currentUser.uid,
        email: currentUser.email
      });
    }
    return true;
  };

  // Updated handleDirectCustomerCreation function without confirmation dialog
  const handleDirectCustomerCreation = (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      console.error('No user is available for subscription');
      alert('Error: No user available for subscription. Please sign in again.');
      return;
    }
    
    // Use the createCheckoutSession function (server-side method)
    createCheckoutSession();
  };

  // Add testing function to debug Stripe customer creation
  const testStripeIntegration = async () => {
    try {
      // Call Firebase function to test Stripe integration
      const functions = getFunctions(undefined, 'us-central1');
      const testFunction = httpsCallable(functions, 'testStripeCustomers');
      
      // Show loading status
      alert('Testing Stripe integration... Please wait.');
      
      // Call the test function
      const result = await testFunction();
      
      // Show the result
      console.log('Stripe test result:', result.data);
      alert(`Stripe test completed! ${result.data.message}`);
    } catch (error) {
      console.error('Error testing Stripe integration:', error);
      alert(`Error testing Stripe integration: ${error.message}`);
    }
  };

  // Add function to test price ID
  const testPriceId = async () => {
    try {
      // Call Firebase function to test the price ID
      const functions = getFunctions(undefined, 'us-central1');
      const testPriceFunction = httpsCallable(functions, 'testStripePrice');
      
      // Show loading status
      alert('Testing Stripe price ID and checking product... Please wait.');
      
      // Call the test function with the priceId and productId
      const result = await testPriceFunction({
        priceId: 'bIY2aL2oC2kBaXe9AA',
        productId: 'prod_S2EYR7XWZewDLv' // Add the known product ID
      });
      
      // Show the result
      console.log('Stripe price test result:', result.data);
      
      // Format the output for the alert
      const testResults = result.data.testResults.map(test => 
        `ID: ${test.id} - Exists: ${test.exists} ${test.exists ? 
          `(${test.price.currency} ${test.price.unit_amount/100})` : 
          `(Error: ${test.error})`}`
      ).join('\n');
      
      const activePrices = result.data.activePrices.map(price => 
        `ID: ${price.id} - ${price.currency} ${price.unit_amount/100}`
      ).join('\n');
      
      const productInfo = result.data.product ? 
        `\n\nProduct Info:\nID: ${result.data.product.id}\nName: ${result.data.product.name}\nActive: ${result.data.product.active}` : 
        '\n\nProduct: Not found';
      
      alert(`Test Results:\n${testResults}\n\nActive Prices (${result.data.activePrices.length}):\n${activePrices}${productInfo}`);
    } catch (error) {
      console.error('Error testing Stripe price:', error);
      alert(`Error testing Stripe price: ${error.message}`);
    }
  };

  // Function to manually force a subscription check
  const forceSubscriptionCheck = async () => {
    try {
      // Show loading indication
      const result = await refreshSubscriptionStatus();
      console.log('Manual subscription check result:', result);
      
      // Check if checkout_success is in URL
      if (location.search.includes('checkout_success=true')) {
        console.log('Detected checkout_success parameter, removing');
        const url = new URL(window.location);
        url.searchParams.delete('checkout_success');
        window.history.replaceState({}, '', url);
      }

      if (result.status === 'active') {
        goToDashboard();
      } else {
        // Try running fix subscription logic
        await fixSubscription();
        // Even if fix fails, go to dashboard anyway
        setTimeout(() => {
          goToDashboard();
        }, 1000);
      }
    } catch (error) {
      console.error('Error during manual subscription check:', error);
      // Even with error, redirect to dashboard
      setTimeout(() => {
        goToDashboard();
      }, 1000);
    }
  };

  return (
    <>
      {/* Full-viewport gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-red-600 via-purple-800 to-green-500 -z-10"></div>
      
      {/* Content container */}
      <div className="relative z-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Payment Success Banner - Show this when we detect checkout_success */}
          {isPostPayment && subscriptionStatus.status !== 'active' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-12">
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-shrink-0 mr-4 mb-4 md:mb-0">
                  <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-800">
                    <span className="material-icons text-3xl text-green-600 dark:text-green-400">check_circle</span>
                  </span>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
                    Payment Successfully Processed!
                  </h3>
                  <p className="text-green-700 dark:text-green-400 mb-4">
                    Your payment has been processed successfully, but we're still waiting for confirmation from our payment processor.
                    This can take a few moments. If your subscription doesn't activate automatically, use the button below.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={forceSubscriptionCheck}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                    >
                      <span className="material-icons mr-1 text-sm">autorenew</span>
                      Verify Subscription Status Now
                    </button>
                    <button
                      onClick={goToDashboard}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none"
                    >
                      <span className="material-icons mr-1 text-sm">dashboard</span>
                      Continue to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Subscription Options */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-6xl font-bold mb-8 text-white">
              Choose Your Plan
            </h1>
            <p className="text-xl sm:text-2xl mb-12 max-w-3xl mx-auto text-gray-100">
              Unlock premium features to enhance your Pokemon card collection management
            </p>
          </div>
          
          {/* Direct subscription button */}
          <div className="text-center mb-8">
            <a
              href={`https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${currentUser?.uid || ''}&prefilled_email=${currentUser?.email || ''}`}
              className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 text-lg font-medium py-4 px-8 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl inline-block"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSubscribeClick}
            >
              Subscribe to Premium - $12.99/month
            </a>
            <p className="text-white mt-2 text-sm">Secure payment processed by Stripe</p>
          </div>
          
          {/* Subscription tiers */}
          <div className="flex flex-col md:flex-row max-w-6xl mx-auto gap-8 mb-16">
            {/* Free Tier */}
            <div className="md:w-1/2 bg-white dark:bg-[#1B2131] shadow-md border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden transform transition-all duration-300 hover:shadow-xl">
              <div className="p-8 flex flex-col h-full">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Free</h2>
                  <div className="flex items-baseline mb-6">
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$0</span>
                    <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">/month</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Perfect for casual collectors just getting started</p>
                  <hr className="border-gray-200 dark:border-gray-700 mb-6" />
                </div>
                
                <div className="space-y-4 flex-grow mb-8">
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Track unlimited cards</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Basic analytics</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Manual local backups</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Unlimited collections</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-red-500 mr-2">cancel</span>
                    <span className="text-gray-600 dark:text-gray-400">Cloud backup & sync</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-red-500 mr-2">cancel</span>
                    <span className="text-gray-600 dark:text-gray-400">Multi-device access</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-red-500 mr-2">cancel</span>
                    <span className="text-gray-600 dark:text-gray-400">Priority support</span>
                  </div>
                </div>
                
                <button 
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 text-lg font-medium py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl text-center"
                  onClick={() => {
                    // Record that the user has explicitly chosen the free tier
                    localStorage.setItem('chosenPlan', 'free');
                    console.log('User explicitly selected free plan');
                    // Navigate to the main dashboard
                    goToDashboard();
                  }}
                >
                  Continue with Free Plan
                </button>
              </div>
            </div>
            
            {/* Premium Tier */}
            <div className="md:w-1/2 bg-white dark:bg-[#1B2131] shadow-md border-2 border-yellow-400 rounded-3xl overflow-hidden transform transition-all duration-300 hover:shadow-xl relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 rounded-bl-lg font-bold">
                RECOMMENDED
              </div>
              <div className="p-8 flex flex-col h-full">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Premium</h2>
                  <div className="flex items-baseline mb-6">
                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">$12.99</span>
                    <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">/month</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">For serious collectors who want advanced features</p>
                  <hr className="border-gray-200 dark:border-gray-700 mb-6" />
                </div>
                
                <div className="space-y-4 flex-grow mb-8">
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Everything in Free</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400 font-bold">Automatic cloud backup</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400 font-bold">Sync across all your devices</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Advanced analytics</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Priority customer support</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 mr-2">check_circle</span>
                    <span className="text-gray-600 dark:text-gray-400">Early access to new features</span>
                  </div>
                </div>
                
                {tableError && (
                  <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-400 p-4 mb-8 rounded-lg">
                    <h3 className="font-bold">There was a problem loading payment options</h3>
                    <p className="mt-1">Please use the direct subscription button above.</p>
                  </div>
                )}
                
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    createCheckoutSession();
                  }}
                  className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-300 text-lg font-medium py-4 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl text-center block"
                >
                  Subscribe to Premium - $12.99/month
                </a>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">Securely processed by Stripe</p>
              </div>
            </div>
          </div>
          
          {/* Cloud Backup Benefits Section */}
          <div className="mt-24">
            <h2 className="text-3xl font-bold text-center text-white mb-16">
              Why Choose Cloud Backup?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow p-6 flex flex-col items-center text-center">
                <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full mb-4">
                  <span className="material-icons text-purple-500 dark:text-purple-400 text-3xl">security</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Data Security</h3>
                <p className="text-gray-600 dark:text-gray-400">Your collection data is securely stored in the cloud, protected against device loss or damage.</p>
              </div>
              
              <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow p-6 flex flex-col items-center text-center">
                <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full mb-4">
                  <span className="material-icons text-purple-500 dark:text-purple-400 text-3xl">devices</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Multi-Device Access</h3>
                <p className="text-gray-600 dark:text-gray-400">Access and manage your collection from any device, anywhere - your phone, tablet, or computer.</p>
              </div>
              
              <div className="bg-white dark:bg-[#1B2131] rounded-xl shadow p-6 flex flex-col items-center text-center">
                <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full mb-4">
                  <span className="material-icons text-purple-500 dark:text-purple-400 text-3xl">auto_awesome</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Automatic Sync</h3>
                <p className="text-gray-600 dark:text-gray-400">Changes automatically sync across all your devices, keeping your collection up-to-date everywhere.</p>
              </div>
            </div>
          </div>
          
          {/* Alternative checkout method link */}
          <div className="text-center mt-12">
            <button
              onClick={handleDirectCustomerCreation}
              className="text-blue-300 hover:text-blue-200 text-sm underline"
            >
              Try alternative checkout method
            </button>
            <div className="text-gray-400 text-xs mt-1">
              If the main checkout button doesn't work, use this alternative
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardPricing; 