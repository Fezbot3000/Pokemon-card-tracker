import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation, 
  Link, 
  useNavigate,
  Outlet
} from 'react-router-dom';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import ProfitChangeModal from './components/ProfitChangeModal';
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/Pricing';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import db from './services/db';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TutorialProvider, useTutorial } from './contexts/TutorialContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import TutorialModal from './components/TutorialModal';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';
import './styles/z-index-fixes.css';
import SoldItems from './components/SoldItems/SoldItems';
import SettingsModal from './components/SettingsModal';
import BottomNavBar from './components/BottomNavBar';
import CloudSync from './components/CloudSync';
import JSZip from 'jszip';
import { Toaster, toast } from 'react-hot-toast';
import SubscriptionGateway from './components/SubscriptionGateway';
import DashboardPricing from './components/DashboardPricing';

// Public route component to redirect authenticated users to dashboard
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  if (currentUser) {
    // Special case: Redirect to dashboard pricing if user is trying to access /pricing
    if (path === '/pricing') {
      navigate('/dashboard/pricing', { replace: true });
      return null;
    }
    
    // Redirect to dashboard if user is already logged in
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  return children;
}

// NewUserRoute to check subscription status and redirect to pricing for new sign-ups
function NewUserRoute() {
  const { currentUser } = useAuth();
  const { subscriptionStatus, isLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  
  // Debugging: Inspect the isNewUser flag on component mount
  useEffect(() => {
    const isNewUser = localStorage.getItem('isNewUser');
    if (currentUser) {
      console.log("DEBUG: IsNewUser Flag Value:", { 
        isNewUser, 
        value: isNewUser === 'true',
        path: location.pathname, 
        uid: currentUser.uid 
      });
    }
  }, [currentUser, location.pathname]);
  
  // Check if we are coming from a successful payment
  const isFromPayment = useMemo(() => {
    return location.search.includes('checkout_success=true') || 
      localStorage.getItem('recentPayment') === 'true';
  }, [location.search]);
  
  // Completely revamped to ensure proper redirection logic
  useEffect(() => {
    // Don't do anything if we're not logged in or already on a pricing page
    if (!currentUser || 
        location.pathname.includes('/pricing') || 
        location.pathname.includes('/dashboard/pricing')) {
      return;
    }
    
    // Helper function for logging
    const logRedirectInfo = () => {
      console.log('NewUserRoute - Checking if redirect needed', {
        pathname: location.pathname,
        hasRedirected: hasRedirected.current,
        isNewUser: localStorage.getItem('isNewUser') === 'true',
        chosenPlan: localStorage.getItem('chosenPlan'),
        isFromPayment,
        subscriptionStatus: subscriptionStatus?.status,
        isLoading
      });
    };
    
    logRedirectInfo();
    
    // If user just completed payment, never redirect them to pricing
    if (isFromPayment) {
      console.log('User is coming from payment flow, skipping pricing redirect');
      hasRedirected.current = true;
      return;
    }
    
    // Skip if we've already processed a redirect
    if (hasRedirected.current) {
      return;
    }
    
    // Check if user is a brand new sign-up (localStorage flag set by auth flows)
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    
    // ALWAYS redirect new users to pricing first, regardless of what page they're on
    if (isNewUser) {
      console.log('New user detected, redirecting to subscription page');
      localStorage.removeItem('isNewUser'); // Clear the flag
      hasRedirected.current = true;
      navigate('/dashboard/pricing');
      return;
    }
    
    // For returning users, check subscription status
    if (!isLoading && subscriptionStatus?.status !== 'loading') {
      const chosenPlan = localStorage.getItem('chosenPlan');
      
      // If they've explicitly chosen the free plan, don't redirect
      if (chosenPlan === 'free') {
        console.log('User has explicitly chosen the free plan');
        hasRedirected.current = true;
        return;
      }
      
      // If user has an active subscription, they can access the dashboard
      if (subscriptionStatus?.status === 'active') {
        console.log('Active subscription detected, user can access dashboard');
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
    }
  }, [currentUser, subscriptionStatus, isLoading, navigate, location.pathname, isFromPayment]);
  
  return null;
}

// Main Dashboard Component
function Dashboard() {
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
    
    // If user is trying to access /dashboard/pricing directly but has an active subscription
    // we will let the route component (DashboardPricing) handle this instead of redirecting here
  }, [location.search, location.pathname, refreshSubscriptionStatus, navigate]);
  
  return (
    <Outlet />
  );
}

// Add LoadingProvider component
const LoadingContext = React.createContext({
  setLoading: () => {},
  isLoading: false
});

function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      setTimeout(() => {
        setIsLoading(false);
        loader.classList.add('loader-hidden');
        setTimeout(() => {
          loader.style.display = 'none';
        }, 300);
      }, 500);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
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
  const { currentUser } = useAuth();
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
    if (currentUser && subscriptionStatus?.status === 'active') {
      // Start the tutorial for new users after a short delay
      // to ensure the UI is fully loaded
      setTimeout(() => {
        checkAndStartTutorial();
      }, 1000);
    }
  }, [currentUser, checkAndStartTutorial, subscriptionStatus?.status]);

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
      // Check if a card with this serial number already exists in any collection
      const allCards = Object.values(collections)
        .filter(Array.isArray)  // Filter out non-array values
        .flat()
        .filter(Boolean);  // Filter out null/undefined values
      
      const existingCard = allCards.find(card => 
        card.slabSerial && card.slabSerial.toLowerCase() === cardData.slabSerial.toLowerCase()
      );
      
      if (existingCard) {
        throw new Error('Card already exists in the database');
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

  const handleImportData = useCallback(async (file) => {
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
        
        // Apply updates across all collections
        const { collections: updatedCollections, stats } = 
          processMultipleCollectionsUpdate(parsedData, allCollections, exchangeRate);
        
        // Save to database
        await db.saveCollections(updatedCollections);
        
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
        toast.success(`Updated ${stats.updatedCards} cards across ${Object.keys(stats.collections).length} collections`);
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
        
        // Apply updates across all collections
        const { collections: updatedCollections, stats } = 
          processMultipleCollectionsUpdate(parsedData, allCollections, exchangeRate);
        
        // Save to database
        await db.saveCollections(updatedCollections);
        
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
        toast.success(`Updated ${stats.updatedCards} cards across ${Object.keys(stats.collections).length} collections`);
      } else {
        // Single file or base data import - existing logic
        // Calculate current total profit before update
        const currentCards = collections[selectedCollection] || [];
        const previousProfit = currentCards.reduce((total, card) => {
          const currentValue = parseFloat(card.currentValueAUD) || 0;
          const purchasePrice = parseFloat(card.investmentAUD) || 0;
          return total + (currentValue - purchasePrice);
        }, 0);

        const { parseCSVFile, validateCSVStructure, processImportedData } = await import('./utils/dataProcessor');
        
        // Parse the CSV file
        const parsedData = await parseCSVFile(file);
        // Validate the structure
        const validation = validateCSVStructure(parsedData, importMode);
        if (!validation.success) {
          throw new Error(validation.error);
        }
        
        const processedData = await processImportedData(parsedData, currentCards, exchangeRate, importMode);
        
        // Update collections with new data
        const updatedCollections = {
          ...collections,
          [selectedCollection]: processedData
        };
        
        // Save to database to persist changes
        await db.saveCollections(updatedCollections);
        
        // Update state
        setCollections(updatedCollections);

        // Calculate new profit after update
        const newProfit = processedData.reduce((total, card) => {
          const currentValue = parseFloat(card.currentValueAUD) || 0;
          const purchasePrice = parseFloat(card.investmentAUD) || 0;
          return total + (currentValue - purchasePrice);
        }, 0);

        // Show the profit change modal
        setProfitChangeData({
          oldProfit: previousProfit,
          newProfit: newProfit
        });
        setShowProfitChangeModal(true);

        // Show success message
        toast.success('Prices updated successfully');
      }
      setImportModalOpen(false);
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Error updating prices: ' + error.message);
      setImportModalOpen(false);
    }
  }, [importMode, selectedCollection, collections, exchangeRate, calculateTotalProfit]);

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
        
        // Get sold cards data from IndexedDB
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
    // Record start time for minimum loading duration
    const startTime = Date.now();
    
    try {
      if (file.name.endsWith('.zip')) {
        // Process ZIP file
        const zip = new JSZip();
        
        // Update progress
        const updateProgress = (message, percent) => {
          const statusEl = document.getElementById('import-status');
          const progressEl = document.getElementById('import-progress');
          
          if (statusEl) statusEl.textContent = message;
          if (progressEl) progressEl.style.width = `${percent}%`;
        };
        
        updateProgress('Reading ZIP file... (Step 1 of 4)', 10);
        const zipContent = await zip.loadAsync(file);
        
        // Check if collections.json exists in data/collections.json (new format)
        // or directly in the root (old format)
        updateProgress('Loading collection data... (Step 2 of 4)', 25);
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
        if (!collectionsData.collections) {
          throw new Error("Invalid backup format: missing collections property");
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
                  const content = await file.async("blob");
                  await db.saveImage(serialNumber, content);
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
        
        // Save collections data
        updateProgress('Saving data... (Step 4 of 4)', 75);
        await db.saveCollections(collectionsData.collections);
        
        // Save profile data if it exists
        if (collectionsData.profile) {
          await db.saveProfile(collectionsData.profile);
        }
        
        // Save sold cards data if it exists
        if (collectionsData.soldCards) {
          await db.saveSoldCards(collectionsData.soldCards);
        }
        
        // Refresh collections
        const savedCollections = await db.getCollections();
        setCollections(savedCollections);
        
        // Switch to "All Cards" view after successful import
        setSelectedCollection('All Cards');
        localStorage.setItem('selectedCollection', 'All Cards');
        
        // Update progress to 100%
        updateProgress('Import completed successfully!', 100);
        
        // Remove loading overlay
        document.body.removeChild(loadingEl);
        
        // Show success toast
        toast.success('Backup imported successfully!');
        
        // Close settings modal
        setShowSettings(false);
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
            await db.saveCollections(newCollections);
            
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
        deleteCard(cardId);
      });
    } catch (error) {
      console.error('Error deleting cards:', error);
      toast.error('Failed to delete cards');
    }
  }, [deleteCard]);

  const handleSettingsClick = () => {
    // For mobile, treat settings as a view
    if (isMobile) {
      setCurrentView('settings');
    }
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    // If we're on mobile and current view is settings,
    // go back to cards view when closing settings
    if (isMobile && currentView === 'settings') {
      setCurrentView('cards');
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#111827] dashboard-page">
      {/* Hide Header on mobile when in settings view */}
      {!(isMobile && currentView === 'settings') && (
        <Header
          className="header"
          selectedCollection={selectedCollection}
          collections={Object.keys(collections)}
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
              const newCollections = {
                ...collections
              };
              // Copy cards to the new collection
              newCollections[newName] = [...(collections[oldName] || [])];
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
              await db.saveCollections(currentCollections);
              console.log("Successfully saved updated collections to DB");
              
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20">
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
          />
        ) : currentView === 'settings' && isMobile ? (
          // The SettingsModal component will handle rendering for mobile view
          null
        ) : (
          <SoldItems />
        )}
      </main>

      {showNewCardForm && (
        <NewCardForm
          onSubmit={(cardData, imageFile, targetCollection) => handleAddCard(cardData, imageFile, targetCollection)}
          onClose={() => setShowNewCardForm(false)}
          exchangeRate={exchangeRate}
          collections={collections}
          selectedCollection={selectedCollection}
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
          isOpen={showSettings}
          onClose={handleCloseSettings}
          selectedCollection={selectedCollection}
          collections={Object.keys(collections)}
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
              await db.saveCollections(currentCollections);
              console.log("Successfully saved updated collections to DB");
              
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
        >
          {/* Cloud Sync Section */}
          <div className={`${isMobile ? 'bg-white dark:bg-[#1B2131] p-4 rounded-lg shadow-sm' : ''}`}>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Cloud Backup</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Sync your collection to the cloud so you can access it on any device
            </p>
            <CloudSync onExportData={handleExportData} onImportCollection={handleImportCollection} />
          </div>
        </SettingsModal>
      )}

      {/* Profit Change Modal */}
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

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className="sm:hidden bottom-nav-container">
        <BottomNavBar 
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            // If switching to settings view, show settings modal
            if (view === 'settings') {
              setShowSettings(true);
            }
            // If switching to a view other than settings, hide settings modal
            else if (showSettings) {
              setShowSettings(false);
            }
          }}
          onAddCard={() => setShowNewCardForm(true)}
          onSettingsClick={handleSettingsClick}
        />
      </div>

      <TutorialModal />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LoadingProvider>
        <AuthProvider>
          <ThemeProvider>
            <SubscriptionProvider>
              <TutorialProvider>
                <Router basename={process.env.PUBLIC_URL}>
                  <Toaster
                    position="top-center"
                    toastOptions={{
                      duration: 3000,
                      className: 'notification-toast',
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
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route 
                      path="/login" 
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/forgot-password" 
                      element={
                        <PublicRoute>
                          <ForgotPassword />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/pricing" 
                      element={<Pricing />} 
                    />
                    
                    {/* Dashboard routes with nested routes using Outlet */}
                    <Route 
                      path="/dashboard"
                      element={
                        <PrivateRoute>
                          <Dashboard />
                        </PrivateRoute>
                      }
                    >
                      <Route 
                        index
                        element={
                          <>
                            <NewUserRoute />
                            <AppContent />
                          </>
                        }
                      />
                      <Route 
                        path="pricing" 
                        element={<DashboardPricing />} 
                      />
                    </Route>
                    
                    {/* Premium-only route example */}
                    <Route
                      path="/premium/*"
                      element={
                        <PrivateRoute requireSubscription={true}>
                          <div className="min-h-screen bg-gray-100 dark:bg-[#111827] p-8">
                            <div className="max-w-4xl mx-auto bg-white dark:bg-[#1B2131] rounded-lg shadow-lg p-6">
                              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Premium Features
                              </h1>
                              <p className="text-gray-700 dark:text-gray-300 mb-6">
                                This is a premium-only section. You have access because you're a premium subscriber!
                              </p>
                              <div className="flex justify-center">
                                <Link to="/dashboard" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                                  Back to Dashboard
                                </Link>
                              </div>
                            </div>
                          </div>
                        </PrivateRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Router>
              </TutorialProvider>
            </SubscriptionProvider>
          </ThemeProvider>
        </AuthProvider>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

export default App;