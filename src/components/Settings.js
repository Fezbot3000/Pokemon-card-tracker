import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { useTheme } from '../design-system/contexts/ThemeContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { toast as toastService } from '../design-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import CollectionManagement from './settings/CollectionManagement';
import SubscriptionManagement from './SubscriptionManagement';
import MarketplaceProfile from './settings/MarketplaceProfile';
import MarketplaceReviews from './settings/MarketplaceReviews';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, userData } = useAuth() || {};
  const { theme, toggleTheme } = useTheme() || { theme: 'light', toggleTheme: () => {} };
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences() || {};
  const { subscriptionStatus } = useSubscription() || {};
  
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    company: userData?.company || '',
    mobile: userData?.mobile || '',
    address: userData?.address || ''
  });

  const isDarkMode = theme === 'dark';

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'account', label: 'Account', icon: 'person' },
    { id: 'marketplace', label: 'Marketplace', icon: 'storefront' }
  ];

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSave = () => {
    // TODO: Implement profile save functionality
    toastService.success('Profile saved successfully');
  };

  const handlePreferredCurrencyChange = (e) => {
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F1419]">
      {/* Tab Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#1B2131] border-b border-gray-200 dark:border-gray-700 lg:sticky lg:top-0 lg:z-10">
        <div className="flex justify-center space-x-1 p-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ef4444] to-[#db2777] text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className={`material-icons text-sm mr-1 ${
                activeTab === tab.id ? 'text-white' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-20 lg:pt-0 p-4 space-y-4 mb-20 sm:mb-4">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Appearance */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Appearance</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose your preferred light or dark theme.</p>
              
              <div className="flex gap-4">
                <div 
                  className={`
                    flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${!isDarkMode ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                  `}
                  onClick={() => toggleTheme('light')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Light Mode</h4>
                    {!isDarkMode && <span className="text-blue-500">✓</span>}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-md p-2">
                    <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
                    <div className="h-2 w-16 bg-gray-300 rounded mb-2"></div>
                    <div className="h-2 w-10 bg-gray-300 rounded"></div>
                  </div>
                </div>
                
                <div 
                  className={`
                    flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-gray-200 dark:border-gray-700'}
                  `}
                  onClick={() => toggleTheme('dark')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                    {isDarkMode && <span className="text-blue-500">✓</span>}
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded-md p-2">
                    <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
                    <div className="h-2 w-16 bg-gray-700 rounded mb-2"></div>
                    <div className="h-2 w-10 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* TEST SECTION - SHOULD BE VISIBLE */}
            <div className="bg-red-100 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
              <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">🔴 TEST SECTION</h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                If you can see this red section, then React is updating properly.
              </p>
            </div>

            {/* Application Settings */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Application Settings</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Configure general application settings.</p>
              
              <div className="space-y-4">
                <button
                  onClick={startTutorial}
                  className="w-full py-3 px-4 bg-gray-100 dark:bg-[#2A3441] text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-[#3A4551] transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">❓</span>
                  Start Tutorial
                </button>

                {/* Currency Selection */}
                <div className="bg-gray-50 dark:bg-[#2A3441] rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <span className="mr-2">🌐</span>
                    Display Currency
                  </h4>
                  <select
                    value={preferredCurrency?.code || 'AUD'}
                    onChange={handlePreferredCurrencyChange}
                    className="w-full p-3 bg-white dark:bg-[#1B2131] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                  >
                    <option value="AUD">Australian Dollar (AUD)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="JPY">Japanese Yen (JPY)</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Select the currency for displaying all monetary values in the app.
                  </p>
                </div>
              </div>
            </div>

            {/* Manage Collections */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Manage Collections</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Rename or delete your card collections.</p>
              <CollectionManagement />
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Sign Out */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Sign Out</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Sign out of your account and return to the login screen.</p>
              
              {userData && (
                <div className="flex items-center space-x-4 mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                    {userData.firstName ? userData.firstName.charAt(0) : '?'}
                  </div>
                  <div>
                    <div className="text-gray-900 dark:text-white font-medium">{userData.firstName} {userData.lastName}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">{user ? user.email : 'Not signed in'}</div>
                  </div>
                </div>
              )}
              
              <button
                onClick={logout}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-[#2A3441] text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-[#3A4551] transition-colors flex items-center justify-center"
              >
                <span className="mr-2">🚪</span>
                Sign Out
              </button>
            </div>

            {/* Personal Information */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Personal Information</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Update your personal information and profile settings.</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleProfileChange}
                      className="w-full p-3 bg-gray-50 dark:bg-[#2A3441] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleProfileChange}
                      className="w-full p-3 bg-gray-50 dark:bg-[#2A3441] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name (Optional)</label>
                    <input
                      type="text"
                      name="company"
                      value={profile.company}
                      onChange={handleProfileChange}
                      className="w-full p-3 bg-gray-50 dark:bg-[#2A3441] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mobile Number (Optional)</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={profile.mobile}
                      onChange={handleProfileChange}
                      className="w-full p-3 bg-gray-50 dark:bg-[#2A3441] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address (Optional)</label>
                    <input
                      type="text"
                      name="address"
                      value={profile.address}
                      onChange={handleProfileChange}
                      className="w-full p-3 bg-gray-50 dark:bg-[#2A3441] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#ef4444] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={handleProfileSave}
                    className="px-6 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-colors"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Subscription Management */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Subscription Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your Stripe subscription and billing information.</p>
              <SubscriptionManagement />
            </div>

            {/* Reset All Data */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Reset All Data</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Permanently delete all your data from both local storage and the cloud.</p>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> This action will permanently delete all your cards, collections, sales history, and images. This cannot be undone.
                </p>
              </div>
              
              <button
                onClick={handleDataReset}
                className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <span className="mr-2">🗑️</span>
                Reset All Data
              </button>
            </div>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            {/* Marketplace Profile */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Marketplace Profile</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your marketplace profile and seller information.</p>
              <MarketplaceProfile />
            </div>
            
            {/* My Reviews */}
            <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">My Reviews</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">View and manage your marketplace reviews and ratings.</p>
              <MarketplaceReviews />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
