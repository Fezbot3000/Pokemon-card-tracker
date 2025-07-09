import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  db as firestoreDb,
} from '../../services/firebase';

import { Modal, Button, ConfirmDialog, Icon, toast as toastService } from '../';
import FormField from '../molecules/FormField';
import SettingsPanel from '../molecules/SettingsPanel';
import SettingsNavItem from '../atoms/SettingsNavItem';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBackup } from '../contexts/BackupContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import db from '../../services/firestore/dbAdapter';
import featureFlags, {
  updateFeatureFlag,
} from '../../utils/featureFlags';

import { CardRepository } from '../../repositories/CardRepository'; // Import CardRepository
import {
  useUserPreferences,
  availableCurrencies,
} from '../../contexts/UserPreferencesContext'; // Added import
import SelectField from '../atoms/SelectField'; // Added import
import MarketplaceProfile from '../../components/settings/MarketplaceProfile'; // Import MarketplaceProfile
import MarketplaceReviews from '../../components/settings/MarketplaceReviews'; // Import MarketplaceReviews
import SubscriptionStatus from '../../components/settings/SubscriptionStatus'; // Import SubscriptionStatus
import CollectionSharing from '../../components/CollectionSharing'; // Import CollectionSharing
import LoggingService from '../../services/LoggingService';

/**
 * SettingsModal Component
 *
 * A comprehensive settings modal that provides access to app settings,
 * user profile, data management, and theme controls.
 */
const SettingsModal = ({
  isOpen,
  onClose,
  collections = [],
  onRenameCollection,
  onDeleteCollection,
  onImportBaseData,
  userData = null,
  onSignOut,
  onResetData,
  onStartTutorial,
  onUploadImagesFromZip,
  className = '',
  ...props
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences(); // Added hook usage
  // Restore and backup hooks (keeping only the ones needed)
  const { addBackupLog } = useBackup();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: '',
  });
  const [collectionToRename, setCollectionToRename] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const importBaseDataRef = useRef(null);
  const imageUploadRef = useRef(null);

  // Create a CardRepository instance at component level
  const cardRepositoryRef = useRef(null);

  // Initialize the CardRepository when user changes
  useEffect(() => {
    if (user) {
      cardRepositoryRef.current = new CardRepository(user.uid);
    } else {
      cardRepositoryRef.current = null;
    }
  }, [user]);

  // Initialize collection to rename
  useEffect(() => {
    if (collections && typeof collections === 'object') {
      const collectionNames = Object.keys(collections);
      if (collectionNames.length > 0) {
        const firstCollection =
          collectionNames.find(c => c !== 'All Cards') || collectionNames[0];
        setCollectionToRename(firstCollection);
      }
    }
  }, [collections]);

  // Load profile data from Firestore
  useEffect(() => {
    if (user) {
      const profileRef = doc(firestoreDb, 'users', user.uid);
      getDoc(profileRef).then(doc => {
        if (doc.exists()) {
          setProfile(doc.data());
        }
      });
    }
  }, [user]);

  // Handle profile changes
  const handleProfileChange = e => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save profile to Firestore and IndexedDB
  const handleProfileSave = async () => {
    try {
      if (user) {
        // Save to Firestore
        const profileRef = doc(firestoreDb, 'users', user.uid);
        await setDoc(profileRef, profile);

        // Save to IndexedDB for local access
        await db.saveProfile(profile);

        toastService.success('Profile saved successfully');
      }
    } catch (error) {
      LoggingService.error('Error saving profile:', error);
      toastService.error('Failed to save profile');
    }
  };

  const handleRenameConfirm = async () => {
    if (newCollectionName && newCollectionName !== collectionToRename) {
      try {
        // Show loading state
        toastService.loading('Renaming collection...', {
          id: 'rename-confirm',
        });

        // Wait for the rename operation to complete
        const success = await onRenameCollection(
          collectionToRename,
          newCollectionName
        );

        if (success !== false) {
          setIsRenaming(false);
          setNewCollectionName('');
          setCollectionToRename('');
          toastService.success('Collection renamed successfully!', {
            id: 'rename-confirm',
          });
        } else {
          toastService.error('Failed to rename collection', {
            id: 'rename-confirm',
          });
        }
      } catch (error) {
        LoggingService.error('Error renaming collection:', error);
        toastService.error(`Failed to rename collection: ${error.message}`, {
          id: 'rename-confirm',
        });
      }
    }
  };

  const handleStartRenaming = () => {
    setNewCollectionName(collectionToRename);
    setIsRenaming(true);
  };

  // Handle file import
  const handleImportBaseDataChange = e => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBaseData(file)
        .then(() => {
          toastService.success('Base data imported successfully!');
        })
        .catch(error => {
          toastService.error('Failed to import base data: ' + error.message);
        })
        .finally(() => {
          e.target.value = '';
        });
    }
  };

  // Handle image upload file change
  const handleImageUploadChange = e => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if it's a zip file
    if (!file.name.endsWith('.zip')) {
      toastService.error('Please select a zip file');
      return;
    }

    addBackupLog(`Starting image upload from file: ${file.name}`);

    // Call the onUploadImagesFromZip function
    onUploadImagesFromZip(file, {
      onProgress: (step, percent, message) => {
        addBackupLog(message);
      },
    }).finally(() => {
      e.target.value = null; // Reset the file input
    });
  };



  // Handle reset data
  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    if (resetConfirmText !== 'RESET') {
      return;
    }
    setShowResetConfirm(false);
    setResetConfirmText('');
    if (onResetData) {
      onResetData();
    }
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
    setResetConfirmText('');
  };

  const handlePreferredCurrencyChange = event => {
    const newCurrencyCode = event.target.value;
    // Find the full currency object from availableCurrencies
    const currencyObject = availableCurrencies.find(
      currency => currency.code === newCurrencyCode
    );

    if (currencyObject && newCurrencyCode !== preferredCurrency.code) {
      updatePreferredCurrency(currencyObject);
      toastService.success(
        `Display currency updated to ${currencyObject.code}`
      );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        footer={
          <div className="flex w-full items-center justify-end">
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        }
        position="right"
        className={`mx-auto w-full max-w-screen-xl sm:w-4/5 md:w-[70%] ${className}`}
        ariaLabel="Settings"
        size="full"
        closeOnClickOutside={true}
        {...props}
      >
        <div className="flex h-full flex-col lg:flex-row" {...props}>
          {/* Navigation sidebar */}
          <nav className="mb-4 w-full shrink-0 border-b border-gray-200 dark:border-indigo-900/20 lg:mb-0 lg:w-48 lg:border-b-0 lg:border-r lg:pr-4">
            <div className="flex flex-row space-x-4 p-4 lg:flex-col lg:space-x-0 lg:space-y-2">
              <SettingsNavItem
                icon="settings"
                label="General"
                isActive={activeTab === 'general'}
                onClick={() => setActiveTab('general')}
              />
              <SettingsNavItem
                icon="account_circle"
                label="Account"
                isActive={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
              />
              <SettingsNavItem
                icon="storefront"
                label="Marketplace"
                isActive={activeTab === 'marketplace'}
                onClick={() => setActiveTab('marketplace')}
              />
              <SettingsNavItem
                icon="share"
                label="Collection Sharing"
                isActive={activeTab === 'sharing'}
                onClick={() => setActiveTab('sharing')}
              />
            </div>
          </nav>

          {/* Content area */}
          <div className="scrollbar-hide w-full overflow-y-auto px-2 py-4 sm:px-4 lg:flex-1">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Appearance"
                  description="Choose your preferred light or dark theme."
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div
                      className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${!isDarkMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-gray-700'} `}
                      onClick={() => toggleTheme('light')}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Light Mode
                        </h4>
                        {!isDarkMode && (
                          <Icon name="check_circle" className="text-blue-500" />
                        )}
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
                        {isDarkMode && (
                          <Icon name="check_circle" className="text-blue-500" />
                        )}
                      </div>
                      <div className="rounded-md border border-gray-700 bg-gray-900 p-2">
                        <div className="mb-2 h-2 w-8 rounded bg-blue-500"></div>
                        <div className="mb-2 h-2 w-16 rounded bg-gray-700"></div>
                        <div className="h-2 w-10 rounded bg-gray-700"></div>
                      </div>
                    </div>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Application Settings"
                  description="Configure general application settings."
                >
                  <div className="space-y-4">
                    {onStartTutorial && (
                      <Button
                        variant="outline"
                        iconLeft={<Icon name="help_outline" />}
                        onClick={onStartTutorial}
                        fullWidth
                      >
                        Start Tutorial
                      </Button>
                    )}

                    {/* Feature Flag Toggle - Moved from Developer Settings */}
                    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Cloud Sync
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enable automatic cloud synchronization for your data
                          </p>
                        </div>
                        <Button
                          variant={
                            featureFlags.enableFirestoreSync
                              ? 'primary'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => {
                            updateFeatureFlag(
                              'enableFirestoreSync',
                              !featureFlags.enableFirestoreSync
                            );
                            if (!featureFlags.enableFirestoreSync) {
                              // Also enable related flags for full cloud functionality
                              updateFeatureFlag('enableFirestoreReads', true);
                              updateFeatureFlag(
                                'enableRealtimeListeners',
                                true
                              );
                            }
                            toastService.success(
                              `Cloud Sync ${!featureFlags.enableFirestoreSync ? 'enabled' : 'disabled'}`
                            );
                          }}
                        >
                          {featureFlags.enableFirestoreSync
                            ? 'Enabled'
                            : 'Disabled'}
                        </Button>
                      </div>
                    </div>

                    {/* Preferred Currency Setting */}
                    <div className="max-w-md rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-black">
                      <h4 className="mb-2 flex items-center font-medium text-gray-900 dark:text-white">
                        <Icon name="language" className="mr-2" />{' '}
                        {/* Using 'language' icon as a placeholder for currency */}
                        Display Currency
                      </h4>
                      <SelectField
                        label="Preferred Currency"
                        name="preferredCurrency"
                        value={preferredCurrency.code}
                        onChange={handlePreferredCurrencyChange}
                        className="w-full text-sm"
                      >
                        {availableCurrencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {`${currency.name} (${currency.code})`}
                          </option>
                        ))}
                      </SelectField>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Select the currency for displaying all monetary values
                        in the app.
                      </p>
                    </div>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Manage Collections"
                  description="Rename or delete your card collections."
                >
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {/* Rename Collection Section */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-black">
                      <h4 className="mb-3 flex items-center font-medium text-gray-900 dark:text-white">
                        <Icon name="edit" className="mr-2 text-indigo-400" />
                        Rename Collection
                      </h4>
                      <div className="space-y-3">
                        <select
                          className={`w-full rounded-lg p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${
                            isDarkMode
                              ? 'border border-[#ffffff1a] bg-[#0F0F0F] text-white'
                              : 'border border-gray-300 bg-white text-gray-800'
                          }`}
                          value={collectionToRename}
                          onChange={e => setCollectionToRename(e.target.value)}
                        >
                          <option value="" disabled>
                            Select Collection...
                          </option>
                          {Array.isArray(collections)
                            ? collections
                                .filter(name => {
                                  const lowerName = name.toLowerCase();
                                  return (
                                    lowerName !== 'all cards' &&
                                    lowerName !== 'sold' &&
                                    lowerName !== 'default collection'
                                  );
                                })
                                .map(collection => (
                                  <option key={collection} value={collection}>
                                    {collection}
                                  </option>
                                ))
                            : Object.keys(collections)
                                .filter(name => {
                                  const lowerName = name.toLowerCase();
                                  return (
                                    lowerName !== 'all cards' &&
                                    lowerName !== 'sold' &&
                                    lowerName !== 'default collection'
                                  );
                                })
                                .map(collection => (
                                  <option key={collection} value={collection}>
                                    {collection}
                                  </option>
                                ))}
                        </select>
                        <Button
                          variant="primary"
                          onClick={handleStartRenaming}
                          disabled={!collectionToRename}
                          iconLeft={<Icon name="edit" />}
                          fullWidth
                        >
                          Rename Selected Collection
                        </Button>
                      </div>
                    </div>

                    {/* Delete Collection Section */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-black">
                      <h4 className="mb-3 flex items-center font-medium text-gray-900 dark:text-white">
                        <Icon name="delete" className="mr-2 text-red-500" />
                        Delete Collection
                      </h4>
                      <div className="space-y-3">
                        <select
                          className={`w-full rounded-lg p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${
                            isDarkMode
                              ? 'border border-[#ffffff1a] bg-[#0F0F0F] text-white'
                              : 'border border-gray-300 bg-white text-gray-800'
                          }`}
                          value={collectionToDelete}
                          onChange={e => setCollectionToDelete(e.target.value)}
                        >
                          <option value="" disabled>
                            Select Collection...
                          </option>
                          {Array.isArray(collections)
                            ? collections
                                .filter(name => {
                                  const lowerName = name.toLowerCase();
                                  return (
                                    lowerName !== 'all cards' &&
                                    lowerName !== 'sold' &&
                                    lowerName !== 'default collection'
                                  );
                                })
                                .map(collection => (
                                  <option key={collection} value={collection}>
                                    {collection}
                                  </option>
                                ))
                            : Object.keys(collections)
                                .filter(name => {
                                  const lowerName = name.toLowerCase();
                                  return (
                                    lowerName !== 'all cards' &&
                                    lowerName !== 'sold' &&
                                    lowerName !== 'default collection'
                                  );
                                })
                                .map(collection => (
                                  <option key={collection} value={collection}>
                                    {collection}
                                  </option>
                                ))}
                        </select>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (collectionToDelete) {
                              setShowDeleteConfirm(true);
                            }
                          }}
                          disabled={!collectionToDelete}
                          iconLeft={<Icon name="delete" />}
                          fullWidth
                        >
                          Delete Selected Collection
                        </Button>
                      </div>
                    </div>
                  </div>
                </SettingsPanel>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Subscription"
                  description="Manage your subscription and billing information."
                >
                  <SubscriptionStatus />
                </SettingsPanel>

                <SettingsPanel
                  title="Sign Out"
                  description="Sign out of your account and return to the login screen."
                >
                  {userData && (
                    <div
                      className="mb-6 flex items-center space-x-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800"
                      data-component-name="SettingsModal"
                    >
                      <div className="flex size-12 items-center justify-center rounded-full bg-indigo-600 font-medium text-white">
                        {userData.firstName
                          ? userData.firstName.charAt(0)
                          : '?'}
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
                  {onSignOut && (
                    <Button
                      variant="outline"
                      onClick={onSignOut}
                      iconLeft={<Icon name="logout" />}
                      fullWidth
                    >
                      Sign Out
                    </Button>
                  )}
                </SettingsPanel>

                <SettingsPanel
                  title="Personal Information"
                  description="Update your personal information and profile settings."
                >
                  {/* Profile form fields */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      id="firstName"
                      label="First Name"
                      type="text"
                      name="firstName"
                      value={profile.firstName || ''}
                      onChange={handleProfileChange}
                    />
                    <FormField
                      id="lastName"
                      label="Last Name"
                      type="text"
                      name="lastName"
                      value={profile.lastName || ''}
                      onChange={handleProfileChange}
                    />
                    <FormField
                      id="companyName"
                      label="Company Name (Optional)"
                      type="text"
                      name="companyName"
                      value={profile.companyName || ''}
                      onChange={handleProfileChange}
                    />
                    <FormField
                      id="mobileNumber"
                      label="Mobile Number (Optional)"
                      type="tel"
                      name="mobileNumber"
                      value={profile.mobileNumber || ''}
                      onChange={handleProfileChange}
                    />
                    <div className="md:col-span-2">
                      <FormField
                        id="address"
                        label="Address (Optional)"
                        type="text"
                        name="address"
                        value={profile.address || ''}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="primary" onClick={handleProfileSave}>
                      Save Profile
                    </Button>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Reset All Data"
                  description="Permanently delete all your data from both local storage and the cloud."
                >
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Warning:</strong> This action will permanently
                      delete all your cards, collections, sales history, and
                      images. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    iconLeft={<Icon name="delete_forever" />}
                    onClick={handleResetData}
                    fullWidth
                  >
                    Reset All Data
                  </Button>
                </SettingsPanel>
              </div>
            )}

            {activeTab === 'marketplace' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Marketplace Profile"
                  description="Manage your marketplace profile and seller information."
                >
                  <MarketplaceProfile />
                </SettingsPanel>
                <SettingsPanel
                  title="My Reviews"
                  description="View and manage your marketplace reviews and ratings."
                >
                  <MarketplaceReviews />
                </SettingsPanel>
              </div>
            )}

            {activeTab === 'sharing' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Collection Sharing"
                  description="Create shareable links to showcase your collections to others."
                >
                  <CollectionSharing isInModal={true} />
                </SettingsPanel>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Collection Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
        }}
        onConfirm={() => {
          if (collectionToDelete && onDeleteCollection) {
            onDeleteCollection(collectionToDelete);
            setCollectionToDelete('');
            setShowDeleteConfirm(false);
          }
        }}
        title="Delete Collection"
        message={`Are you sure you want to delete the collection "${collectionToDelete}"? All cards in this collection will be permanently removed.`}
        confirmButtonProps={{
          variant: 'danger',
        }}
      />

      {/* Enhanced ConfirmDialog for Reset All Data with detailed information */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        title="Reset All Data"
        message={
          <div className="space-y-3">
            <p className="font-medium text-red-600 dark:text-red-400">
              Warning: This will permanently delete ALL your data. This action
              cannot be undone.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The following data will be deleted:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
              <li>All cards in your collection (Dashboard)</li>
              <li>All sold items and sales history</li>
              <li>All purchase invoices and purchase history</li>
              <li>All uploaded card images</li>
              <li>All collections and categories</li>
              <li>All local data (browser storage)</li>
              <li>All cloud data (if you're signed in)</li>
            </ul>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your account will remain active, but all data associated with it
              will be removed.
            </p>
            <p className="mt-2 text-sm font-medium">
              Type "RESET" below to confirm this action:
            </p>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600"
              placeholder="Type RESET to confirm"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
            />
          </div>
        }
        confirmButtonProps={{
          disabled: resetConfirmText !== 'RESET',
          variant: 'danger',
        }}
      />

      {/* Rename Collection Modal */}
      <Modal
        isOpen={isRenaming}
        onClose={() => setIsRenaming(false)}
        title="Rename Collection"
        size="sm"
      >
        <div className="space-y-4 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter a new name for the collection{' '}
            <span className="font-semibold">"{collectionToRename}"</span>:
          </p>
          <FormField
            id="newCollectionName"
            label="New Collection Name"
            type="text"
            name="newCollectionName"
            value={newCollectionName}
            onChange={e => setNewCollectionName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRenameConfirm}
              disabled={
                !newCollectionName || newCollectionName === collectionToRename
              }
            >
              Rename Collection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={importBaseDataRef}
        onChange={handleImportBaseDataChange}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={imageUploadRef}
        onChange={handleImageUploadChange}
        accept=".zip"
        className="hidden"
      />
    </>
  );
};

SettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedCollection: PropTypes.string,
  collections: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  onRenameCollection: PropTypes.func,
  onDeleteCollection: PropTypes.func,
  onImportCollection: PropTypes.func,
  onImportBaseData: PropTypes.func,
  userData: PropTypes.object,
  onSignOut: PropTypes.func,
  onResetData: PropTypes.func,
  onStartTutorial: PropTypes.func,
  onImportAndCloudMigrate: PropTypes.func,
  onUploadImagesFromZip: PropTypes.func,
  onExportData: PropTypes.func, // Add missing prop type for export data function
  onImportSoldItemsFromZip: PropTypes.func, // Add missing prop type for importing sold items
  className: PropTypes.string,
};

export default SettingsModal;
