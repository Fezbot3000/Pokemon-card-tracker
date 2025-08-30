import React, { useState } from 'react';
import { Button, toastService as toast } from '../../design-system';
import MarketplacePaymentService from '../../services/marketplacePaymentService';
import logger from '../../utils/logger';

/**
 * Seller onboarding component for Stripe Connect setup
 */
function SellerOnboarding({ onComplete }) {
  const [loading, setLoading] = useState(false);

  const handleStartOnboarding = async () => {
    try {
      setLoading(true);
      toast.info('Creating your seller account...');

      // Use production URL for Stripe Connect (required for live mode)
      const productionUrl = 'https://mycardtracker-c8479.web.app';
      const returnUrl = `${productionUrl}/seller-onboarding-complete`;
      const refreshUrl = `${productionUrl}/seller-onboarding-complete`;

      // Create the onboarding link
      const result = await MarketplacePaymentService.createSellerOnboardingLink(returnUrl, refreshUrl);
      
      if (result.success) {
        toast.success('Redirecting to Stripe for account setup...');
        // Redirect to Stripe Connect onboarding
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Failed to create onboarding link');
      }

    } catch (error) {
      logger.error('Error starting seller onboarding:', error);
      toast.error('Failed to start seller setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Enable Instant Payments
        </h3>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Set up your payment account to receive instant payouts when buyers purchase your items.
        </p>
        
        <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
            ✨ Benefits of Payment Setup:
          </h4>
          <ul className="space-y-1 text-left text-sm text-blue-800 dark:text-blue-200">
            <li>• Instant payouts when items sell</li>
            <li>• Secure payment processing</li>
            <li>• Buyer protection and trust</li>
            <li>• No monthly fees - only pay when you sell</li>
          </ul>
        </div>

        <Button
          onClick={handleStartOnboarding}
          disabled={loading}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {loading ? 'Setting up...' : 'Set Up Payments'}
        </Button>
        
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Powered by Stripe Connect - Secure & Trusted
        </p>
      </div>
    </div>
  );
}

export default SellerOnboarding;
