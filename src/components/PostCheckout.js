import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

const PostCheckout = () => {
  const navigate = useNavigate();
  const { refreshSubscriptionStatus, subscriptionStatus } = useSubscription();
  const [attempts, setAttempts] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const maxAttempts = 10; // Check for up to 30 seconds

  useEffect(() => {
    const checkSubscription = async () => {
      if (attempts >= maxAttempts) {
        setShowFallback(true);
        return;
      }

      // Wait 3 seconds before first check to give webhook time
      if (attempts === 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Refresh subscription status from backend
      await refreshSubscriptionStatus();
      
      // Check if subscription is now active
      if (subscriptionStatus?.status === 'active') {
        // Success! Redirect to dashboard
        navigate('/dashboard');
        return;
      }

      // Not active yet, try again in 3 seconds
      setAttempts(prev => prev + 1);
      setTimeout(checkSubscription, 3000);
    };

    checkSubscription();
  }, []);

  if (showFallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Still Processing</h2>
          <p className="text-gray-600 mb-6">
            Your payment was successful, but we're still setting up your subscription. This can take a few minutes.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Check Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard Anyway
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            If this persists, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Finalizing your subscription...
        </p>
        
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="ml-2 text-gray-600">Setting up your account</span>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Attempt {attempts + 1} of {maxAttempts}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PostCheckout;
