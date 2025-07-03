import React, { useState } from 'react';
import Modal from '../design-system/molecules/Modal';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import { toast } from 'react-hot-toast';
import { useAuth } from '../design-system/contexts/AuthContext';

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
    console.log('🚀 Starting upgrade process...');
    
    if (!user) {
      console.error('❌ No user found - user must be logged in');
      toast.error('Please log in to upgrade');
      return;
    }

    console.log('✅ User authenticated:', { uid: user.uid, email: user.email });
    setLoading(true);
    
    try {
      // Step 1: Check environment variables
      console.log('🔍 Checking environment variables...');
      const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      
      if (!stripePublishableKey) {
        console.error('❌ REACT_APP_STRIPE_PUBLISHABLE_KEY is not set');
        toast.error('Stripe configuration missing. Please contact support.');
        setLoading(false);
        return;
      }

      // Step 2: Create checkout session on server (OFFICIAL STRIPE APPROACH)
      console.log('🔥 Creating checkout session via Firebase Functions...');
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');
      
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({});
      
      console.log('✅ Server-side session created:', result.data);

      // Step 3: Load Stripe and redirect to checkout with session ID
      console.log('📦 Loading Stripe...');
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripePublishableKey);
      
      if (!stripe) {
        console.error('❌ Stripe failed to load');
        throw new Error('Stripe failed to load');
      }
      
      console.log('✅ Stripe loaded successfully');

      // Step 4: Redirect to Stripe Checkout with session ID (OFFICIAL APPROACH)
      console.log('💳 Redirecting to Stripe Checkout...');
      const { error } = await stripe.redirectToCheckout({
        sessionId: result.data.sessionId
      });
      
      if (error) {
        console.error('❌ Stripe redirect error:', error);
        throw error;
      }
      
      console.log('✅ Successfully redirected to Stripe Checkout');
    } catch (error) {
      console.error('💥 Upgrade error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      
      // More specific error messages
      let errorMessage = 'Failed to start checkout process';
      
      if (error.message && error.message.includes('functions.config is not a function')) {
        errorMessage = 'Server configuration error. Please contact support.';
      } else if (error.message && error.message.includes('price')) {
        errorMessage = 'Invalid price configuration. Please contact support.';
      } else if (error.message && error.message.includes('Stripe')) {
        errorMessage = 'Payment system error. Please try again.';
      } else if (error.message && error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
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
      className="upgrade-modal"
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Choose the plan that fits you</h2>
          {typeof daysRemaining === 'number' && daysRemaining > 0 && (
            <div className="mb-4 text-purple-600 dark:text-purple-400 font-medium flex items-center justify-center">
              <Icon name="schedule" className="mr-1" />
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in your free trial
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-stretch">
          {/* Free Plan Card */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center max-w-xs mx-auto">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Free Plan</h3>
            <div className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">A$0.00</div>
            <ul className="mb-4 w-full">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-2 py-1 text-sm text-gray-700 dark:text-gray-300">
                  {f.free ? (
                    <Icon name="check" className="text-green-500" />
                  ) : (
                    <Icon name="close" className="text-red-500" />
                  )}
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <Button variant="secondary" disabled className="w-full">Current Plan</Button>
          </div>
          {/* Divider for desktop */}
          <div className="hidden sm:block w-0.5 bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-700 mx-2 rounded-full"></div>
          {/* Premium Plan Card */}
          <div className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-lg border-2 border-purple-400 dark:border-purple-600 p-6 flex flex-col items-center max-w-xs mx-auto">
            <h3 className="text-lg font-bold mb-2">Premium Plan</h3>
            <div className="text-2xl font-bold mb-2">A$9.99/mo</div>
            <ul className="mb-4 w-full">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-2 py-1 text-sm">
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
              className="w-full bg-white/20 border border-white/30 hover:bg-white/30 text-white font-medium px-4 py-2 rounded text-sm mt-auto"
            >
              {loading ? 'Processing...' : 'Upgrade Now'}
            </Button>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Cancel anytime. Secure payment via Stripe.
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeModal; 