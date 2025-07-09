import React, { useState } from 'react';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import { toast } from 'react-hot-toast';
import { useAuth } from '../design-system/contexts/AuthContext';
import { getStripePublishableKey } from '../config/secrets';
import LoggingService from '../services/LoggingService';

const features = [
  { label: 'Unlimited collections', free: false, premium: true },
  { label: 'Marketplace selling', free: false, premium: true },
  { label: 'Purchase invoices', free: false, premium: true },
  { label: 'Sold items tracking', free: false, premium: true },
  { label: 'PSA search', free: false, premium: true },
  { label: 'Browse marketplace', free: true, premium: true },
  { label: 'Basic card tracking', free: true, premium: true },
];

const UpgradeModal = ({ isOpen, onClose, daysRemaining }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    LoggingService.info('🚀 PRODUCTION DEBUG: Starting upgrade process');
    setLoading(true);

    try {
      LoggingService.info(
        '📡 PRODUCTION DEBUG: About to call createCheckoutSession'
      );
      LoggingService.info('📡 PRODUCTION DEBUG: User ID:', user?.uid);

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');

      LoggingService.info(
        '📡 PRODUCTION DEBUG: Functions instance:',
        functions
      );

      const createCheckoutSession = httpsCallable(
        functions,
        'createCheckoutSession'
      );

      // Get the premium plan price ID from environment or use default
      const STRIPE_PREMIUM_PLAN_PRICE_ID =
        process.env.REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID ||
        'price_1RfTouGIULGXhjjBvCFuEoQH';

      LoggingService.info('📡 PRODUCTION DEBUG: Calling function with data:', {
        priceId: STRIPE_PREMIUM_PLAN_PRICE_ID,
        userId: user?.uid,
      });

      const result = await createCheckoutSession({
        priceId: STRIPE_PREMIUM_PLAN_PRICE_ID,
        userId: user?.uid,
      });

      LoggingService.info(
        '✅ PRODUCTION DEBUG: Function call successful:',
        result
      );
      LoggingService.info(
        '✅ PRODUCTION DEBUG: Session URL:',
        result.data?.url
      );
      LoggingService.info(
        '✅ PRODUCTION DEBUG: Session ID:',
        result.data?.sessionId
      );

      // Step 3: Load Stripe and redirect to checkout with session ID
      LoggingService.info('📦 PRODUCTION DEBUG: Loading Stripe...');
      const stripePublishableKey = getStripePublishableKey();
      LoggingService.info(
        '📦 PRODUCTION DEBUG: Stripe key available:',
        !!stripePublishableKey
      );

      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripePublishableKey);

      if (!stripe) {
        LoggingService.error('❌ PRODUCTION DEBUG: Stripe failed to load');
        throw new Error('Stripe failed to load');
      }

      LoggingService.info('✅ PRODUCTION DEBUG: Stripe loaded successfully');

      // Step 4: Redirect to Stripe Checkout with session ID
      LoggingService.info(
        '💳 PRODUCTION DEBUG: Redirecting to Stripe Checkout...'
      );
      const { error } = await stripe.redirectToCheckout({
        sessionId: result.data.sessionId,
      });

      if (error) {
        LoggingService.error(
          '❌ PRODUCTION DEBUG: Stripe redirect error:',
          error
        );
        throw error;
      }

      LoggingService.info(
        '✅ PRODUCTION DEBUG: Successfully redirected to Stripe Checkout'
      );
    } catch (error) {
      LoggingService.error('❌ PRODUCTION DEBUG: Error caught:', error);
      LoggingService.error(
        '❌ PRODUCTION DEBUG: Error message:',
        error.message
      );
      LoggingService.error('❌ PRODUCTION DEBUG: Error code:', error.code);
      LoggingService.error(
        '❌ PRODUCTION DEBUG: Full error object:',
        JSON.stringify(error, null, 2)
      );

      // More specific error messages
      let errorMessage = 'Payment system error';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Your Plan Options"
      position="right"
      size="lg"
      closeOnClickOutside={true}
      className="mx-auto max-w-2xl"
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">
            Choose the plan that fits you
          </h2>
          {typeof daysRemaining === 'number' && daysRemaining > 0 && (
            <div className="mb-4 flex items-center justify-center font-medium text-purple-600 dark:text-purple-400">
              <Icon name="schedule" className="mr-1" />
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in your
              free trial
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch justify-center gap-6 sm:flex-row">
          {/* Free Plan Card */}
          <div className="mx-auto flex max-w-xs flex-1 flex-col items-center rounded-xl border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
              Free Plan
            </h3>
            <div className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              A$0.00
            </div>
            <ul className="mb-4 w-full">
              {features.map(f => (
                <li
                  key={f.label}
                  className="flex items-center gap-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                >
                  {f.free ? (
                    <Icon name="check" className="text-green-500" />
                  ) : (
                    <Icon name="close" className="text-red-500" />
                  )}
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <Button variant="secondary" disabled className="w-full">
              Current Plan
            </Button>
          </div>
          {/* Divider for desktop */}
          <div className="mx-2 hidden w-0.5 rounded-full bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-700 sm:block"></div>
          {/* Premium Plan Card */}
          <div className="mx-auto flex max-w-xs flex-1 flex-col items-center rounded-xl border-2 border-purple-400 bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white shadow-lg dark:border-purple-600">
            <h3 className="mb-2 text-lg font-bold">Premium Plan</h3>
            <div className="mb-2 text-2xl font-bold">A$9.99/mo</div>
            <ul className="mb-4 w-full">
              {features.map(f => (
                <li
                  key={f.label}
                  className="flex items-center gap-2 py-1 text-sm"
                >
                  {f.premium ? (
                    <Icon name="check" className="text-green-200" />
                  ) : (
                    <Icon name="close" className="text-red-200" />
                  )}
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              onClick={handleUpgrade}
              loading={loading}
              className="border-white/30 bg-white/20 hover:bg-white/30 mt-auto w-full rounded border px-4 py-2 text-sm font-medium text-white"
            >
              {loading ? 'Processing...' : 'Upgrade Now'}
            </Button>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Cancel anytime. Secure payment via Stripe.
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeModal;
