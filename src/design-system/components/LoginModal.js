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
            className="mb-4"
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
            className="mb-4"
          />

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between mb-6">
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
            fullWidth
            disabled={isLoading || !email || !password}
            className="sign-in-button !bg-gradient-to-r !from-[#E6185C] !to-[#FF2D55] !text-white" 
            // Use !important flags to override any global styles
            iconLeft={isLoading ? <Icon name="sync" className="animate-spin" color="white"/> : null}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="mx-4 text-sm text-gray-500">Or continue with</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onGoogleLogin}
            className="flex items-center justify-center px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-900 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            <span className="text-white text-sm">Google</span>
          </button>
          <button
            onClick={onAppleLogin}
            className="flex items-center justify-center px-4 py-2 border border-gray-800 rounded-lg hover:bg-gray-900 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M17.05,11.97 C17.0236,10.3647 17.9782,9.01346 19.5,8.5 C18.5519,7.15206 16.9921,6.30821 15.3,6.24 C13.5,6.06 11.8,7.26 10.9,7.26 C9.9,7.26 8.5,6.25 7,6.28 C4.8,6.34 2.9,7.68 1.9,9.78 C-0.1,14.04 1.6,20.05 3.5,23.25 C4.4,24.81 5.5,26.56 7,26.5 C8.5,26.44 9,25.5 10.8,25.5 C12.6,25.5 13,26.5 14.6,26.46 C16.2,26.43 17.2,24.87 18.1,23.3 C18.7,22.2 19.2,21 19.5,19.78 C17.7,19 16.5,17.56 16.5,15.75 C16.5,13.82 17.92,12.21 19.85,11.86 C19.04,11.18 18.04,10.8 17.04,10.8 L17.05,11.97 Z M15.05,4.81 C15.8524,3.85758 16.1812,2.65181 15.95,1.46 C14.7738,1.57038 13.698,2.14159 12.95,3.05 C12.1476,3.99194 11.8174,5.1886 12.04,6.37 C13.2262,6.27901 14.312,5.70786 15.07,4.8 L15.05,4.81 Z"
              />
            </svg>
            <span className="text-white text-sm">Apple</span>
          </button>
        </div>

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
