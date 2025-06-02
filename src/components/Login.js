import React, { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../design-system';
import { Helmet } from 'react-helmet-async';
import NavigationBar from './NavigationBar';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState({ google: false, apple: false });
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentUser, 
    loading: authLoading, 
    signIn, 
    signUp, 
    error: authError, 
    signInWithGoogle, 
    signInWithApple
  } = useAuth();
  
  // Get the redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

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
  
  // Reset loading states and handle redirect cleanup on component mount
  useEffect(() => {
    // Reset social loading states on page load
    setSocialLoading({ google: false, apple: false });
  }, []);

  // Set errors from auth context
  useEffect(() => {
    if (authError) {
      setErrors({ auth: authError });
    }
  }, [authError]);

  // Add this useEffect to display better feedback
  useEffect(() => {
    // Clear errors when component mounts
    return () => setErrors({});
  }, []);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (!isLogin && !confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (!isLogin && password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    
    try {
      if (isLogin) {
        // Login with remember me functionality
        await signIn({ email, password, remember: rememberMe });
        navigate(from, { replace: true });
      } else {
        // Sign up
        await signUp({ email, password, displayName: email.split('@')[0] });
        setSignupSuccess(true);
        // Instead of navigating directly to pricing, set isNewUser flag and go to dashboard
        localStorage.setItem('isNewUser', 'true');
        // NewUserRoute component will handle subscription check and redirect if needed
        navigate('/dashboard', { replace: true });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsLoading(false);
      // Error handling is done in AuthContext
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      setSocialLoading({ ...socialLoading, google: true });
      const user = await signInWithGoogle();
      
      // IMPORTANT: Always navigate to dashboard and let NewUserRoute handle the redirects
      // This ensures all flows go through the same redirect logic
      console.log('Google sign-in successful, going through dashboard flow');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // Only log errors that aren't popup closed by user
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign in error:', error);
      }
      // Error handling is done in AuthContext
    } finally {
      setSocialLoading({ ...socialLoading, google: false });
    }
  };

  // Handle Apple sign in  
  const handleAppleSignIn = async () => {
    try {
      setSocialLoading({ ...socialLoading, apple: true });
      const user = await signInWithApple();
      
      // IMPORTANT: Always navigate to dashboard and let NewUserRoute handle the redirects
      // This ensures all flows go through the same redirect logic
      console.log('Apple sign-in successful, going through dashboard flow');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // Only log errors that aren't popup closed by user
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Apple sign in error:', error);
      }
      // Error handling is done in AuthContext
    } finally {
      setSocialLoading({ ...socialLoading, apple: false });
    }
  };

  // Toggle between login and signup modes
  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Clear errors when switching modes
    setErrors({});
  };

  return (
    <div className="logged-out-page bg-gradient-to-br from-purple-900 via-red-500 to-green-500 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 page-no-padding">
      <Helmet>
        <title>{isLogin ? 'Login' : 'Sign Up'} | MyCardTracker</title>
        <meta name="description" content={isLogin ? 'Login to your MyCardTracker account to manage your collection, track investments, and access the marketplace.' : 'Sign up for MyCardTracker to start tracking your trading cards, monitor investments, and trade with other collectors.'} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://www.mycardtracker.com.au/login`} />
      </Helmet>
      <NavigationBar />
      
      <div className="max-w-md w-full bg-white dark:bg-[#1B2131] rounded-2xl shadow-xl overflow-hidden mt-16">
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
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Login/Signup Form */}
        <div className="px-6 pb-8">
          {/* Authentication error */}
          {errors.auth && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.auth}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Social Sign In Buttons */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-[#252B3B] text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#2A3241] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
              >
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-[#1B2131] text-gray-500 dark:text-gray-400">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email & Password Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    } bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required={!isLogin}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      } bg-white dark:bg-[#252B3B] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Remember Me & Forgot Password (Login only) */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link 
                    to="/forgot-password"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
            )}

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
                  <>{isLogin ? 'Sign in' : 'Create account'}</>
                )}
              </button>
            </div>
          </form>

          {/* Privacy Policy */}
          <div className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
            By signing in, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Privacy Policy
            </a>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login; 