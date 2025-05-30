import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Helmet } from 'react-helmet-async';
import Footer from '../components/Footer';

const Subscribe = () => {
  const { currentUser, loading, signOut } = useAuth();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState(null);

  // Redirect if not authenticated
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

  const handleSubscribe = async () => {
    setIsCreatingSession(true);
    setError(null);

    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({
        priceId: process.env.REACT_APP_STRIPE_PRICE_ID
      });

      if (result.data.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'Failed to create checkout session');
      setIsCreatingSession(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B2131] text-white">
      <Helmet>
        <title>Subscribe to Premium | MyCardTracker</title>
        <meta name="description" content="Upgrade to Premium and unlock advanced features for your Pokemon card collection tracking." />
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
      
      {/* Hero Section */}
      <section className="relative flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-20 pb-12">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-8 border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Premium Features
          </div>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Upgrade to
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Premium
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Unlock advanced features for your Pokemon card collection
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-md mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl">
            {/* Plan Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">Premium Plan</h2>
              <div className="flex items-baseline justify-center mb-6">
                <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  $9.99
                </span>
                <span className="text-gray-400 ml-2">/month</span>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              {[
                'Unlimited card tracking',
                'Advanced analytics & insights',
                'Price history & trends',
                'Export & backup features',
                'Priority customer support',
                'Early access to new features'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-5 h-5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Subscribe Button */}
            <button
              onClick={handleSubscribe}
              disabled={isCreatingSession}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isCreatingSession ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating session...
                </div>
              ) : (
                'Subscribe Now'
              )}
            </button>

            {/* Security Note */}
            <p className="text-xs text-gray-400 text-center mt-4">
              Secure payment powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Subscribe;
