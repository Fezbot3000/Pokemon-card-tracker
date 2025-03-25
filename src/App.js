import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import ProfitChangeModal from './components/ProfitChangeModal';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import { db } from './services/db';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';
import SoldItems from './components/SoldItems/SoldItems';
import SettingsModal from './components/SettingsModal';
import JSZip from 'jszip';
import { auth } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AuthPage from './components/auth/AuthPage';
import { cardService } from './services/cardService';
import LoadingSkeleton from './components/LoadingSkeleton';
import { formatCurrency } from './utils/formatters';
import { getUsdToAudRate } from './utils/currencyAPI';
import CollectionSelector from './components/CollectionSelector';

function AppContent({ user }) {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfitChangeModal, setShowProfitChangeModal] = useState(false);
  const [profitChangeData, setProfitChangeData] = useState({ oldProfit: 0, newProfit: 0 });
  const [currentView, setCurrentView] = useState('collection'); // 'collection' or 'sold'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [toast, setToast] = useState(null);
  const [showBulkSoldModal, setShowBulkSoldModal] = useState(false);
  const [selectedCardsForSale, setSelectedCardsForSale] = useState([]);
  const [bulkSoldDetails, setBulkSoldDetails] = useState({
    buyer: '',
    date: new Date().toISOString().split('T')[0],
    cards: []
  });
  
  const {
    cards: cardData,
    loading: cardLoading,
    error: cardError,
    selectedCard: cardSelected,
    importCsvData,
    selectCard,
    clearSelectedCard,
    updateCard,
    deleteCard: deleteCardFromState,
    addCard
  } = useCardData();

  // Memoized collection data
  const collectionData = useMemo(() => {
    if (selectedCollection === 'All Cards') {
      // Combine cards from all collections
      return Object.values(collections).flat();
    }
    return collections[selectedCollection] || [];
  }, [collections, selectedCollection]);

  // Toast notification function
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Memoized callbacks
  const handleAddCard = useCallback(async (cardData) => {
    try {
      // Add card to current collection
      const updatedCollections = {
        ...collections,
        [selectedCollection]: [...(collections[selectedCollection] || []), cardData]
      };
      
      // Save to database
      await cardService.saveCollection(user.uid, selectedCollection, updatedCollections[selectedCollection]);
      
      // Update state
      setCollections(updatedCollections);
      
      // Close the form
      setShowNewCardForm(false);
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Error adding card: ' + error.message);
    }
  }, [collections, selectedCollection, user]);

  const handleCardUpdate = useCallback(async (updatedCard) => {
    try {
      // Handle the special case of "All Cards" view
      if (selectedCollection === 'All Cards') {
        // Find which collection this card actually belongs to
        let cardCollection = null;
        let cardFound = false;
        
        // Look through all collections to find the card
        for (const [collName, cards] of Object.entries(collections)) {
          if (Array.isArray(cards)) {
            const cardIndex = cards.findIndex(c => c.slabSerial === updatedCard.slabSerial);
            if (cardIndex !== -1) {
              cardCollection = collName;
              cardFound = true;
              break;
            }
          }
        }
        
        if (cardFound && cardCollection) {
          // Update the card in its original collection
          const updatedCollections = {
            ...collections,
            [cardCollection]: collections[cardCollection].map(card =>
              card.slabSerial === updatedCard.slabSerial ? updatedCard : card
            )
          };
          
          // Save to database
          await cardService.saveCollection(user.uid, cardCollection, updatedCollections[cardCollection]);
          
          // Update state
          setCollections(updatedCollections);
          
          // Also update the card in the useCardData hook's state
          updateCard(updatedCard);
        }
      } else {
        // Normal case - we're updating a card in the current collection
        const updatedCollections = {
          ...collections,
          [selectedCollection]: collections[selectedCollection].map(card =>
            card.slabSerial === updatedCard.slabSerial ? updatedCard : card
          )
        };
        
        // Save to database
        await cardService.saveCollection(user.uid, selectedCollection, updatedCollections[selectedCollection]);
        
        // Update state
        setCollections(updatedCollections);
        
        // Also update the card in the useCardData hook's state
        updateCard(updatedCard);
      }
    } catch (error) {
      console.error('Error updating card:', error);
    }
  }, [collections, selectedCollection, updateCard, user]);

  // Calculate total profit for a collection
  const calculateTotalProfit = useCallback((cards) => {
    return cards.reduce((total, card) => {
      const currentValue = parseFloat(card.currentValueAUD) || 0;
      const purchasePrice = parseFloat(card.investmentAUD) || 0;
      return total + (currentValue - purchasePrice);
    }, 0);
  }, []);

  const handleImportData = useCallback(async (file) => {
    try {
      // Show loading state immediately when starting to process a file
      setLoading(true);

      // Calculate current total profit before update
      const currentCards = collections[selectedCollection] || [];
      const oldProfit = calculateTotalProfit(currentCards);

      // Import and process the CSV data
      const result = await importCsvData(file, importMode);
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to import CSV data');
      }

      // Process the imported data
      const processedData = await processImportedData(result.data, currentCards, exchangeRate, importMode);
      if (!processedData || !Array.isArray(processedData)) {
        throw new Error('Failed to process imported data');
      }

      // Save to database first to ensure persistence
      await cardService.saveCollection(user.uid, selectedCollection, processedData);

      // Update local state only after successful save
      setCollections(prev => ({
        ...prev,
        [selectedCollection]: processedData
      }));

      // Calculate new profit and show modal if there's a significant change
      const newProfit = calculateTotalProfit(processedData);
      if (Math.abs(newProfit - oldProfit) > 0.01) {
        setProfitChangeData({ oldProfit, newProfit });
        setShowProfitChangeModal(true);
      }

      // Close the import modal
      setImportModalOpen(false);

      // Show success message
      const cardCount = processedData.length - currentCards.length;
      const message = importMode === 'baseData'
        ? `Successfully imported ${cardCount > 0 ? cardCount + ' new cards' : 'base data'}`
        : 'Successfully updated card prices';
      showToast(message, 'success');
    } catch (error) {
      console.error('Import error:', error);
      showToast(error.message || 'Failed to import data', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    importCsvData,
    importMode,
    selectedCollection,
    collections,
    exchangeRate,
    calculateTotalProfit,
    user,
    cardService,
    showToast
  ]);

  const handleCollectionChange = useCallback((collection) => {
    // Skip if already on this collection
    if (collection === selectedCollection) return;
    
    // Update the selected collection immediately without loading state
    setSelectedCollection(collection);
    localStorage.setItem('selectedCollection', collection);
    clearSelectedCard();
  }, [clearSelectedCard, selectedCollection]);

  const handleAddCollection = useCallback(async (newName) => {
    if (newName && !collections[newName]) {
      try {
        await cardService.saveCollection(user.uid, newName, []);
        const newCollections = {
          ...collections,
          [newName]: []
        };
        setCollections(newCollections);
        setSelectedCollection(newName);
      } catch (error) {
        console.error('Error adding collection:', error);
      }
    }
  }, [collections, user]);

  const handleRenameCollection = useCallback(async (oldName, newName) => {
    if (newName && !collections[newName]) {
      try {
        await cardService.renameCollection(user.uid, oldName, newName);
        const newCollections = { ...collections };
        newCollections[newName] = newCollections[oldName];
        delete newCollections[oldName];
        setCollections(newCollections);
        setSelectedCollection(newName);
      } catch (error) {
        console.error('Error renaming collection:', error);
      }
    }
  }, [collections, user]);

  const handleDeleteCollection = useCallback(async (name) => {
    if (collections[name] && Object.keys(collections).length > 1) {
      try {
        await cardService.deleteCollection(user.uid, name);
        const newCollections = { ...collections };
        delete newCollections[name];
        setCollections(newCollections);
        setSelectedCollection(Object.keys(newCollections)[0]);
      } catch (error) {
        console.error('Error deleting collection:', error);
      }
    }
  }, [collections, user]);

  const handleImportClick = (mode) => {
    setImportMode(mode === 'baseData' ? 'baseData' : 'priceUpdate');
    setLoading(false);
    setImportModalOpen(true);
  };

  // Load collections function
  const loadCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get collections from cardService
      const savedCollections = await cardService.getCollections(user.uid);
      
      // Get saved collection from localStorage
      const savedSelectedCollection = localStorage.getItem('selectedCollection');
      
      if (Object.keys(savedCollections).length > 0) {
        setCollections(savedCollections);
        
        // Handle both regular collections and "All Cards" special case
        if (savedSelectedCollection) {
          if (savedSelectedCollection === 'All Cards' || savedCollections[savedSelectedCollection]) {
            setSelectedCollection(savedSelectedCollection);
          } else {
            // Fall back to first collection if saved one doesn't exist
            setSelectedCollection(Object.keys(savedCollections)[0]);
          }
        } else if (!savedCollections[selectedCollection]) {
          // Fall back if current selection doesn't exist
          setSelectedCollection(Object.keys(savedCollections)[0]);
        }
      } else {
        const defaultCollections = { 'Default Collection': [] };
        setCollections(defaultCollections);
        setSelectedCollection('Default Collection');
        await cardService.saveCollection(user.uid, 'Default Collection', []);
      }
      
      // Remove artificial delay but keep small delay for UI consistency
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCollection]);

  // Load collections on mount
  useEffect(() => {
    if (user) {
      loadCollections();
    }
  }, [user, loadCollections]);

  // Add automatic image sync when collections first load
  useEffect(() => {
    if (user && !isLoading && Object.keys(collections).length > 0) {
      // Only sync if collections loaded and we have cards
      const hasCards = Object.values(collections)
        .some(collection => Array.isArray(collection) && collection.length > 0);
        
      if (hasCards) {
        console.log('Collections loaded, checking if images need syncing...');
        
        // Check for image sync preference in localStorage
        const lastImageSync = localStorage.getItem('lastImageSync');
        const currentTime = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
        
        // Only sync if never synced or last sync was more than a day ago
        if (!lastImageSync || (currentTime - parseInt(lastImageSync)) > oneDayMs) {
          console.log('Starting automatic image sync...');
          
          // Don't await this - let it run in the background
          db.syncImagesFromStorage(user.uid)
            .then(result => {
              console.log(`Automatic image sync complete: ${result.synced} of ${result.total} images synchronized`);
              localStorage.setItem('lastImageSync', currentTime.toString());
              
              // Show a toast if we synced images
              if (result.synced > 0) {
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
                toast.textContent = `Image sync complete: ${result.synced} images loaded`;
                document.body.appendChild(toast);
                
                setTimeout(() => {
                  toast.style.opacity = '0';
                  setTimeout(() => document.body.removeChild(toast), 300);
                }, 5000);
              }
            })
            .catch(error => {
              console.error('Error during automatic image sync:', error);
            });
        } else {
          console.log('Skipping automatic image sync - already synced recently');
        }
      }
    }
  }, [user, isLoading, collections]);

  // Function to export all collection data as a ZIP file
  const handleExportData = async () => {
    try {
      // Create a new ZIP file
      const zip = new JSZip();
      
      // Create a data folder in the ZIP
      const dataFolder = zip.folder("data");
      
      // Get ALL collections data
      let allCollections = {};
      try {
        allCollections = await cardService.getCollections(user.uid);
      } catch (error) {
        console.error('Error fetching collections:', error);
        // Try to get from IndexedDB directly as fallback
        allCollections = await db.getCollections().catch(e => ({}));
      }

      // Get ALL sold cards data
      let soldCards = [];
      try {
        soldCards = await db.getSoldCards();
      } catch (error) {
        console.error('Error fetching sold cards:', error);
        soldCards = [];
      }
      
      // Add collections data as JSON
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        collections: allCollections || {},
        soldCards: soldCards || [],
        settings: {
          defaultCollection: selectedCollection
        }
      };

      // Add collections.json to the data folder
      dataFolder.file("collections.json", JSON.stringify(exportData, null, 2));
      
      // Create an images folder in the ZIP
      const imagesFolder = zip.folder("images");
      
      // Process ALL images from ALL collections and sold cards
      const imagePromises = [];
      
      // Process collection cards
      for (const [collectionName, cards] of Object.entries(allCollections)) {
        if (!Array.isArray(cards)) continue;
        
        for (const card of cards) {
          if (!card || !card.slabSerial) continue;
          
          const promise = (async () => {
            try {
              const imageBlob = await db.getImage(card.slabSerial);
              
              if (!imageBlob) return;
              
              // Add image to ZIP with slab serial as filename
              const extension = imageBlob.type.split('/')[1] || 'jpg';
              const filename = `${card.slabSerial}.${extension}`;
              await imagesFolder.file(filename, imageBlob);
              
              // Update card with image path
              card.imagePath = `images/${filename}`;
            } catch (error) {
              console.warn(`Failed to export image for card ${card.slabSerial}:`, error);
            }
          })();
          imagePromises.push(promise);
        }
      }

      // Process sold cards images
      for (const card of soldCards) {
        if (!card || !card.slabSerial) continue;
        
        const promise = (async () => {
          try {
            const imageBlob = await db.getImage(card.slabSerial);
            
            if (!imageBlob) return;
            
            // Add image to ZIP with slab serial as filename
            const extension = imageBlob.type.split('/')[1] || 'jpg';
            const filename = `${card.slabSerial}.${extension}`;
            await imagesFolder.file(filename, imageBlob);
            
            // Update card with image path
            card.imagePath = `images/${filename}`;
          } catch (error) {
            console.warn(`Failed to export image for sold card ${card.slabSerial}:`, error);
          }
        })();
        imagePromises.push(promise);
      }
      
      // Wait for all images to be processed
      await Promise.all(imagePromises);
      
      // Update export data with image paths
      exportData.collections = allCollections;
      exportData.soldCards = soldCards;
      
      // Add the final JSON with image paths
      dataFolder.file("collections.json", JSON.stringify(exportData, null, 2));
      
      // Add a README file
      const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/collections.json: All collections, sold cards, and settings data
- /images/: All card images referenced in collections.json

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your collections, sold cards, and images will be restored`;
      
      zip.file("README.txt", readme);
      
      // Generate the ZIP file
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `pokemon-card-tracker-backup-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 100);

      return true;
    } catch (error) {
      console.error("Export error:", error);
      throw error;
    }
  };

  // Function to handle collection import (backup file)
  const handleImportCollection = () => {
    // Create a custom modal for file selection
    const modalEl = document.createElement('div');
    modalEl.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]';
    modalEl.innerHTML = `
      <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Import Backup</h3>
          <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" id="close-import-modal">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center mb-4 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer" id="drop-zone">
          <span class="material-icons text-gray-400 dark:text-gray-600 text-5xl mb-4">upload_file</span>
          <p class="text-gray-800 dark:text-gray-200 text-lg mb-2">Drop your backup file here</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm">or click to select a file</p>
        </div>
        <input type="file" accept=".zip,.json" class="hidden" id="backup-file-input">
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Supported formats: .zip (recommended)
        </p>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Get references to elements
    const fileInput = modalEl.querySelector('#backup-file-input');
    const dropZone = modalEl.querySelector('#drop-zone');
    const closeButton = modalEl.querySelector('#close-import-modal');

    // Handle file selection
    const handleFile = async (file) => {
      if (!file) return;
      
      // Remove the file selection modal
      document.body.removeChild(modalEl);
      
      // Create a persistent toast for status updates
      const createStatusToast = (initialMessage, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
          type === 'success' ? 'bg-green-500' :
          type === 'error' ? 'bg-red-500' :
          type === 'warning' ? 'bg-yellow-500' :
          'bg-blue-500'
        } text-white`;
        toast.innerHTML = `
          <div class="flex items-start">
            <div class="flex-grow">
              <div class="font-semibold status-message">${initialMessage}</div>
              <div class="text-sm mt-1 progress-details"></div>
            </div>
          </div>
        `;
        document.body.appendChild(toast);
        return toast;
      };

      // Update toast content
      const updateToast = (toast, message, details = '', type = 'info') => {
        toast.className = `fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
          type === 'success' ? 'bg-green-500' :
          type === 'error' ? 'bg-red-500' :
          type === 'warning' ? 'bg-yellow-500' :
          'bg-blue-500'
        } text-white`;
        toast.querySelector('.status-message').textContent = message;
        toast.querySelector('.progress-details').textContent = details;
      };

      // Create initial status toast
      const statusToast = createStatusToast('Starting backup import...', 'info');
      
      try {
        if (file.name.endsWith('.zip')) {
          // Process ZIP file
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          
          // Check if collections.json exists
          const collectionsFile = zipContent.file("data/collections.json");
          if (!collectionsFile) {
            throw new Error("Invalid backup file: missing collections.json");
          }
          
          // Load collections data
          const collectionsJson = await collectionsFile.async("string");
          const collectionsData = JSON.parse(collectionsJson);
          
          // Validate format
          if (!collectionsData.collections) {
            throw new Error("Invalid backup format");
          }

          updateToast(statusToast, 'Importing to local database...', 'This will make your data available immediately');
          
          // First quickly save everything to IndexedDB
          try {
            // Save collections to IndexedDB
            await db.saveCollections(collectionsData.collections);
            
            // Extract and save images to IndexedDB
            const imagePromises = [];
            const storageUploadQueue = [];

            zipContent.folder("images")?.forEach((relativePath, file) => {
              if (!file.dir) {
                const promise = (async () => {
                  try {
                    const content = await file.async("blob");
                    const fileName = relativePath.split("/").pop();
                    const serialNumber = fileName.split(".")[0];
                    
                    if (serialNumber) {
                      // Save to IndexedDB
                      await db.saveImage(serialNumber, content);
                      
                      // Queue for later Firebase upload
                      storageUploadQueue.push({
                        serialNumber,
                        content,
                        retries: 3
                      });
                    }
                  } catch (error) {
                    console.error(`Failed to save image ${relativePath} to IndexedDB:`, error);
                  }
                })();
                imagePromises.push(promise);
              }
            });

            // Wait for all IndexedDB saves
            await Promise.all(imagePromises);

            // Update UI immediately since local data is ready
            const savedCollections = await db.getCollections();
            setCollections(savedCollections);
            
            // Switch to first collection if needed
            if (Object.keys(savedCollections).length > 0 && 
                !savedCollections[selectedCollection]) {
              setSelectedCollection(Object.keys(savedCollections)[0]);
            }

            // Show success for local import
            updateToast(
              statusToast,
              'Backup imported successfully!',
              `• Collections: ${Object.keys(collectionsData.collections).length}\n• Total cards: ${Object.values(collectionsData.collections).flat().length}\n• Starting cloud sync...`,
              'success'
            );

            // Close settings modal
            setShowSettings(false);

            // Start background sync to Firebase
            let successCount = 0;
            let failureCount = 0;
            let lastTokenRefresh = 0;
            const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes in milliseconds

            // Function to refresh token if needed
            const refreshTokenIfNeeded = async () => {
              const now = Date.now();
              if (now - lastTokenRefresh >= TOKEN_REFRESH_INTERVAL) {
                const currentUser = auth.currentUser;
                if (currentUser) {
                  try {
                    await currentUser.getIdToken(true);
                    lastTokenRefresh = now;
                    return true;
                  } catch (error) {
                    console.error('Failed to refresh token:', error);
                    return false;
                  }
                }
              }
              return false;
            };

            // Start syncing collections to Firebase
            updateToast(statusToast, 'Syncing to cloud...', 'Uploading collections...');
            
            for (const [collectionName, cards] of Object.entries(collectionsData.collections)) {
              try {
                await refreshTokenIfNeeded();
                await cardService.saveCollection(user.uid, collectionName, cards);
                console.log(`Synced collection: ${collectionName}`);
              } catch (error) {
                console.error(`Failed to sync collection ${collectionName}:`, error);
                // Continue with other collections even if one fails
              }
            }

            // Process Firebase Storage uploads in batches
            if (storageUploadQueue.length > 0) {
              updateToast(statusToast, 'Syncing to cloud...', 'Uploading images...');
              
              const BATCH_SIZE = 3;
              for (let i = 0; i < storageUploadQueue.length; i += BATCH_SIZE) {
                const batch = storageUploadQueue.slice(i, i + BATCH_SIZE);
                
                // Update progress
                updateToast(
                  statusToast,
                  'Syncing to cloud...',
                  `Uploading images... (${i}/${storageUploadQueue.length})`
                );
                
                await Promise.all(batch.map(async (item) => {
                  try {
                    await refreshTokenIfNeeded();
                    await cardService.uploadImageToStorage(user.uid, item.serialNumber, item.content);
                    successCount++;
                  } catch (error) {
                    console.warn(`Firebase Storage upload failed for ${item.serialNumber}:`, error);
                    failureCount++;
                    
                    // Only retry once per image
                    if (item.retries > 0 && 
                        (error.code === 'storage/unauthorized' || 
                         error.message?.includes('unauthorized') || 
                         error.message?.includes('permission'))) {
                      try {
                        await refreshTokenIfNeeded();
                        await cardService.uploadImageToStorage(user.uid, item.serialNumber, item.content);
                        successCount++;
                        failureCount--;
                      } catch (retryError) {
                        console.error(`Retry failed for ${item.serialNumber}:`, retryError);
                      }
                    }
                  }
                }));
                
                // Small delay between batches
                if (i + BATCH_SIZE < storageUploadQueue.length) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              }
            }

            // Final status update
            if (failureCount > 0) {
              updateToast(
                statusToast,
                'Backup imported with some issues',
                `• Collections: ${Object.keys(collectionsData.collections).length}\n• Images: ${successCount} uploaded, ${failureCount} failed\n\nYour data is available locally, and partially synced to cloud.`,
                'warning'
              );
            } else {
              updateToast(
                statusToast,
                'Backup imported and fully synced!',
                `• Collections: ${Object.keys(collectionsData.collections).length}\n• Images: ${successCount} uploaded successfully`,
                'success'
              );
            }

            // Remove toast after 8 seconds
            setTimeout(() => {
              statusToast.style.opacity = '0';
              setTimeout(() => document.body.removeChild(statusToast), 300);
            }, 8000);

          } catch (error) {
            console.error('Error during import:', error);
            updateToast(
              statusToast,
              'Error during import',
              error.message,
              'error'
            );
          }
        } else {
          throw new Error("Unsupported file format. Please upload a .zip backup file.");
        }
      } catch (error) {
        console.error("Import error:", error);
        updateToast(statusToast, 'Import failed', error.message, 'error');
        
        // Remove error toast after 5 seconds
        setTimeout(() => {
          statusToast.style.opacity = '0';
          setTimeout(() => document.body.removeChild(statusToast), 300);
        }, 5000);
      }
    };

    // Set up event listeners
    fileInput.addEventListener('change', (e) => {
      handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-primary', 'dark:border-primary', 'bg-primary/5', 'dark:bg-primary/10');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-primary', 'dark:border-primary', 'bg-primary/5', 'dark:bg-primary/10');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-primary', 'dark:border-primary', 'bg-primary/5', 'dark:bg-primary/10');
      
      const file = e.dataTransfer.files[0];
      handleFile(file);
    });

    // Close modal when clicking close button or outside
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalEl);
    });

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        document.body.removeChild(modalEl);
      }
    });
  };

  // Handle deleting cards from both collections and state
  const handleDeleteCard = useCallback(async (slabSerialOrSerials) => {
    try {
      console.log('handleDeleteCard called with:', slabSerialOrSerials);
      const serialsToDelete = Array.isArray(slabSerialOrSerials) 
        ? slabSerialOrSerials 
        : [slabSerialOrSerials];

      console.log('Processing serials to delete:', serialsToDelete);

      // Create a copy of the current collections
      const updatedCollections = { ...collections };

      // If we're in "All Cards" view, we need to find which collection each card belongs to
      if (selectedCollection === 'All Cards') {
        // Create a map of serial numbers to their collection names
        const cardCollectionMap = {};
        Object.entries(collections).forEach(([collectionName, cards]) => {
          if (Array.isArray(cards) && collectionName !== 'All Cards') {
            cards.forEach(card => {
              if (serialsToDelete.includes(card.slabSerial)) {
                cardCollectionMap[card.slabSerial] = collectionName;
              }
            });
          }
        });

        // Delete cards from their respective collections
        for (const serial of serialsToDelete) {
          const sourceCollection = cardCollectionMap[serial];
          if (sourceCollection) {
            console.log(`Deleting card ${serial} from collection ${sourceCollection}`);
            updatedCollections[sourceCollection] = updatedCollections[sourceCollection].filter(
              card => card.slabSerial !== serial
            );
            // Save the updated collection to the database
            await cardService.saveCollection(user.uid, sourceCollection, updatedCollections[sourceCollection]);
          } else {
            console.warn(`Could not find source collection for card ${serial}`);
          }
        }
      } else {
        // Normal case - we're deleting from a specific collection
        updatedCollections[selectedCollection] = updatedCollections[selectedCollection].filter(
          card => !serialsToDelete.includes(card.slabSerial)
        );
        
        // Save the updated collection to the database
        await cardService.saveCollection(user.uid, selectedCollection, updatedCollections[selectedCollection]);
      }

      // Update the collections state
      setCollections(updatedCollections);

      // Delete from cards state
      serialsToDelete.forEach(serial => deleteCardFromState(serial));

      console.log('Deleting card images...');
      // Delete the card images
      for (const serial of serialsToDelete) {
        try {
          await db.deleteImage(serial);
        } catch (error) {
          console.error(`Error deleting image for card ${serial}:`, error);
        }
      }

      console.log('Card deletion completed successfully');
      return true;
    } catch (error) {
      console.error('Error deleting card(s):', error);
      return false;
    }
  }, [collections, deleteCardFromState, user, selectedCollection, cardService]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Auth state observer in useEffect will handle redirect
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleCardClick = useCallback((card) => {
    console.log('Card clicked:', card);
    setSelectedCard(card);
  }, []);

  const handleCloseCardDetails = useCallback(() => {
    setSelectedCard(null);
  }, []);

  const handleViewChange = useCallback((view, selectedCards = []) => {
    if (view === 'markAsSold') {
      // Initialize selectedCardsForSale state
      setSelectedCardsForSale(selectedCards);
      
      // Initialize bulkSoldDetails with the cards and default empty sold prices
      setBulkSoldDetails(prev => {
        // Initialize cards array with the selected cards and empty sold prices
        const initializedCards = selectedCards.map(card => ({
          ...card,
          soldPrice: ''  // Empty string for the input field
        }));
        
        return {
          ...prev,
          cards: initializedCards
        };
      });
      
      // Show the modal
      setShowBulkSoldModal(true);
    } else {
      setCurrentView(view);
    }
  }, []);

  // Add a new function to safely delete cards from collections
  const safeDeleteCardsFromCollection = async (collectionName, serialsToDelete) => {
    try {
      console.log(`Safe deleting cards from collection: ${collectionName}, serials:`, serialsToDelete);
      if (collectionName === 'All Cards') {
        console.warn('Cannot directly delete from "All Cards" virtual collection');
        return false;
      }
      
      // Get the current collection state
      const currentCollection = collections[collectionName];
      if (!Array.isArray(currentCollection)) {
        console.warn(`Collection ${collectionName} is not an array, cannot delete cards`);
        return false;
      }
      
      // Filter out the cards to delete
      const updatedCollection = currentCollection.filter(
        card => !serialsToDelete.includes(card.slabSerial)
      );
      
      // Save to database
      await cardService.saveCollection(user.uid, collectionName, updatedCollection);
      
      // Update local state
      setCollections(prev => ({
        ...prev,
        [collectionName]: updatedCollection
      }));
      
      return true;
    } catch (error) {
      console.error(`Error deleting cards from collection ${collectionName}:`, error);
      return false;
    }
  };

  // Update the handleConfirmSale function
  const handleConfirmSale = async () => {
    try {
      // Validate required fields
      if (!bulkSoldDetails.buyer) {
        showToast('Please enter buyer name', 'error');
        return;
      }

      // Validate each card has a valid sold price
      const allCardsValid = bulkSoldDetails.cards.length === selectedCardsForSale.length && 
                            bulkSoldDetails.cards.every(c => parseFloat(c.soldPrice) > 0);
      
      if (!allCardsValid) {
        showToast('Please enter a valid price for all cards', 'error');
        return;
      }

      // Show loading indicator or toast
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-blue-500 text-white transition-opacity duration-300';
      loadingToast.textContent = `Processing sales...`;
      document.body.appendChild(loadingToast);
      
      // Process each card sale one by one
      const successfulSales = [];
      const failedSales = [];
      
      // Create a map of serial numbers to their collection names if in All Cards view
      const cardCollectionMap = {};
      if (selectedCollection === 'All Cards') {
        // Find the original collection for each card
        Object.entries(collections).forEach(([collectionName, cards]) => {
          if (Array.isArray(cards) && collectionName !== 'All Cards') {
            cards.forEach(card => {
              if (bulkSoldDetails.cards.some(c => c.slabSerial === card.slabSerial)) {
                cardCollectionMap[card.slabSerial] = collectionName;
              }
            });
          }
        });
      }
      
      // Step 1: Process sold cards
      for (const cardDetails of bulkSoldDetails.cards) {
        try {
          // Create the sold card record
          const soldCard = {
            slabSerial: cardDetails.slabSerial,
            serialNumber: cardDetails.slabSerial,
            player: cardDetails.player,
            card: cardDetails.card,
            set: cardDetails.set,
            year: cardDetails.year,
            category: cardDetails.category,
            condition: cardDetails.condition,
            investmentAUD: cardDetails.investmentAUD,
            soldPriceAUD: parseFloat(cardDetails.soldPrice),
            buyer: bulkSoldDetails.buyer,
            dateSold: new Date(bulkSoldDetails.date).toISOString(),
            profit: parseFloat(cardDetails.soldPrice) - cardDetails.investmentAUD
          };

          // Add to sold cards database
          const soldCardId = await db.addSoldCard(soldCard);
          console.log(`Successfully added sold card ${soldCardId}`);
          
          // Record as successful sale
          successfulSales.push({
            ...cardDetails,
            id: soldCardId,
            collectionName: selectedCollection === 'All Cards' ? cardCollectionMap[cardDetails.slabSerial] : selectedCollection
          });
        } catch (error) {
          console.error(`Error processing sale for card ${cardDetails.slabSerial}:`, error);
          failedSales.push({ card: cardDetails, error });
        }
      }
      
      // Step 2: Delete sold cards from their collections
      // Group cards by collection for more efficient updates
      const collectionUpdates = {};
      
      for (const sale of successfulSales) {
        const collectionName = sale.collectionName;
        if (!collectionName) {
          console.warn(`Could not find source collection for card ${sale.slabSerial}`);
          continue;
        }
        
        if (!collectionUpdates[collectionName]) {
          collectionUpdates[collectionName] = [];
        }
        
        collectionUpdates[collectionName].push(sale.slabSerial);
      }
      
      // Process each collection update
      for (const [collectionName, serials] of Object.entries(collectionUpdates)) {
        try {
          console.log(`Deleting ${serials.length} cards from collection ${collectionName}`);
          await safeDeleteCardsFromCollection(collectionName, serials);
        } catch (error) {
          console.error(`Error deleting cards from collection ${collectionName}:`, error);
          // Don't fail the whole operation here, we've already recorded the sales
        }
      }

      // Remove loading indicator
      document.body.removeChild(loadingToast);
      
      // Close modal and reset state
      setShowBulkSoldModal(false);
      setBulkSoldDetails({
        buyer: '',
        date: new Date().toISOString().split('T')[0],
        cards: []
      });
      
      // Clear selected cards
      setSelectedCardsForSale([]);

      // Show appropriate status message
      if (successfulSales.length === bulkSoldDetails.cards.length) {
        showToast(`Successfully sold ${successfulSales.length} card(s)`, 'success');
      } else if (successfulSales.length > 0) {
        showToast(`Partially successful: ${successfulSales.length} of ${bulkSoldDetails.cards.length} cards sold`, 'warning');
      } else {
        showToast('No cards were sold successfully', 'error');
      }
      
      // Switch to sold view if any sales were successful
      if (successfulSales.length > 0) {
        setCurrentView('sold');
      }
    } catch (error) {
      console.error('Error processing sales:', error);
      showToast('Failed to process sales: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Add a toggleMobileMenu function if it's missing
  const toggleMobileMenu = useCallback(() => {
    // Toggle mobile menu logic would go here
    console.log("Mobile menu toggled");
  }, []);

  // Add this right before the return statement
  const collectionSelectorComponent = useMemo(() => {
    return (
      <CollectionSelector
        collections={Object.keys(collections)}
        selectedCollection={selectedCollection}
        onCollectionChange={handleCollectionChange}
        onAddCollection={handleAddCollection}
      />
    );
  }, [collections, selectedCollection, handleCollectionChange, handleAddCollection]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19]">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-gray-700 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="app-header">
        <Header
          selectedCollection={selectedCollection}
          collections={Object.keys(collections)}
          onCollectionChange={handleCollectionChange}
          onImportClick={handleImportClick}
          onSettingsClick={() => setShowSettings(true)}
          onAddCollection={handleAddCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          onViewChange={handleViewChange}
          currentView={currentView}
        />
      </header>

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'collection' ? (
          <CardList
            cards={collectionData}
            exchangeRate={exchangeRate}
            onCardClick={handleCardClick}
            onDeleteCards={handleDeleteCard}
            onUpdateCard={handleCardUpdate}
            onAddCard={() => setShowNewCardForm(true)}
            onViewChange={handleViewChange}
            user={user}
            collectionSelector={collectionSelectorComponent}
          />
        ) : (
          <SoldItems />
        )}
      </main>

      {/* Card Details Modal */}
      {selectedCard && (
        <CardDetails
          card={selectedCard}
          onClose={handleCloseCardDetails}
          onUpdateCard={handleCardUpdate}
          onDelete={handleDeleteCard}
          exchangeRate={exchangeRate}
          onViewChange={handleViewChange}
        />
      )}

      {/* Other modals */}
      {showNewCardForm && (
        <NewCardForm
          onClose={() => setShowNewCardForm(false)}
          onSubmit={handleAddCard}
          exchangeRate={exchangeRate}
        />
      )}

      {importModalOpen && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => {
            setImportModalOpen(false);
            setLoading(false);
          }}
          onImport={handleImportData}
          mode={importMode}
          loading={loading}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          selectedCollection={selectedCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          refreshCollections={loadCollections}
          onExport={handleExportData}
          onImportCollection={handleImportCollection}
          onLogout={handleLogout}
          user={user}
        />
      )}

      {showProfitChangeModal && (
        <ProfitChangeModal
          oldProfit={profitChangeData.oldProfit}
          newProfit={profitChangeData.newProfit}
          onClose={() => setShowProfitChangeModal(false)}
        />
      )}

      {/* Bulk Sold Modal */}
      {showBulkSoldModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl mx-4 p-6 rounded-xl shadow-lg bg-[#1B2131]">
            <h2 className="text-xl font-semibold mb-6 text-white">Mark Cards as Sold</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Buyer<span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Enter buyer name"
                    value={bulkSoldDetails?.buyer || ''}
                    onChange={(e) => setBulkSoldDetails(prev => ({
                      ...prev,
                      buyer: e.target.value
                    }))}
                  />
                  {!bulkSoldDetails?.buyer && (
                    <div className="text-red-500 text-xs mt-1">Please enter the buyer's name</div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date Sold</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={bulkSoldDetails?.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBulkSoldDetails(prev => ({
                      ...prev,
                      date: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-200">Selected Cards</h3>
                <div className="space-y-4">
                  {selectedCardsForSale.map(card => (
                    <div key={card.slabSerial} className="p-4 rounded-lg bg-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-200">{card.card}</div>
                          <div className="text-sm text-gray-400">Investment: {formatCurrency(card.investmentAUD)}</div>
                        </div>
                        <div className="w-48">
                          <label className="block text-sm text-gray-400 mb-1">
                            Sold Price (AUD)<span className="text-red-500 ml-1">*</span>
                          </label>
                          <input
                            type="number"
                            className="input w-full"
                            placeholder="0.00"
                            step="0.01"
                            value={(() => {
                              const cardDetail = bulkSoldDetails.cards.find(c => c.slabSerial === card.slabSerial);
                              return cardDetail?.soldPrice || '';
                            })()}
                            onChange={(e) => {
                              const newCards = [...bulkSoldDetails.cards];
                              const index = newCards.findIndex(c => c.slabSerial === card.slabSerial);
                              if (index !== -1) {
                                newCards[index] = { ...newCards[index], soldPrice: e.target.value };
                              } else {
                                newCards.push({ ...card, soldPrice: e.target.value });
                              }
                              setBulkSoldDetails(prev => ({ ...prev, cards: newCards }));
                            }}
                          />
                          {(() => {
                            const cardDetail = bulkSoldDetails.cards.find(c => c.slabSerial === card.slabSerial);
                            const soldPrice = parseFloat(cardDetail?.soldPrice || 0);
                            const profit = soldPrice - card.investmentAUD;
                            
                            if (!isNaN(profit) && soldPrice > 0) {
                              return (
                                <div className={`text-sm font-medium mt-2 ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  Profit: {formatCurrency(profit)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Total calculations */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <div className="text-lg text-gray-300">
                  Total Sale Price
                  <div className="text-xl font-semibold text-white">
                    {formatCurrency(bulkSoldDetails.cards.reduce((total, card) => {
                      return total + (parseFloat(card.soldPrice) || 0);
                    }, 0))}
                  </div>
                </div>
                
                <div className="text-lg text-gray-300 text-right">
                  Total Profit
                  <div className={`text-xl font-semibold ${
                    (() => {
                      const totalProfit = bulkSoldDetails.cards.reduce((total, card) => {
                        const cardObj = selectedCardsForSale.find(c => c.slabSerial === card.slabSerial);
                        return total + ((parseFloat(card.soldPrice) || 0) - (cardObj?.investmentAUD || 0));
                      }, 0);
                      return totalProfit >= 0 ? 'text-green-500' : 'text-red-500';
                    })()
                  }`}>
                    {formatCurrency(bulkSoldDetails.cards.reduce((total, card) => {
                      const cardObj = selectedCardsForSale.find(c => c.slabSerial === card.slabSerial);
                      return total + ((parseFloat(card.soldPrice) || 0) - (cardObj?.investmentAUD || 0));
                    }, 0))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowBulkSoldModal(false);
                  setBulkSoldDetails({
                    buyer: '',
                    date: new Date().toISOString().split('T')[0],
                    cards: []
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!bulkSoldDetails?.buyer || !bulkSoldDetails?.cards?.every(c => c.soldPrice > 0)}
                onClick={handleConfirmSale}
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent user={user} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}