import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import UpgradeModal from './UpgradeModal';
// Import the modal (to be created)
// import UpgradeModal from './UpgradeModal';

/**
 * TrialStatusBanner Component
 * 
 * Displays trial status and upgrade prompts to users
 */
const TrialStatusBanner = () => {
  // Modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // const navigate = useNavigate(); // No longer needed for modal
  
  // Try to get subscription data with error handling
  let subscriptionData;
  try {
    subscriptionData = useSubscription();
  } catch (error) {
    // Fallback - show a basic banner
    return (
      <div style={{backgroundColor: 'orange', color: 'white', padding: '15px', textAlign: 'center'}}>
        ⚠️ Subscription system loading... Please refresh if this persists.
      </div>
    );
  }
  
  const { isOnTrial, getTrialDaysRemaining, isFree, subscription } = subscriptionData;
  
  // For debugging - let's force show the banner if we're on trial
  const shouldShow = isOnTrial || isFree || subscription?.status === 'free_trial';
  
  // Don't show banner for premium users or when loading
  if (!shouldShow) {
    return null;
  }
  
  const daysRemaining = getTrialDaysRemaining();
  
  // Show the actual trial banner
  return (
    <>
      <div
        className="max-w-4xl mx-auto mb-4 rounded-xl shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 text-center relative z-10"
        style={{ marginTop: 0 }}
      >
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-icons text-sm">schedule</span>
            <span className="font-medium">
              {isFree 
                ? 'Upgrade to Premium to unlock all features'
                : `Free Trial: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
              }
            </span>
          </div>
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="ml-2 bg-white/20 border border-white/30 hover:bg-white/30 text-white font-medium px-4 py-2 rounded text-sm"
          >
            Upgrade to Premium - $9.99/month
          </Button>
          {isOnTrial && daysRemaining > 0 && (
            <Button
              variant="text"
              onClick={() => setShowUpgradeModal(true)}
              className="text-white/80 hover:text-white text-sm underline"
            >
              See what you'll get
            </Button>
          )}
        </div>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} daysRemaining={daysRemaining} />
      {/* <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} /> */}
    </>
  );
};

export default TrialStatusBanner; 
