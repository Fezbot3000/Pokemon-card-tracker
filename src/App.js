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
import { showToast } from './utils/toast';
import { dataService } from './services/dataService';
import { databaseService } from './services/databaseService';

function AppContent({ user, collections, setCollections, isLoading, setIsLoading }) {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState(() => {
    // Get selected collection from localStorage or use first collection or default
    const savedCollection = localStorage.getItem('selectedCollection');
    if (savedCollection && (savedCollection === 'All Cards' || collections[savedCollection])) {
      return savedCollection;
    }
    return Object.keys(collections).length > 0 ? Object.keys(collections)[0] : 'Default Collection';
  });
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

  // Replace the internal showToast function with the imported one
  // but still handle setting the toast state for the centralized toast in the UI
  const displayToast = useCallback((message, type = 'info') => {
    // Use the imported showToast for consistent styling
    showToast(message, type);
    
    // Also set the toast state for the centralized toast in the UI (optional)
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
          await dataService.saveCollection(cardCollection, updatedCollections[cardCollection]);
          
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
        await dataService.saveCollection(selectedCollection, updatedCollections[selectedCollection]);
        
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
      await dataService.saveCollection(selectedCollection, processedData);

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
      displayToast(message, 'success');
    } catch (error) {
      console.error('Import error:', error);
      displayToast(error.message || 'Failed to import data', 'error');
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
    displayToast
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
        await dataService.saveCollection(newName, []);
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
        await dataService.renameCollection(oldName, newName);
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
        await dataService.deleteCollection(name);
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
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get collections directly from dataService
      const savedCollections = await dataService.getCollections();
      
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
        await dataService.saveCollection('Default Collection', []);
      }
      
      // Remove artificial delay but keep small delay for UI consistency
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCollection, setIsLoading, setCollections, setSelectedCollection]);

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
          dataService.db.syncImagesFromStorage(user.uid)
            .then(result => {
              console.log(`Automatic image sync complete: ${result.synced} of ${result.total} images synchronized`);
              localStorage.setItem('lastImageSync', currentTime.toString());
              
              // Show a toast if we synced images
              if (result.synced > 0) {
                const toast = document.createElement('div');
                toast.className = 'fixed right-4 bottom-20 z-[9999] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300 toast-notification';
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
          Supported formats: .zip (recommended), .json
        </p>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Create toast functions
    const createStatusToast = (message, type = 'info') => {
      const toast = document.createElement('div');
      toast.className = `fixed right-4 bottom-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
      } text-white`;
      toast.innerHTML = `
        <div class="flex items-start">
          <div class="flex-grow">
            <div class="font-semibold status-message">${message}</div>
            <div class="text-sm mt-1 progress-details"></div>
          </div>
        </div>
      `;
      document.body.appendChild(toast);
      return toast;
    };

    const updateToast = (toast, message, details = '', type = 'info') => {
      if (!toast) return;
      
      toast.className = `fixed right-4 bottom-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
      } text-white`;
      
      const messageEl = toast.querySelector('.status-message');
      const detailsEl = toast.querySelector('.progress-details');
      
      if (messageEl) messageEl.textContent = message;
      if (detailsEl) detailsEl.textContent = details;
    };

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
      const statusToast = createStatusToast('Starting backup import...', 'info');
      
      try {
        let collectionsData;
        let imageFiles = [];
        
        if (file.name.endsWith('.zip')) {
          // Process ZIP file
          updateToast(statusToast, 'Reading ZIP file...', 'This may take a moment');
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          
          // Try both possible paths for collections.json
          let collectionsFile = zipContent.file("data/collections.json") || zipContent.file("collections.json");
          if (!collectionsFile) {
            throw new Error("Invalid backup file: missing collections.json");
          }
          
          // Load collections data
          updateToast(statusToast, 'Loading collection data...', 'Processing JSON file');
          const collectionsJson = await collectionsFile.async("string");
          const parsedData = JSON.parse(collectionsJson);
          
          // Handle different backup formats
          if (parsedData.version) {
            collectionsData = parsedData.collections;
          } else if (parsedData.collections) {
            collectionsData = parsedData.collections;
          } else {
            collectionsData = parsedData;
          }

          // Process images from the ZIP
          updateToast(statusToast, 'Processing images...', 'This may take a moment');
          
          // Check both possible image paths (images/ and data/images/)
          const imagesFolder = zipContent.folder("images");
          const dataImagesFolder = zipContent.folder("data/images");
          
          // Combined image entries from both possible locations
          const imageEntries = [];
          
          if (imagesFolder) {
            imagesFolder.forEach((relativePath, file) => {
              if (!file.dir) {
                imageEntries.push({ relativePath, file });
              }
            });
          }
          
          if (dataImagesFolder) {
            dataImagesFolder.forEach((relativePath, file) => {
              if (!file.dir) {
                imageEntries.push({ relativePath: `data/images/${relativePath}`, file });
              }
            });
          }

          console.log(`Found ${imageEntries.length} images in backup`);
          updateToast(statusToast, 'Processing images...', `Found ${imageEntries.length} images`);

          // Process images in smaller batches
          const BATCH_SIZE = 2;
          for (let i = 0; i < imageEntries.length; i += BATCH_SIZE) {
            const batch = imageEntries.slice(i, Math.min(i + BATCH_SIZE, imageEntries.length));
            const batchPromises = batch.map(async ({ relativePath, file }) => {
              try {
                console.log(`Processing image: ${relativePath}`);
                const content = await file.async("blob");
                const fileName = relativePath.split("/").pop();
                const serialNumber = fileName.split(".")[0];
                
                if (serialNumber) {
                  // Determine the MIME type based on the file extension or default to image/jpeg
                  const ext = fileName.split('.').pop().toLowerCase();
                  const mimeType = ext === 'png' ? 'image/png' : 
                                  ext === 'gif' ? 'image/gif' :
                                  ext === 'webp' ? 'image/webp' : 'image/jpeg';
                    
                  imageFiles.push({
                    serialNumber,
                    content: new Blob([content], { type: mimeType })
                  });
                  console.log(`Image processed for ${serialNumber}, size: ${content.size} bytes, type: ${mimeType}`);
                }
              } catch (error) {
                console.error(`Failed to process image ${relativePath}:`, error);
              }
            });
            
            await Promise.all(batchPromises);
            updateToast(statusToast, 'Processing images...', `${i + batch.length} of ${imageEntries.length} images processed`);
            
            // Add a small delay between batches
            if (i + BATCH_SIZE < imageEntries.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } else if (file.name.endsWith('.json')) {
          // Process JSON file directly
          const reader = new FileReader();
          const parsedData = await new Promise((resolve, reject) => {
            reader.onload = (e) => {
              try {
                resolve(JSON.parse(e.target.result));
              } catch (error) {
                reject(new Error("Invalid JSON format"));
              }
            };
            reader.onerror = () => reject(new Error("Error reading file"));
            reader.readAsText(file);
          });

          // Handle different JSON formats
          if (parsedData.version) {
            collectionsData = parsedData.collections;
          } else if (parsedData.collections) {
            collectionsData = parsedData.collections;
          } else {
            collectionsData = parsedData;
          }
        } else {
          throw new Error("Unsupported file format. Please upload a .zip or .json backup file.");
        }
          
        // Validate format and handle empty collections
        if (!collectionsData) {
          throw new Error("No collection data found in backup file");
        }

        // Convert to collections format if needed
        const collections = Array.isArray(collectionsData) 
          ? { 'Default Collection': collectionsData }
          : collectionsData;

        // Save collections first
        updateToast(statusToast, 'Saving collections...', 'Storing your data locally');
        await databaseService.saveCollections(collections, false);

        // Then save images with smaller batch size
        if (imageFiles.length > 0) {
          updateToast(statusToast, 'Saving images...', `0 of ${imageFiles.length} images saved`);
          
          // Process with even smaller batches for stability
          const SAVE_BATCH_SIZE = 1;
          for (let i = 0; i < imageFiles.length; i += SAVE_BATCH_SIZE) {
            // Process one image at a time
            const batch = imageFiles.slice(i, i + SAVE_BATCH_SIZE);
            
            for (const imageFile of batch) {
              try {
                console.log(`Saving image for card ${imageFile.serialNumber}, size: ${imageFile.content.size} bytes, type: ${imageFile.content.type}`);
                
                // Save locally without queueing for sync yet
                await databaseService.saveImage(imageFile.serialNumber, imageFile.content, false);
                
                // Brief delay between image saves
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Update progress
                updateToast(statusToast, 'Saving images...', `${i + 1} of ${imageFiles.length} images saved locally`);
              } catch (error) {
                console.error(`Failed to save image for ${imageFile.serialNumber}:`, error);
              }
            }
          }
        }

        // Once everything is saved locally, trigger collection sync
        updateToast(statusToast, 'Syncing with cloud...', 'Uploading collections to Firebase');
        await databaseService.saveCollections(collections, true);
        
        // Then sync images one by one
        if (imageFiles.length > 0) {
          updateToast(statusToast, 'Syncing images with cloud...', `0 of ${imageFiles.length} images uploaded`);
          
          for (let i = 0; i < imageFiles.length; i++) {
            try {
              const imageFile = imageFiles[i];
              console.log(`Syncing image for ${imageFile.serialNumber} to Firebase`);
              
              // Now queue for Firebase sync
              await databaseService.saveImage(imageFile.serialNumber, imageFile.content, true);
              
              // Brief delay between image syncs
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Update progress
              updateToast(statusToast, 'Syncing images with cloud...', `${i + 1} of ${imageFiles.length} images uploaded`);
            } catch (error) {
              console.error(`Failed to sync image #${i + 1} to Firebase:`, error);
            }
          }
        }
        
        // Update UI state
        setCollections(collections);
        
        // Switch to first collection if needed
        if (Object.keys(collections).length > 0) {
          const firstCollection = Object.keys(collections)[0];
          setSelectedCollection(firstCollection);
          localStorage.setItem('selectedCollection', firstCollection);
        }

        // Show success message
        updateToast(
          statusToast,
          'Backup imported successfully!',
          `Collections: ${Object.keys(collections).length}, Images: ${imageFiles.length}`,
          'success'
        );

        // Close settings modal
        setShowSettings(false);

        // Force a UI refresh after a short delay to ensure everything is saved
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error) {
        console.error("Import error:", error);
        updateToast(statusToast, 'Import failed', error.message, 'error');
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
        displayToast('Please enter buyer name', 'error');
        return;
      }

      // Validate each card has a valid sold price
      const allCardsValid = bulkSoldDetails.cards.length === selectedCardsForSale.length && 
                          bulkSoldDetails.cards.every(c => parseFloat(c.soldPrice) > 0);
      
      if (!allCardsValid) {
        displayToast('Please enter a valid price for all cards', 'error');
        return;
      }

      // Show loading indicator or toast with a longer duration
      const loadingToastElement = showToast('Processing sales...', 'info', 30000);
      
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
      document.body.removeChild(loadingToastElement);
      
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
        displayToast(`Successfully sold ${successfulSales.length} card(s)`, 'success');
      } else if (successfulSales.length > 0) {
        displayToast(`Partially successful: ${successfulSales.length} of ${bulkSoldDetails.cards.length} cards sold`, 'warning');
      } else {
        displayToast('No cards were sold successfully', 'error');
      }
      
      // Switch to sold view if any sales were successful
      if (successfulSales.length > 0) {
        setCurrentView('sold');
      }
    } catch (error) {
      console.error('Error processing sales:', error);
      displayToast('Failed to process sales: ' + (error.message || 'Unknown error'), 'error');
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
      {/* Toast notification is now handled by the toast utility */}

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
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [dbError, setDbError] = useState(null);

  // Initialize database and load collections
  const initializeData = useCallback(async (user) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('Initializing database...');
      
      // First initialize the database with retries
      let dbInitialized = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!dbInitialized && retryCount < maxRetries) {
        try {
          await databaseService.initDatabase();
          console.log('Database initialized successfully');
          dbInitialized = true;
        } catch (error) {
          console.error(`Failed to initialize database (attempt ${retryCount + 1}):`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      if (!dbInitialized) {
        throw new Error('Failed to initialize database after multiple attempts');
      }
      
      console.log('Loading collections...');
      try {
        // First try to get collections from IndexedDB
        let fetchedCollections = await dataService.getCollections();
        
        // If no collections in IndexedDB, try Firebase
        if (!fetchedCollections || Object.keys(fetchedCollections).length === 0) {
          console.log('No collections in IndexedDB, checking Firebase...');
          try {
            fetchedCollections = await dataService.initialize();
          } catch (firebaseError) {
            console.error('Error fetching from Firebase:', firebaseError);
            // Continue with empty collections
            fetchedCollections = {};
          }
        }
        
        console.log('Collections loaded:', fetchedCollections);
        
        if (!fetchedCollections || Object.keys(fetchedCollections).length === 0) {
          console.log('No collections found, creating default collection');
          const defaultCollections = { 'Default Collection': [] };
          setCollections(defaultCollections);
          await dataService.saveCollection('Default Collection', []);
        } else {
          setCollections(fetchedCollections);
        }
        setDbError(null);
      } catch (error) {
        console.error('Error loading collections:', error);
        setDbError('Error loading collections. Your data will be available when the connection is restored.');
        // Set default collection to allow app to function
        setCollections({ 'Default Collection': [] });
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      setDbError('Error initializing data. Please refresh the page and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? 'logged in' : 'logged out');
      
      if (!mounted) return;
      
      setUser(user);
      setAuthLoading(false);
      
      if (user) {
        await initializeData(user);
      } else {
        // Clear data on logout
        setCollections({ 'Default Collection': [] });
        setIsLoading(false);
        setDbError(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [initializeData]);

  if (authLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {dbError && (
          <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-2 text-center z-50">
            {dbError}
            <button 
              className="ml-4 px-2 py-1 bg-white text-red-500 rounded hover:bg-red-100 text-sm"
              onClick={() => initializeData(user)}
            >
              Retry
            </button>
          </div>
        )}
        <AppContent 
          user={user} 
          collections={collections}
          setCollections={setCollections}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </ErrorBoundary>
    </ThemeProvider>
  );
}