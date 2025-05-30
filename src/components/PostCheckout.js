import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../contexts/SubscriptionContext';

const PostCheckout = () => {
  const navigate = useNavigate();
  const { refreshSubscriptionStatus, subscriptionStatus } = useSubscription();
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Verifying your subscription...');
  const maxAttempts = 10; // Check for up to 30 seconds

  useEffect(() => {
    const verifySubscription = async () => {
      if (attempts >= maxAttempts) {
        setMessage('Taking longer than expected. Redirecting to dashboard...');
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      try {
        setMessage('Checking subscription status...');
        await refreshSubscriptionStatus();
        
        if (subscriptionStatus?.status === 'active') {
          setMessage('Subscription verified! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 1000);
          return;
        }

        // Not active yet, try again in 3 seconds
        setAttempts(prev => prev + 1);
        setMessage(`Verifying subscription... (${attempts + 1}/${maxAttempts})`);
        setTimeout(verifySubscription, 3000);
        
      } catch (error) {
        console.error('Error verifying subscription:', error);
        setAttempts(prev => prev + 1);
        setTimeout(verifySubscription, 3000);
      }
    };

    // Start verification after 2 seconds to allow webhook processing
    setTimeout(verifySubscription, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Setting up your account...</span>
          </div>
        </div>
        
        {attempts >= 5 && (
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default PostCheckout;
