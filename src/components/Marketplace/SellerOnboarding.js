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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Enable Instant Payments
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Set up your payment account to receive instant payouts when buyers purchase your items.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            ✨ Benefits of Payment Setup:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 text-left space-y-1">
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
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Powered by Stripe Connect - Secure & Trusted
        </p>
      </div>
    </div>
  );
}

export default SellerOnboarding;
