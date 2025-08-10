import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../design-system/contexts/ThemeContext';
import { useUserPreferences, availableCurrencies } from '../contexts/UserPreferencesContext';
import { CustomDropdown, Button, ConfirmDialog } from '../design-system';
import MarketplaceProfile from './settings/MarketplaceProfile';
import MarketplaceReviews from './settings/MarketplaceReviews';
import SubscriptionStatus from './settings/SubscriptionStatus';
import CollectionManagement from './settings/CollectionManagement';
import CollectionSharing from './CollectionSharing';

/**
 * Mobile Settings Page Component
 * 
 * A mobile-first settings page that displays all settings in a single scrollable view
 * without tabs, matching the pattern of other mobile pages like Marketplace.
 */
const Settings = ({
  currentTab = 'general',
  selectedCollection,
  collections,
  onStartTutorial,
  onSignOut,
  onRenameCollection,
  onDeleteCollection,
  onResetData,
  onClose,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Render different content based on current tab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'general':
        return (
          <div className="w-full space-y-6 px-4 pt-4 pb-24">
      {/* Appearance Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Choose your preferred light or dark theme.</p>
        
        <div className="space-y-3">
          {/* Light Mode (mobile-only card) */}
          <div
            role="button"
            aria-pressed={theme === 'light'}
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`w-full overflow-hidden rounded-xl border p-4 ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 dark:border-gray-700 dark:bg-black'
            }`}
          >
            <div className="flex w-full min-w-0 items-center justify-between">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-gray-900 dark:text-white">Light Mode</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="h-4 w-8 rounded bg-blue-500"></div>
                  <div className="h-2 w-16 rounded bg-gray-300"></div>
                  <div className="h-2 w-12 rounded bg-gray-300"></div>
                </div>
              </div>
              {theme === 'light' && (
                <div className="ml-3 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
            </div>
          </div>

          {/* Dark Mode (mobile-only card) */}
          <div
            role="button"
            aria-pressed={theme === 'dark'}
            onClick={() => theme === 'light' && toggleTheme()}
            className={`w-full overflow-hidden rounded-xl border p-4 ${
              theme === 'dark'
                ? 'border-blue-500 bg-gray-800'
                : 'border-gray-200 dark:border-gray-700 dark:bg-black'
            }`}
          >
            <div className="flex w-full min-w-0 items-center justify-between">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="h-4 w-8 rounded bg-blue-500"></div>
                  <div className="h-2 w-16 rounded bg-gray-600"></div>
                  <div className="h-2 w-12 rounded bg-gray-600"></div>
                </div>
              </div>
              {theme === 'dark' && (
                <div className="ml-3 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application Settings Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Application Settings</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Configure general application settings.</p>
        
        <div className="space-y-4">
          {/* Start Tutorial Button */}
          <Button
            onClick={onStartTutorial}
            variant="outline"
            size="md"
            className="w-full"
          >
            <span className="material-icons mr-2 text-lg">help_outline</span>
            Start Tutorial
          </Button>



          {/* Currency Settings */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Display Currency</h3>
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">Preferred Currency</p>
            <CustomDropdown
              options={availableCurrencies.map(currency => ({
                value: currency.code,
                label: `${currency.symbol} ${currency.name} (${currency.code})`,
              }))}
              value={preferredCurrency?.code || ''}
              onSelect={(currencyCode) => {
                const selectedCurrency = availableCurrencies.find(c => c.code === currencyCode);
                if (selectedCurrency) {
                  updatePreferredCurrency(selectedCurrency);
                }
              }}
              placeholder="Select currency"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Collection Management */}
      <CollectionManagement
        collections={collections}
        selectedCollection={selectedCollection}
        onRenameCollection={onRenameCollection}
        onDeleteCollection={onDeleteCollection}
      />
          </div>
        );

      case 'account':
        return (
          <div className="w-full space-y-6 px-4 pt-4 pb-24">
            {/* Subscription Status */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Subscription</h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Manage your subscription and billing information.</p>
              <SubscriptionStatus />
            </div>

            {/* Account Actions */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Account Actions</h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Sign out of your account or reset your data.</p>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  onClick={onSignOut}
                  className="w-full"
                >
                  Sign Out
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full"
                >
                  Reset All Data
                </Button>
              </div>
            </div>
          </div>
        );

      case 'marketplace':
        return (
          <div className="w-full space-y-6 px-4 pt-4 pb-24">
            {/* Marketplace Profile */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Marketplace Profile</h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Manage your marketplace profile and seller information.</p>
              <MarketplaceProfile />
            </div>

            {/* My Reviews */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">My Reviews</h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">View and manage your marketplace reviews and ratings.</p>
              <MarketplaceReviews />
            </div>
          </div>
        );

      case 'sharing':
        return (
          <div className="w-full space-y-6 px-4 pt-4 pb-24">
            {/* Collection Sharing */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Collection Sharing</h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Create shareable links to showcase your collections to others.</p>
              <CollectionSharing isInModal={true} />
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full space-y-6 px-4 pt-4 pb-24">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a tab to view settings.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {renderTabContent()}
      
      {/* Reset Data Confirmation */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false);
          onResetData();
        }}
        title="Reset All Data"
        message="Are you sure you want to reset all your data? This action cannot be undone and will permanently delete all your cards, collections, and settings."
        confirmButtonProps={{
          variant: 'danger',
        }}
      />
    </>
  );
};

Settings.propTypes = {
  currentTab: PropTypes.string,
  selectedCollection: PropTypes.string,
  collections: PropTypes.object,
  onStartTutorial: PropTypes.func,
  onSignOut: PropTypes.func,
  onRenameCollection: PropTypes.func,
  onDeleteCollection: PropTypes.func,
  onResetData: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default Settings;
