import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system/contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import { toast } from 'react-hot-toast';
import { getStripePublishableKey } from '../config/secrets';
import LoggingService from '../services/LoggingService';

/**
 * UpgradePage Component
 *
 * Displays subscription plans and handles Stripe checkout for upgrades
 */
const UpgradePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnTrial, getTrialDaysRemaining, isPremium } =
    useSubscription();
  const [loading, setLoading] = useState(false);

  // Redirect premium users
  if (isPremium) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-black">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg dark:bg-gray-900">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Icon
              name="check_circle"
              className="text-2xl text-green-600 dark:text-green-400"
            />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            You're Already Premium!
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            You have access to all premium features. Enjoy your Pokemon Card
            Tracker experience!
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleUpgrade = async () => {
    LoggingService.info('🚀 Starting upgrade process from UpgradePage...');

    if (!user) {
      LoggingService.error('❌ No user found - user must be logged in');
      toast.error('Please log in to upgrade');
      navigate('/login');
      return;
    }

    LoggingService.info('✅ User authenticated:', { uid: user.uid, email: user.email });
    setLoading(true);

    try {
      // Step 1: Check environment variables
      LoggingService.info('🔍 Checking environment variables...');
      const stripePublishableKey = getStripePublishableKey();

      // Step 2: Create checkout session on server (OFFICIAL STRIPE APPROACH)
      LoggingService.info('🔥 Creating checkout session via Firebase Functions...');
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');

      const createCheckoutSession = httpsCallable(
        functions,
        'createCheckoutSession'
      );
      const result = await createCheckoutSession({});

      LoggingService.info('✅ Server-side session created:', result.data);

      // Step 3: Load Stripe and redirect to checkout with session ID
      LoggingService.info('📦 Loading Stripe...');
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripePublishableKey);

      if (!stripe) {
        LoggingService.error('❌ Stripe failed to load');
        throw new Error('Stripe failed to load');
      }

      LoggingService.info('✅ Stripe loaded successfully');

      // Step 4: Redirect to Stripe Checkout with session ID (OFFICIAL APPROACH)
      LoggingService.info('💳 Redirecting to Stripe Checkout...');
      const { error } = await stripe.redirectToCheckout({
        sessionId: result.data.sessionId,
      });

      if (error) {
        LoggingService.error('❌ Stripe redirect error:', error);
        throw error;
      }

      LoggingService.info('✅ Successfully redirected to Stripe Checkout');
    } catch (error) {
      LoggingService.error('💥 Upgrade error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
      });

      // More specific error messages
      let errorMessage = 'Failed to start checkout process';

      if (
        error.message &&
        error.message.includes('functions.config is not a function')
      ) {
        errorMessage = 'Server configuration error. Please contact support.';
      } else if (error.message && error.message.includes('price')) {
        errorMessage = 'Invalid price configuration. Please contact support.';
      } else if (error.message && error.message.includes('Stripe')) {
        errorMessage = 'Payment system error. Please try again.';
      } else if (error.message && error.message.includes('network')) {
        errorMessage =
          'Network error. Please check your connection and try again.';
      }

      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const features = [
    {
      icon: 'folder',
      title: 'Unlimited Collections',
      description: 'Organize your cards into unlimited custom collections',
    },
    {
      icon: 'storefront',
      title: 'Marketplace Selling',
      description: 'List and sell your cards on the marketplace',
    },
    {
      icon: 'receipt',
      title: 'Purchase Invoices',
      description: 'Generate professional invoices for your sales',
    },
    {
      icon: 'point_of_sale',
      title: 'Sold Items Tracking',
      description: 'Track your sales history and profit analytics',
    },
    {
      icon: 'search',
      title: 'PSA Search & Lookup',
      description: 'Access PSA database for card valuations',
    },
    {
      icon: 'cloud_sync',
      title: 'Advanced Cloud Sync',
      description: 'Sync your data across all devices',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl p-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <Icon name="arrow_back" className="mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upgrade to Premium
            </h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Trial Status */}
        {isOnTrial && (
          <div className="mb-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center text-white">
            <h2 className="mb-2 text-2xl font-bold">
              {getTrialDaysRemaining()} Day
              {getTrialDaysRemaining() !== 1 ? 's' : ''} Left in Your Free Trial
            </h2>
            <p className="text-purple-100">
              You're currently enjoying all premium features. Upgrade now to
              continue after your trial ends!
            </p>
          </div>
        )}

        {/* Pricing Card */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-900">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center text-white">
            <h2 className="mb-2 text-3xl font-bold">Premium Plan</h2>
            <div className="mb-2 text-5xl font-bold">
              $9.99
              <span className="text-xl font-normal">/month</span>
            </div>
            <p className="text-purple-100">
              Unlock all features and take your card collection to the next
              level
            </p>
          </div>

          <div className="p-6">
            <Button
              variant="primary"
              size="lg"
              onClick={handleUpgrade}
              loading={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-4 text-lg hover:from-purple-600 hover:to-pink-600"
            >
              <Icon name="star" className="mr-2" />
              {loading ? 'Processing...' : 'Upgrade to Premium'}
            </Button>

            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Cancel anytime • Secure payment via Stripe
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-900"
            >
              <div className="flex items-start">
                <div className="mr-4 flex size-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Icon
                    name={feature.icon}
                    className="text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-12 rounded-lg bg-white p-6 shadow-md dark:bg-gray-900">
          <h3 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                Can I cancel anytime?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can cancel your subscription at any time. You'll
                continue to have access to premium features until the end of
                your billing period.
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                What happens to my data if I cancel?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Your data is always safe. If you cancel, you'll move to the free
                plan and keep access to your cards, but some premium features
                will be restricted.
              </p>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                Is my payment information secure?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Absolutely. We use Stripe for payment processing, which is
                trusted by millions of businesses worldwide and is PCI DSS
                compliant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;
