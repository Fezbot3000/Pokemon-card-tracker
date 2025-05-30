import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { checkSubscriptionStatus } from '../services/checkSubscriptionStatus';
import { Helmet } from 'react-helmet-async';

const SubscriptionStatus = () => {
  const { currentUser, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    const checkStatus = async () => {
      try {
        setIsChecking(true);
        const result = await checkSubscriptionStatus();
        
        if (result?.status === 'active') {
          navigate('/dashboard');
        } else {
          // If subscription is not active, redirect back to subscribe page
          navigate('/subscribe');
        }
      } catch (err) {
        console.error('Error checking subscription status:', err);
        setError(err.message);
        setIsChecking(false);
      }
    };

    // Add a small delay to ensure webhook has processed
    const timer = setTimeout(checkStatus, 2000);
    return () => clearTimeout(timer);
  }, [currentUser, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1B2131] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1B2131] text-white">
        <Helmet>
          <title>Subscription Error | MyCardTracker</title>
        </Helmet>
        
        {/* Sign Out Button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-xl font-medium text-sm border border-white/20 hover:border-white/30 transition-all duration-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Switch Account
          </button>
        </div>
        
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">Subscription Error</h1>
            <p className="text-gray-300 mb-8">{error}</p>
            <button
              onClick={() => navigate('/subscribe')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Back to Subscribe
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>Processing Subscription | MyCardTracker</title>
      </Helmet>
      
      {/* Sign Out Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSignOut}
          className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-xl font-medium text-sm border border-white/20 hover:border-white/30 transition-all duration-300"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Switch Account
        </button>
      </div>
      
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
          {/* Animated Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full animate-pulse"></div>
          </div>
          
          <h1 className="text-2xl font-bold mb-4">
            Finalising your subscription...
          </h1>
          
          <p className="text-gray-300 mb-8 leading-relaxed">
            Please wait while we confirm your payment and activate your subscription.
            This usually takes just a few seconds.
          </p>
          
          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mb-8">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          <p className="text-xs text-gray-400">
            Secure payment processing by Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
