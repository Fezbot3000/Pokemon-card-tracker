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
  Icon 
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
import TutorialModal from './components/TutorialModal';
import ErrorBoundary from './components/ErrorBoundary';
import PremiumFeatures from './components/PremiumFeatures';
import './styles/main.css';
import './styles/black-background.css'; 
import './styles/ios-fixes.css'; 
import SoldItems from './components/SoldItems/SoldItems';
import BottomNavBar from './components/BottomNavBar';
import CloudSync from './components/CloudSync';
import JSZip from 'jszip';
import DashboardPricing from './components/DashboardPricing';
import ComponentLibrary from './pages/ComponentLibrary';

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
      console.log('User is coming from payment flow, clearing isNewUser flag');
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
      console.log('User needs subscription, redirecting to pricing');
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
  const { refreshSubscriptionStatus } = useSubscription();
  const hasRefreshed = useRef(false);
  const navigate = useNavigate();

  // Check for checkout_success parameter when dashboard loads - but only once
  useEffect(() => {
    // Only run this once per component mount
    if (hasRefreshed.current) return;
    
    // Detect if user is coming from a payment flow
    const isFromPayment = location.search.includes('checkout_success=true');
    
    if (isFromPayment) {
      console.log('Detected checkout_success parameter, refreshing subscription status');
      hasRefreshed.current = true;
      
      // Force refresh subscription status
      refreshSubscriptionStatus();
      
      // Remove the parameter from URL
      const url = new URL(window.location);
      url.searchParams.delete('checkout_success');
      window.history.replaceState({}, '', url);
      
      // If we're on the pricing page but came from payment success, force redirect to dashboard
      if (location.pathname.includes('/dashboard/pricing')) {
        console.log('User completed payment but is on pricing page, forcing redirect to dashboard');
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
  
  // Render the dashboard content if authenticated
  return (
    <Outlet />
  );
}

// Wrapper for dashboard index route (NewUserRoute + AppContent)
function DashboardIndex() {
  return <>
    <NewUserRoute />
    <AppContent />
  </>;
}

function AppContent() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfitChangeModal, setShowProfitChangeModal] = useState(false);
  const [profitChangeData, setProfitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0
  });
  const [currentView, setCurrentView] = useState('cards'); // 'cards' or 'sold'
  const { registerSettingsCallback, checkAndStartTutorial } = useTutorial();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const { refreshSubscriptionStatus } = useSubscription();
  
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

  // Register the settings callback when component mounts
  // Using a ref to ensure we only register the callback once
  const callbackRegistered = useRef(false);
  const { subscriptionStatus } = useSubscription();
  
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
      // When 's' key is pressed, open settings
      if (e.key === 's' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setShowSettings(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Memoized collection data
  const collectionData = useMemo(() => {
    if (selectedCollection === 'All Cards') {
      // Combine cards from all collections, filtering out any non-array values
      return Object.values(collections)
        .filter(Array.isArray)
        .flat()
        .filter(Boolean);
    }
    return collections[selectedCollection] || [];
  }, [collections, selectedCollection]);

  // Memoized callbacks
  const handleAddCard = useCallback(async (cardData, imageFile, targetCollection) => {
    try {
      // Check if a card with this serial number already exists in any active collection (excluding sold)
      const activeCollections = Object.entries(collections)
        .filter(([name]) => name.toLowerCase() !== 'sold')
        .map(([, cards]) => cards)
        .flat();
      
      const existingCard = activeCollections.find(card => card.slabSerial === cardData.slabSerial);
      
      if (existingCard) {
        throw new Error('A card with this serial number already exists in your active collections');
      }

      // Save the image if provided
      if (imageFile) {
        await db.saveImage(cardData.slabSerial, imageFile);
      }

      // Add card to the target collection
      const updatedCollections = {
        ...collections,
        [targetCollection]: [
          ...(collections[targetCollection] || []),
          cardData
        ]
      };

      // Save to database first
      await db.saveCollections(updatedCollections);

      // Update collections state
      setCollections(updatedCollections);
      
      // Add to useCardData state
      await addCard(cardData);

      // Close the form
      setShowNewCardForm(false);

      // Show success message
      toast.success('Card added successfully');
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Error adding card: ' + error.message);
      throw error; // Re-throw to be handled by the form
    }
  }, [collections, addCard]);

  const handleCardUpdate = useCallback(async (updatedCard) => {
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
        await db.saveCollections(updatedCollections);
        
        // Update state
        setCollections(updatedCollections);
        
        // Also update the card in the useCardData hook's state
        updateCard(updatedCard);
      } else {
        console.warn('Could not find the card in any collection');
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
      await db.saveCollections(updatedCollections);
      
      // Update state
      setCollections(updatedCollections);
      
      // Also update the card in the useCardData hook's state
      updateCard(updatedCard);
    }
  }, [collections, selectedCollection, updateCard]);

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
      console.error('Error importing data:', error);
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
    const loadCollections = async () => {
      try {
        setIsLoading(true);
        
        // Attempt to load collections from IndexedDB
        const savedCollections = await db.getCollections().catch(error => {
          console.error('Failed to load collections:', error);
          return { 'Default Collection': [] };
        });
        
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
          
          // Try to save the default collection, but don't fail if it errors
          try {
            await db.saveCollections(defaultCollections);
          } catch (saveError) {
            console.error('Could not save default collection:', saveError);
          }
        }
      } catch (error) {
        console.error('Error loading collections:', error);
        
        // Set default collections as fallback
        const defaultCollections = { 'Default Collection': [] };
        setCollections(defaultCollections);
        setSelectedCollection('Default Collection');
      } finally {
        setIsLoading(false);
      }
    };

    loadCollections();
  }, []);

  // Function to export all collection data as a ZIP file
  const handleExportData = async (options = {}) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a new ZIP file
        const zip = new JSZip();
        
        // Get ALL collections data
        const allCollections = await db.getCollections();
        
        // Get profile data
        const profileData = await db.getProfile();
        
        // Get sold cards data
        const soldCardsData = await db.getSoldCards();
        
        // Create a data folder in the ZIP
        const dataFolder = zip.folder("data");
        
        // Add collections data as JSON - include ALL collections
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

        // Add collections.json to the data folder
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
                console.error(`Failed to export image for card ${card.slabSerial}:`, error);
              }
            })();
            imagePromises.push(promise);
          }
        }

        // Process sold cards images
        for (const soldCard of soldCardsData) {
          const promise = (async () => {
            try {
              const imageBlob = await db.getImage(soldCard.slabSerial);
              
              if (!imageBlob) return;
              
              // Add image to ZIP with slab serial as filename
              const extension = imageBlob.type.split('/')[1] || 'jpg';
              const filename = `${soldCard.slabSerial}.${extension}`;
              await imagesFolder.file(filename, imageBlob);
              
              // Update card with image path
              soldCard.imagePath = `images/${filename}`;
            } catch (error) {
              // Silent fail for individual images
              console.error(`Failed to export image for sold card ${soldCard.slabSerial}:`, error);
            }
          })();
          imagePromises.push(promise);
        }
        
        try {
          // Wait for all images to be processed
          await Promise.all(imagePromises);
          
          // Update collections data with image paths
          dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
          
          // Add a README file
          const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/collections.json: All collections, card data, profile data, and sold items
- /images/: All card images referenced in collections.json

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your collections, profile, sold items and images will be restored`;
          
          zip.file("README.txt", readme);
          
          // Generate the ZIP file with compression
          const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
              level: 9
            }
          });
          
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
          console.error("Export error:", error);
          reject(error);
        }
      } catch (error) {
        console.error("Export error:", error);
        reject(error);
      }
    });
  };

  // Function to handle importing collections from JSON or ZIP file
  const handleImportCollection = (file) => {
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
          
          // Create a loading overlay
          const loadingEl = document.createElement('div');
          loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
          loadingEl.innerHTML = `
            <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Importing backup...</p>
              <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 4)</p>
              <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
              </div>
            </div>
          `;
          document.body.appendChild(loadingEl);
          
          // Start processing the file
          processImportFile(file, loadingEl);
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Import failed: ' + error.message);
        }
      };
      
      input.click();
    } else {
      // If file is provided directly (e.g. from cloud sync)
      // Create a loading overlay
      const loadingEl = document.createElement('div');
      loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
      loadingEl.innerHTML = `
        <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p class="text-gray-700 dark:text-gray-300 font-medium mb-1">Importing backup...</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm" id="import-status">Processing file... (Step 1 of 4)</p>
          <div class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div id="import-progress" class="bg-primary h-2 rounded-full" style="width: 10%"></div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingEl);
      
      // Process the file
      processImportFile(file, loadingEl);
    }
  };
  
  // Process the imported file
  const processImportFile = async (file, loadingEl) => {
    try {
      // Create a JSZip instance
      const zip = new JSZip();
      let hasCollections = false;
      let importedCards = 0;
      let importedProfiles = 0;
      let importedSoldCards = 0;

      // Function to update progress
      const updateProgress = (message, percent) => {
        if (!loadingEl) return;
        const progressEl = loadingEl.querySelector('[data-progress]');
        const messageEl = loadingEl.querySelector('[data-message]');
        if (progressEl) progressEl.style.width = `${percent}%`;
        if (messageEl) messageEl.textContent = message;
      };

      if (file.name.endsWith('.zip')) {
        // Process ZIP file
        const zipContent = await zip.loadAsync(file);
        
        // Check if collections.json exists in data/collections.json (new format)
        // or directly in the root (old format)
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
          console.error('Error parsing JSON:', jsonError);
          throw new Error("Invalid backup format: JSON parsing failed");
        }
        
        // Validate format
        if (!collectionsData.collections && !Object.keys(collectionsData).some(key => 
            (key === 'collections' || (typeof collectionsData[key] === 'object' && !Array.isArray(collectionsData[key]))))) {
          console.warn("Backup format unusual: missing or invalid collections property");
          // Instead of failing, we'll try to continue processing
        }
        
        // Extract and properly save sold cards FIRST, before any other operations
        if (collectionsData.soldCards && Array.isArray(collectionsData.soldCards)) {
          console.log(`[CRITICAL] Found ${collectionsData.soldCards.length} sold cards in ZIP backup`);
          
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
          
          console.log(`[CRITICAL] Added ${collectionsData.collections.sold.length} sold cards to collections for proper saving`);
          importedSoldCards = collectionsData.collections.sold.length;
        } else if (collectionsData.soldItems && Array.isArray(collectionsData.soldItems)) {
          // Try alternative field name (soldItems instead of soldCards)
          console.log(`[CRITICAL] Found ${collectionsData.soldItems.length} sold items in ZIP backup`);
          
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
          
          console.log(`[CRITICAL] Added ${collectionsData.collections.sold.length} sold items to collections for proper saving`);
          importedSoldCards = collectionsData.collections.sold.length;
        } else if (collectionsData.collections && collectionsData.collections.sold && Array.isArray(collectionsData.collections.sold)) {
          // Backup already has the correct structure - sold items are in collections.sold
          console.log(`[CRITICAL] Found ${collectionsData.collections.sold.length} items in collections.sold already`);
          importedSoldCards = collectionsData.collections.sold.length;
        } else {
          console.log("[CRITICAL] No sold items found in backup file");
        }
        
        // Extract images
        updateProgress('Processing images... (Step 3 of 4)', 50);
        let imagesFolder = zipContent.folder("images");
        if (!imagesFolder || Object.keys(imagesFolder.files).length === 0) {
          // Try looking for images in root
          const imageFiles = Object.keys(zipContent.files).filter(path => 
            path.match(/\.(jpg|jpeg|png|gif)$/i) && !zipContent.files[path].dir
          );
          
          if (imageFiles.length > 0) {
            console.log('Found images in root directory');
            imagesFolder = zipContent; // Use root as images folder
          } else {
            console.log('No images found in backup');
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
                    console.error(`Failed to export image for card ${serialNumber}:`, error);
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
          console.log(`Processed ${imagePromises.length} images`);
        }
        
        // Can be nested under a 'collections' key or directly in the root
        let collectionsToSave = {};
        let hasCollections = false;
        let importedCards = 0;
        
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
                importedCards += processedCards.length;
                hasCollections = true;
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
                importedCards += processedCards.length;
                hasCollections = true;
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
              importedCards += processedCards.length;
              hasCollections = true;
            }
          });
        }
        
        // Save collections data
        updateProgress('Saving data... (Step 4 of 4)', 75);
        await db.saveCollections(collectionsToSave, true); // Explicitly preserve sold items
        
        // Specifically save sold items if they exist
        if (collectionsData.collections && collectionsData.collections.sold) {
          console.log(`Explicitly saving ${collectionsData.collections.sold.length} sold items`);
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
        updateProgress('Import completed successfully!', 100);
        
        // Ensure we wait at least 1 second to show the loading UI
        const minimumTime = 1000; // 1 second
        const elapsedTime = Date.now() - new Date().getTime();
        
        if (elapsedTime < minimumTime) {
          await new Promise(resolve => setTimeout(resolve, minimumTime - elapsedTime));
        }
        
        // Remove loading overlay
        document.body.removeChild(loadingEl);
        
        // Show success toast
        toast.success('Backup imported successfully!');
        
        // Force complete page reload to ensure all data is refreshed
        window.location.reload();
      } else if (file.name.endsWith('.json')) {
        // Process JSON file implementation...
        // Similar to the existing code for handling JSON files
        
        // Update progress
        const updateProgress = (message, percent) => {
          const statusEl = document.getElementById('import-status');
          const progressEl = document.getElementById('import-progress');
          
          if (statusEl) statusEl.textContent = message;
          if (progressEl) progressEl.style.width = `${percent}%`;
        };
        
        updateProgress('Reading JSON file... (Step 1 of 3)', 20);
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            updateProgress('Parsing JSON data... (Step 2 of 3)', 50);
            const jsonData = JSON.parse(e.target.result);
            
            // Try to update collections
            updateProgress('Saving collection data... (Step 3 of 3)', 80);
            const newCollections = {
              ...collections,
              'Imported Collection': Array.isArray(jsonData) ? jsonData : [jsonData]
            };
            
            // Save to database
            await db.saveCollections(newCollections, true); // Explicitly preserve sold items
            
            // Update state
            setCollections(newCollections);
            setSelectedCollection('Imported Collection');
            localStorage.setItem('selectedCollection', 'Imported Collection');
            
            updateProgress('Import completed successfully!', 100);
            
            // Remove loading overlay
            document.body.removeChild(loadingEl);
            
            toast.success('JSON data imported successfully!');
            
            // Close settings if it's open
            setShowSettings(false);
          } catch (error) {
            console.error('JSON parsing error:', error);
            document.body.removeChild(loadingEl);
            toast.error('Invalid JSON file: ' + error.message);
          }
        };
        
        reader.readAsText(file);
      } else {
        document.body.removeChild(loadingEl);
        throw new Error("Unsupported file format. Please upload a .zip backup file or .json file.");
      }
    } catch (error) {
      console.error("Import error:", error);
      // Remove loading overlay if it exists
      if (loadingEl && document.body.contains(loadingEl)) {
        document.body.removeChild(loadingEl);
      }
      toast.error(`Error importing backup: ${error.message}`);
    }
  };

  const onDeleteCards = useCallback(async (cardIds) => {
    try {
      // Delete images from IndexedDB
      for (const cardId of cardIds) {
        await db.deleteImage(cardId);
      }

      // Delete cards from the useCardData hook's state
      cardIds.forEach(cardId => {
        deleteCard({ slabSerial: cardId });
      });
    } catch (error) {
      console.error('Error deleting cards:', error);
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
      console.error('[App] handleCardDelete received invalid input:', cardInput);
      toast.error('Failed to delete card: Invalid input.');
      return;
    }

    if (!slabSerialToDelete) {
      console.error('[App] Could not determine valid card ID to delete from input:', cardInput);
      toast.error('Failed to delete card: Missing card ID.');
      return;
    }

    try {
      // Step 1: Load current collections from DB
      const currentCollections = await db.getCollections();
      if (!currentCollections || typeof currentCollections !== 'object') {
        throw new Error('Failed to load collections from database.');
      }

      // Step 2: Find and remove the card from the collection(s)
      let cardFoundAndRemoved = false;
      const updatedCollections = { ...currentCollections };

      for (const collectionName in updatedCollections) {
        // Skip potential non-array properties if any exist
        if (!Array.isArray(updatedCollections[collectionName])) continue; 
        
        const initialLength = updatedCollections[collectionName].length;
        updatedCollections[collectionName] = updatedCollections[collectionName].filter(
          card => card.slabSerial !== slabSerialToDelete
        );
        
        if (updatedCollections[collectionName].length < initialLength) {
          cardFoundAndRemoved = true;
        }
      }

      if (!cardFoundAndRemoved) {
        // Card wasn't found in any collection - maybe already deleted?
        // Or maybe it exists in the hook's state but not DB? (unlikely)
        console.warn(`[App] Card ${slabSerialToDelete} not found in any collection in the database. Assuming already deleted or state mismatch.`);
      } else {
        // Step 3: Save updated collections back to DB
        await db.saveCollections(updatedCollections);
      }

      // Step 4: Update the useCardData hook's local state (triggers UI update)
      deleteCard(slabSerialToDelete); 

      // Step 5: Update local App.js collections state (if needed, though maybe redundant if UI relies on hook)
      // setCollections(updatedCollections); // Consider if this is necessary
      
      // Success toast should be handled by the calling component (CardDetails)
      // or we can add one here if preferred.
      // toast.success('Card deleted successfully!'); 

    } catch (error) {
      console.error('[App] Error during card deletion process:', error);
      toast.error(`Error deleting card: ${error.message}`);
    }
  }, [deleteCard]); // Now depends only on the hook's deleteCard function again

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
      toast.loading('Resetting all data...', { duration: 5000, id: 'reset-data' });
      
      // Call the database service to reset all data
      await db.resetAllData();
      
      // Show success toast
      toast.success('All data has been reset successfully', { id: 'reset-data' });
      
      // Reset the application state
      setCollections({ 'Default Collection': [] });
      setSelectedCollection('Default Collection');
      localStorage.setItem('selectedCollection', 'Default Collection');
      
      // Reload the page to ensure all components refresh properly
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
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
          collections={['All Cards', ...Object.keys(collections).filter(name => name.toLowerCase() !== 'sold')]}
          onCollectionChange={setSelectedCollection}
          onImportClick={handleImportClick}
          onSettingsClick={handleSettingsClick}
          currentView={currentView}
          onViewChange={setCurrentView}
          refreshCollections={() => {
            // Refresh collections data from the database
            db.getCollections().then(savedCollections => {
              if (Object.keys(savedCollections).length > 0) {
                setCollections(savedCollections);
                // Only switch collection if current isn't "All Cards" and doesn't exist
                if (selectedCollection !== 'All Cards' && !savedCollections[selectedCollection]) {
                  const newCollection = Object.keys(savedCollections)[0];
                  setSelectedCollection(newCollection);
                  localStorage.setItem('selectedCollection', newCollection);
                }
              }
            });
          }}
          onAddCollection={(name) => {
            // Prevent adding "All Cards" as a normal collection
            if (name === 'All Cards') {
              toast.error('Cannot create a collection named "All Cards" - this is a reserved name');
              return;
            }
            
            // Create new collection
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
            if (oldName && newName && oldName !== newName) {
              // Create new collection
              const newCollections = { ...collections };
              // Copy cards to the new collection
              newCollections[newName] = newCollections[oldName];
              // Remove old collection
              delete newCollections[oldName];
              
              // Save to database
              db.saveCollections(newCollections).then(() => {
                setCollections(newCollections);
                // Update selected collection if it was renamed
                if (selectedCollection === oldName) {
                  setSelectedCollection(newName);
                  localStorage.setItem('selectedCollection', newName);
                }
              });
            }
          }}
          onDeleteCollection={async (name) => {
            try {
              console.log("App.js: Attempting to delete collection:", name);
              
              // Get current collections
              const currentCollections = { ...collections };
              
              // Check if collection exists
              if (!currentCollections[name]) {
                console.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                throw new Error(`Collection "${name}" does not exist`);
              }
              
              // Check if it's the last collection
              if (Object.keys(currentCollections).length <= 1) {
                throw new Error("Cannot delete the last collection");
              }
              
              // Remove the collection
              delete currentCollections[name];
              console.log("Collection removed from object, saving to DB...");
              
              // Save updated collections to database
              await db.saveCollections(currentCollections, true); // Explicitly preserve sold items
              
              // Update state
              setCollections(currentCollections);
              
              // Switch to another collection if the deleted one was selected
              if (selectedCollection === name) {
                const newSelection = Object.keys(currentCollections)[0];
                setSelectedCollection(newSelection);
                localStorage.setItem('selectedCollection', newSelection);
                console.log("Selected new collection:", newSelection);
              }
              
              return true;
            } catch (error) {
              console.error("Error deleting collection:", error);
              toast.error(`Failed to delete collection: ${error.message}`);
              throw error;
            }
          }}
        />
      )}
      
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20">
        {currentView === 'cards' ? (
          <CardList
            cards={collectionData}
            exchangeRate={exchangeRate}
            onCardClick={(card) => {
              selectCard(card);
            }}
            onDeleteCards={onDeleteCards}
            onUpdateCard={handleCardUpdate}
            onAddCard={() => setShowNewCardForm(true)}
            selectedCollection={selectedCollection}
            collections={collections}
            setCollections={setCollections}
            onDeleteCard={handleCardDelete}
          />
        ) : currentView === 'settings' && isMobile ? (
          // The SettingsModal component will handle rendering for mobile view
          <MobileSettingsModal
            isOpen={showSettings}
            onClose={handleCloseSettings}
            selectedCollection={selectedCollection}
            collections={Object.keys(collections).filter(name => name.toLowerCase() !== 'sold')}
            onRenameCollection={(oldName, newName) => {
              const newCollections = { ...collections };
              newCollections[newName] = newCollections[oldName];
              delete newCollections[oldName];
              setCollections(newCollections);
              setSelectedCollection(newName);
            }}
            onDeleteCollection={async (name) => {
              try {
                console.log("App.js: Attempting to delete collection:", name);
                
                // Get current collections
                const currentCollections = { ...collections };
                
                // Check if collection exists
                if (!currentCollections[name]) {
                  console.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                  throw new Error(`Collection "${name}" does not exist`);
                }
                
                // Check if it's the last collection
                if (Object.keys(currentCollections).length <= 1) {
                  throw new Error("Cannot delete the last collection");
                }
                
                // Remove the collection
                delete currentCollections[name];
                console.log("Collection removed from object, saving to DB...");
                
                // Save updated collections to database
                await db.saveCollections(currentCollections, true); // Explicitly preserve sold items
                
                // Update state
                setCollections(currentCollections);
                
                // Switch to another collection if the deleted one was selected
                if (selectedCollection === name) {
                  const newSelection = Object.keys(currentCollections)[0];
                  setSelectedCollection(newSelection);
                  localStorage.setItem('selectedCollection', newSelection);
                }
                
                return true;
              } catch (error) {
                console.error("Error deleting collection:", error);
                toast.error(`Failed to delete collection: ${error.message}`);
                throw error;
              }
            }}
            refreshCollections={() => {
              // Refresh collections data
              db.getCollections().then(savedCollections => {
                if (Object.keys(savedCollections).length > 0) {
                  setCollections(savedCollections);
                }
              });
            }}
            onExportData={handleExportData}
            onImportCollection={handleImportCollection}
            onUpdatePrices={() => {
              return new Promise((resolve, reject) => {
                handleImportClick('priceUpdate');
                // Close the settings modal
                setShowSettings(false);
                // This is just triggering the modal to open, so we resolve
                // The actual update will happen when user selects a file in the import modal
                resolve();
              });
            }}
            onImportBaseData={() => {
              return new Promise((resolve, reject) => {
                handleImportClick('baseData');
                // Close the settings modal
                setShowSettings(false);
                // This is just triggering the modal to open, so we resolve
                // The actual import will happen when user selects a file in the import modal
                resolve();
              });
            }}
            userData={user}
            onSignOut={logout}
            onStartTutorial={checkAndStartTutorial}
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
        />
      )}

      {selectedCard && (
        <CardDetails
          card={selectedCard}
          onClose={clearSelectedCard}
          onUpdate={handleCardUpdate}
          onUpdateCard={handleCardUpdate}
          onDelete={deleteCard}
          exchangeRate={exchangeRate}
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
          collections={Object.keys(collections).filter(name => name.toLowerCase() !== 'sold')}
          onRenameCollection={(oldName, newName) => {
            const newCollections = { ...collections };
            newCollections[newName] = newCollections[oldName];
            delete newCollections[oldName];
            setCollections(newCollections);
            setSelectedCollection(newName);
          }}
          onDeleteCollection={async (name) => {
            try {
              console.log("App.js: Attempting to delete collection:", name);
              
              // Get current collections
              const currentCollections = { ...collections };
              
              // Check if collection exists
              if (!currentCollections[name]) {
                console.error(`Collection "${name}" does not exist in:`, Object.keys(currentCollections));
                throw new Error(`Collection "${name}" does not exist`);
              }
              
              // Check if it's the last collection
              if (Object.keys(currentCollections).length <= 1) {
                throw new Error("Cannot delete the last collection");
              }
              
              // Remove the collection
              delete currentCollections[name];
              console.log("Collection removed from object, saving to DB...");
              
              // Save updated collections to database
              await db.saveCollections(currentCollections, true); // Explicitly preserve sold items
              
              // Update state
              setCollections(currentCollections);
              
              // Switch to another collection if the deleted one was selected
              if (selectedCollection === name) {
                const newSelection = Object.keys(currentCollections)[0];
                setSelectedCollection(newSelection);
                localStorage.setItem('selectedCollection', newSelection);
              }
              
              return true;
            } catch (error) {
              console.error("Error deleting collection:", error);
              toast.error(`Failed to delete collection: ${error.message}`);
              throw error;
            }
          }}
          refreshCollections={() => {
            // Refresh collections data
            db.getCollections().then(savedCollections => {
              if (Object.keys(savedCollections).length > 0) {
                setCollections(savedCollections);
              }
            });
          }}
          onExportData={handleExportData}
          onImportCollection={handleImportCollection}
          onUpdatePrices={() => {
            return new Promise((resolve, reject) => {
              handleImportClick('priceUpdate');
              // Close the settings modal
              setShowSettings(false);
              // This is just triggering the modal to open, so we resolve
              // The actual update will happen when user selects a file in the import modal
              resolve();
            });
          }}
          onImportBaseData={() => {
            return new Promise((resolve, reject) => {
              handleImportClick('baseData');
              // Close the settings modal
              setShowSettings(false);
              // This is just triggering the modal to open, so we resolve
              // The actual import will happen when user selects a file in the import modal
              resolve();
            });
          }}
          userData={user}
          onSignOut={logout}
          onStartTutorial={checkAndStartTutorial}
          onResetData={handleResetData}
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
            // If switching to a view other than settings, hide settings modal
            if (view !== 'settings' && showSettings) {
              setShowSettings(false);
            }
            // If switching to settings view, show settings modal
            if (view === 'settings' && !showSettings) {
              setShowSettings(true);
            }
          }}
          onAddCard={() => setShowNewCardForm(true)}
          onSettingsClick={handleSettingsClick}
          isModalOpen={selectedCard !== null || showNewCardForm || isAnyModalOpen}
        />
      </div>

      <TutorialModal />
    </div>
  );
}

const RootProviders = () => (
  <ErrorBoundary>
    <DesignSystemProvider>
      <SubscriptionProvider>
        <TutorialProvider>
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
        </TutorialProvider>
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
  // Legacy default export for compatibility, but not used in index.js
  return null;
}