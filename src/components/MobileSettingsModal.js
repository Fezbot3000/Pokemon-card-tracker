import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTutorial } from '../contexts/TutorialContext';
import { Link } from 'react-router-dom';

const MobileSettingsModal = ({ isOpen, onClose, onResetData }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { subscriptionStatus } = useSubscription();
  const { startTutorial } = useTutorial();
  const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'USD');

  // Handle currency change
  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setCurrency(newCurrency);
    localStorage.setItem('currency', newCurrency);
    // Trigger a refresh to update currency display
    window.dispatchEvent(new Event('currencyChange'));
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
  };

  // Handle tutorial restart
  const handleRestartTutorial = () => {
    startTutorial();
    onClose();
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect will happen automatically via auth state change
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-end justify-center">
      <div className="bg-white dark:bg-[#1B2131] w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as</p>
            <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
            {subscriptionStatus === 'active' && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Premium Subscriber
              </span>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="flex justify-between items-center">
            <span className="text-gray-900 dark:text-white">Dark Mode</span>
            <button 
              onClick={handleThemeToggle} 
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span 
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`} 
              />
            </button>
          </div>

          {/* Currency Selector */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={handleCurrencyChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-[#2D3748] text-gray-900 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="AUD">AUD ($)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>

          {/* Subscription Management */}
          {subscriptionStatus !== 'active' && (
            <div>
              <Link
                to="/dashboard/pricing"
                onClick={onClose}
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Upgrade to Premium
              </Link>
            </div>
          )}

          {/* Tutorial */}
          <div>
            <button
              onClick={handleRestartTutorial}
              className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Restart Tutorial
            </button>
          </div>

          {/* Reset Data */}
          <div>
            <button
              onClick={onResetData}
              className="block w-full text-center px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Reset All Data
            </button>
          </div>

          {/* Sign Out */}
          <div>
            <button
              onClick={handleSignOut}
              className="block w-full text-center px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSettingsModal;
