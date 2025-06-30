import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import Button from '../design-system/atoms/Button';
import Icon from '../design-system/atoms/Icon';
import UpgradeModal from './UpgradeModal';

/**
 * FeatureGate Component
 * 
 * Wraps premium features and shows upgrade prompts when access is restricted
 */
const FeatureGate = ({ 
  feature, 
  children, 
  fallback = null,
  showUpgradePrompt = true,
  customMessage = null,
  inline = false
}) => {
  const { hasFeature, isOnTrial, getTrialDaysRemaining, isFree } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // If user has access to the feature, render children
  if (hasFeature(feature)) {
    return children;
  }
  
  // If no upgrade prompt should be shown, return fallback
  if (!showUpgradePrompt) {
    return fallback;
  }
  
  const daysRemaining = getTrialDaysRemaining();
  
  const getUpgradeMessage = () => {
    if (customMessage) return customMessage;
    
    if (isFree) {
      return 'This feature is only available with Premium. Upgrade to unlock all features.';
    }
    
    if (isOnTrial && daysRemaining > 0) {
      return `Your trial has access to this feature for ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}. Upgrade to keep using it after your trial ends.`;
    }
    
    return 'Your trial has expired. Upgrade to Premium to continue using this feature.';
  };
  
  const getFeatureName = () => {
    const featureNames = {
      MULTIPLE_COLLECTIONS: 'Multiple Collections',
      MARKETPLACE_SELLING: 'Marketplace Selling',
      INVOICING: 'Purchase Invoices',
      PSA_SEARCH: 'PSA Search',
      SOLD_ITEMS: 'Sold Items Tracking',
      CLOUD_SYNC: 'Cloud Sync',
      COLLECTION_SHARING: 'Collection Sharing'
    };
    
    return featureNames[feature] || 'Premium Feature';
  };
  
  // Inline version for smaller UI elements
  if (inline) {
    return (
      <>
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Icon name="lock" size="sm" className="text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Premium feature
          </span>
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setShowUpgradeModal(true)}
            className="ml-auto"
          >
            Upgrade
          </Button>
        </div>
        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)} 
          daysRemaining={daysRemaining} 
        />
      </>
    );
  }
  
  // Full upgrade prompt
  return (
    <>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
        <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
          <Icon name="lock" className="text-purple-600 dark:text-purple-400" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          {getFeatureName()}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
          {getUpgradeMessage()}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="primary" 
            onClick={() => setShowUpgradeModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Icon name="star" size="sm" className="mr-2" />
            Upgrade to Premium - $9.99/month
          </Button>
        </div>
        
        {fallback && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {fallback}
          </div>
        )}
      </div>
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        daysRemaining={daysRemaining} 
      />
    </>
  );
};

export default FeatureGate; 
