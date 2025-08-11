import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import Button from '../design-system/atoms/Button';
import UpgradeModal from './UpgradeModal';
// Import the modal (to be created)
// import UpgradeModal from './UpgradeModal';

/**
 * TrialStatusBanner Component
 *
 * Displays trial status and upgrade prompts to users
 */
const TrialStatusBanner = () => {
  // Move all hooks to the top before any conditional logic
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // const navigate = useNavigate(); // No longer needed for modal

  // Get subscription data - moved to top to avoid conditional hook calls
  const subscriptionData = useSubscription();

  // Handle subscription data loading/error states
  if (!subscriptionData) {
    console.info('[TrialStatusBanner] No subscriptionData yet');
    // Fallback - show a basic banner
    return (
      <div
        style={{
          backgroundColor: 'orange',
          color: 'white',
          padding: '15px',
          textAlign: 'center',
        }}
      >
        ⚠️ Subscription system loading... Please refresh if this persists.
      </div>
    );
  }

  const { isOnTrial, getTrialDaysRemaining, isFree, subscription } =
    subscriptionData;
  console.info('[TrialStatusBanner] subscriptionData', subscriptionData);

  // For debugging - let's force show the banner if we're on trial
  const shouldShow =
    isOnTrial || isFree || subscription?.status === 'free_trial';
  console.info('[TrialStatusBanner] shouldShow', shouldShow, {
    isOnTrial,
    isFree,
    status: subscription?.status,
  });

  // Don't show banner for premium users or when loading
  if (!shouldShow) {
    console.info('[TrialStatusBanner] Hiding banner due to shouldShow=false');
    return null;
  }

  const daysRemaining = getTrialDaysRemaining();
  console.info('[TrialStatusBanner] daysRemaining', daysRemaining);

  // Show the actual trial banner
  return (
    <>
      <div
        className="relative z-10 mx-auto mb-4 max-w-4xl rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-center text-white shadow-lg"
        style={{ marginTop: 0 }}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-icons text-sm">schedule</span>
            <span className="font-medium">
              {isFree
                ? 'Upgrade to Premium to unlock all features'
                : `Free Trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="bg-white/20 border-white/30 hover:bg-white/30 ml-2 rounded border px-4 py-2 text-sm font-medium text-white"
          >
            Upgrade to Premium - $9.99/month
          </Button>
          {isOnTrial && daysRemaining > 0 && (
            <Button
              variant="text"
              onClick={() => setShowUpgradeModal(true)}
              className="text-white/80 text-sm underline hover:text-white"
            >
              See what you'll get
            </Button>
          )}
        </div>
      </div>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        daysRemaining={daysRemaining}
      />
      {/* <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} /> */}
    </>
  );
};

export default TrialStatusBanner;
