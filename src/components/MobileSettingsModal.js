import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../design-system';
import { useTutorial } from '../contexts/TutorialContext';
import logger from '../utils/logger';
import CustomDropdown from './ui/CustomDropdown';

const MobileSettingsModal = ({ isOpen, onClose, onResetData }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startTutorial } = useTutorial();
  const [currency, setCurrency] = useState(
    localStorage.getItem('currency') || 'USD'
  );

  // Handle currency change
  const handleCurrencyChange = e => {
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
      logger.error('Error signing out:', error, { context: { file: 'MobileSettingsModal', purpose: 'sign-out' } });
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
    <div className="bg-black/75 fixed inset-0 z-50 flex items-end justify-center">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-black" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Signed in as
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {user?.email}
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">Dark Mode</span>
            <button
              onClick={handleThemeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Currency Selector */}
          <div>
            <label
              htmlFor="currency"
              className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              Currency
            </label>
            <CustomDropdown
              id="currency"
              value={currency}
              onSelect={handleCurrencyChange}
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'JPY', label: 'JPY (¥)' },
                { value: 'AUD', label: 'AUD ($)' },
                { value: 'CAD', label: 'CAD ($)' }
              ]}
            />
          </div>

          {/* Tutorial */}
          <div>
            <button
              onClick={handleRestartTutorial}
              className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-gray-900 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
            >
              Restart Tutorial
            </button>
          </div>

          {/* Reset Data */}
          <div>
            <button
              onClick={onResetData}
              className="block w-full rounded-md border border-red-300 px-4 py-2 text-center text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Reset All Data
            </button>
          </div>

          {/* Sign Out */}
          <div>
            <button
              onClick={handleSignOut}
              className="block w-full rounded-md bg-[#ef4444] px-4 py-2 text-center text-white transition-colors hover:bg-[#dc2626]"
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
