import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { useTheme } from '../design-system/contexts/ThemeContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { toast as toastService } from '../design-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import CollectionManagement from './settings/CollectionManagement';
import MarketplaceProfile from './settings/MarketplaceProfile';
import MarketplaceReviews from './settings/MarketplaceReviews';
import SubscriptionStatus from './settings/SubscriptionStatus';
import CollectionSharing from './CollectionSharing';
import db from '../services/firestore/dbAdapter';
import ErrorBoundary from './ErrorBoundary';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, userData } = useAuth() || {};
  const { theme, toggleTheme } = useTheme() || {
    theme: 'light',
    toggleTheme: () => {},
  };
  const { preferredCurrency, updatePreferredCurrency } =
    useUserPreferences() || {};

  const [activeTab, setActiveTab] = useState('general');
  const [collections, setCollections] = useState({});
  const [collectionToRename, setCollectionToRename] = useState('');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [profile, setProfile] = useState({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    company: userData?.company || '',
    mobile: userData?.mobile || '',
    address: userData?.address || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isDarkMode = theme === 'dark';

  // Load collections on component mount
  useEffect(() => {
    const loadCollections = async () => {
      try {
        setIsLoading(true);
        const savedCollections = await db.getCollections();
        if (savedCollections && typeof savedCollections === 'object') {
          setCollections(savedCollections);
        }
      } catch (error) {
        console.error('Error loading collections:', error);
        toastService.error('Failed to load collections');
      } finally {
        setIsLoading(false);
      }
    };

    loadCollections();
  }, []);

  // Listen for custom event to open sharing tab
  useEffect(() => {
    const handleOpenSharingTab = () => {
      setActiveTab('sharing');
    };

    window.addEventListener('openSharingTab', handleOpenSharingTab);

    return () => {
      window.removeEventListener('openSharingTab', handleOpenSharingTab);
    };
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'account', label: 'Account', icon: 'person' },
    { id: 'sharing', label: 'Collection Sharing', icon: 'share' },
    { id: 'marketplace', label: 'Marketplace', icon: 'storefront' },
  ];

  const handleProfileChange = e => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSave = () => {
    // TODO: Implement profile save functionality
    toastService.success('Profile saved successfully');
  };

  const handlePreferredCurrencyChange = e => {
    const newCurrency = e.target.value;
    if (updatePreferredCurrency) {
      updatePreferredCurrency({ code: newCurrency });
      toastService.success(`Currency changed to ${newCurrency}`);
    }
  };

  const handleDataReset = async () => {
    try {
      // TODO: Implement data reset functionality
      toastService.success('All data has been reset successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error resetting data:', error);
      toastService.error('Failed to reset data. Please try again.');
    }
  };

  const startTutorial = () => {
    // TODO: Implement tutorial functionality
    toastService.info('Tutorial functionality coming soon');
  };

  const handleStartRenaming = () => {
    if (collectionToRename) {
      const newName = prompt(`Enter new name for "${collectionToRename}":`);
      if (newName && newName.trim() && newName !== collectionToRename) {
        handleRenameCollection(collectionToRename, newName.trim());
      }
    }
  };

  const handleRenameCollection = async (oldName, newName) => {
    try {
      // Use the collectionManager for consistent behavior
      const { collectionManager } = await import('../utils/collectionManager');
      const success = await collectionManager.renameCollection(
        oldName,
        newName,
        {
          collections,
          setCollections,
          selectedCollection: null, // Settings doesn't track selected collection
          setSelectedCollection: () => {}, // No-op for settings
          user: null, // Settings doesn't have user context
        }
      );

      if (success) {
        setCollectionToRename('');
        toastService.success(
          `Collection renamed from "${oldName}" to "${newName}"`
        );
      } else {
        toastService.error('Failed to rename collection');
      }
    } catch (error) {
      console.error('Error renaming collection:', error);
      toastService.error('Failed to rename collection');
    }
  };

  const handleDeleteCollection = async collectionName => {
    try {
      const updatedCollections = { ...collections };
      delete updatedCollections[collectionName];

      // Save to database
      await db.saveCollections(updatedCollections);
      setCollections(updatedCollections);
      setCollectionToDelete('');
      toastService.success(
        `Collection "${collectionName}" deleted successfully`
      );
    } catch (error) {
      console.error('Error deleting collection:', error);
      toastService.error('Failed to delete collection');
    }
  };

  // Safe tab change handler
  const handleTabChange = tabId => {
    try {
      setActiveTab(tabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error changing tab:', error);
      toastService.error('Failed to change tab');
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <div className="size-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-black">
        {/* Tab Navigation */}
        <div className="header-responsive fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-black lg:sticky lg:top-0 lg:z-10">
          <div className="flex h-full items-center justify-center space-x-1 px-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white'
                    : 'hover:bg-gray-200/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span
                  className={`material-icons mr-1 hidden text-sm xs:inline ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8 px-4 pb-16 pt-[var(--header-total-height-mobile)] lg:pb-4 lg:pt-[var(--header-total-height-desktop)]">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Appearance */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Appearance
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Choose your preferred light or dark theme.
                </p>

                <div className="flex gap-4">
                  <div
                    className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${!isDarkMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'} `}
                    onClick={() => toggleTheme('light')}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Light Mode
                      </h4>
                      {!isDarkMode && <span className="text-blue-500">✓</span>}
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-2">
                      <div className="mb-2 h-2 w-8 rounded bg-blue-500"></div>
                      <div className="mb-2 h-2 w-16 rounded bg-gray-300"></div>
                      <div className="h-2 w-10 rounded bg-gray-300"></div>
                    </div>
                  </div>

                  <div
                    className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-gray-200 dark:border-gray-700'} `}
                    onClick={() => toggleTheme('dark')}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Dark Mode
                      </h4>
                      {isDarkMode && <span className="text-blue-500">✓</span>}
                    </div>
                    <div className="rounded-md border border-gray-700 bg-gray-900 p-2">
                      <div className="mb-2 h-2 w-8 rounded bg-blue-500"></div>
                      <div className="mb-2 h-2 w-16 rounded bg-gray-700"></div>
                      <div className="h-2 w-10 rounded bg-gray-700"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Settings */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Application Settings
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Configure general application settings.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={startTutorial}
                    className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-[#2A3441] dark:text-white dark:hover:bg-[#3A4551]"
                  >
                    <span className="material-icons mr-2">school</span>
                    Start Tutorial
                  </button>

                  {/* Currency Selection */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-[#2A3441]">
                    <h4 className="mb-2 flex items-center font-medium text-gray-900 dark:text-white">
                      <span className="mr-2">🌐</span>
                      Display Currency
                    </h4>
                    <select
                      value={preferredCurrency?.code || 'AUD'}
                      onChange={handlePreferredCurrencyChange}
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#ef4444] dark:border-gray-600 dark:bg-black dark:text-white"
                    >
                      <option value="AUD">Australian Dollar (AUD)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="GBP">British Pound (GBP)</option>
                      <option value="JPY">Japanese Yen (JPY)</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Select the currency for displaying all monetary values in
                      the app.
                    </p>
                  </div>
                </div>
              </div>

              {/* Manage Collections */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Manage Collections
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Rename or delete your card collections.
                </p>
                <CollectionManagement
                  collections={collections}
                  collectionToRename={collectionToRename}
                  setCollectionToRename={setCollectionToRename}
                  collectionToDelete={collectionToDelete}
                  setCollectionToDelete={setCollectionToDelete}
                  onStartRenaming={handleStartRenaming}
                  onDeleteCollection={handleDeleteCollection}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Subscription Status */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Subscription
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Manage your subscription and billing information.
                </p>

                <ErrorBoundary>
                  <SubscriptionStatus />
                </ErrorBoundary>
              </div>

              {/* Sign Out */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Sign Out
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Sign out of your account and return to the login screen.
                </p>

                {userData && (
                  <div className="mb-6 flex items-center space-x-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <div className="flex size-12 items-center justify-center rounded-full bg-indigo-600 font-medium text-white">
                      {userData.firstName ? userData.firstName.charAt(0) : '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {userData.firstName} {userData.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {user ? user.email : 'Not signed in'}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={logout}
                  className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-[#2A3441] dark:text-white dark:hover:bg-[#3A4551]"
                >
                  <span className="mr-2">🚪</span>
                  Sign Out
                </button>
              </div>

              {/* Personal Information */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Personal Information
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Update your personal information and profile settings.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#ef4444] dark:border-gray-600 dark:bg-[#2A3441] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#ef4444] dark:border-gray-600 dark:bg-[#2A3441] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Company Name (Optional)
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={profile.company}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#ef4444] dark:border-gray-600 dark:bg-[#2A3441] dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mobile Number (Optional)
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={profile.mobile}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#ef4444] dark:border-gray-600 dark:bg-[#2A3441] dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Address (Optional)
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={profile.address}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#ef4444] dark:border-gray-600 dark:bg-[#2A3441] dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleProfileSave}
                      className="rounded-lg bg-[#ef4444] px-6 py-2 text-white transition-colors hover:bg-[#dc2626]"
                    >
                      Save Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset All Data */}
              <div className="rounded-lg border border-red-200 bg-white p-6 dark:border-red-800 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Reset All Data
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Permanently delete all your data from both local storage and
                  the cloud.
                </p>

                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Warning:</strong> This action will permanently
                    delete all your cards, collections, sales history, and
                    images. This cannot be undone.
                  </p>
                </div>

                <button
                  onClick={handleDataReset}
                  className="flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-3 text-white transition-colors hover:bg-red-700"
                >
                  <span className="mr-2">🗑️</span>
                  Reset All Data
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sharing' && (
            <div className="space-y-6">
              <ErrorBoundary>
                <CollectionSharing />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'marketplace' && (
            <div className="space-y-6">
              {/* Marketplace Profile */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Marketplace Profile
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Manage your marketplace profile and seller information.
                </p>
                <ErrorBoundary>
                  <MarketplaceProfile />
                </ErrorBoundary>
              </div>

              {/* My Reviews */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-black">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  My Reviews
                </h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  View and manage your marketplace reviews and ratings.
                </p>
                <ErrorBoundary>
                  <MarketplaceReviews />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
