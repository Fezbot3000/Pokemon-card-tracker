import React, { useState, useEffect } from 'react';
import { useAuth } from '../design-system/contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { toast } from 'react-hot-toast';
import Button from '../design-system/atoms/Button';
import StripeDebugger from './StripeDebugger';

/**
 * SubscriptionDebug Component
 * 
 * Debug component to show subscription state and test different payment stages - only for development
 */
const SubscriptionDebug = () => {
  const { user, subscriptionData, updateSubscriptionStatus } = useAuth();
  const subscription = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [showStripeDebugger, setShowStripeDebugger] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!user) {
    return (
      <div className="fixed bottom-4 left-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50 opacity-90">
        <div className="font-bold mb-2">🐛 Subscription Debug</div>
        <div className="text-gray-400">Please log in to test subscription states</div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus, additionalData = {}) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const success = await updateSubscriptionStatus(newStatus, additionalData);
      if (success) {
        toast.success(`Subscription changed to: ${newStatus.replace('_', ' ').toUpperCase()}`);
      } else {
        toast.error('Failed to update subscription status');
      }
    } catch (error) {
      console.error('Debug: Subscription update failed:', error);
      toast.error(`Failed to update subscription: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testScenarios = [
    {
      title: 'Start Fresh Trial',
      description: '7-day free trial (new user)',
      status: 'free_trial',
      data: {
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      color: 'bg-green-600'
    },
    {
      title: 'Trial - 3 Days Left',
      description: 'Free trial with 3 days remaining',
      status: 'free_trial',
      data: {
        trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      color: 'bg-yellow-600'
    },
    {
      title: 'Trial - 1 Day Left',
      description: 'Free trial with 1 day remaining',
      status: 'free_trial',
      data: {
        trialEndsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      color: 'bg-orange-600'
    },
    {
      title: 'Trial - Expired Today',
      description: 'Trial expired (0 days left)',
      status: 'free_trial',
      data: {
        trialEndsAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      },
      color: 'bg-red-600'
    },
    {
      title: 'Premium Active',
      description: 'Active premium subscription',
      status: 'premium',
      data: {
        subscriptionId: 'sub_test_premium_123',
        customerId: 'cus_test_customer_456'
      },
      color: 'bg-purple-600'
    },
    {
      title: 'Free Plan',
      description: 'Free plan (post-trial or new)',
      status: 'free',
      data: {},
      color: 'bg-gray-600'
    },
    {
      title: 'Subscription Expired',
      description: 'Premium subscription expired',
      status: 'expired',
      data: {
        subscriptionId: 'sub_test_expired_123',
        customerId: 'cus_test_customer_456'
      },
      color: 'bg-red-700'
    },
    {
      title: 'Loading State',
      description: 'Subscription status loading',
      status: 'loading',
      data: {},
      color: 'bg-blue-600'
    },
    {
      title: 'Trial - Expiring Soon',
      description: 'Free trial with 2 hours remaining',
      status: 'free_trial',
      data: {
        trialEndsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      },
      color: 'bg-red-500'
    },
    {
      title: 'Trial - Just Started',
      description: 'Free trial with 6 days, 23 hours remaining',
      status: 'free_trial',
      data: {
        trialEndsAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000) - (60 * 60 * 1000)).toISOString() // Almost 7 days
      },
      color: 'bg-green-500'
    },
    {
      title: 'Premium - With IDs',
      description: 'Premium with subscription and customer IDs',
      status: 'premium',
      data: {
        subscriptionId: 'sub_1234567890abcdef',
        customerId: 'cus_0987654321fedcba',
        planType: 'premium'
      },
      color: 'bg-purple-700'
    },
    {
      title: 'Unknown Status',
      description: 'Undefined subscription status',
      status: 'unknown',
      data: {},
      color: 'bg-gray-800'
    }
  ];

  const quickActions = [
    {
      title: 'Extend Trial (+7 days)',
      action: () => {
        const newEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        handleStatusChange('free_trial', {
          trialEndsAt: newEndDate.toISOString()
        });
      },
      color: 'bg-green-500'
    },
    {
      title: 'Expire Trial Now',
      action: () => {
        handleStatusChange('free_trial', {
          trialEndsAt: new Date(Date.now() - 1000).toISOString()
        });
      },
      color: 'bg-red-500'
    },
    {
      title: 'Activate Premium',
      action: () => {
        handleStatusChange('premium', {
          subscriptionId: 'sub_test_' + Date.now(),
          customerId: 'cus_test_' + Date.now()
        });
      },
      color: 'bg-purple-500'
    },
    {
      title: 'Reset to Free',
      action: () => {
        handleStatusChange('free', {});
      },
      color: 'bg-gray-500'
    },
    {
      title: 'Simulate Network Error',
      action: () => {
        toast.error('Simulated: Failed to load subscription data');
        handleStatusChange('loading', {});
      },
      color: 'bg-red-700'
    },
    {
      title: 'Clear All Data',
      action: () => {
        handleStatusChange('free', {
          trialEndsAt: null,
          subscriptionId: null,
          customerId: null
        });
      },
      color: 'bg-gray-700'
    },
    {
      title: 'Test Notifications',
      action: () => {
        const status = subscriptionData.status;
        if (status === 'free_trial') {
          const days = subscriptionData.daysRemaining;
          if (days <= 1) {
            toast.error('⏰ Your free trial expires tomorrow! Upgrade now to keep all features.');
          } else if (days <= 3) {
            toast.error(`⏰ ${days} days left in your trial. Consider upgrading to Premium!`);
          } else {
            toast.success(`🎉 Enjoying your trial? ${days} days of Premium features remaining!`);
          }
        } else if (status === 'free') {
          toast.error('🔒 This feature requires Premium. Upgrade for just $9.99/month!');
        } else if (status === 'premium') {
          toast.success('✨ Premium feature unlocked! Enjoy unlimited access.');
        }
      },
      color: 'bg-indigo-500'
    },
    {
      title: 'Debug Connection',
      action: async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          toast.success(`DB Connection OK. Current status: ${userData.subscriptionStatus || 'none'}`);
          console.log('Debug: Current user data:', userData);
        } catch (error) {
          toast.error(`DB Connection failed: ${error.message}`);
          console.error('Debug: DB connection error:', error);
        }
      },
      color: 'bg-teal-500'
    }
  ];

  // Environment variable check
  const checkEnvironmentVariables = () => {
    const envVars = [
      'REACT_APP_STRIPE_PUBLISHABLE_KEY',
      'REACT_APP_STRIPE_PREMIUM_PLAN_PRICE_ID',
      'REACT_APP_FIREBASE_API_KEY',
      'REACT_APP_FIREBASE_PROJECT_ID'
    ];

    const results = envVars.map(varName => ({
      name: varName,
      value: process.env[varName],
      status: process.env[varName] ? '✅ Set' : '❌ Missing'
    }));

    return results;
  };

  const runEnvironmentCheck = () => {
    console.log('🔍 Running environment variable check...');
    const envResults = checkEnvironmentVariables();
    
    envResults.forEach(result => {
      console.log(`${result.status} ${result.name}:`, result.value ? '[HIDDEN]' : 'undefined');
    });

    setTestResults(prev => [...prev, {
      test: 'Environment Variables',
      results: envResults,
      timestamp: new Date().toISOString()
    }]);
  };

  const testStripeConnection = async () => {
    console.log('🧪 Testing Stripe connection...');
    setIsLoading(true);
    
    try {
      const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        throw new Error('REACT_APP_STRIPE_PUBLISHABLE_KEY not found');
      }

      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(stripeKey);
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      console.log('✅ Stripe loaded successfully');
      setTestResults(prev => [...prev, {
        test: 'Stripe Connection',
        status: '✅ Success',
        details: 'Stripe SDK loaded successfully',
        timestamp: new Date().toISOString()
      }]);
      
      toast.success('Stripe connection test passed');
    } catch (error) {
      console.error('❌ Stripe connection test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Stripe Connection',
        status: '❌ Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
      
      toast.error(`Stripe test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFirebaseFunction = async () => {
    console.log('🧪 Testing Firebase function...');
    setIsLoading(true);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../firebase');
      
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      console.log('📞 Calling createCheckoutSession function...');
      const result = await createCheckoutSession({});
      
      console.log('✅ Function call successful:', result.data);
      setTestResults(prev => [...prev, {
        test: 'Firebase Function',
        status: '✅ Success',
        details: result.data,
        timestamp: new Date().toISOString()
      }]);
      
      toast.success('Firebase function test passed');
    } catch (error) {
      console.error('❌ Firebase function test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Firebase Function',
        status: '❌ Failed',
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        },
        timestamp: new Date().toISOString()
      }]);
      
      toast.error(`Firebase function test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    console.clear();
  };

  return (
    <div className={`fixed bottom-4 left-4 bg-black text-white rounded-lg text-xs z-50 opacity-95 transition-all duration-300 ${
      isExpanded ? 'max-w-2xl max-h-[80vh] overflow-y-auto p-6' : 'max-w-sm p-4'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold">🐛 Subscription Debug</div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isExpanded ? '▼ Collapse' : '▲ Expand Testing'}
        </button>
      </div>
      
      {/* Current Status Display */}
      <div className="space-y-1 mb-4 border-b border-gray-700 pb-3">
        <div><strong>User:</strong> {user?.email || 'Not logged in'}</div>
        <div><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${
          subscriptionData.status === 'premium' ? 'bg-purple-600' :
          subscriptionData.status === 'free_trial' ? 'bg-green-600' :
          subscriptionData.status === 'free' ? 'bg-gray-600' :
          subscriptionData.status === 'expired' ? 'bg-red-600' :
          'bg-blue-600'
        }`}>{subscriptionData.status}</span></div>
        <div><strong>Plan:</strong> {subscriptionData.planType}</div>
        <div><strong>Days Remaining:</strong> {subscriptionData.daysRemaining}</div>
        <div><strong>Trial Ends:</strong> {subscriptionData.trialEndsAt ? new Date(subscriptionData.trialEndsAt).toLocaleDateString() : 'N/A'}</div>
        <div className="flex gap-4 text-xs">
          <span><strong>Trial:</strong> {subscription.isOnTrial ? '✅' : '❌'}</span>
          <span><strong>Premium:</strong> {subscription.isPremium ? '✅' : '❌'}</span>
          <span><strong>Free:</strong> {subscription.isFree ? '✅' : '❌'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Quick Actions */}
          <div>
            <div className="font-semibold mb-2">⚡ Quick Actions:</div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  disabled={isLoading}
                  className={`${action.color} hover:opacity-80 disabled:opacity-50 text-white px-2 py-1 rounded text-xs font-medium transition-opacity`}
                >
                  {action.title}
                </button>
              ))}
            </div>
          </div>

          {/* Test Scenarios */}
          <div>
            <div className="font-semibold mb-2">🧪 Test Scenarios:</div>
            <div className="grid grid-cols-2 gap-2">
              {testScenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={() => handleStatusChange(scenario.status, scenario.data)}
                  disabled={isLoading}
                  className={`${scenario.color} hover:opacity-80 disabled:opacity-50 text-white p-2 rounded text-left transition-opacity`}
                >
                  <div className="font-medium text-xs">{scenario.title}</div>
                  <div className="text-xs opacity-90">{scenario.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Feature Testing */}
          <div>
            <div className="font-semibold mb-2">🔒 Feature Access Test:</div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              {Object.keys(subscription.FEATURES).map(feature => (
                <div key={feature} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                  <div className="flex flex-col">
                    <span className="font-medium">{feature.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400 text-xs">
                      Required: {subscription.FEATURES[feature]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      subscription.hasFeature(feature) ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {subscription.hasFeature(feature) ? 'Allowed' : 'Blocked'}
                    </span>
                    <span className="text-lg">
                      {subscription.hasFeature(feature) ? '✅' : '🚫'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Component Testing */}
          <div>
            <div className="font-semibold mb-2">🧩 Component Behavior Test:</div>
            <div className="space-y-2 text-xs">
              <div className="bg-gray-800 p-2 rounded">
                <div className="font-medium mb-1">TrialStatusBanner:</div>
                <div className="text-gray-400">
                  Should show: {subscription.isOnTrial || subscription.isFree ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="font-medium mb-1">FeatureGate (Premium):</div>
                <div className="text-gray-400">
                  Should block: {subscription.isPremium ? 'No' : 'Yes'}
                </div>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <div className="font-medium mb-1">Upgrade Urgency:</div>
                <div className={`inline-block px-2 py-1 rounded text-xs ${
                  subscription.getUpgradeUrgency() === 'high' ? 'bg-red-600' :
                  subscription.getUpgradeUrgency() === 'medium' ? 'bg-yellow-600' :
                  subscription.getUpgradeUrgency() === 'low' ? 'bg-blue-600' :
                  'bg-gray-600'
                }`}>
                  {subscription.getUpgradeUrgency().toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="bg-gray-800 p-2 rounded">
            <div className="font-semibold mb-1">📢 Status Message:</div>
            <div className="text-xs">{subscription.getStatusMessage()}</div>
            <div className="text-xs mt-1">
              <strong>Upgrade Urgency:</strong> {subscription.getUpgradeUrgency()}
            </div>
          </div>

          {/* Testing Tips */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="font-semibold mb-2">💡 Testing Tips:</div>
            <div className="text-xs space-y-1 text-gray-300">
              <div>• Test trial expiration by setting trial to expire in past</div>
              <div>• Check feature gates by switching between free/premium</div>
              <div>• Verify upgrade banners appear at correct urgency levels</div>
              <div>• Test marketplace features with different subscription states</div>
              <div>• Check invoice creation with premium vs free accounts</div>
              <div>• Verify PSA search access based on subscription level</div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button 
              onClick={runEnvironmentCheck}
              variant="secondary"
              size="sm"
            >
              Check Environment
            </Button>
            <Button 
              onClick={testStripeConnection}
              variant="secondary"
              size="sm"
              loading={isLoading}
            >
              Test Stripe
            </Button>
            <Button 
              onClick={testFirebaseFunction}
              variant="secondary"
              size="sm"
              loading={isLoading}
              disabled={!user}
            >
              Test Firebase Function
            </Button>
            <Button 
              onClick={clearResults}
              variant="secondary"
              size="sm"
            >
              Clear Results
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Test Results</h3>
              {testResults.map((result, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{result.test}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.status && (
                    <div className="mb-2">
                      <span className={result.status.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                        {result.status}
                      </span>
                    </div>
                  )}
                  
                  {result.details && (
                    <pre className="text-xs bg-gray-100 dark:bg-gray-600 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                  
                  {result.error && (
                    <pre className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.error, null, 2)}
                    </pre>
                  )}
                  
                  {result.results && (
                    <div className="space-y-1">
                      {result.results.map((envResult, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-700 dark:text-gray-300">{envResult.name}:</span>
                          <span className={envResult.value ? 'text-green-600' : 'text-red-600'}>
                            {envResult.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="text-center text-blue-400 bg-gray-800 p-2 rounded">
              🔄 Updating subscription status...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionDebug; 
