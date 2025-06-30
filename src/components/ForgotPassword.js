import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Add page-no-padding class to body when component mounts
  useEffect(() => {
    // Redirect if user is already logged in
    if (!authLoading && currentUser) {
      navigate('/dashboard', { replace: true });
    }

    document.body.classList.add('page-no-padding');
    
    // Clean up function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('page-no-padding');
    };
  }, [currentUser, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic email validation
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return;
    }

    setIsLoading(true);
    
    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-500 to-green-500 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 page-no-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 absolute top-0 w-full pt-12">
        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl">
            <div className="flex">
              <Link to="/" className="px-5 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-l-xl transition-colors">
                Home
              </Link>
              <Link to="/pricing" className="px-5 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-r-xl transition-colors">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-md w-full bg-white dark:bg-[#1B2131] rounded-2xl shadow-xl overflow-hidden">
        {/* Header with logo */}
        <div className="px-6 py-8 text-center">
          <Link to="/" className="inline-block">
            <img 
              src="/favicon-192x192.png"
              alt="Pokémon Card Tracker Logo" 
              className="h-16 w-16 mx-auto rounded-xl"
            />
          </Link>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {!isSubmitted ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="you@example.com"
                  />
                  {error && (
                    <p className="mt-1 text-sm text-red-500">{error}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Reset password'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="rounded-full h-16 w-16 bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Check your email</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. The link will expire in 1 hour.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  try again
                </button>
              </p>
            </div>
          )}

          {/* Back to Sign In */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword; 
