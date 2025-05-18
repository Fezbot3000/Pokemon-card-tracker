import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate, 
  useLocation, 
  Link, 
  useNavigate,
  Outlet
} from 'react-router-dom';
import { 
  Header, 
  useTheme, 
  useAuth,
  toast,
  Toast, 
  SettingsModal, 
  Icon,
  RestoreProvider, useRestore,
  RestoreProgressBar,
  BackupProvider, useBackup,
  BackupProgressBar,
  toastService // Import toastService
} from './design-system';
import DesignSystemProvider from './design-system/providers/DesignSystemProvider';
import MobileSettingsModal from './components/MobileSettingsModal'; 
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import ProfitChangeModal from './components/ProfitChangeModal';
import AddCardModal from './components/AddCardModal'; 
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/Pricing';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import db from './services/db';
import { TutorialProvider, useTutorial } from './contexts/TutorialContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'; // Added import
import InvoiceProvider from './contexts/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import PremiumFeatures from './components/PremiumFeatures';
import './styles/main.css';
import './styles/black-background.css'; 
import './styles/ios-fixes.css'; 
import SoldItems from './components/SoldItems/SoldItems';
import PurchaseInvoices from './components/PurchaseInvoices/PurchaseInvoices';
import BottomNavBar from './components/BottomNavBar';
import CloudSync from './components/CloudSync';
import DashboardPricing from './components/DashboardPricing';
import ComponentLibrary from './pages/ComponentLibrary';
import logger from './utils/logger'; // Import the logger utility
import RestoreListener from './components/RestoreListener';
import SyncStatusIndicator from './components/SyncStatusIndicator'; // Import the SyncStatusIndicator
import featureFlags from './utils/featureFlags'; // Import feature flags
import { CardRepository } from './repositories/CardRepository';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db as firestoreDb, storage } from './services/firebase';
import JSZip from 'jszip'; // Import JSZip for handling zip files
import TutorialModal from './components/TutorialModal'; // Add back this import

// Helper function to generate a unique ID for cards without one
const generateUniqueId = () => {
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 10000);
  return `card_${timestamp}_${randomPart}`;
};

// NewUserRoute to check subscription status and redirect to pricing for new sign-ups
function NewUserRoute() {
  const { user } = useAuth();
  const { subscriptionStatus, isLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  
  useEffect(() => {
    // Avoid multiple redirects
    if (hasRedirected.current) return;
    
    // Wait until subscription status is loaded
    if (isLoading) return;
    
    // Only proceed if we have a user
    if (!user) return;
    
    // Check if we're coming from a payment flow
    const isFromPayment = location.search.includes('checkout_success=true');
    
    // Check if we need to redirect the user
    if (isFromPayment) {
      logger.debug('User is coming from payment flow, clearing isNewUser flag');
      localStorage.removeItem('isNewUser');
      localStorage.removeItem('chosenPlan');
      hasRedirected.current = true;
      return;
    }
    
    // If user has an active subscription, they can access the dashboard
    if (subscriptionStatus?.status === 'active') {
      hasRedirected.current = true;
      return;
    }
    
    // For inactive/no subscription users who haven't chosen the free plan,
    // redirect to pricing page
    if (subscriptionStatus?.status !== 'active') {
      logger.debug('User needs subscription, redirecting to pricing');
      hasRedirected.current = true;
      navigate('/dashboard/pricing');
      return;
    }
  }, [user, subscriptionStatus, isLoading, navigate, location.pathname]);
  
  return null;
}

// Main Dashboard Component
function Dashboard() {
  const { currentUser, loading: authLoading } = useAuth();
  const location = useLocation();
  const { subscriptionStatus, isLoading: subscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const hasRefreshed = useRef(false);
  const navigate = useNavigate();

  // Check for checkout_success parameter when dashboard loads - but only once
  useEffect(() => {
    // Only run this once per component mount
    if (hasRefreshed.current) return;
    
    // Detect if user is coming from a payment flow
    const isFromPayment = location.search.includes('checkout_success=true');
    
    if (isFromPayment) {
      logger.debug('Detected checkout_success parameter, refreshing subscription status');
      hasRefreshed.current = true;
      
      // Force refresh subscription status
      refreshSubscriptionStatus();
      
      // Remove the parameter from URL
      const url = new URL(window.location);
      url.searchParams.delete('checkout_success');
      window.history.replaceState({}, '', url);
      
      // If we're on the pricing page but came from payment success, force redirect to dashboard
      if (location.pathname.includes('/dashboard/pricing')) {
        logger.debug('User completed payment but is on pricing page, forcing redirect to dashboard');
        // Add a small delay to allow the subscription status to refresh
        setTimeout(() => {
          // Force navigate to dashboard instead of pricing
          navigate('/dashboard', { replace: true });
        }, 1500);
      }
    }
  }, [location.search, location.pathname, refreshSubscriptionStatus, navigate]);

  // Show loading indicator while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Show loading indicator while subscription status is being determined
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to pricing if subscription is not active (and not loading)
  // Add check to avoid redirect loop if already on pricing page
  if (subscriptionStatus?.status !== 'active' && location.pathname !== '/dashboard/pricing') {
    logger.debug('Dashboard Gate: User needs subscription, redirecting to pricing');
    return <Navigate to="/dashboard/pricing" replace />;
  }
  
  // Render the dashboard content if authenticated and subscription is active
  return (
    <Outlet />
  );
}

// Wrapper for dashboard index route (AppContent)
function DashboardIndex() {
  return <>
    <AppContent />
  </>;
}

function AppContent() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('All Cards'); // Set initial state to 'All Cards'
  const [collections, setCollections] = useState({}); // Don't initialize with Default Collection
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfitChangeModal, setShowProfitChangeModal] = useState(false);
  const [profitChangeData, setProfitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0
  });
  const [currentView, setCurrentView] = useState('cards'); // 'cards' or 'sold'
  const [initialCardCollection, setInitialCardCollection] = useState(null); // State for initial collection
  const { registerSettingsCallback, checkAndStartTutorial, startTutorial } = useTutorial();
  const { user, logout } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  
  const {
    cards,
    loading,
    error,
    selectedCard,
    exchangeRate,
    importCsvData,
    selectCard,
    clearSelectedCard,
    updateCard,
    deleteCard,
    addCard
  } = useCardData();

  const handleCloseDetailsModal = () => {
    clearSelectedCard();
    setInitialCardCollection(null); // Clear initial collection on close
  };

  const handleCardUpdate = async (cardId, updatedData, originalCollectionName) => {
    try {
      // The updateCard function from useCardData should handle Firestore updates.
      // If collection changes, updatedData should reflect the new collectionName.
      // Local state for 'collections' will be updated via useEffect watching 'cards' from useCardData.
      await updateCard(cardId, updatedData);
      // Example: toast.success('Card updated successfully!');
    } catch (error) {
      // Example: logger.error('Failed to update card:', error);
      // Example: toast.error('Failed to update card.');
      console.error('Failed to update card in handleCardUpdate:', error); 
      // Depending on requirements, you might want to re-throw or handle UI feedback here.
    }
  };

  // Effect to sync Firestore cards (from useCardData) with local collections state
  useEffect(() => {
    if (cards && Array.isArray(cards)) { // Check if cards data is available and is an array
      // Group cards by their collection property
      const groupedByCollection = cards.reduce((acc, card) => {
        // Don't force Default Collection as a fallback
        const collectionName = card.collection || card.collectionName;
        
        // Only add the card to a collection if it has a valid collection name
        if (collectionName) {
          if (!acc[collectionName]) {
            acc[collectionName] = [];
          }
          acc[collectionName].push(card);
        }
        return acc;
      }, {});

      // Update the 'collections' state by merging existing and new grouped data
      setCollections(prevCollections => {
        const newCollectionsState = { ...prevCollections };
        // Add or update collections from the grouped data
        Object.keys(groupedByCollection).forEach(collectionName => {
          newCollectionsState[collectionName] = groupedByCollection[collectionName];
        });
        // Ensure collections that exist in prevCollections but not in groupedByCollection 
        // (like an empty 'Sold' or a newly created empty collection) are preserved
        Object.keys(prevCollections).forEach(collectionName => {
          if (!newCollectionsState[collectionName]) {
            // Only preserve non-Default collections that are empty
            if (collectionName !== 'Default Collection') {
              newCollectionsState[collectionName] = prevCollections[collectionName]; // Preserve existing (potentially empty) collections
            }
          }
        });
        
        return newCollectionsState;
      });
    }
  }, [cards]); // Dependency: Run whenever the cards array from useCardData changes

  // Memoized collection data for CardList
  const collectionData = useMemo(() => {
    if (selectedCollection === 'All Cards') {
      // Combine cards from all collections, EXCLUDING 'sold'
      return Object.entries(collections)
        .filter(([name, cards]) => name.toLowerCase() !== 'sold' && Array.isArray(cards))
        .map(([name, cards]) => cards) // Get just the card arrays
        .flat() // Combine all card arrays into one
        .filter(Boolean); // Remove any potential null/undefined entries
    }
    // Otherwise, return the cards for the selected collection or an empty array
    return collections[selectedCollection] || [];
  }, [collections, selectedCollection]);

  // Register the settings callback when component mounts
  // Using a ref to ensure we only register the callback once
  const callbackRegistered = useRef(false);
  
  useEffect(() => {
    if (!callbackRegistered.current) {
      registerSettingsCallback(() => setShowSettings(true));
      callbackRegistered.current = true;
    }
  }, [registerSettingsCallback]);

  // Check if this is a new user and start the tutorial, but only if they have an active subscription
  useEffect(() => {
    if (user && subscriptionStatus?.status === 'active') {
      // Start the tutorial for new users after a short delay
      // to ensure the UI is fully loaded
      setTimeout(() => {
        checkAndStartTutorial();
      }, 1000);
    }
  }, [user, checkAndStartTutorial, subscriptionStatus?.status]);

  // Check if device is mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Add keyboard shortcut for settings (press 's' key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if the event target is an input, textarea, or select element
      const targetTagName = e.target.tagName.toLowerCase();
      if (targetTagName === 'input' || targetTagName === 'textarea' || targetTagName === 'select' || e.target.isContentEditable) {
        // Ignore keypresses within form elements or content-editable areas
        return;
      }

      // When 's' key is pressed (outside of form elements), open settings
      if (e.key === 's' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Prevent default browser behavior for 's' if necessary (e.g., saving page)
        // e.preventDefault(); // Uncomment if needed
        setShowSettings(true);
      }
      
      // You could add other global shortcuts here, e.g.:
      // if (e.key === 'a' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      //   setShowNewCardForm(true);
      // }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Calculate total profit for a collection
  const calculateTotalProfit = useCallback((cards) => {
    return cards.reduce((total, card) => {
      const currentValue = parseFloat(card.currentValueAUD) || 0;
      const purchasePrice = parseFloat(card.investmentAUD) || 0;
      return total + (currentValue - purchasePrice);
    }, 0);
  }, []);

  const handleImportData = useCallback(async (file, importOptions = {}) => {
    try {
      // Check if file is an array (multiple files)
      const isMultipleFiles = Array.isArray(file);
      
      if (isMultipleFiles && importMode === 'priceUpdate') {
        // For multiple files in price update mode, we'll update across all collections
        const { parseMultipleCSVFiles, validateCSVStructure, processMultipleCollectionsUpdate } = await import('./utils/dataProcessor');
        
        // Calculate total profit before update for all collections (except 'All Cards')
        const allCollections = { ...collections };
        if ('All Cards' in allCollections) {
          delete allCollections['All Cards'];
        }
        
        // Calculate previous profit across all collections
        let previousProfit = 0;
        Object.values(allCollections).forEach(cards => {
          if (Array.isArray(cards)) {
            previousProfit += calculateTotalProfit(cards);
          }
        });

        // Parse and combine data from multiple files
        const parsedData = await parseMultipleCSVFiles(file);
        // Validate the structure
        const validation = validateCSVStructure(parsedData, importMode);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        
        // Apply updates across all collections with the provided import options
        const { collections: updatedCollections, stats } = 
          processMultipleCollectionsUpdate(parsedData, allCollections, exchangeRate, importOptions);
        
        // Save to database
        await db.saveCollections(updatedCollections, true); // Explicitly preserve sold items
        
        // Update state - make sure to preserve the 'All Cards' entry if it exists
        const newCollections = {...updatedCollections};
        if ('All Cards' in collections) {
          newCollections['All Cards'] = [];
        }
        setCollections(newCollections);
        
        // Calculate new profit after update
        let newProfit = 0;
        Object.values(updatedCollections).forEach(cards => {
          if (Array.isArray(cards)) {
            newProfit += calculateTotalProfit(cards);
          }
        });
        
        // Show the profit change modal
        setProfitChangeData({
          oldProfit: previousProfit,
          newProfit: newProfit
        });
        setShowProfitChangeModal(true);
        
        // Show success message with stats
        const fieldsUpdatedCount = Object.values(stats.collections).reduce((total, collection) => {
          return total + Object.values(collection.fieldsUpdated).reduce((sum, count) => sum + count, 0);
        }, 0);
        
        toast.success(`Updated ${stats.updatedCards} cards with ${fieldsUpdatedCount} field updates across ${Object.keys(stats.collections).length} collections`);
      } else if (selectedCollection === 'All Cards' && importMode === 'priceUpdate') {
        // If "All Cards" is selected for price update, use the same multi-collection update logic
        const { parseCSVFile, validateCSVStructure, processMultipleCollectionsUpdate } = await import('./utils/dataProcessor');
        
        // Calculate total profit before update for all collections (except 'All Cards')
        const allCollections = { ...collections };
        delete allCollections['All Cards'];
        
        // Calculate previous profit across all collections
        let previousProfit = 0;
        Object.values(allCollections).forEach(cards => {
          if (Array.isArray(cards)) {
            previousProfit += calculateTotalProfit(cards);
          }
        });

        // Parse the CSV file
        const parsedData = await parseCSVFile(file);
        // Validate the structure
        const validation = validateCSVStructure(parsedData, importMode);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        
        // Apply updates across all collections with the provided import options
        const { collections: updatedCollections, stats } = 
          processMultipleCollectionsUpdate(parsedData, allCollections, exchangeRate, importOptions);
        
        // Save to database
        await db.saveCollections(updatedCollections, true); // Explicitly preserve sold items
        
        // Update state - make sure to preserve the 'All Cards' entry
        const newCollections = {...updatedCollections, 'All Cards': []};
        setCollections(newCollections);
        
        // Calculate new profit after update
        let newProfit = 0;
        Object.values(updatedCollections).forEach(cards => {
          if (Array.isArray(cards)) {
            newProfit += calculateTotalProfit(cards);
          }
        });
        
        // Show the profit change modal
        setProfitChangeData({
          oldProfit: previousProfit,
          newProfit: newProfit
        });
        setShowProfitChangeModal(true);
        
        // Show success message with stats
        const fieldsUpdatedCount = Object.values(stats.collections).reduce((total, collection) => {
          return total + Object.values(collection.fieldsUpdated).reduce((sum, count) => sum + count, 0);
        }, 0);
        
        toast.success(`Updated ${stats.updatedCards} cards with ${fieldsUpdatedCount} field updates across ${Object.keys(stats.collections).length} collections`);
      } else {
        // For single collection updates or base data import
        const { parseCSVFile, validateCSVStructure, processImportedData } = await import('./utils/dataProcessor');
        
        // Parse the CSV file
        const parsedData = await parseCSVFile(file);
        
        // Validate the structure
        const validation = validateCSVStructure(parsedData, importMode);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        
        // Process the data and merge with existing cards
        const existingCards = collections[selectedCollection] || [];
        
        // Use the new options parameter for processImportedData
        const updatedCards = processImportedData(
          parsedData, 
          existingCards, 
          exchangeRate, 
          {
            ...importOptions,
            importMode
          }
        );
        
        // Update the collection
        const updatedCollections = {
          ...collections,
          [selectedCollection]: updatedCards
        };
        
        // Save to database
        await db.saveCollections(updatedCollections, true); // Explicitly preserve sold items
        
        // Update state
        setCollections(updatedCollections);
        
        // Show success message
        toast.success(`Successfully updated ${selectedCollection} with ${parsedData.length} records`);
      }
      
      // Close the import modal
      setImportModalOpen(false);
    } catch (error) {
      logger.error('Error importing data:', error);
      toast.error(`Import failed: ${error.message}`);
    }
  }, [collections, selectedCollection, importMode, exchangeRate, calculateTotalProfit]);

  const handleCollectionChange = useCallback((collection) => {
    setSelectedCollection(collection);
    clearSelectedCard();
    localStorage.setItem('selectedCollection', collection);
  }, [clearSelectedCard]);

  const handleImportClick = (mode) => {
    // Remove the restriction that prevents updating prices when "All Cards" is selected
    setImportMode(mode === 'baseData' ? 'baseData' : 'priceUpdate');
    setImportModalOpen(true);
  };

  // Load collections from IndexedDB on mount
  useEffect(() => {
    const initializeDatabaseAndLoadCollections = async () => {
      try {
        setIsLoading(true);
        
        // Use a silent initialization approach for first login
        try {
          logger.debug('Initializing database on app startup');
          
          // Instead of forcing a reset immediately, first try to open the database normally
          await db.silentInitialize();
          logger.debug('Database initialization complete');
        } catch (initError) {
          logger.debug('Silent initialization failed, will try normal operations', initError);
          // Continue anyway - we'll try to recover with normal operations
        }
        
        // Attempt to load collections from IndexedDB
        const savedCollections = await db.getCollections().catch(error => {
          logger.debug('Failed to load collections, using default collection');
          return { 'Default Collection': [] };
        });
        
        // Get saved collection from localStorage
        const savedSelectedCollection = localStorage.getItem('selectedCollection');

        if (Object.keys(savedCollections).length > 0) {
          setCollections(savedCollections);
          
          // Always default to 'All Cards' when the app loads, regardless of what's in localStorage
          setSelectedCollection('All Cards');
          localStorage.setItem('selectedCollection', 'All Cards');
          logger.debug('Setting collection to All Cards by default');
        } else {
          // No collections found in DB at all
          logger.debug('No collections found in DB, setting up Default Collection.');
          const defaultCollections = { 'Default Collection': [] };
          setCollections(defaultCollections);
          
          // Even with a new default collection, we want to start with All Cards view
          setSelectedCollection('All Cards');
          localStorage.setItem('selectedCollection', 'All Cards');
        }
      } catch (error) {
        logger.debug('Error during initialization, using default collections');
        
        // Set default collections as fallback
        const defaultCollections = { 'Default Collection': [] };
        setCollections(defaultCollections);
        setSelectedCollection('Default Collection');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDatabaseAndLoadCollections();
  }, []);

  // Function to export all data as a ZIP file
  const handleExportData = async (options = {}) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Show loading toast
        toast.loading('Preparing backup...', { id: 'export-data' });
        
        // Create a new ZIP file
        const zip = new JSZip();
        
        // Get ALL collections data
        const allCollections = await db.getCollections();
        
        // Get profile data
        const profileData = await db.getProfile();
        
        // Get sold cards data
        const soldCardsData = await db.getSoldCards();
        
        // Get purchase invoices data
        const purchaseInvoicesData = await db.getPurchaseInvoices();
        
        // Get user preferences from localStorage
        const userPreferences = {
          theme: localStorage.getItem('theme') || 'light',
          cardListSortField: localStorage.getItem('cardListSortField') || 'name',
          cardListSortDirection: localStorage.getItem('cardListSortDirection') || 'asc',
          cardListDisplayMetric: localStorage.getItem('cardListDisplayMetric') || 'value',
          featureFlags: JSON.parse(localStorage.getItem('appFeatureFlags') || '{}')
        };
        
        // Create a data folder in the ZIP
        const dataFolder = zip.folder("data");
        
        // Create a comprehensive data file that includes everything
        const completeBackupData = {
          version: '2.0',
          exportDate: new Date().toISOString(),
          collections: allCollections,
          settings: {
            defaultCollection: selectedCollection
          },
          profile: profileData,
          soldCards: soldCardsData,
          purchaseInvoices: purchaseInvoicesData,
          userPreferences: userPreferences
        };
        
        // Add the comprehensive data file
        dataFolder.file("pokemon-card-tracker-data.json", JSON.stringify(completeBackupData, null, 2));
        
        // Add legacy collections.json for backward compatibility
        const collectionsData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          collections: allCollections,
          settings: {
            defaultCollection: selectedCollection
          },
          profile: profileData,
          soldCards: soldCardsData
        };
        dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
        
        // Create an images folder in the ZIP
        const imagesFolder = zip.folder("images");
        
        // Process ALL images from ALL collections and sold cards
        const imagePromises = [];
        
        // Process collection cards
        for (const [collectionName, cards] of Object.entries(allCollections)) {
          if (!Array.isArray(cards)) continue;
          
          for (const card of cards) {
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
                // Silent fail for individual images
                logger.error(`Failed to export image for card ${card.slabSerial}:`, error);
              }
            })();
            imagePromises.push(promise);
          }
        }

        // Process sold cards images
        for (const soldCard of soldCardsData) {
          const promise = (async () => {
            try {
              // Try to get image from database
              const imageBlob = await db.getImage(soldCard.slabSerial);
              
              if (!imageBlob) {
                logger.debug(`No image found for card ${soldCard.slabSerial}`);
                return;
              }
              
              // Log successful image retrieval
              logger.debug(`Retrieved image for card ${soldCard.slabSerial}, type: ${imageBlob.type}, size: ${imageBlob.size} bytes`);
              
              // Add image to ZIP with slab serial as filename
              const extension = imageBlob.type.split('/')[1] || 'jpg';
              const filename = `${soldCard.slabSerial}.${extension}`;
              await imagesFolder.file(filename, imageBlob);
              
              // Update card with image path
              soldCard.imagePath = `images/${filename}`;
              logger.debug(`Added image ${filename} to ZIP for card ${soldCard.slabSerial}`);
            } catch (error) {
              // Log detailed error for debugging
              logger.error(`Failed to export image for card ${soldCard.slabSerial}:`, error);
            }
          })();
          imagePromises.push(promise);
        }
        
        try {
          // Wait for all images to be processed
          await Promise.all(imagePromises);
          
          // Log how many images were processed
          const imageCount = imagePromises.length;
          logger.debug(`Processed ${imageCount} image promises for export`);
          
          // Update data files with image paths
          dataFolder.file("pokemon-card-tracker-data.json", JSON.stringify(completeBackupData, null, 2));
          dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
          
          // Add a debug file with information about the export process
          const debugInfo = {
            timestamp: new Date().toISOString(),
            collectionsCount: Object.keys(allCollections).length,
            cardsCount: Object.values(allCollections).reduce((count, cards) => count + (Array.isArray(cards) ? cards.length : 0), 0),
            soldCardsCount: soldCardsData.length,
            purchaseInvoicesCount: purchaseInvoicesData.length,
            imagePromisesCount: imageCount
          };
          dataFolder.file("debug-info.json", JSON.stringify(debugInfo, null, 2));
          
          // Add a README file
          const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/pokemon-card-tracker-data.json: Complete backup including all collections, cards, sold items, purchase invoices, and user preferences
- /data/collections.json: Legacy format for backward compatibility
- /images/: All card images referenced in the data files

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your data will be restored including collections, cards, sold items, purchase invoices, and user preferences`;
          
          zip.file("README.txt", readme);
          
          // Generate the ZIP file with compression
          const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
              level: 9
            }
          });
          
          // Update toast to success
          toast.success('Backup created successfully!', { id: 'export-data' });
          
          // If returnBlob option is true, return the blob directly instead of downloading
          if (options.returnBlob) {
            resolve(content);
            return;
          }
          
          // Create download link for ZIP file
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

          resolve();
        } catch (error) {
          logger.error("Export error:", error);
          reject(error);
        }
      } catch (error) {
        logger.error("Export error:", error);
        reject(error);
      }
    });
  };

  // Function to handle importing collections from JSON or ZIP file
  const handleImportCollection = (file, options = {}) => {
    // If file is not provided, show file input dialog
    if (!file) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip,.json';
      
      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) {
            return;
          }
          
          // Create a loading overlay - only if not called from SettingsModal
          if (!options.noOverlay) {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
            loadingEl.innerHTML = `
              <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Importing backup...</p>
                <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 4)</p>
                <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
                </div>
              </div>
            `;
            document.body.appendChild(loadingEl);
            
            // Start processing the file
            try {
              await processImportFile(file, loadingEl, options);
            } catch (error) {
              logger.error('Process import file error:', error);
              // Error is already handled in processImportFile
            }
          } else {
            // Process without overlay (for SettingsModal integration)
            try {
              await processImportFile(file, null, options);
            } catch (error) {
              logger.error('Process import file error:', error);
              // Error will be handled by the caller (SettingsModal)
              throw error;
            }
          }
        } catch (error) {
          logger.error('Import error:', error);
          toast.error(`Import failed: ${error.message}`);
        }
      };
      
      input.click();
    } else {
      // If file is provided directly (e.g. from cloud sync)
      // Create a loading overlay only if not called from SettingsModal
      if (!options.noOverlay) {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
        loadingEl.innerHTML = `
          <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Importing backup...</p>
            <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 4)</p>
            <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
            </div>
          </div>
        `;
        document.body.appendChild(loadingEl);
        
        // Process the file
        return processImportFile(file, loadingEl, options).catch(error => {
          logger.error('Process import file error:', error);
          // Error is already handled in processImportFile
        });
      } else {
        // Process without overlay (for SettingsModal integration)
        return processImportFile(file, null, options);
      }
    }
  };

  // Process the imported file
  const processImportFile = async (file, loadingEl, options = {}) => {
    try {
      // Create a JSZip instance
      const zip = new JSZip();
      let hasCollections = false;
      let importedCards = 0;
      let importedProfiles = 0;
      let importedSoldCards = 0;

      // Function to update progress
      const updateProgress = (message, percent, step) => {
        // Update the overlay if it exists
        if (loadingEl) {
          const progressEl = loadingEl.querySelector('#import-progress');
          const messageEl = loadingEl.querySelector('#import-status');
          if (progressEl) progressEl.style.width = `${percent}%`;
          if (messageEl) messageEl.textContent = message;
        }
        
        // Call the onProgress callback if provided (for SettingsModal integration)
        if (options.onProgress && typeof options.onProgress === 'function') {
          options.onProgress(step || 1, percent, message);
        }
      };

      // Set initial progress
      updateProgress('Processing file... (Step 1 of 4)', 10, 1);
      
      // Process ZIP file
      const zipContent = await zip.loadAsync(file);
      
      // Check if collections.json exists in the expected locations
      let collectionsFile = zipContent.file("data/collections.json");
      if (!collectionsFile) {
        // Try the old format (root level)
        collectionsFile = zipContent.file("collections.json");
        
        if (!collectionsFile) {
          throw new Error("Invalid backup file: missing collections.json");
        }
      }
      
      // Load collections data
      const collectionsJson = await collectionsFile.async("string");
      let collectionsData;
      
      try {
        collectionsData = JSON.parse(collectionsJson);
      } catch (jsonError) {
        logger.error('Error parsing JSON:', jsonError);
        throw new Error("Invalid backup format: JSON parsing failed");
      }
      
      // Validate format
      if (!collectionsData.collections && !Object.keys(collectionsData).some(key => 
          (key === 'collections' || (typeof collectionsData[key] === 'object' && !Array.isArray(collectionsData[key]))))) {
        logger.warn("Backup format unusual: missing or invalid collections property");
        // Instead of failing, we'll try to continue processing
      }
      
      // Extract and properly save sold cards FIRST, before any other operations
      if (collectionsData.soldCards && Array.isArray(collectionsData.soldCards)) {
        logger.log(`[CRITICAL] Found ${collectionsData.soldCards.length} sold cards in ZIP backup`);
        
        // Add to collections so they'll be properly saved through the normal channel
        if (!collectionsData.collections) {
          collectionsData.collections = {};
        }
        
        collectionsData.collections.sold = collectionsData.soldCards.map(item => ({
          ...item,
          soldDate: item.soldDate || item.dateSold || new Date().toISOString(),
          buyer: item.buyer || "Import",
          finalValueAUD: parseFloat(item.finalValueAUD) || parseFloat(item.currentValueAUD) || 0,
          finalProfitAUD: parseFloat(item.finalProfitAUD) || 
            (parseFloat(item.finalValueAUD || item.currentValueAUD || 0) - parseFloat(item.investmentAUD || 0))
        }));
        
        logger.log(`[CRITICAL] Added ${collectionsData.collections.sold.length} sold cards to collections for proper saving`);
        importedSoldCards = collectionsData.collections.sold.length;
      } else if (collectionsData.soldItems && Array.isArray(collectionsData.soldItems)) {
        // Try alternative field name (soldItems instead of soldCards)
        logger.log(`[CRITICAL] Found ${collectionsData.soldItems.length} sold items in ZIP backup`);
        
        if (!collectionsData.collections) {
          collectionsData.collections = {};
        }
        
        collectionsData.collections.sold = collectionsData.soldItems.map(item => ({
          ...item,
          soldDate: item.soldDate || item.dateSold || new Date().toISOString(),
          buyer: item.buyer || "Import",
          finalValueAUD: parseFloat(item.finalValueAUD) || parseFloat(item.currentValueAUD) || 0,
          finalProfitAUD: parseFloat(item.finalProfitAUD) || 
            (parseFloat(item.finalValueAUD || item.currentValueAUD || 0) - parseFloat(item.investmentAUD || 0))
        }));
        
        logger.log(`[CRITICAL] Added ${collectionsData.collections.sold.length} sold items to collections for proper saving`);
        importedSoldCards = collectionsData.collections.sold.length;
      } else if (collectionsData.collections && collectionsData.collections.sold && Array.isArray(collectionsData.collections.sold)) {
        // Backup already has the correct structure - sold items are in collections.sold
        logger.log(`[CRITICAL] Found ${collectionsData.collections.sold.length} items in collections.sold already`);
        importedSoldCards = collectionsData.collections.sold.length;
      } else {
        logger.log("[CRITICAL] No sold items found in backup file");
      }
      
      // Extract images
      updateProgress('Processing images... (Step 3 of 4)', 50, 3);
      let imagesFolder = zipContent.folder("images");
      if (!imagesFolder || Object.keys(imagesFolder.files).length === 0) {
        // Try looking for images in root
        const imageFiles = Object.keys(zipContent.files).filter(path => 
          path.match(/\.(jpg|jpeg|png|gif)$/i) && !zipContent.files[path].dir
        );
        
        if (imageFiles.length > 0) {
          logger.log('Found images in root directory');
          imagesFolder = zipContent; // Use root as images folder
        } else {
          logger.log('No images found in backup');
          imagesFolder = null;
        }
      }
      
      // Extract images
      const imagePromises = [];
      
      if (imagesFolder) {
        const allFiles = Object.keys(zipContent.files);
        
        // This handles both "images/xxx.jpg" format and root-level images
        for (const path of allFiles) {
          const file = zipContent.files[path];
          
          // Skip directories and collections.json
          if (file.dir || path === "collections.json" || path === "data/collections.json") {
            continue;
          }
          
          // Process image files only
          if (path.match(/\.(jpg|jpeg|png|gif)$/i)) {
            const fileName = path.split("/").pop();
            if (!fileName) continue;
            
            // Extract slab serial from filename (remove extension)
            const serialNumber = fileName.split(".")[0];
            
            if (serialNumber) {
              const promise = (async () => {
                try {
                  const imageBlob = await file.async("blob");
                  await db.saveImage(serialNumber, imageBlob);
                } catch (error) {
                  // Silent fail for individual images
                  logger.error(`Failed to export image for card ${serialNumber}:`, error);
                }
              })();
              imagePromises.push(promise);
            }
          }
        }
      }
      
      // Wait for all images to be processed
      if (imagePromises.length > 0) {
        await Promise.all(imagePromises);
        logger.log(`Processed ${imagePromises.length} images`);
      }
      
      // Can be nested under a 'collections' key or directly in the root
      const collectionsToSave = {};
      let processedHasCollections = false;
      let processedImportedCards = 0;
      
      if (collectionsData.collections) {
        // If collections are stored in a 'collections' property
        if (typeof collectionsData.collections === 'object' && !Array.isArray(collectionsData.collections)) {
          // Map format (Object with collection names as keys)
          Object.entries(collectionsData.collections).forEach(([name, cards]) => {
            if (name.toLowerCase() !== 'sold' && Array.isArray(cards)) {
              // Process the cards to ensure they have the correct field mappings
              const processedCards = cards.map(card => {
                return {
                  // Preserve the original data
                  ...card,
                  // Map fields to their expected names
                  player: card.player || card.name || 'Unknown Player',
                  card: card.card || card.cardName || card.player || card.name || 'Unnamed Card',
                  name: card.name || card.card || card.player || 'Unknown Card',
                  slabSerial: card.slabSerial || card.serialNumber || card.id || generateUniqueId(),
                  // Ensure financial fields are numbers
                  investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                                (typeof card.investmentAUD === 'string' ? parseFloat(card.investmentAUD) : 0),
                  currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                                  (typeof card.currentValueAUD === 'string' ? parseFloat(card.currentValueAUD) : 0),
                  // Add any missing fields with defaults
                  set: card.set || 'Unknown Set',
                  year: card.year || '',
                  condition: card.condition || '',
                  category: card.category || 'Pokemon',
                };
              });
              collectionsToSave[name] = processedCards;
              processedImportedCards += processedCards.length;
              processedHasCollections = true;
            }
          });
        } else if (Array.isArray(collectionsData.collections)) {
          // Array format (list of collection objects)
          collectionsData.collections.forEach(collection => {
            if (collection && collection.name && collection.name.toLowerCase() !== 'sold') {
              // Process the cards to ensure they have the correct field mappings
              const cards = Array.isArray(collection.cards) ? collection.cards : [];
              const processedCards = cards.map(card => {
                return {
                  // Preserve the original data
                  ...card,
                  // Map fields to their expected names
                  player: card.player || card.name || 'Unknown Player',
                  card: card.card || card.cardName || card.player || card.name || 'Unnamed Card',
                  name: card.name || card.card || card.player || 'Unknown Card',
                  slabSerial: card.slabSerial || card.serialNumber || card.id || generateUniqueId(),
                  // Ensure financial fields are numbers
                  investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                                (typeof card.investmentAUD === 'string' ? parseFloat(card.investmentAUD) : 0),
                  currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                                  (typeof card.currentValueAUD === 'string' ? parseFloat(card.currentValueAUD) : 0),
                  // Add any missing fields with defaults
                  set: card.set || 'Unknown Set',
                  year: card.year || '',
                  condition: card.condition || '',
                  category: card.category || 'Pokemon',
                };
              });
              collectionsToSave[collection.name] = processedCards;
              processedImportedCards += processedCards.length;
              processedHasCollections = true;
            }
          });
        }
      } else {
        // Legacy format
        Object.entries(collectionsData).forEach(([name, cards]) => {
          if (name !== 'profile' && name !== 'settings' && name.toLowerCase() !== 'sold' && Array.isArray(cards)) {
            // Process the cards to ensure they have the correct field mappings
            const processedCards = cards.map(card => {
              return {
                // Preserve the original data
                ...card,
                // Map fields to their expected names
                player: card.player || card.name || 'Unknown Player',
                card: card.card || card.cardName || card.player || card.name || 'Unnamed Card',
                name: card.name || card.card || card.player || 'Unknown Card',
                slabSerial: card.slabSerial || card.serialNumber || card.id || generateUniqueId(),
                // Ensure financial fields are numbers
                investmentAUD: typeof card.investmentAUD === 'number' ? card.investmentAUD : 
                              (typeof card.investmentAUD === 'string' ? parseFloat(card.investmentAUD) : 0),
                currentValueAUD: typeof card.currentValueAUD === 'number' ? card.currentValueAUD : 
                                (typeof card.currentValueAUD === 'string' ? parseFloat(card.currentValueAUD) : 0),
                // Add any missing fields with defaults
                set: card.set || 'Unknown Set',
                year: card.year || '',
                condition: card.condition || '',
                category: card.category || 'Pokemon',
              };
            });
            collectionsToSave[name] = processedCards;
            processedImportedCards += processedCards.length;
            processedHasCollections = true;
          }
        });
      }
      
      // Save collections data
      updateProgress('Saving data... (Step 4 of 4)', 80, 4);
      await db.saveCollections(collectionsToSave, true); // Explicitly preserve sold items
      
      // Specifically save sold items if they exist
      if (collectionsData.collections && collectionsData.collections.sold) {
        logger.log(`Explicitly saving ${collectionsData.collections.sold.length} sold items`);
        await db.saveSoldCards(collectionsData.collections.sold);
      }
      
      // Force refresh all data
      window.dispatchEvent(new CustomEvent('sold-items-updated'));
      window.dispatchEvent(new CustomEvent('import-complete'));
      
      // Refresh collections
      const savedCollections = await db.getCollections();
      setCollections(savedCollections);
      
      // Switch to "All Cards" view after successful import
      setSelectedCollection('All Cards');
      localStorage.setItem('selectedCollection', 'All Cards');
      
      // Update progress to 100%
      updateProgress('Import completed successfully!', 100, 4);
      
      // Ensure we wait at least 1 second to show the loading UI
      const minimumTime = 1000; // 1 second
      const elapsedTime = Date.now() - new Date().getTime();
      
      if (elapsedTime < minimumTime) {
        await new Promise(resolve => setTimeout(resolve, minimumTime - elapsedTime));
      }
      
      // Remove the loading overlay after a delay to show completion
      if (loadingEl) {
        setTimeout(() => {
          try {
            document.body.removeChild(loadingEl);
          } catch (err) {
            logger.log('Error removing loadingEl, may have already been removed:', err);
          }
        }, 1500);
      }
      
      // Show success toast
      toast.success('Backup imported successfully!');
      
      // Force complete page reload only if not called from SettingsModal
      if (!options.noOverlay) {
        window.location.reload();
      }
    } catch (error) {
      logger.error("Import error:", error);
      // Remove the loading overlay after a delay to show completion
      if (loadingEl) {
        setTimeout(() => {
          try {
            document.body.removeChild(loadingEl);
          } catch (err) {
            logger.log('Error removing loadingEl, may have already been removed:', err);
          }
        }, 1500);
      }
      toast.error(`Error importing backup: ${error.message}`);
      
      // Rethrow the error so the caller can handle it
      throw error;
    }
  };

  const onDeleteCards = useCallback(async (cardIds) => {
    try {
      // Delete images from IndexedDB
      for (const cardId of cardIds) {
        // Make sure we're working with string IDs, not objects
        const id = typeof cardId === 'object' ? cardId.slabSerial : cardId;
        await db.deleteImage(id);
        
        // Delete card from the useCardData hook's state
        deleteCard({ slabSerial: id });
      }
    } catch (error) {
      logger.error('Error deleting cards:', error);
      toast.error('Failed to delete cards');
    }
  }, [deleteCard]);

  const handleCardDelete = useCallback(async (cardInput) => {
    let cardToDelete;
    let slabSerialToDelete;

    if (typeof cardInput === 'object' && cardInput !== null && cardInput.slabSerial) {
      cardToDelete = cardInput; // Input is the card object
      slabSerialToDelete = cardInput.slabSerial;
    } else if (typeof cardInput === 'string') {
      slabSerialToDelete = cardInput; // Input is just the ID string
    } else {
      logger.error('[App] handleCardDelete received invalid input:', cardInput);
      toast.error('Failed to delete card: Invalid input.');
      return;
    }

    if (!slabSerialToDelete) {
      logger.error('[App] Could not determine valid card ID to delete from input:', cardInput);
      toast.error('Failed to delete card: Missing card ID.');
      return;
    }

    try {
      // Step 1: Load current collections from DB
      const currentCollections = await db.getCollections();
      if (!currentCollections || typeof currentCollections !== 'object') {
        throw new Error('Failed to load collections from database.');
      }

      const updatedCollections = { ...currentCollections };
      
      // Step 2: Find and remove the card from its original collection
      let foundCard = null;
      
      // Try to find the card in its original collection if we know it
      if (initialCardCollection && updatedCollections[initialCardCollection]) {
        const cardIndex = updatedCollections[initialCardCollection].findIndex(
          card => card.slabSerial === slabSerialToDelete
        );
        
        if (cardIndex !== -1) {
          // Save the card before removing it
          foundCard = updatedCollections[initialCardCollection][cardIndex];
          // Remove from original collection
          updatedCollections[initialCardCollection].splice(cardIndex, 1);
          logger.log(`[App] Removed card ${slabSerialToDelete} from its original collection '${initialCardCollection}'`);
        } else {
          logger.warn(`[App] Card ${slabSerialToDelete} not found in its expected original collection '${initialCardCollection}'`);
        }
      }
      
      // If we didn't find it in the original collection or don't know the original,
      // search through all collections
      if (!foundCard) {
        for (const [collName, cards] of Object.entries(updatedCollections)) {
          if (collName !== 'sold' && Array.isArray(cards)) {
            const cardIndex = cards.findIndex(card => card.slabSerial === slabSerialToDelete);
            if (cardIndex !== -1) {
              // Found the card in this collection
              foundCard = cards[cardIndex];
              // Remove it from this collection
              cards.splice(cardIndex, 1);
              logger.log(`[App] Found and removed card ${slabSerialToDelete} from collection '${collName}'`);
              break;
            }
          }
        }
      }
      
      // Step 3: Now add the card to its new collection
      // Create the new collection if it doesn't exist
      if (!updatedCollections[selectedCollection]) {
        updatedCollections[selectedCollection] = [];
        logger.log(`[App] Created new collection '${selectedCollection}'`);
      }
      
      // Preserve all original card data that wasn't explicitly changed
      const cardToAdd = {
        ...(foundCard || {}),  // Base it on the found card if available
        // Explicitly preserve the image URL to prevent it from being lost during moves
        imageUrl: foundCard ? foundCard.imageUrl : null
      };
      
      // Add to the new collection
      // Check if it already exists in the target collection (could happen if moving to same collection)
      const existingIndex = updatedCollections[selectedCollection].findIndex(
        card => card.slabSerial === slabSerialToDelete
      );
      
      if (existingIndex !== -1) {
        // Update in place if already exists
        updatedCollections[selectedCollection][existingIndex] = cardToAdd;
        logger.log(`[App] Updated existing card ${slabSerialToDelete} in collection '${selectedCollection}'`);
      } else {
        // Add as new if doesn't exist
        updatedCollections[selectedCollection].push(cardToAdd);
        logger.log(`[App] Added card ${slabSerialToDelete} to collection '${selectedCollection}'`);
      }
      
      // Step 4: Save the updated collections to DB
      await db.saveCollections(updatedCollections, true);
      logger.log(`[App] Saved updated collections to DB for card ${slabSerialToDelete}.`);

      // Step 5: Update local state
      setCollections(updatedCollections);
      
      // Step 6: Update card in Firestore via the useCardData hook and shadowSync
      const cardForFirestore = {
        ...cardToAdd,
        collection: selectedCollection,
        collectionId: selectedCollection
      };
      
      // Update in useCardData hook (which triggers UI updates)
      updateCard(cardForFirestore);
      
      // Explicitly sync to Firestore if feature flag is enabled
      if (featureFlags.enableFirestoreSync && user) {
        try {
          const shadowSyncService = await import('./services/shadowSync').then(module => module.default);
          await shadowSyncService.shadowWriteCard(slabSerialToDelete, cardForFirestore, selectedCollection);
          logger.log(`[App] Successfully shadow synced card ${slabSerialToDelete} to Firestore`);
        } catch (syncError) {
          // Log but don't fail the operation
          logger.error(`[App] Error syncing card ${slabSerialToDelete} to Firestore:`, syncError);
        }
      }

      // Step 7: Close modal and show success
      handleCloseDetailsModal();
      toast.success('Card updated successfully!');

    } catch (error) {
      logger.error('[App] Error updating card:', error);
      toast.error(`Error updating card: ${error.message}`);
    }
  }, [initialCardCollection, updateCard, handleCloseDetailsModal, setCollections, user]);

  const handleAddCard = useCallback(async (cardData, imageFile, targetCollection) => {
    try {
      // Save card data to IndexedDB with parameters in correct order
      const newCard = await db.addCard(cardData, imageFile, targetCollection);
      
      // Add card to the useCardData hook's state with allowOverwrite option
      addCard(newCard, { 
        overwrite: true, 
        fromFirebase: featureFlags.enableFirestoreSync 
      });
      
      // Update local state
      const newCollections = {
        ...collections,
        [targetCollection]: [...(collections[targetCollection] || []), newCard]
      };
      setCollections(newCollections);
      
      // Show success toast
      toast.success('Card added successfully!');
    } catch (error) {
      logger.error('Error adding card:', error);
      toast.error(`Error adding card: ${error.message}`);
    }
  }, [addCard, collections]);

  const handleSettingsClick = () => {
    document.body.classList.add('settings-open'); 
    
    // For mobile, treat settings as a view
    if (isMobile) {
      setCurrentView('settings');
    }
    
    // Always show settings regardless of device
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    document.body.classList.remove('settings-open'); 
    
    setShowSettings(false);
    // If we're on mobile and current view is settings,
    // go back to cards view when closing settings
    if (isMobile && currentView === 'settings') {
      setCurrentView('cards');
    }
  };

  // Add function to handle resetting all data
  const handleResetData = async () => {
    try {
      // Show loading toast
      toast.loading('Resetting all data...', { duration: 10000, id: 'reset-data' });
      
      // Delete cloud data if user is logged in
      if (user) {
        try {
          logger.debug('Deleting cloud data for user:', user.uid);
          const repository = new CardRepository(user.uid);
          await repository.deleteAllUserData();
          logger.debug('Successfully deleted cloud data');
        } catch (cloudError) {
          logger.error('Error deleting cloud data:', cloudError);
          // Continue with local data reset even if cloud deletion fails
        }
      }
      
      // Call the database service to reset all data
      await db.resetAllData();
      
      // Show success toast
      toast.success('All data has been reset successfully (local and cloud)', { id: 'reset-data' });
      
      // Reset the application state
      setCollections({}); // Reset collections to empty object
      setSelectedCollection('All Cards');
      localStorage.setItem('selectedCollection', 'All Cards');
      
      // Reload the page to ensure all components refresh properly
      window.location.reload();
    } catch (error) {
      logger.error('Error resetting data:', error);
      toast.error(`Failed to reset data: ${error.message}`, { id: 'reset-data' });
    }
  };

  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  useEffect(() => {
    const handleModalOpenEvent = (event) => {
      setIsAnyModalOpen(event.detail.isOpen);
    };
    
    window.addEventListener('modalOpen', handleModalOpenEvent);
    
    return () => {
      window.removeEventListener('modalOpen', handleModalOpenEvent);
    };
  }, []);

  const handleNewCollectionCreation = useCallback(async (newCollectionName) => {
    if (!newCollectionName || collections[newCollectionName]) {
      logger.warn('Attempted to create an existing or empty collection:', newCollectionName);
      return; // Don't create if it already exists or is empty
    }
    try {
      logger.log(`Creating new collection: ${newCollectionName}`);
      await db.createEmptyCollection(newCollectionName);
      // Update the collections state
      setCollections(prevCollections => ({
        ...prevCollections,
        [newCollectionName]: [] // Add the new collection with an empty array
      }));
      toast.success(`Collection '${newCollectionName}' created!`);
      // Optionally, select the newly created collection
      // setSelectedCollection(newCollectionName);
      // localStorage.setItem('selectedCollection', newCollectionName);
    } catch (error) {
      logger.error('Error creating new collection:', error);
      toast.error(`Failed to create collection: ${error.message}`);
    }
  }, [collections, setCollections]);

  // Function to import a zip file and migrate cards directly to the cloud
  const importAndCloudMigrate = async (file, options = {}) => {
    try {
      // Create a loading overlay
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
      loadingEl.innerHTML = `
        <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Cloud Migration...</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 5)</p>
          <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingEl);

      // Function to update progress
      const updateProgress = (message, percent, step) => {
        const progressEl = loadingEl.querySelector('#import-progress');
        const messageEl = loadingEl.querySelector('#import-status');
        if (progressEl) progressEl.style.width = `${percent}%`;
        if (messageEl) messageEl.textContent = message;
        
        // Call the onProgress callback if provided (for SettingsModal integration)
        if (options.onProgress && typeof options.onProgress === 'function') {
          options.onProgress(step || 1, percent, message);
        }
      };

      // Set initial progress
      updateProgress('Extracting zip file... (Step 1 of 5)', 10, 1);
      
      // Create a JSZip instance and load the file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Check for collections.json in the expected locations
      let collectionsFile = zipContent.file("data/collections.json");
      if (!collectionsFile) {
        // Try the old format (root level)
        collectionsFile = zipContent.file("collections.json");
        
        if (!collectionsFile) {
          throw new Error("Invalid backup file: missing collections.json");
        }
      }
      
      // Load collections data
      const collectionsJson = await collectionsFile.async("string");
      let collectionsData;
      
      try {
        collectionsData = JSON.parse(collectionsJson);
      } catch (jsonError) {
        logger.error('Error parsing JSON:', jsonError);
        throw new Error("Invalid backup format: JSON parsing failed");
      }
      
      // Get all collections and cards
      const collections = {};
      let allCards = [];
      
      // Process collections structure
      updateProgress('Processing collections... (Step 3 of 5)', 30, 3);
      
      // Handle different backup formats
      if (collectionsData.collections) {
        // New format with collections property
        Object.entries(collectionsData.collections).forEach(([name, cards]) => {
          if (Array.isArray(cards)) {
            collections[name] = { cards: cards, count: cards.length };
            allCards = [...allCards, ...cards.map(card => ({ ...card, collection: name, collectionId: name }))];
          }
        });
      } else {
        // Old format with direct collection names
        Object.entries(collectionsData).forEach(([name, value]) => {
          if (typeof value === 'object' && !Array.isArray(value) && name !== 'profile' && name !== 'soldCards') {
            const cards = value;
            collections[name] = { cards: cards, count: Object.keys(cards).length };
            allCards = [...allCards, ...Object.values(cards).map(card => ({ ...card, collection: name, collectionId: name }))];
          }
        });
      }
      
      // Check if we have a user to upload to
      if (!user) {
        throw new Error("You must be logged in to migrate cards to the cloud");
      }
      
      // Initialize CardRepository
      const repository = new CardRepository(user.uid);
      
      // Process and upload cards
      updateProgress('Uploading cards to cloud... (Step 4 of 5)', 40, 4);
      
      let successCount = 0;
      let errorCount = 0;
      const totalCards = allCards.length;
      
      // Process cards in batches to avoid overwhelming Firebase
      const batchSize = 5;
      for (let i = 0; i < allCards.length; i += batchSize) {
        const batch = allCards.slice(i, i + batchSize);
        
        // Process each card in the batch concurrently
        await Promise.all(batch.map(async (card) => {
          try {
            // Check if card has an image in the zip
            let imageFile = null;
            const cardId = card.id || card.slabSerial;
            
            if (cardId) {
              // Look for image in various possible locations
              const possibleImagePaths = [
                `images/${cardId}.jpg`,
                `images/${cardId}.jpeg`,
                `images/${cardId}.png`,
                `data/images/${cardId}.jpg`,
                `data/images/${cardId}.jpeg`,
                `data/images/${cardId}.png`,
                `${cardId}.jpg`,
                `${cardId}.jpeg`,
                `${cardId}.png`,
                `cards/${cardId}.jpg`,
                `cards/${cardId}.jpeg`,
                `cards/${cardId}.png`,
                `data/cards/${cardId}.jpg`,
                `data/cards/${cardId}.jpeg`,
                `data/cards/${cardId}.png`
              ];
              
              for (const path of possibleImagePaths) {
                const imageZipFile = zipContent.file(path);
                if (imageZipFile) {
                  try {
                    const blob = await imageZipFile.async("blob");
                    imageFile = new File([blob], `${cardId}.jpg`, { type: "image/jpeg" });
                    console.log(`[CloudMigrate] Image ready for card ${cardId}, size: ${blob.size}, type: ${blob.type}`);
                    break;
                  } catch (extractError) {
                    console.error(`[CloudMigrate] Error extracting image from path ${path}:`, extractError);
                  }
                }
              }
            }
            
            // Ensure card has required fields
            const processedCard = {
              ...card,
              // Ensure collection is set
              collection: card.collection || card.collectionId || "Default Collection",
              collectionId: card.collectionId || card.collection || "Default Collection",
              // Convert any Firestore timestamps to strings
              datePurchased: card.datePurchased && typeof card.datePurchased === 'object' && 'seconds' in card.datePurchased 
                ? new Date(card.datePurchased.seconds * 1000).toISOString().split('T')[0]
                : card.datePurchased || new Date().toISOString().split('T')[0]
            };
            
            // Create the card in Firestore
            let imageBlob = null;
            if (imageFile) {
              try {
                // Get blob directly from File object since it's already been extracted
                // File objects are already Blob-like and can be used directly
                imageBlob = imageFile;
                console.log(`[CloudMigrate] Image ready for card ${cardId}, size: ${imageBlob.size}, type: ${imageBlob.type}`);
              } catch (imgError) {
                console.error(`[CloudMigrate] Error processing image for card ${cardId}:`, imgError);
              }
            } else {
              console.log(`[CloudMigrate] No image found for card ${cardId} in zip file`);
            }
            
            const createdCardResult = await repository.createCard(processedCard, imageBlob); 
            console.log(`[CloudMigrate] Result from createCard for ${cardId}:`, createdCardResult);

            if (createdCardResult && createdCardResult.id) {
              successCount++;
            } else {
              errorCount++;
            }
            
            // Update progress
            const progress = 40 + Math.floor((successCount + errorCount) / totalCards * 50);
            updateProgress(`Uploading cards to cloud (${successCount + errorCount}/${totalCards})... (Step 4 of 5)`, progress, 4);
            
          } catch (error) {
            logger.error("Error uploading card to cloud:", error);
            errorCount++;
            
            // Update progress even on error
            const progress = 40 + Math.floor((successCount + errorCount) / totalCards * 50);
            updateProgress(`Uploading cards to cloud (${successCount + errorCount}/${totalCards})... (Step 4 of 5)`, progress, 4);
          }
        }));
      }
      
      // Create collections in Firestore if they don't exist
      updateProgress('Creating collections in cloud... (Step 5 of 5)', 90, 5);
      
      for (const [name, collectionData] of Object.entries(collections)) {
        try {
          // Skip the "All Cards" collection
          if (name === "All Cards") continue;
          
          // Check if collection exists
          const collectionRef = doc(repository.collectionsRef, name);
          const collectionDoc = await getDoc(collectionRef);
          
          if (!collectionDoc.exists()) {
            // Create the collection
            await setDoc(collectionRef, {
              name: name,
              cardCount: collectionData.count,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          logger.error(`Error creating collection ${name}:`, error);
        }
      }
      
      // Final update
      updateProgress('Migration complete!', 100, 5);
      
      // Show success message
      toast.success(`Cloud migration complete! ${successCount} cards uploaded, ${errorCount} errors.`);
      
      // Trigger a refresh of the card data
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('import-complete'));
      }
      
      // Remove the loading overlay after a delay
      setTimeout(() => {
        if (loadingEl && loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }
      }, 2000);
      
      return { success: true, successCount, errorCount };
    } catch (error) {
      logger.error("Error in cloud migration:", error);
      toast.error(`Cloud migration failed: ${error.message}`);
      
      // Remove the loading overlay if it exists
      const loadingEl = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-70');
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      
      return { success: false, error: error.message };
    }
  };

  // Function to upload only images from a zip file to Firebase Storage
  const uploadImagesFromZip = async (file, options = {}) => {
    try {
      // Create a loading overlay
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
      loadingEl.innerHTML = `
        <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Image Upload...</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 3)</p>
          <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingEl);

      // Function to update progress
      const updateProgress = (message, percent, step) => {
        const progressEl = loadingEl.querySelector('#import-progress');
        const messageEl = loadingEl.querySelector('#import-status');
        if (progressEl) progressEl.style.width = `${percent}%`;
        if (messageEl) messageEl.textContent = message;
        
        // Call the onProgress callback if provided
        if (options.onProgress && typeof options.onProgress === 'function') {
          options.onProgress(step || 1, percent, message);
        }
      };

      // Set initial progress
      updateProgress('Extracting zip file... (Step 1 of 3)', 10, 1);
      
      // Create a JSZip instance and load the file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Check for images folder in the expected locations
      const imageFiles = [];
      
      // Find all image files in the zip
      updateProgress('Finding images in zip file... (Step 2 of 3)', 30, 2);
      
      // Look for images in both root/images and data/images folders
      zipContent.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          // Check if it's an image file in one of the expected locations
          if ((relativePath.startsWith('images/') || relativePath.startsWith('data/images/')) && 
              (relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') || relativePath.endsWith('.png'))) {
            imageFiles.push({
              path: relativePath,
              entry: zipEntry,
              id: relativePath.split("/").pop().split('.')[0] // Extract the ID from the filename
            });
          }
        }
      });
      
      // Check if we have a user to upload to
      if (!user) {
        throw new Error("You must be logged in to upload images to the cloud");
      }
      
      // Initialize CardRepository
      const repository = new CardRepository(user.uid);
      
      // Process and upload images one by one
      updateProgress(`Uploading images to cloud (0/${imageFiles.length})... (Step 3 of 3)`, 40, 3);
      
      let successCount = 0;
      let errorCount = 0;
      const totalImages = imageFiles.length;
      
      // Process images one at a time
      for (let i = 0; i < imageFiles.length; i++) {
        try {
          const imageFile = imageFiles[i];
          
          // Extract the blob from the zip entry
          const blob = await imageFile.entry.async("blob");
          const file = new File([blob], `${imageFile.id}.jpg`, { type: "image/jpeg" });
          
          // Upload the image to Firebase Storage
          const storageRef = ref(storage, `users/${user.uid}/cards/${imageFile.id}.jpg`);
          await uploadBytes(storageRef, file);
          
          // Get the download URL (optional, for verification)
          const downloadURL = await getDownloadURL(storageRef);
          
          // Update progress
          successCount++;
          const progress = 40 + Math.floor((i + 1) / totalImages * 60);
          updateProgress(`Uploading images to cloud (${i + 1}/${totalImages})... (Step 3 of 3)`, progress, 3);
          
          // Add a small delay to avoid overwhelming Firebase
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          logger.error("Error uploading image to cloud:", error);
          errorCount++;
          
          // Update progress even on error
          const progress = 40 + Math.floor((i + 1) / totalImages * 60);
          updateProgress(`Uploading images to cloud (${i + 1}/${totalImages})... (Step 3 of 3)`, progress, 3);
        }
      }
      
      // Final update
      updateProgress('Image upload complete!', 100, 3);
      
      // Show success message
      toast.success(`Image upload complete! ${successCount} images uploaded, ${errorCount} errors.`);
      
      // Remove the loading overlay after a delay
      setTimeout(() => {
        if (loadingEl && loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }
      }, 2000);
      
      return { success: true, successCount, errorCount };
    } catch (error) {
      logger.error("Error in image upload:", error);
      toast.error(`Image upload failed: ${error.message}`);
      
      // Remove the loading overlay if it exists
      const loadingEl = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-70');
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
      
      return { success: false, error: error.message };
    }
  };

  // Function to import sold items from a zip file directly to the cloud
  const importSoldItemsFromZip = async (file, options = {}) => {
    try {
      // Check if user is authenticated
      if (!user) {
        toastService.error('You must be logged in to import sold items');
        return;
      }

      // Create a loading overlay
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
      loadingEl.innerHTML = `
        <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Sold Items Import...</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 3)</p>
          <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingEl);

      // Function to update progress
      const updateProgress = (message, percent, step) => {
        const progressEl = loadingEl.querySelector('#import-progress');
        const messageEl = loadingEl.querySelector('#import-status');
        if (progressEl) progressEl.style.width = `${percent}%`;
        if (messageEl) messageEl.textContent = message;
        
        // Call the onProgress callback if provided (for SettingsModal integration)
        if (options.onProgress && typeof options.onProgress === 'function') {
          options.onProgress(step || 1, percent, message);
        }
      };

      // Set initial progress
      updateProgress('Extracting zip file... (Step 1 of 3)', 10, 1);
      
      // Create a JSZip instance and load the file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Check for collections.json in the expected locations
      let collectionsFile = zipContent.file("data/collections.json");
      if (!collectionsFile) {
        // Try the old format (root level)
        collectionsFile = zipContent.file("collections.json");
        
        if (!collectionsFile) {
          throw new Error("Invalid backup file: missing collections.json");
        }
      }
      
      // Load collections data
      const collectionsJson = await collectionsFile.async("string");
      let collectionsData;
      
      try {
        collectionsData = JSON.parse(collectionsJson);
      } catch (jsonError) {
        logger.error('Error parsing JSON:', jsonError);
        throw new Error("Invalid backup format: JSON parsing failed");
      }
      
      updateProgress('Extracting sold items... (Step 2 of 3)', 30, 2);
      
      // Look for sold items in different possible locations
      let soldItems = [];
      
      // Check for soldCards array at top level
      if (collectionsData.soldCards && Array.isArray(collectionsData.soldCards)) {
        soldItems.push(...collectionsData.soldCards);
      }
      
      // Check for sold items in collections
      if (collectionsData.collections && typeof collectionsData.collections === 'object') {
        Object.entries(collectionsData.collections).forEach(([collectionName, cards]) => {
          if (collectionName.toLowerCase() === 'sold' && Array.isArray(cards)) {
            soldItems.push(...cards);
          }
        });
      }
      
      if (soldItems.length === 0) {
        throw new Error("No sold items found in backup file");
      }
      
      updateProgress(`Found ${soldItems.length} sold items. Uploading to cloud... (Step 3 of 3)`, 50, 3);
      
      // Process the sold items
      const processedSoldItems = soldItems.map(item => ({
        ...item,
        soldDate: item.soldDate || item.dateSold || new Date().toISOString(),
        buyer: item.buyer || "Import",
        finalValueAUD: parseFloat(item.finalValueAUD) || parseFloat(item.currentValueAUD) || 0,
        finalProfitAUD: parseFloat(item.finalProfitAUD) || 
          (parseFloat(item.finalValueAUD || item.currentValueAUD || 0) - parseFloat(item.investmentAUD || 0))
      }));
      
      // Check for existing sold items in Firestore to avoid duplicates
      const soldItemsRef = collection(firestoreDb, `users/${user.uid}/sold-items`);
      const existingSoldItemsSnapshot = await getDocs(soldItemsRef);
      const existingSoldItemIds = new Set();
      
      existingSoldItemsSnapshot.forEach(doc => {
        existingSoldItemIds.add(doc.id);
      });
      
      // Filter out duplicates
      const newSoldItems = processedSoldItems.filter(
        item => !existingSoldItemIds.has(item.slabSerial || item.id)
      );
      
      if (newSoldItems.length === 0) {
        updateProgress('No new sold items to import. All items already exist.', 100, 3);
        setTimeout(() => {
          document.body.removeChild(loadingEl);
          toastService.warning('No new sold items to import. All items already exist.');
        }, 1500);
        return;
      }
      
      // Upload sold items to Firestore
      let successCount = 0;
      let errorCount = 0;
      const totalItems = newSoldItems.length;
      
      // Process sold items in batches to avoid overwhelming Firebase
      const batchSize = 5;
      for (let i = 0; i < newSoldItems.length; i += batchSize) {
        const batch = newSoldItems.slice(i, i + batchSize);
        
        // Process each sold item in the batch concurrently
        await Promise.all(batch.map(async (soldItem) => {
          try {
            // Check if card has an image in the zip
            let imageFile = null;
            const cardId = soldItem.id || soldItem.slabSerial;
            
            if (cardId) {
              // Look for image in various possible locations
              const possibleImagePaths = [
                `images/${cardId}.jpg`,
                `images/${cardId}.jpeg`,
                `images/${cardId}.png`,
                `data/images/${cardId}.jpg`,
                `data/images/${cardId}.jpeg`,
                `data/images/${cardId}.png`
              ];
              
              for (const path of possibleImagePaths) {
                const imgFile = zipContent.file(path);
                if (imgFile) {
                  imageFile = imgFile;
                  break;
                }
              }
            }
            
            // Upload image if found
            let imageUrl = null;
            if (imageFile) {
              const imageBlob = await imageFile.async("blob");
              const storageRef = ref(storage, `users/${user.uid}/card-images/${cardId}`);
              await uploadBytes(storageRef, imageBlob);
              imageUrl = await getDownloadURL(storageRef);
            }
            
            // Add to Firestore
            const soldItemRef = doc(firestoreDb, `users/${user.uid}/sold-items/${cardId}`);
            await setDoc(soldItemRef, {
              ...soldItem,
              imageUrl,
              updatedAt: serverTimestamp()
            });
            
            successCount++;
            
            // Update progress
            const progress = Math.round(50 + (successCount + errorCount) / totalItems * 50);
            updateProgress(`Uploading sold items: ${successCount}/${totalItems} complete`, progress, 3);
            
          } catch (cardError) {
            console.error(`Error uploading sold item ${soldItem.id || soldItem.slabSerial}:`, cardError);
            errorCount++;
          }
        }));
      }
      
      // Final progress update
      updateProgress(`Completed! ${successCount} sold items uploaded to cloud, ${errorCount} errors`, 100, 3);
      
      // Remove loading overlay after a delay
      setTimeout(() => {
        document.body.removeChild(loadingEl);
        toastService.success(`Imported ${successCount} sold items to the cloud`);
        
        // Dispatch event to notify SoldItems component to refresh
        window.dispatchEvent(new CustomEvent('sold-items-updated'));
      }, 1500);
      
    } catch (error) {
      console.error('Error importing sold items:', error);
      
      // Remove loading overlay if it exists
      const loadingEl = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-70');
      if (loadingEl) {
        document.body.removeChild(loadingEl);
      }
      
      toastService.error(`Error importing sold items: ${error.message}`);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0F0F0F] dashboard-page">
      {/* Hide Header on mobile when in settings view */}
      {!(isMobile && currentView === 'settings') && (
        <Header
          className="header"
          selectedCollection={selectedCollection}
          collections={collections} // Reverted change
          onCollectionChange={setSelectedCollection}
          onImportClick={handleImportClick}
          onSettingsClick={handleSettingsClick}
          currentView={currentView}
          onViewChange={setCurrentView}
          onAddCollection={(name) => {
            if (name === 'All Cards') {
              toast.error('Cannot create a collection named "All Cards" - this is a reserved name');
              return;
            }
            
            const newCollections = {
              ...collections,
              [name]: []
            };
            db.saveCollections(newCollections).then(() => {
              setCollections(newCollections);
              setSelectedCollection(name);
              localStorage.setItem('selectedCollection', name);
            });
          }}
          onRenameCollection={(oldName, newName) => {
            const newCollections = { ...collections };
            newCollections[newName] = newCollections[oldName];
            delete newCollections[oldName];
            setCollections(newCollections);
            setSelectedCollection(newName);
          }}
          onDeleteCollection={async (name) => {
            try {
              logger.log("App.js: Attempting to delete collection:", name);
              
              const currentCollections = { ...collections };
              
              if (!currentCollections[name]) {
                logger.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                throw new Error(`Collection "${name}" does not exist`);
              }
              
              if (Object.keys(currentCollections).length <= 1) {
                throw new Error("Cannot delete the last collection");
              }
              
              toast.loading(`Deleting collection "${name}" and all its cards...`, { id: 'delete-collection' });
              
              let cardsInCollection = [];
              
              try {
                Object.values(collections).forEach(collectionCards => {
                  if (Array.isArray(collectionCards)) {
                    const matchingCards = collectionCards.filter(card => 
                      card.collectionName === name || card.collection === name
                    );
                    cardsInCollection = [...cardsInCollection, ...matchingCards];
                  }
                });
                
                logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from app state`);
              } catch (stateError) {
                logger.error("Error finding cards in collection from state:", stateError);
              }
              
              if (cardsInCollection.length === 0) {
                try {
                  const allCollections = await db.getCollections();
                  if (allCollections && allCollections[name] && Array.isArray(allCollections[name])) {
                    cardsInCollection = allCollections[name];
                    logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from database`);
                  }
                } catch (dbError) {
                  logger.error("Error finding cards in collection from database:", dbError);
                }
              }
              
              try {
                logger.log(`Revoking blob URLs for ${cardsInCollection.length} cards in collection "${name}"`);
                
                cardsInCollection.forEach(card => {
                  if (card.imageUrl && card.imageUrl.startsWith('blob:')) {
                    try {
                      URL.revokeObjectURL(card.imageUrl);
                      logger.debug(`Revoked blob URL for card ${card.id || card.slabSerial}`);
                    } catch (revokeError) {
                      logger.error(`Error revoking blob URL for card ${card.id || card.slabSerial}:`, revokeError);
                    }
                  }
                });
                
                for (const card of cardsInCollection) {
                  const cardId = card.id || card.slabSerial;
                  if (cardId) {
                    try {
                      await db.deleteImage(cardId);
                      logger.debug(`Deleted image for card ${cardId} from IndexedDB`);
                    } catch (deleteError) {
                      logger.error(`Error deleting image for card ${cardId} from IndexedDB:`, deleteError);
                    }
                  }
                }
              } catch (blobError) {
                logger.error("Error revoking blob URLs:", blobError);
              }
              
              if (currentCollections[name].id && user) {
                try {
                  const cardRepo = new CardRepository(user.uid);
                  
                  await cardRepo.deleteCollection(currentCollections[name].id);
                  logger.log(`Collection "${name}" and all its cards deleted from Firestore`);
                } catch (firestoreError) {
                  logger.error("Error deleting collection from Firestore:", firestoreError);
                }
              }
              
              delete currentCollections[name];
              logger.log("Collection removed from object, saving to DB...");
              
              await db.saveCollections(currentCollections);
              
              setCollections(currentCollections);
              
              if (selectedCollection === name) {
                const newSelection = Object.keys(currentCollections)[0];
                setSelectedCollection(newSelection);
                localStorage.setItem('selectedCollection', newSelection);
                logger.log("Selected new collection:", newSelection);
              }
              
              toast.success(`Collection "${name}" and all its cards deleted successfully`, { id: 'delete-collection' });
              
              return true;
            } catch (error) {
              logger.error("Error deleting collection:", error);
              toast.error(`Failed to delete collection: ${error.message}`, { id: 'delete-collection' });
              throw error;
            }
          }}
          onExportData={handleExportData}
          onImportCollection={handleImportCollection}
          onImportBaseData={() => {
            return new Promise((resolve) => {
              handleImportClick('baseData');
              setShowSettings(false);
              resolve();
            });
          }}
          userData={user}
          onSignOut={logout}
          onResetData={handleResetData}
          onImportAndCloudMigrate={importAndCloudMigrate}
          onUploadImagesFromZip={uploadImagesFromZip}
          onImportSoldItemsFromZip={importSoldItemsFromZip}
        />
      )}
      
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20">
        {currentView === 'cards' ? (
          <div className="flex-1 overflow-y-auto">
            {/* Main content */}
            <div className={`${selectedCard ? 'hidden lg:block' : ''}`}>
              {/* Show settings modal when settings is selected */}
              {showSettings ? (
                <SettingsModal
                  isOpen={showSettings}
                  onClose={handleCloseSettings}
                  selectedCollection={selectedCollection}
                  collections={collections} // Reverted change
                  onStartTutorial={startTutorial} // Ensure this is present once
                  onRenameCollection={(oldName, newName) => {
                    const newCollections = { ...collections };
                    newCollections[newName] = newCollections[oldName];
                    delete newCollections[oldName];
                    setCollections(newCollections);
                    setSelectedCollection(newName);
                  }}
                  onDeleteCollection={async (name) => {
                    try {
                      logger.log("App.js: Attempting to delete collection:", name);
                      
                      const currentCollections = { ...collections };
                      
                      if (!currentCollections[name]) {
                        logger.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                        throw new Error(`Collection "${name}" does not exist`);
                      }
                      
                      if (Object.keys(currentCollections).length <= 1) {
                        throw new Error("Cannot delete the last collection");
                      }
                      
                      toast.loading(`Deleting collection "${name}" and all its cards...`, { id: 'delete-collection' });
                      
                      let cardsInCollection = [];
                      
                      try {
                        Object.values(collections).forEach(collectionCards => {
                          if (Array.isArray(collectionCards)) {
                            const matchingCards = collectionCards.filter(card => 
                              card.collectionName === name || card.collection === name
                            );
                            cardsInCollection = [...cardsInCollection, ...matchingCards];
                          }
                        });
                        
                        logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from app state`);
                      } catch (stateError) {
                        logger.error("Error finding cards in collection from state:", stateError);
                      }
                      
                      if (cardsInCollection.length === 0) {
                        try {
                          const allCollections = await db.getCollections();
                          if (allCollections && allCollections[name] && Array.isArray(allCollections[name])) {
                            cardsInCollection = allCollections[name];
                            logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from database`);
                          }
                        } catch (dbError) {
                          logger.error("Error finding cards in collection from database:", dbError);
                        }
                      }
                      
                      try {
                        logger.log(`Revoking blob URLs for ${cardsInCollection.length} cards in collection "${name}"`);
                        
                        cardsInCollection.forEach(card => {
                          if (card.imageUrl && card.imageUrl.startsWith('blob:')) {
                            try {
                              URL.revokeObjectURL(card.imageUrl);
                              logger.debug(`Revoked blob URL for card ${card.id || card.slabSerial}`);
                            } catch (revokeError) {
                              logger.error(`Error revoking blob URL for card ${card.id || card.slabSerial}:`, revokeError);
                            }
                          }
                        });
                        
                        for (const card of cardsInCollection) {
                          const cardId = card.id || card.slabSerial;
                          if (cardId) {
                            try {
                              await db.deleteImage(cardId);
                              logger.debug(`Deleted image for card ${cardId} from IndexedDB`);
                            } catch (deleteError) {
                              logger.error(`Error deleting image for card ${cardId} from IndexedDB:`, deleteError);
                            }
                          }
                        }
                      } catch (blobError) {
                        logger.error("Error revoking blob URLs:", blobError);
                      }
                      
                      if (currentCollections[name].id && user) {
                        try {
                          const cardRepo = new CardRepository(user.uid);
                          
                          await cardRepo.deleteCollection(currentCollections[name].id);
                          logger.log(`Collection "${name}" and all its cards deleted from Firestore`);
                        } catch (firestoreError) {
                          logger.error("Error deleting collection from Firestore:", firestoreError);
                        }
                      }
                      
                      delete currentCollections[name];
                      logger.log("Collection removed from object, saving to DB...");
                      
                      await db.saveCollections(currentCollections);
                      
                      setCollections(currentCollections);
                      
                      if (selectedCollection === name) {
                        const newSelection = Object.keys(currentCollections)[0];
                        setSelectedCollection(newSelection);
                        localStorage.setItem('selectedCollection', newSelection);
                        logger.log("Selected new collection:", newSelection);
                      }
                      
                      toast.success(`Collection "${name}" and all its cards deleted successfully`, { id: 'delete-collection' });
                      
                      return true;
                    } catch (error) {
                      logger.error("Error deleting collection:", error);
                      toast.error(`Failed to delete collection: ${error.message}`, { id: 'delete-collection' });
                      throw error;
                    }
                  }}
                  onExportData={handleExportData}
                  onImportCollection={handleImportCollection}
                  onImportBaseData={() => {
                    return new Promise((resolve) => {
                      handleImportClick('baseData');
                      setShowSettings(false);
                      resolve();
                    });
                  }}
                  userData={user}
                  onSignOut={logout}
                  onResetData={handleResetData}
                  onImportAndCloudMigrate={importAndCloudMigrate}
                  onUploadImagesFromZip={uploadImagesFromZip}
                  onImportSoldItemsFromZip={importSoldItemsFromZip}
                />
              ) : (
                <>
                  {/* Show card list when no card is selected */}
                  {currentView === 'cards' && (
                    <CardList
                      cards={collectionData} 
                      exchangeRate={exchangeRate}
                      onCardClick={(card) => {
                        let actualCollectionName = selectedCollection;
                        if (selectedCollection === 'All Cards') {
                          for (const [collName, cardsInCollection] of Object.entries(collections)) {
                            if (Array.isArray(cardsInCollection) && cardsInCollection.some(c => c.slabSerial === card.slabSerial)) {
                              actualCollectionName = collName;
                              break; 
                            }
                          }
                          if (actualCollectionName === 'All Cards') {
                            logger.warn("Could not determine original collection for card: ", card.slabSerial);
                            actualCollectionName = null; 
                          }
                        }
                        selectCard(card);
                        setInitialCardCollection(actualCollectionName); 
                      }}
                      onDeleteCards={onDeleteCards}
                      onDeleteCard={handleCardDelete}
                      onUpdateCard={handleCardUpdate}
                      onAddCard={() => setShowNewCardForm(true)}
                      selectedCollection={selectedCollection}
                      collections={collections}
                      setCollections={setCollections}
                      onCollectionChange={(collection) => {
                        setSelectedCollection(collection);
                        localStorage.setItem('selectedCollection', collection);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ) : currentView === 'purchase-invoices' ? (
          <PurchaseInvoices />
        ) : currentView === 'settings' && isMobile ? (
          <MobileSettingsModal
            isOpen={showSettings}
            onClose={handleCloseSettings}
            selectedCollection={selectedCollection}
            collections={collections} // Reverted change
            onStartTutorial={startTutorial} // Ensure this is present once
            onRenameCollection={(oldName, newName) => {
              const newCollections = { ...collections };
              newCollections[newName] = newCollections[oldName];
              delete newCollections[oldName];
              setCollections(newCollections);
              setSelectedCollection(newName);
            }}
            onDeleteCollection={async (name) => {
              try {
                logger.log("App.js: Attempting to delete collection:", name);
                
                const currentCollections = { ...collections };
                
                if (!currentCollections[name]) {
                  logger.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                  throw new Error(`Collection "${name}" does not exist`);
                }
                
                if (Object.keys(currentCollections).length <= 1) {
                  throw new Error("Cannot delete the last collection");
                }
                
                const collectionId = currentCollections[name].id;
                
                toast.loading(`Deleting collection "${name}" and all its cards...`, { id: 'delete-collection' });
                
                let cardsInCollection = [];
                
                try {
                  Object.values(collections).forEach(collectionCards => {
                    if (Array.isArray(collectionCards)) {
                      const matchingCards = collectionCards.filter(card => 
                        card.collectionName === name || card.collection === name
                      );
                      cardsInCollection = [...cardsInCollection, ...matchingCards];
                    }
                  });
                  
                  logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from app state`);
                } catch (stateError) {
                  logger.error("Error finding cards in collection from state:", stateError);
                }
                
                if (cardsInCollection.length === 0) {
                  try {
                    const allCollections = await db.getCollections();
                    if (allCollections && allCollections[name] && Array.isArray(allCollections[name])) {
                      cardsInCollection = allCollections[name];
                      logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from database`);
                    }
                  } catch (dbError) {
                    logger.error("Error finding cards in collection from database:", dbError);
                  }
                }
                
                try {
                  logger.log(`Revoking blob URLs for ${cardsInCollection.length} cards in collection "${name}"`);
                  
                  cardsInCollection.forEach(card => {
                    if (card.imageUrl && card.imageUrl.startsWith('blob:')) {
                      try {
                        URL.revokeObjectURL(card.imageUrl);
                        logger.debug(`Revoked blob URL for card ${card.id || card.slabSerial}`);
                      } catch (revokeError) {
                        logger.error(`Error revoking blob URL for card ${card.id || card.slabSerial}:`, revokeError);
                      }
                    }
                  });
                  
                  for (const card of cardsInCollection) {
                    const cardId = card.id || card.slabSerial;
                    if (cardId) {
                      try {
                        await db.deleteImage(cardId);
                        logger.debug(`Deleted image for card ${cardId} from IndexedDB`);
                      } catch (deleteError) {
                        logger.error(`Error deleting image for card ${cardId} from IndexedDB:`, deleteError);
                      }
                    }
                  }
                } catch (blobError) {
                  logger.error("Error revoking blob URLs:", blobError);
                }
                
                if (collectionId && user) {
                  try {
                    const cardRepo = new CardRepository(user.uid);
                    
                    await cardRepo.deleteCollection(collectionId);
                    logger.log(`Collection "${name}" and all its cards deleted from Firestore`);
                  } catch (firestoreError) {
                    logger.error("Error deleting collection from Firestore:", firestoreError);
                  }
                }
                
                delete currentCollections[name];
                logger.log("Collection removed from object, saving to DB...");
                
                await db.saveCollections(currentCollections);
                
                setCollections(currentCollections);
                
                if (selectedCollection === name) {
                  const newSelection = Object.keys(currentCollections)[0];
                  setSelectedCollection(newSelection);
                  localStorage.setItem('selectedCollection', newSelection);
                  logger.log("Selected new collection:", newSelection);
                }
                
                toast.success(`Collection "${name}" and all its cards deleted successfully`, { id: 'delete-collection' });
                
                return true;
              } catch (error) {
                logger.error("Error deleting collection:", error);
                toast.error(`Failed to delete collection: ${error.message}`, { id: 'delete-collection' });
                throw error;
              }
            }}
            onExportData={handleExportData}
            onImportCollection={handleImportCollection}
            onImportBaseData={() => {
              return new Promise((resolve, reject) => {
                handleImportClick('baseData');
                setShowSettings(false);
                resolve();
              });
            }}
            userData={user}
            onSignOut={logout}
            onResetData={handleResetData}
          />
        ) : (
          <SoldItems />
        )}
      </main>

      {showNewCardForm && (
        <AddCardModal
          isOpen={showNewCardForm}
          onClose={() => setShowNewCardForm(false)}
          onSave={(cardData, imageFile, targetCollection) => handleAddCard(cardData, imageFile, targetCollection)}
          collections={Object.keys(collections)}
          onNewCollectionCreated={handleNewCollectionCreation}
          defaultCollection={selectedCollection !== 'All Cards' && selectedCollection !== 'Sold' ? selectedCollection : ''}
        />
      )}

      {selectedCard && (
        <CardDetails
          card={{
            ...selectedCard,
            // Ensure these fields are explicitly set to avoid undefined values
            collection: selectedCard.collection || initialCardCollection,
            collectionId: selectedCard.collectionId || selectedCard.collection || initialCardCollection,
            set: selectedCard.set || selectedCard.setName || '',
            setName: selectedCard.setName || selectedCard.set || '',
            // Ensure numeric fields are properly formatted
            investmentUSD: selectedCard.investmentUSD || 0,
            currentValueUSD: selectedCard.currentValueUSD || 0,
            investmentAUD: parseFloat(selectedCard.investmentAUD) || 0,
            currentValueAUD: parseFloat(selectedCard.currentValueAUD) || 0,
          }}
          onClose={handleCloseDetailsModal} 
          initialCollectionName={initialCardCollection} 
          onUpdateCard={handleCardUpdate} 
          onDelete={deleteCard}
          exchangeRate={exchangeRate}
          collections={collections ? Object.keys(collections) : []}
        />
      )}

      {importModalOpen && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportData}
          mode={importMode}
          loading={loading}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={true}
          onClose={handleCloseSettings}
          selectedCollection={selectedCollection}
          collections={collections} // Reverted change
          onStartTutorial={startTutorial} // Ensure this is present once
          onRenameCollection={(oldName, newName) => {
            const newCollections = { ...collections };
            newCollections[newName] = newCollections[oldName];
            delete newCollections[oldName];
            setCollections(newCollections);
            setSelectedCollection(newName);
          }}
          onDeleteCollection={async (name) => {
            try {
              logger.log("App.js: Attempting to delete collection:", name);
              
              const currentCollections = { ...collections };
              
              if (!currentCollections[name]) {
                logger.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                throw new Error(`Collection "${name}" does not exist`);
              }
              
              if (Object.keys(currentCollections).length <= 1) {
                throw new Error("Cannot delete the last collection");
              }
              
              toast.loading(`Deleting collection "${name}" and all its cards...`, { id: 'delete-collection' });
              
              let cardsInCollection = [];
              
              try {
                Object.values(collections).forEach(collectionCards => {
                  if (Array.isArray(collectionCards)) {
                    const matchingCards = collectionCards.filter(card => 
                      card.collectionName === name || card.collection === name
                    );
                    cardsInCollection = [...cardsInCollection, ...matchingCards];
                  }
                });
                
                logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from app state`);
              } catch (stateError) {
                logger.error("Error finding cards in collection from state:", stateError);
              }
              
              if (cardsInCollection.length === 0) {
                try {
                  const allCollections = await db.getCollections();
                  if (allCollections && allCollections[name] && Array.isArray(allCollections[name])) {
                    cardsInCollection = allCollections[name];
                    logger.log(`Found ${cardsInCollection.length} cards in collection "${name}" from database`);
                  }
                } catch (dbError) {
                  logger.error("Error finding cards in collection from database:", dbError);
                }
              }
              
              try {
                logger.log(`Revoking blob URLs for ${cardsInCollection.length} cards in collection "${name}"`);
                
                cardsInCollection.forEach(card => {
                  if (card.imageUrl && card.imageUrl.startsWith('blob:')) {
                    try {
                      URL.revokeObjectURL(card.imageUrl);
                      logger.debug(`Revoked blob URL for card ${card.id || card.slabSerial}`);
                    } catch (revokeError) {
                      logger.error(`Error revoking blob URL for card ${card.id || card.slabSerial}:`, revokeError);
                    }
                  }
                });
                
                for (const card of cardsInCollection) {
                  const cardId = card.id || card.slabSerial;
                  if (cardId) {
                    try {
                      await db.deleteImage(cardId);
                      logger.debug(`Deleted image for card ${cardId} from IndexedDB`);
                    } catch (deleteError) {
                      logger.error(`Error deleting image for card ${cardId} from IndexedDB:`, deleteError);
                    }
                  }
                }
              } catch (blobError) {
                logger.error("Error revoking blob URLs:", blobError);
              }
              
              if (currentCollections[name].id && user) {
                try {
                  const cardRepo = new CardRepository(user.uid);
                  
                  await cardRepo.deleteCollection(currentCollections[name].id);
                  logger.log(`Collection "${name}" and all its cards deleted from Firestore`);
                } catch (firestoreError) {
                  logger.error("Error deleting collection from Firestore:", firestoreError);
                }
              }
              
              delete currentCollections[name];
              logger.log("Collection removed from object, saving to DB...");
              
              await db.saveCollections(currentCollections);
              
              setCollections(currentCollections);
              
              if (selectedCollection === name) {
                const newSelection = Object.keys(currentCollections)[0];
                setSelectedCollection(newSelection);
                localStorage.setItem('selectedCollection', newSelection);
                logger.log("Selected new collection:", newSelection);
              }
              
              toast.success(`Collection "${name}" and all its cards deleted successfully`, { id: 'delete-collection' });
              
              return true;
            } catch (error) {
              logger.error("Error deleting collection:", error);
              toast.error(`Failed to delete collection: ${error.message}`, { id: 'delete-collection' });
              throw error;
            }
          }}
          onExportData={handleExportData}
          onImportCollection={handleImportCollection}
          onImportBaseData={() => {
            return new Promise((resolve) => {
              handleImportClick('baseData');
              setShowSettings(false);
              resolve();
            });
          }}
          userData={user}
          onSignOut={logout}
          onResetData={handleResetData}
          onImportAndCloudMigrate={importAndCloudMigrate}
          onUploadImagesFromZip={uploadImagesFromZip}
          onImportSoldItemsFromZip={importSoldItemsFromZip}
        />
      )}

      {showProfitChangeModal && (
        <ProfitChangeModal
          isOpen={showProfitChangeModal}
          onClose={() => setShowProfitChangeModal(false)}
          profitChangeData={{
            previousProfit: profitChangeData.oldProfit,
            newProfit: profitChangeData.newProfit
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${selectedCard ? 'bottom-nav-hidden' : ''}`}
      >
        <BottomNavBar
          currentView={currentView || location.pathname.split('/').pop() || 'cards'}
          onViewChange={(view) => {
            setCurrentView(view);
            if (view !== 'settings' && showSettings) {
              setShowSettings(false);
            }
            if (view === 'settings' && !showSettings) {
              setShowSettings(true);
            }
          }}
          onAddCard={() => setShowNewCardForm(true)}
          onSettingsClick={handleSettingsClick}
          isModalOpen={selectedCard !== null || showNewCardForm || isAnyModalOpen}
        />
      </div>

      {/* Add RestoreListener at the App component level where state setters are in scope */}
      <RestoreListener 
        onRefreshData={() => {
          logger.log('App: Refreshing data after restore/backup');
          // Refresh collections from the database
          db.getCollections().then(savedCollections => {
            if (Object.keys(savedCollections).length > 0) {
              setCollections(savedCollections);
              // If there are collections but none is selected, select the first one
              if (!selectedCollection || (selectedCollection !== 'All Cards' && !savedCollections[selectedCollection])) {
                const newCollection = Object.keys(savedCollections)[0];
                setSelectedCollection(newCollection);
                localStorage.setItem('selectedCollection', newCollection);
                logger.log(`App: Selected new collection after restore: ${newCollection}`);
              }
              toast.success('Data restored successfully! Your collections are now available.');
            }
          }).catch(error => {
            logger.error('Error refreshing collections after restore:', error);
          });
        }}
      />

      <TutorialModal />
      <SyncStatusIndicator />
    </div>
  );
}

const RootProviders = () => (
  <ErrorBoundary>
    <DesignSystemProvider>
      <SubscriptionProvider>
        <UserPreferencesProvider>
          <TutorialProvider>
            <BackupProvider>
              <BackupProgressBar />
              <RestoreProvider>
                <RestoreProgressBar />
                <InvoiceProvider>
                  <Toast
                    position="top-center"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        background: '#1B2131',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontWeight: '500'
                      }
                    }}
                  />
                  <Outlet />
                </InvoiceProvider>
              </RestoreProvider>
            </BackupProvider>
          </TutorialProvider>
        </UserPreferencesProvider>
      </SubscriptionProvider>
    </DesignSystemProvider>
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootProviders />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'pricing',
        element: <Pricing />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
        children: [
          {
            index: true,
            element: <DashboardIndex />,
          },
          {
            path: 'pricing',
            element: <DashboardPricing />,
          },
        ],
      },
      {
        path: 'premium/*',
        element: <PremiumFeatures />,
      },
      {
        path: 'component-library',
        element: <ComponentLibrary />,
      },
      {
        path: '*',
        element: <Navigate to="/" />,
      },
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  return null;
}