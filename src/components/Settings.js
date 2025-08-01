import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../design-system/contexts/ThemeContext';
import { useUserPreferences, availableCurrencies } from '../contexts/UserPreferencesContext';
import { CustomDropdown, Button, ConfirmDialog } from '../design-system';
import MarketplaceProfile from './settings/MarketplaceProfile';
import SubscriptionStatus from './settings/SubscriptionStatus';
import CollectionManagement from './settings/CollectionManagement';

/**
 * Mobile Settings Page Component
 * 
 * A mobile-first settings page that displays all settings in a single scrollable view
 * without tabs, matching the pattern of other mobile pages like Marketplace.
 */
const Settings = ({
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

  return (
    <div className="w-full space-y-6">
      {/* Appearance Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Choose your preferred light or dark theme.</p>
        
        <div className="space-y-3">
          {/* Light Mode */}
          <button
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Light Mode</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="h-4 w-8 rounded bg-blue-500"></div>
                  <div className="h-2 w-16 rounded bg-gray-300"></div>
                  <div className="h-2 w-12 rounded bg-gray-300"></div>
                </div>
              </div>
              {theme === 'light' && (
                <div className="flex size-6 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
            </div>
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => theme === 'light' && toggleTheme()}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="h-4 w-8 rounded bg-blue-500"></div>
                  <div className="h-2 w-16 rounded bg-gray-600"></div>
                  <div className="h-2 w-12 rounded bg-gray-600"></div>
                </div>
              </div>
              {theme === 'dark' && (
                <div className="flex size-6 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Application Settings Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Application Settings</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Configure general application settings.</p>
        
        <div className="space-y-4">
          {/* Start Tutorial Button */}
          <button
            onClick={onStartTutorial}
            className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-50 py-3 text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <span className="material-icons mr-2 text-lg">help_outline</span>
            Start Tutorial
          </button>

          {/* Cloud Sync Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Cloud Sync</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Enable automatic cloud synchronization for your data</p>
            </div>
            <div className="rounded-full bg-blue-500 px-3 py-1 text-xs text-white">
              Enabled
            </div>
          </div>

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
              onChange={(currencyCode) => {
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

      {/* Subscription Status */}
      <SubscriptionStatus />

      {/* Collection Management */}
      <CollectionManagement
        collections={collections}
        selectedCollection={selectedCollection}
        onRenameCollection={onRenameCollection}
        onDeleteCollection={onDeleteCollection}
      />

      {/* Marketplace Profile */}
      <MarketplaceProfile />

      {/* Account Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Account Actions</h2>
        
        <div className="space-y-3">
          <Button
            variant="danger"
            onClick={() => setShowResetConfirm(true)}
            className="w-full"
          >
            Reset All Data
          </Button>
          
          <Button
            variant="secondary"
            onClick={onSignOut}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>

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
    </div>
  );
};

Settings.propTypes = {
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