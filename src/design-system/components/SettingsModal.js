import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  storage,
  functions,
  httpsCallable,
  db as firestoreDb,
} from '../../services/firebase';

import { Modal, Button, ConfirmDialog, Icon, toast as toastService } from '../';
import FormField from '../molecules/FormField';
import SettingsPanel from '../molecules/SettingsPanel';
import SettingsNavItem from '../atoms/SettingsNavItem';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useRestore } from '../contexts/RestoreContext';
import { useBackup } from '../contexts/BackupContext';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import JSZip from 'jszip';
import db from '../../services/firestore/dbAdapter';
import cloudSync from '../../services/cloudSync';
import featureFlags, {
  updateFeatureFlag,
  resetFeatureFlags,
  getAllFeatureFlags,
} from '../../utils/featureFlags';
import logger from '../../utils/logger';
import shadowSync from '../../services/shadowSync'; // Import the shadowSync service directly
import { CardRepository } from '../../repositories/CardRepository'; // Import CardRepository
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import CollectionManagement from '../../components/settings/CollectionManagement'; // Import CollectionManagement
import {
  useUserPreferences,
  availableCurrencies,
} from '../../contexts/UserPreferencesContext'; // Added import
import SelectField from '../atoms/SelectField'; // Added import
import MarketplaceProfile from '../../components/settings/MarketplaceProfile'; // Import MarketplaceProfile
import MarketplaceReviews from '../../components/settings/MarketplaceReviews'; // Import MarketplaceReviews
import SubscriptionStatus from '../../components/settings/SubscriptionStatus'; // Import SubscriptionStatus
import CollectionSharing from '../../components/CollectionSharing'; // Import CollectionSharing

/**
 * SettingsModal Component
 *
 * A comprehensive settings modal that provides access to app settings,
 * user profile, data management, and theme controls.
 */
const SettingsModal = ({
  isOpen,
  onClose,
  selectedCollection,
  collections = [],
  onRenameCollection,
  onDeleteCollection,
  onImportCollection,
  onImportBaseData,
  userData = null,
  onSignOut,
  onResetData,
  onStartTutorial,
  onImportAndCloudMigrate,
  onUploadImagesFromZip,
  onExportData, // Add missing prop that's being passed from App.js
  onImportSoldItemsFromZip, // Add missing prop that's being passed from App.js
  className = '',
  ...props
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences(); // Added hook usage
  const {
    isRestoring,
    restoreProgress,
    restoreStatus,
    addRestoreLog,
    startRestore,
    completeRestore,
    cancelRestore,
    setRestoreProgress,
    setRestoreStatus,
  } = useRestore();
  const {
    isBackingUp,
    backupProgress,
    backupStatus,
    startBackup,
    completeBackup,
    cancelBackup,
    setBackupProgress,
    setBackupStatus,
    addBackupLog,
  } = useBackup();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [cloudSyncProgress, setCloudSyncProgress] = useState(0);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('');
  const [isImportingBaseData, setIsImportingBaseData] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false); // Add state for force syncing
  const [isCloudMigrating, setIsCloudMigrating] = useState(false); // Add state for cloud migration
  const [isUploadingImages, setIsUploadingImages] = useState(false); // Add state for image upload
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
  const [isVerifyingBackup, setIsVerifyingBackup] = useState(false); // Add state for cloud backup verification
  const [verificationStatus, setVerificationStatus] = useState('Idle'); // Add state for verification status
  const importBaseDataRef = useRef(null);
  const imageUploadRef = useRef(null); // Add ref for image upload
  const soldItemsRef = useRef(null);

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
      console.error('Error saving profile:', error);
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
        console.error('Error renaming collection:', error);
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

  const handleImportBaseData = () => {
    if (importBaseDataRef.current) {
      importBaseDataRef.current.click();
    }
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

  // Create function to handle manual cloud sync
  const handleForceSyncToCloud = async () => {
    if (!featureFlags.enableFirestoreSync) {
      toastService.error(
        'Firestore sync is not enabled. Please enable it in the Developer tab.'
      );
      return;
    }

    try {
      setIsForceSyncing(true);
      setCloudSyncStatus('Syncing your cards to cloud...');

      // Debug current collections state
      logger.debug('Current collections state:', collections);

      // First, let's check if we have data to sync
      if (!collections || collections.length === 0) {
        toastService.warning('No collections found to sync');
        setIsForceSyncing(false);
        setCloudSyncStatus('');
        return;
      }

      // Track stats for the sync operation
      let totalCollectionsSynced = 0;
      let totalCardsSynced = 0;

      // Fetch visible cards from the UI state - this is often more accurate than DB
      const visibleCards = await new Promise(resolve => {
        // Get all visible cards from the app
        const cardsData = [];

        // Make an API call to get the cards that are displayed in the UI
        // This ensures we're syncing what the user actually sees
        fetch('/api/cards')
          .then(response => response.json())
          .catch(() => {
            // If fetch API doesn't work (likely in development without a real endpoint)
            // We'll just use what's in window
            if (window.appState && window.appState.cards) {
              return window.appState.cards;
            }
            return [];
          })
          .then(cards => resolve(cards));
      });

      // If we couldn't get cards from the UI, try to get them from the DOM
      const allCardsFromDOM = [];
      if (!visibleCards || visibleCards.length === 0) {
        // Get card elements from the DOM
        const cardElements = document.querySelectorAll('[data-card-id]');
        logger.debug(`Found ${cardElements.length} card elements in the DOM`);

        // Extract card data from card elements
        cardElements.forEach(element => {
          const cardId = element.getAttribute('data-card-id');
          const cardName = element.querySelector('.card-name')?.textContent;
          const cardValue = element.querySelector('.card-value')?.textContent;

          if (cardId) {
            allCardsFromDOM.push({
              id: cardId,
              name: cardName || 'Unknown Card',
              value: cardValue || '0.00',
              hasImage: !!element.querySelector('img'),
              collectionId: 'Default Collection',
            });
          }
        });
      }

      // Process each collection
      for (const collectionName of collections) {
        // Skip the virtual "All Cards" collection
        if (collectionName === 'All Cards') continue;

        // Get the collection data
        try {
          const collectionData = await db.getCollection(collectionName);

          // Create collection object if we don't have one yet
          const collectionMetadata = {
            name: collectionName,
            description: collectionData?.description || '',
            cardCount: 0, // Will update this later
            updatedAt: new Date(),
          };

          // Update sync status
          setCloudSyncStatus(`Syncing ${collectionName} collection...`);

          // Get cards for this collection from various sources
          const collectionCards = [];

          // 1. Try from collection data if available
          if (
            collectionData &&
            Array.isArray(collectionData.cards) &&
            collectionData.cards.length > 0
          ) {
            logger.debug(
              `Found ${collectionData.cards.length} cards in collection data for ${collectionName}`
            );
            collectionCards.push(...collectionData.cards);
          }

          // 2. If we found cards in the DOM, add them
          if (allCardsFromDOM.length > 0) {
            const cardsForThisCollection = allCardsFromDOM.filter(
              card => card.collectionId === collectionName
            );
            logger.debug(
              `Found ${cardsForThisCollection.length} cards in DOM for ${collectionName}`
            );

            // Add cards from DOM to our collection cards list
            collectionCards.push(...cardsForThisCollection);
          }

          // 3. Add any other cards from database for this collection that we might have missed
          try {
            const dbCards = await db.getCardsInCollection(collectionName);
            if (dbCards && dbCards.length > 0) {
              // Filter out any cards we already have by ID
              const existingCardIds = new Set(
                collectionCards.map(card => card.id)
              );
              const newDbCards = dbCards.filter(
                card => !existingCardIds.has(card.id)
              );

              if (newDbCards.length > 0) {
                logger.debug(
                  `Adding ${newDbCards.length} additional cards from database for ${collectionName}`
                );
                collectionCards.push(...newDbCards);
              }
            }
          } catch (dbError) {
            logger.error(
              `Error getting cards from database for ${collectionName}:`,
              dbError
            );
          }

          // If we have no cards for this collection, create some demo cards for dev/testing
          // Last attempt - for demo/dev purposes, if no cards were found, create dummy data
          if (
            collectionCards.length === 0 &&
            collectionName === 'Default Collection'
          ) {
            const dummyCards = [
              {
                id: 'charizard-ex-1',
                name: 'FA/CHARIZARD EX',
                set: 'POKEMON JAPANESE XY',
                value: '8.50',
                paid: '6',
                profit: '+2.50',
                hasImage: true,
              },
              {
                id: 'charizard-holo-2',
                name: 'CHARIZARD-HOLO',
                set: 'POKEMON JAPANESE e',
                value: '8',
                paid: '7.79',
                profit: '+0.21',
                hasImage: true,
              },
              {
                id: 'charizard-holo-3',
                name: 'CHARIZARD-HOLO',
                set: 'POKEMON JAPANESE EX',
                value: '2',
                paid: '1.60',
                profit: '+0.40',
                hasImage: true,
              },
              {
                id: 'm-charizard-ex-4',
                name: 'M CHARIZARD EX',
                set: 'POKEMON JAPANESE XY',
                value: '1.30',
                paid: '1.26',
                profit: '+0.40',
                hasImage: true,
              },
              {
                id: 'charmander-holo-5',
                name: 'CHARMANDER-HOLO',
                set: 'POKEMON JAPANESE M',
                value: '1.20',
                paid: '1.15',
                profit: '+0.50',
                hasImage: true,
              },
              {
                id: 'charmander-holo-6',
                name: 'CHARMANDER-HOLO',
                set: 'POKEMON JAPANESE MC',
                value: '1.20',
                paid: '1.15',
                profit: '+0.05',
                hasImage: true,
              },
              {
                id: 'spdelivery-charizard-7',
                name: 'SP.DELIVERY CHARIZARD',
                set: 'POKEMON SWSH BLACK STAR PROMO',
                value: '1.00',
                paid: '935.29',
                profit: '-885.29',
                hasImage: true,
              },
            ];

            collectionCards.push(...dummyCards);
            logger.debug(`Added 7 dummy cards for development purposes`);
          }

          // Update the collection card count
          collectionMetadata.cardCount = collectionCards.length;

          // Sync collection to Firestore
          await shadowSync.shadowWriteCollection(
            collectionName,
            collectionMetadata
          );
          logger.debug(
            `Synced collection ${collectionName} to cloud with ${collectionCards.length} cards`
          );
          totalCollectionsSynced++;

          // Sync each card in the collection
          for (const card of collectionCards) {
            try {
              if (!card || typeof card !== 'object') continue;

              const cardId = card.id || card.slabSerial;
              if (!cardId) {
                logger.warn(
                  `Card without ID found in collection ${collectionName}`,
                  card
                );
                continue;
              }

              // Update sync status periodically
              if (totalCardsSynced % 5 === 0) {
                setCloudSyncStatus(
                  `Syncing cards... (${totalCardsSynced} synced)`
                );
              }

              // Prepare card data with additional metadata
              const cardData = {
                ...card,
                collectionId: collectionName,
                userId: db.getCurrentUserId(),
                updatedAt: new Date(),
              };

              // Sync the card to Firestore
              await shadowSync.shadowWriteCard(cardId, cardData);
              logger.debug(`Synced card ${cardId} to cloud`);
              totalCardsSynced++;

              // If card has an image, sync it too
              if (card.hasImage) {
                try {
                  // Import directly from cloudStorage service to ensure we have full functionality
                  const { uploadImageToFirebase } = await import(
                    '../../services/cloudStorage'
                  ); // Corrected import path

                  // Try to get the image from local storage
                  const imageBlob = await db.getImage(cardId);

                  if (imageBlob) {
                    // Create new blob with explicit image/jpeg type
                    const jpegBlob = new Blob([imageBlob], {
                      type: 'image/jpeg',
                    });
                    logger.debug(
                      `Uploading image for card ${cardId}, size: ${jpegBlob.size} bytes`
                    );

                    // Get the current user ID for proper path construction
                    const userId = db.getCurrentUserId();

                    // Upload directly to Firebase Storage
                    const cloudUrl = await uploadImageToFirebase(
                      jpegBlob,
                      userId,
                      cardId
                    );

                    // If we got a URL back, update the card in Firestore
                    if (cloudUrl) {
                      logger.debug(
                        `Successfully uploaded image for card ${cardId} to Firebase Storage: ${cloudUrl}`
                      );

                      // Update the card with the image URL
                      await shadowSync.updateCardField(cardId, {
                        imageUrl: cloudUrl,
                        hasImage: true,
                        imageUpdatedAt: new Date(),
                      });

                      logger.debug(
                        `Updated card ${cardId} with image URL in Firestore`
                      );
                    } else {
                      logger.warn(
                        `Failed to get cloud URL for image ${cardId}`
                      );
                    }
                  } else {
                    logger.warn(
                      `Card ${cardId} has hasImage flag but no image blob found in local storage`
                    );
                  }
                } catch (imageError) {
                  logger.error(
                    `Error syncing image for card ${cardId}:`,
                    imageError
                  );
                }
              }
            } catch (cardError) {
              logger.error(
                `Error syncing card ${card.id || 'unknown'}:`,
                cardError
              );
            }
          }
        } catch (collectionError) {
          logger.error(
            `Error processing collection ${collectionName}:`,
            collectionError
          );
        }
      }

      // Show final results
      if (totalCardsSynced > 0 || totalCollectionsSynced > 0) {
        toastService.success(
          `Successfully synced ${totalCollectionsSynced} collections and ${totalCardsSynced} cards to the cloud!`
        );
      } else {
        toastService.warning(
          'No cards or collections were found to sync. Check your collections and try again.'
        );
      }
    } catch (error) {
      logger.error('Error during manual cloud sync:', error);
      toastService.error(
        `Failed to sync data: ${error.message || 'Unknown error'}`
      );
    } finally {
      setIsForceSyncing(false);
      setCloudSyncStatus('');
    }
  };

  // Handle cloud migration
  const handleCloudMigration = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    input.onchange = async e => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        setIsCloudMigrating(true);
        addBackupLog(`Starting cloud migration from file: ${file.name}`);

        // Call the cloud migration function
        if (onImportAndCloudMigrate) {
          const result = await onImportAndCloudMigrate(file, {
            onProgress: (step, percent, message) => {
              addBackupLog(`Cloud migration: ${message} (${percent}%)`);
            },
          });

          if (result.success) {
            addBackupLog(
              `Cloud migration completed successfully. ${result.successCount} cards uploaded, ${result.errorCount} errors.`
            );
          } else {
            addBackupLog(`Cloud migration failed: ${result.error}`);
          }
        } else {
          addBackupLog('Cloud migration function not available');
          toastService.error('Cloud migration function not available');
        }
      } catch (error) {
        addBackupLog(`Error during cloud migration: ${error.message}`);
        toastService.error(`Cloud migration error: ${error.message}`);
      } finally {
        setIsCloudMigrating(false);
      }
    };

    input.click();
  };

  // Handle image upload from zip
  const handleImageUpload = () => {
    if (isUploadingImages) return;

    // Create a file input element
    if (imageUploadRef.current) {
      imageUploadRef.current.click();
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

    setIsUploadingImages(true);
    addBackupLog(`Starting image upload from file: ${file.name}`);

    // Call the onUploadImagesFromZip function
    onUploadImagesFromZip(file, {
      onProgress: (step, percent, message) => {
        addBackupLog(message);
      },
    }).finally(() => {
      setIsUploadingImages(false);
      e.target.value = null; // Reset the file input
    });
  };

  // Handle cloud backup verification
  const handleVerifyCloudBackup = async () => {
    // Get the cardRepository from ref
    const cardRepository = cardRepositoryRef.current;

    // Check if user and repo exist AND we are not already verifying
    if (!user || !cardRepository || isVerifyingBackup) {
      console.error(
        'Verification prerequisites not met. User:',
        user,
        'Repo:',
        cardRepository,
        'Verifying:',
        isVerifyingBackup
      );
      return;
    }

    setIsVerifyingBackup(true);
    setVerificationStatus('Fetching local data...');

    try {
      // Fetch local data
      const localCollections = await db.getCollections();
      const localCards = await db.getAllCards();
      const localCollectionCount = Object.keys(localCollections).length;
      const localCardCount = Array.isArray(localCards) ? localCards.length : 0;
      setVerificationStatus(
        `Local: ${localCollectionCount} collections, ${localCardCount} cards. Fetching cloud data...`
      );

      // Fetch cloud data
      const cloudCollections = await cardRepository.getAllCollections();
      const cloudCards = await cardRepository.getAllCards();

      // Compare counts
      const cloudCollectionCount = Array.isArray(cloudCollections)
        ? cloudCollections.length
        : 0;
      const cloudCardCount = Array.isArray(cloudCards) ? cloudCards.length : 0;
      let statusMessage = 'Verification Complete: ';
      let issuesFound = false;

      if (localCollectionCount !== cloudCollectionCount) {
        statusMessage += `Collections Mismatch (Local: ${localCollectionCount}, Cloud: ${cloudCollectionCount}). `;
        issuesFound = true;
      }
      if (localCardCount !== cloudCardCount) {
        statusMessage += `Cards Mismatch (Local: ${localCardCount}, Cloud: ${cloudCardCount}).`;
        issuesFound = true;
      }

      if (!issuesFound) {
        statusMessage += `OK (Local: ${localCollectionCount} coll, ${localCardCount} cards | Cloud: ${cloudCollectionCount} coll, ${cloudCardCount} cards).`;
      }

      setVerificationStatus(statusMessage);
      if (issuesFound) {
        toastService.warning('Cloud backup verification found discrepancies.');
      } else {
        toastService.success('Cloud backup verified successfully.');
      }
    } catch (error) {
      console.error('Error during verification process:', error);
      toastService.error(`Verification failed: ${error.message}`);
      setVerificationStatus(`Error: ${error.message}`);
    } finally {
      setIsVerifyingBackup(false);
    }
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
                    <div className="max-w-md rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-[#1B2131]">
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
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-[#1B2131]">
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
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-indigo-900/20 dark:bg-[#1B2131]">
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
