import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

// Import necessary atoms and molecules from the design system
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import Toggle from '../atoms/Toggle';
import FormField from '../molecules/FormField';

/**
 * LoginModal Component
 * 
 * A composite component that presents a dialog for user login,
 * matching the existing live design.
 */
const LoginModal = ({ 
  isOpen = true, // Default to true for the component library demo
  onClose,
  onLoginSubmit,
  onSignUpClick,
  onForgotPasswordClick,
  onGoogleLogin,
  onAppleLogin,
  initialEmail = '',
  isLoading = false,
  showModal = true, // Controls if we show a modal or full page
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onLoginSubmit) {
      onLoginSubmit({ email, password, rememberMe });
    }
  };

  // Reset fields when modal closes or when component unmounts
  React.useEffect(() => {
    if (!isOpen) {
      setEmail(initialEmail);
      setPassword('');
      setRememberMe(false);
    }
  }, [isOpen, initialEmail]);

  const content = (
    <div className="flex flex-col items-center bg-black rounded-lg overflow-hidden">
      {/* Main Content */}
      <div className="w-full max-w-md p-6 pt-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="/favicon-192x192.png" 
            alt="Pokemon Card Tracker" 
            className="w-16 h-16 rounded-xl"
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-1">
          Sign in to your account
        </h2>
        
        {/* Sign up link */}
        <div className="text-center mb-6">
          <span className="text-blue-300 text-sm">
            Don't have an account? {' '}
            <Link 
              to="/signup" 
              className="text-blue-400 hover:underline"
              onClick={onSignUpClick}
            >
              Sign up
            </Link>
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Social Sign In */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-800 rounded-xl hover:bg-gray-900 transition-colors text-white disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-gray-700 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email & Password Fields */}
          <div className="space-y-4">
            <FormField
              id="login-email"
              label="Email address"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />

            <FormField
              id="login-password"
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Toggle
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                id="remember-me"
                size="sm"
                labelPosition="right"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300 cursor-pointer">
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-blue-400 hover:underline text-sm"
            >
              Forgot your password?
            </button>
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={isLoading}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </form>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-blue-400 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-blue-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );

  // If we're showing a modal, we'll wrap this in the modal component
  // If not, we'll just return the content directly
  return showModal ? (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gradient-to-r from-[#9C2792] to-[#E84545] opacity-100" 
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {content}
      </div>
    </div>
  ) : content;
};

LoginModal.propTypes = {
  /** Controls whether the modal is visible */
  isOpen: PropTypes.bool,
  /** Function to call when the modal should be closed */
  onClose: PropTypes.func,
  /** Function to call when the login form is submitted. Receives { email, password, rememberMe } */
  onLoginSubmit: PropTypes.func,
  /** Function to call when the sign up link is clicked */
  onSignUpClick: PropTypes.func,
  /** Function to call when the forgot password link is clicked */
  onForgotPasswordClick: PropTypes.func,
  /** Function to call when the Google sign-in button is clicked */
  onGoogleLogin: PropTypes.func,
  /** Function to call when the Apple sign-in button is clicked */
  onAppleLogin: PropTypes.func,
  /** Optional initial value for the email field */
  initialEmail: PropTypes.string,
  /** Optional flag to show loading state (disables inputs/buttons) */
  isLoading: PropTypes.bool,
  /** Controls whether to render as a modal or just the content */
  showModal: PropTypes.bool,
};

export default LoginModal;
