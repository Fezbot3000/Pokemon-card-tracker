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
    <div className="page-no-padding flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-red-500 to-green-500 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-0 mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white/10 rounded-xl backdrop-blur-sm">
            <div className="flex">
              <Link to="/" className="hover:bg-white/10 rounded-l-xl px-5 py-3 text-sm font-medium text-white transition-colors">
                Home
              </Link>
              <Link to="/pricing" className="hover:bg-white/10 rounded-r-xl px-5 py-3 text-sm font-medium text-white transition-colors">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-[#1B2131]">
        {/* Header with logo */}
        <div className="px-6 py-8 text-center">
          <Link to="/" className="inline-block">
            <img 
              src="/favicon-192x192.png"
              alt="Pokémon Card Tracker Logo" 
              className="mx-auto size-16 rounded-xl"
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
                <div className="relative mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 ${
                      error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-[#252B3B] dark:text-white`}
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
                  className="flex w-full items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-3 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="-ml-1 mr-3 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
                <svg className="size-10 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">Check your email</h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                We've sent a password reset link to <strong>{email}</strong>. The link will expire in 1 hour.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
