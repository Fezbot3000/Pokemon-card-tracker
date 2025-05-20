import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { storage, functions, httpsCallable, db as firestoreDb } from '../../services/firebase';
import { stripDebugProps } from '../../utils/stripDebugProps';
import { Modal, Button, ConfirmDialog, Icon, toast as toastService } from '../';
import FormField from '../molecules/FormField';
import SettingsPanel from '../molecules/SettingsPanel';
import SettingsNavItem from '../atoms/SettingsNavItem';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useRestore } from '../contexts/RestoreContext';
import { useBackup } from '../contexts/BackupContext';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import JSZip from 'jszip';
import db from '../../services/db';
import cloudSync from '../../services/cloudSync';
import featureFlags, { updateFeatureFlag, resetFeatureFlags, getAllFeatureFlags } from '../../utils/featureFlags';
import logger from '../../utils/logger';
import shadowSync from '../../services/shadowSync'; // Import the shadowSync service directly
import { CardRepository } from '../../repositories/CardRepository'; // Import CardRepository
import { searchByCertNumber, parsePSACardData } from '../../services/psaSearch';
import SubscriptionManagement from '../../components/SubscriptionManagement'; // Import the SubscriptionManagement component
import { useUserPreferences, availableCurrencies } from '../../contexts/UserPreferencesContext'; // Added import
import SelectField from '../atoms/SelectField'; // Added import
import { runCardDataMigration } from '../../utils/migrateCardData'; // Import card data migration utility

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
  const { 
    preferredCurrency, 
    updatePreferredCurrency 
  } = useUserPreferences(); // Added hook usage
  const { 
    isRestoring, 
    restoreProgress, 
    restoreStatus, 
    addRestoreLog, 
    startRestore, 
    completeRestore, 
    cancelRestore,
    setRestoreProgress,
    setRestoreStatus
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
    addBackupLog
  } = useBackup();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [cloudSyncProgress, setCloudSyncProgress] = useState(0);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('');
  const [isImportingBaseData, setIsImportingBaseData] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false); // Add state for force syncing
  const [isCloudMigrating, setIsCloudMigrating] = useState(false); // Add state for cloud migration
  const [isUploadingImages, setIsUploadingImages] = useState(false); // Add state for image upload
  const [isMigratingCardData, setIsMigratingCardData] = useState(false); // Add state for card data migration
  const [cardMigrationMode, setCardMigrationMode] = useState('dry-run'); // 'dry-run' or 'live'
  const [activeTab, setActiveTab] = useState('general');
  const [collectionToDelete, setCollectionToDelete] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    address: '',
    companyName: ''
  });
  const [collectionToRename, setCollectionToRename] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
const [resetConfirmText, setResetConfirmText] = useState('');
  const [isVerifyingBackup, setIsVerifyingBackup] = useState(false); // Add state for cloud backup verification
  const [isReloadingPSA, setIsReloadingPSA] = useState(false);
  const [psaReloadProgress, setPsaReloadProgress] = useState({ current: 0, total: 0 });
  const [verificationStatus, setVerificationStatus] = useState('Idle'); // Add state for verification status
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
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
        const firstCollection = collectionNames.find(c => c !== 'All Cards') || collectionNames[0];
        setCollectionToRename(firstCollection);
      }
    }
  }, [collections]);

  // Load profile data from Firestore
  useEffect(() => {
    if (user) {
      const profileRef = doc(firestoreDb, 'users', user.uid);
      getDoc(profileRef).then((doc) => {
        if (doc.exists()) {
          setProfile(doc.data());
        }
      });
    }
  }, [user]);

  // Handle profile changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
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

  const handleRenameConfirm = () => {
    if (newCollectionName && newCollectionName !== collectionToRename) {
      onRenameCollection(collectionToRename, newCollectionName);
      setIsRenaming(false);
      toastService.success('Collection renamed successfully!');
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
  const handleImportBaseDataChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBaseData(file)
        .then(() => {
          toastService.success('Base data imported successfully!');
        })
        .catch((error) => {
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
      toastService.error('Firestore sync is not enabled. Please enable it in the Developer tab.');
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
              collectionId: 'Default Collection'
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
            updatedAt: new Date()
          };
          
          // Update sync status
          setCloudSyncStatus(`Syncing ${collectionName} collection...`);
          
          // Get cards for this collection from various sources
          const collectionCards = [];
          
          // 1. Try from collection data if available
          if (collectionData && Array.isArray(collectionData.cards) && collectionData.cards.length > 0) {
            logger.debug(`Found ${collectionData.cards.length} cards in collection data for ${collectionName}`);
            collectionCards.push(...collectionData.cards);
          }
          
          // 2. If we found cards in the DOM, add them
          if (allCardsFromDOM.length > 0) {
            const cardsForThisCollection = allCardsFromDOM.filter(card => 
              card.collectionId === collectionName
            );
            logger.debug(`Found ${cardsForThisCollection.length} cards in DOM for ${collectionName}`);
            
            // Add cards from DOM to our collection cards list
            collectionCards.push(...cardsForThisCollection);
          }
          
          // 3. Add any other cards from database for this collection that we might have missed
          try {
            const dbCards = await db.getCardsInCollection(collectionName);
            if (dbCards && dbCards.length > 0) {
              // Filter out any cards we already have by ID
              const existingCardIds = new Set(collectionCards.map(card => card.id));
              const newDbCards = dbCards.filter(card => !existingCardIds.has(card.id));
              
              if (newDbCards.length > 0) {
                logger.debug(`Adding ${newDbCards.length} additional cards from database for ${collectionName}`);
                collectionCards.push(...newDbCards);
              }
            }
          } catch (dbError) {
            logger.error(`Error getting cards from database for ${collectionName}:`, dbError);
          }
          
          // If we have no cards for this collection, create some demo cards for dev/testing
          // Last attempt - for demo/dev purposes, if no cards were found, create dummy data
          if (collectionCards.length === 0 && collectionName === 'Default Collection') {
            const dummyCards = [
              {
                id: 'charizard-ex-1',
                name: 'FA/CHARIZARD EX',
                set: 'POKEMON JAPANESE XY',
                value: '8.50',
                paid: '6',
                profit: '+2.50',
                hasImage: true
              },
              {
                id: 'charizard-holo-2',
                name: 'CHARIZARD-HOLO',
                set: 'POKEMON JAPANESE e',
                value: '8',
                paid: '7.79',
                profit: '+0.21',
                hasImage: true
              },
              {
                id: 'charizard-holo-3',
                name: 'CHARIZARD-HOLO',
                set: 'POKEMON JAPANESE EX',
                value: '2',
                paid: '1.60',
                profit: '+0.40',
                hasImage: true
              },
              {
                id: 'm-charizard-ex-4',
                name: 'M CHARIZARD EX',
                set: 'POKEMON JAPANESE XY',
                value: '1.30',
                paid: '1.26',
                profit: '+0.40',
                hasImage: true
              },
              {
                id: 'charmander-holo-5',
                name: 'CHARMANDER-HOLO',
                set: 'POKEMON JAPANESE M',
                value: '1.20',
                paid: '1.15',
                profit: '+0.50',
                hasImage: true
              },
              {
                id: 'charmander-holo-6',
                name: 'CHARMANDER-HOLO',
                set: 'POKEMON JAPANESE MC',
                value: '1.20',
                paid: '1.15',
                profit: '+0.05',
                hasImage: true
              },
              {
                id: 'spdelivery-charizard-7',
                name: 'SP.DELIVERY CHARIZARD',
                set: 'POKEMON SWSH BLACK STAR PROMO',
                value: '1.00',
                paid: '935.29',
                profit: '-885.29',
                hasImage: true
              }
            ];
            
            collectionCards.push(...dummyCards);
            logger.debug(`Added 7 dummy cards for development purposes`);
          }
          
          // Update the collection card count
          collectionMetadata.cardCount = collectionCards.length;
          
          // Sync collection to Firestore
          await shadowSync.shadowWriteCollection(collectionName, collectionMetadata);
          logger.debug(`Synced collection ${collectionName} to cloud with ${collectionCards.length} cards`);
          totalCollectionsSynced++;
          
          // Sync each card in the collection
          for (const card of collectionCards) {
            try {
              if (!card || typeof card !== 'object') continue;
              
              const cardId = card.id || card.slabSerial;
              if (!cardId) {
                logger.warn(`Card without ID found in collection ${collectionName}`, card);
                continue;
              }
              
              // Update sync status periodically
              if (totalCardsSynced % 5 === 0) {
                setCloudSyncStatus(`Syncing cards... (${totalCardsSynced} synced)`);
              }
              
              // Prepare card data with additional metadata
              const cardData = {
                ...card,
                collectionId: collectionName,
                userId: db.getCurrentUserId(),
                updatedAt: new Date()
              };
              
              // Sync the card to Firestore
              await shadowSync.shadowWriteCard(cardId, cardData);
              logger.debug(`Synced card ${cardId} to cloud`);
              totalCardsSynced++;
              
              // If card has an image, sync it too
              if (card.hasImage) {
                try {
                  // Import directly from cloudStorage service to ensure we have full functionality
                  const { uploadImageToFirebase } = await import('../../services/cloudStorage'); // Corrected import path
                  
                  // Try to get the image from local storage
                  const imageBlob = await db.getImage(cardId);
                  
                  if (imageBlob) {
                    // Create new blob with explicit image/jpeg type
                    const jpegBlob = new Blob([imageBlob], { type: 'image/jpeg' });
                    logger.debug(`Uploading image for card ${cardId}, size: ${jpegBlob.size} bytes`);
                    
                    // Get the current user ID for proper path construction
                    const userId = db.getCurrentUserId();
                    
                    // Upload directly to Firebase Storage
                    const cloudUrl = await uploadImageToFirebase(jpegBlob, userId, cardId);
                    
                    // If we got a URL back, update the card in Firestore
                    if (cloudUrl) {
                      logger.debug(`Successfully uploaded image for card ${cardId} to Firebase Storage: ${cloudUrl}`);
                      
                      // Update the card with the image URL
                      await shadowSync.updateCardField(cardId, {
                        imageUrl: cloudUrl,
                        hasImage: true,
                        imageUpdatedAt: new Date()
                      });
                      
                      logger.debug(`Updated card ${cardId} with image URL in Firestore`);
                    } else {
                      logger.warn(`Failed to get cloud URL for image ${cardId}`);
                    }
                  } else {
                    logger.warn(`Card ${cardId} has hasImage flag but no image blob found in local storage`);
                  }
                } catch (imageError) {
                  logger.error(`Error syncing image for card ${cardId}:`, imageError);
                }
              }
            } catch (cardError) {
              logger.error(`Error syncing card ${card.id || 'unknown'}:`, cardError);
            }
          }
        } catch (collectionError) {
          logger.error(`Error processing collection ${collectionName}:`, collectionError);
        }
      }
      
      // Show final results
      if (totalCardsSynced > 0 || totalCollectionsSynced > 0) {
        toastService.success(`Successfully synced ${totalCollectionsSynced} collections and ${totalCardsSynced} cards to the cloud!`);
      } else {
        toastService.warning('No cards or collections were found to sync. Check your collections and try again.');
      }
    } catch (error) {
      logger.error('Error during manual cloud sync:', error);
      toastService.error(`Failed to sync data: ${error.message || 'Unknown error'}`);
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
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsCloudMigrating(true);
        addLog(`Starting cloud migration from file: ${file.name}`);
        
        // Call the cloud migration function
        if (onImportAndCloudMigrate) {
          const result = await onImportAndCloudMigrate(file, {
            onProgress: (step, percent, message) => {
              addLog(`Cloud migration: ${message} (${percent}%)`);
            }
          });
          
          if (result.success) {
            addLog(`Cloud migration completed successfully. ${result.successCount} cards uploaded, ${result.errorCount} errors.`);
          } else {
            addLog(`Cloud migration failed: ${result.error}`);
          }
        } else {
          addLog('Cloud migration function not available');
          toastService.error('Cloud migration function not available');
        }
      } catch (error) {
        addLog(`Error during cloud migration: ${error.message}`);
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
  const handleImageUploadChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if it's a zip file
    if (!file.name.endsWith('.zip')) {
      toastService.error('Please select a zip file');
      return;
    }
    
    setIsUploadingImages(true);
    addLog(`Starting image upload from file: ${file.name}`);
    
    // Call the onUploadImagesFromZip function
    onUploadImagesFromZip(file, {
      onProgress: (step, percent, message) => {
        addLog(message);
      }
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
      console.error('Verification prerequisites not met. User:', user, 'Repo:', cardRepository, 'Verifying:', isVerifyingBackup);
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
      setVerificationStatus(`Local: ${localCollectionCount} collections, ${localCardCount} cards. Fetching cloud data...`);

      // Fetch cloud data
      const cloudCollections = await cardRepository.getAllCollections();
      const cloudCards = await cardRepository.getAllCards();
      
      // Compare counts
      const cloudCollectionCount = Array.isArray(cloudCollections) ? cloudCollections.length : 0;
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

  // Handle subscription management
  const handleManageSubscription = async () => {
    setIsCreatingPortalSession(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createPortalSession = httpsCallable(functions, 'createCustomerPortalSession');
      
      // Get the current URL origin for the return URL
      const baseUrl = window.location.origin;
      
      // Call the Cloud Function to get a fresh session URL with the baseUrl
      const { data } = await createPortalSession({ 
        baseUrl,
        returnUrl: `${baseUrl}/dashboard`
      });
      
      if (data && data.url) {
        // Redirect to the Stripe Customer Portal
        window.open(data.url, '_blank');
      } else {
        toastService.error('Could not access subscription management portal');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toastService.error(`Failed to access subscription portal: ${error.message}`);
    } finally {
      setIsCreatingPortalSession(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    // Show confirmation dialog before cancellation
    if (window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      try {
        // Redirect to the Stripe Customer Portal with cancel_subscription=true parameter
        await handleManageSubscription();
        toastService.success('Please complete cancellation in the Stripe portal.');
      } catch (error) {
        console.error('Error initiating cancellation:', error);
        toastService.error(`Failed to initiate cancellation: ${error.message}`);
      }
    }
  };

  // Handle bulk PSA data reload
  const handleBulkPSAReload = async () => {
    if (!user || !cardRepositoryRef.current || isReloadingPSA) {
      return;
    }

    try {
      setIsReloadingPSA(true);
      const cardRepository = cardRepositoryRef.current;

      // Get all cards
      const allCards = await cardRepository.getAllCards();
      
      // Filter cards with PSA slab numbers
      const psaCards = allCards.filter(card => card.slabSerial);
      
      setPsaReloadProgress({ current: 0, total: psaCards.length });
      
      // Process each card
      for (let i = 0; i < psaCards.length; i++) {
        const card = psaCards[i];
        try {
          const psaData = await searchByCertNumber(card.slabSerial);
          
          if (!psaData.error) {
            const parsedData = parsePSACardData(psaData);
            if (parsedData.cardName || parsedData.setName || parsedData.grade) {
              // Update the card with new PSA data
              await cardRepository.updateCard({
                id: card.id,
                ...card,
                ...parsedData,
                _lastUpdateTime: Date.now()
              });
            }
          }
        } catch (cardError) {
          console.error(`Error updating PSA data for card ${card.id}:`, cardError);
        }
        
        setPsaReloadProgress(prev => ({ ...prev, current: i + 1 }));
      }
      
      toastService.success(`Updated PSA data for ${psaCards.length} cards`);
    } catch (error) {
      console.error('Error in bulk PSA reload:', error);
      toastService.error('Failed to update PSA data');
    } finally {
      setIsReloadingPSA(false);
      setPsaReloadProgress({ current: 0, total: 0 });
    }
  };

  // Handle subscription upgrade
  const handleUpgradeSubscription = async () => {
    if (!user) {
      toastService.error('You must be logged in to subscribe');
      return;
    }
    
    // Redirect to Stripe checkout
    window.location.href = `https://buy.stripe.com/bIY2aL2oC2kBaXe9AA?client_reference_id=${user.uid}&prefilled_email=${user.email}`;
  };

  const handlePreferredCurrencyChange = (event) => {
    const newCurrency = event.target.value;
    if (newCurrency && newCurrency !== preferredCurrency) {
      updatePreferredCurrency(newCurrency);
      toastService.success(`Display currency updated to ${newCurrency}`);
    }
  };

  // Handle card data migration
  const handleCardDataMigration = async () => {
    if (isMigratingCardData) return;
    
    try {
      setIsMigratingCardData(true);
      toastService.loading('Starting card data migration...');
      
      const isDryRun = cardMigrationMode === 'dry-run';
      const result = await runCardDataMigration(isDryRun);
      
      if (result.success) {
        const { stats } = result;
        toastService.dismiss();
        toastService.success(
          `${isDryRun ? 'Dry run' : 'Migration'} completed: ${stats.docsUpdated} cards updated, ${stats.fieldsRemoved} fields removed`
        );
        
        // Show more detailed toast for dry run
        if (isDryRun && stats.docsUpdated > 0) {
          setTimeout(() => {
            toastService.success(
              'Dry run successful. Switch to "Live Run" mode to apply these changes.', 
              { duration: 5000 }
            );
          }, 1500);
        }
      } else {
        toastService.dismiss();
        toastService.error(`Migration failed: ${result.message}`);
      }
    } catch (error) {
      logger.error('Error during card data migration:', error);
      toastService.dismiss();
      toastService.error(`Migration error: ${error.message}`);
    } finally {
      setIsMigratingCardData(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        footer={
          <div className="flex items-center justify-end w-full">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        }
        position="right"
        className={`w-[70%] max-w-screen-xl mx-auto ${className}`}
        ariaLabel="Settings"
        size="full"
        closeOnClickOutside={false}
        {...stripDebugProps(props)}
      >
        <div className="flex flex-col lg:flex-row h-full" {...stripDebugProps(props)}>
          {/* Navigation sidebar */}
          <nav className="w-full lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-indigo-900/20 mb-4 lg:mb-0 lg:pr-4">
            <div className="flex flex-row lg:flex-col space-x-4 lg:space-x-0 lg:space-y-2 p-4">
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
                icon="code" 
                label="Development" 
                isActive={activeTab === 'development'}
                onClick={() => setActiveTab('development')}
              />
            </div>
          </nav>

          {/* Content area */}
          <div className="w-full lg:flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-8 bg-gray-50 dark:bg-[#1A1A1A]">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <SettingsPanel
                  title="Appearance"
                  description="Choose your preferred light or dark theme."
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div 
                      className={`
                        flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${!isDarkMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-gray-700'}
                      `}
                      onClick={() => toggleTheme('light')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">Light Mode</h4>
                        {!isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
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
                        {isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
                      </div>
                      <div className="bg-gray-900 border border-gray-700 rounded-md p-2">
                        <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
                        <div className="h-2 w-16 bg-gray-700 rounded mb-2"></div>
                        <div className="h-2 w-10 bg-gray-700 rounded"></div>
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
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cloud Sync</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enable automatic cloud synchronization for your data
                          </p>
                        </div>
                        <Button
                          variant={featureFlags.enableFirestoreSync ? "primary" : "outline"}
                          size="sm"
                          onClick={() => {
                            updateFeatureFlag('enableFirestoreSync', !featureFlags.enableFirestoreSync);
                            if (!featureFlags.enableFirestoreSync) {
                              // Also enable related flags for full cloud functionality
                              updateFeatureFlag('enableFirestoreReads', true);
                              updateFeatureFlag('enableRealtimeListeners', true);
                            }
                            toastService.success(`Cloud Sync ${!featureFlags.enableFirestoreSync ? 'enabled' : 'disabled'}`);
                          }}
                        >
                          {featureFlags.enableFirestoreSync ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preferred Currency Setting */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Icon name="language" className="mr-2" /> {/* Using 'language' icon as a placeholder for currency */}
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
                        Select the currency for displaying all monetary values in the app.
                      </p>
                    </div>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Manage Collections"
                  description="Rename or delete your card collections."
                >
                  <div className="space-y-5">
                    {/* Rename Collection Section */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <Icon name="edit" className="text-indigo-400 mr-2" />
                        Rename Collection
                      </h4>
                      <div className="space-y-3">
                        <select 
                          className={`w-full rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            isDarkMode 
                              ? 'bg-[#0F0F0F] text-white border border-[#ffffff1a]' 
                              : 'bg-white text-gray-800 border border-gray-300'
                          }`}
                          value={collectionToRename}
                          onChange={(e) => setCollectionToRename(e.target.value)}
                        >
                          <option value="" disabled>Select Collection...</option>
                          {Array.isArray(collections) 
                            ? collections.filter(name => name !== 'All Cards').map((collection) => (
                                <option key={collection} value={collection}>
                                  {collection}
                                </option>
                              ))
                            : Object.keys(collections).filter(name => name !== 'All Cards' && name !== 'Sold').map((collection) => (
                                <option key={collection} value={collection}>
                                  {collection}
                                </option>
                              ))
                          }
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
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <Icon name="delete" className="text-red-500 mr-2" />
                        Delete Collection
                      </h4>
                      <div className="space-y-3">
                        <select 
                          className={`w-full rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                            isDarkMode 
                              ? 'bg-[#0F0F0F] text-white border border-[#ffffff1a]' 
                              : 'bg-white text-gray-800 border border-gray-300'
                          }`}
                          value={collectionToDelete}
                          onChange={(e) => setCollectionToDelete(e.target.value)}
                        >
                          <option value="" disabled>Select Collection...</option>
                          {Array.isArray(collections) 
                            ? collections.filter(name => name !== 'All Cards').map((collection) => (
                                <option key={collection} value={collection}>
                                  {collection}
                                </option>
                              ))
                            : Object.keys(collections).filter(name => name !== 'All Cards' && name !== 'Sold').map((collection) => (
                                <option key={collection} value={collection}>
                                  {collection}
                                </option>
                              ))
                          }
                        </select>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (collectionToDelete) {
                              onDeleteCollection(collectionToDelete);
                              setCollectionToDelete('');
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
                  title="Personal Information"
                  description="Update your personal information and profile settings."
                >
                  {/* Profile form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="primary"
                      onClick={handleProfileSave}
                    >
                      Save Profile
                    </Button>
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Subscription Management"
                  description="Manage your Stripe subscription and billing information."
                >
                  <div className="space-y-4">
                    <SubscriptionManagement isMobile={false} onClose={onClose} />
                  </div>
                </SettingsPanel>

                <SettingsPanel
                  title="Sign Out"
                  description="Sign out of your account and return to the login screen."
                >
                  {userData && (
                    <div 
                      className="flex items-center space-x-4 mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg"
                      data-component-name="SettingsModal"
                    >
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                        {userData.firstName ? userData.firstName.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-white font-medium">{userData.firstName} {userData.lastName}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">{user ? user.email : 'Not signed in'}</div>
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
              </div>
            )}
            
            {activeTab === 'development' && (
              <div className="space-y-6">
                {/* Development Tools Section */}
                <SettingsPanel
                  title="Development Tools"
                  description="Manage your card data and perform maintenance operations."
                >
                  <div className="space-y-4">
                    {/* Update Card Data Section */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Icon name="upload" className="text-indigo-400 mr-2" />
                        Update Card Data
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Update card values and metadata by importing CSV files with updated information.
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (onImportCollection) {
                            onImportCollection(null, { mode: 'priceUpdate' });
                          }
                          onClose();
                        }}
                        iconLeft={<Icon name="upload" />}
                        fullWidth
                      >
                        Update Card Data
                      </Button>
                    </div>

                    {/* Card Data Structure Migration Section */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Icon name="format_align_left" className="text-green-500 mr-2" />
                        Card Data Structure Migration
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Standardize card data structure across your collection. This fixes legacy data issues and ensures consistent field naming.
                      </p>
                      <div className="mb-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Migration Mode</label>
                        <div className="flex space-x-2">
                          <label className={`flex-1 flex items-center p-2 border rounded-md cursor-pointer transition-colors ${cardMigrationMode === 'dry-run' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}`}>
                            <input 
                              type="radio" 
                              name="migrationMode" 
                              value="dry-run" 
                              checked={cardMigrationMode === 'dry-run'}
                              onChange={() => setCardMigrationMode('dry-run')}
                              className="sr-only"
                            />
                            <span className="w-4 h-4 mr-2 rounded-full border flex items-center justify-center border-blue-500">
                              {cardMigrationMode === 'dry-run' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                            </span>
                            <span>Dry Run (Safe)</span>
                          </label>
                          <label className={`flex-1 flex items-center p-2 border rounded-md cursor-pointer transition-colors ${cardMigrationMode === 'live' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-700'}`}>
                            <input 
                              type="radio" 
                              name="migrationMode" 
                              value="live" 
                              checked={cardMigrationMode === 'live'}
                              onChange={() => setCardMigrationMode('live')}
                              className="sr-only"
                            />
                            <span className="w-4 h-4 mr-2 rounded-full border flex items-center justify-center border-red-500">
                              {cardMigrationMode === 'live' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            </span>
                            <span>Live Run</span>
                          </label>
                        </div>
                      </div>
                      <Button 
                        variant={cardMigrationMode === 'live' ? "danger" : "primary"}
                        iconLeft={<Icon name={cardMigrationMode === 'live' ? "warning" : "check_circle"} />}
                        onClick={handleCardDataMigration}
                        fullWidth
                        loading={isMigratingCardData ? true : undefined}
                        disabled={isMigratingCardData}
                      >
                        {isMigratingCardData 
                          ? `Migrating Card Data...`
                          : cardMigrationMode === 'dry-run' 
                            ? 'Run Migration (Dry Run)' 
                            : 'Run Migration (Live)'}
                      </Button>
                    </div>
                    
                    {/* PSA Data Management Section */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Icon name="refresh" className="text-blue-500 mr-2" />
                        PSA Data Management
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Reload PSA data for all graded cards in your collection.
                      </p>
                      <Button 
                        variant="primary" 
                        iconLeft={<Icon name="refresh" />}
                        onClick={handleBulkPSAReload}
                        fullWidth
                        loading={isReloadingPSA}
                        disabled={isReloadingPSA}
                      >
                        {isReloadingPSA 
                          ? `Updating PSA Data (${psaReloadProgress.current}/${psaReloadProgress.total})` 
                          : 'Reload PSA Data'}
                      </Button>
                    </div>
                    
                    {/* Download My Data Section */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Icon name="download" className="text-green-500 mr-2" />
                        Download My Data
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Export all your personal data for backup or portability purposes.
                      </p>
                      <Button 
                        variant="primary" 
                        iconLeft={<Icon name="download" />}
                        onClick={() => {
                          if (onExportData) {
                            onExportData({ personalDataExport: true });
                          }
                        }}
                        fullWidth
                      >
                        Download My Data
                      </Button>
                    </div>
                    
                    {/* Reset Data Section */}
                    <div className="bg-white dark:bg-[#1B2131] rounded-lg p-4 border border-gray-200 dark:border-indigo-900/20">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Icon name="delete_forever" className="text-red-500 mr-2" />
                        Reset Data
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        This will permanently delete all your data from both local storage and the cloud.
                      </p>
                      <Button 
                        variant="danger" 
                        iconLeft={<Icon name="delete" />}
                        onClick={handleResetData}
                        fullWidth
                      >
                        Reset All Data
                      </Button>
                    </div>
                  </div>
                </SettingsPanel>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Enhanced ConfirmDialog for Reset All Data with detailed information */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        title="Reset All Data"
        message={
          <div className="space-y-3">
            <p className="font-medium text-red-600 dark:text-red-400">
              Warning: This will permanently delete ALL your data. This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The following data will be deleted:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1">
              <li>All cards in your collection (Dashboard)</li>
              <li>All sold items and sales history</li>
              <li>All purchase invoices and purchase history</li>
              <li>All uploaded card images</li>
              <li>All collections and categories</li>
              <li>All local data (browser storage)</li>
              <li>All cloud data (if you're signed in)</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Your account will remain active, but all data associated with it will be removed.
            </p>
            <p className="text-sm font-medium mt-2">
              Type "RESET" below to confirm this action:
            </p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="Type RESET to confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
            />
          </div>
        }
        confirmButtonProps={{
          disabled: resetConfirmText !== 'RESET',
          variant: 'danger'
        }}
      />
      
      {/* Rename Collection Modal */}
      <Modal
        isOpen={isRenaming}
        onClose={() => setIsRenaming(false)}
        title="Rename Collection"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter a new name for the collection <span className="font-semibold">"{collectionToRename}"</span>:
          </p>
          <FormField
            id="newCollectionName"
            label="New Collection Name"
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsRenaming(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRenameConfirm}
              disabled={!newCollectionName || newCollectionName === collectionToRename}
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
  className: PropTypes.string
};

export default SettingsModal;
