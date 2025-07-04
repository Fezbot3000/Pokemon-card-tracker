import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate, 
  useLocation, 
  Link, 
  useNavigate,
  Outlet,
  useOutletContext
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { 
  Header, 
  useTheme, 
  useAuth,
  SettingsModal, 
  Icon,
  RestoreProvider, useRestore,
  BackupProvider, useBackup,
  BackupProgressBar,
  toastService // Import toastService
} from './design-system';
import DesignSystemProvider from './design-system/providers/DesignSystemProvider';
import MobileSettingsModal from './components/MobileSettingsModal'; 
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import AddCardModal from './components/AddCardModal'; 
import ProfitChangeModal from './components/ProfitChangeModal';
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import useCardData from './hooks/useCardData';
import db from './services/firestore/dbAdapter';
import { TutorialProvider, useTutorial } from './contexts/TutorialContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'; // Added import
import InvoiceProvider from './contexts/InvoiceContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';
import './styles/black-background.css'; 
 
import SoldItems from './components/SoldItems/SoldItems';
import PurchaseInvoices from './components/PurchaseInvoices/PurchaseInvoices';
import Marketplace from './components/Marketplace/Marketplace';
import MarketplaceSelling from './components/Marketplace/MarketplaceSelling';
import MarketplaceMessages from './components/Marketplace/MarketplaceMessages';
import BottomNavBar from './components/BottomNavBar';
import CloudSync from './components/CloudSync';
import ComponentLibrary from './pages/ComponentLibrary';
import TrialStatusBanner from './components/TrialStatusBanner';

import logger from './utils/logger'; // Import the logger utility
import RestoreListener from './components/RestoreListener';
import SyncStatusIndicator from './components/SyncStatusIndicator'; // Import the SyncStatusIndicator
import featureFlags from './utils/featureFlags'; // Import feature flags
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { db as firestoreDb, storage } from './services/firebase';
import TutorialModal from './components/TutorialModal'; // Add back this import
import { settingsManager } from './utils/settingsManager'; // Import settings manager
import { dataResetManager } from './utils/dataResetManager'; // Import data reset manager
import { useCardModals } from './hooks/useCardModals'; // Import card modals hook
import { CardRepository } from './repositories/CardRepository';
import { collectionManager } from './utils/collectionManager'; // Import collection manager

// Helper function to generate a unique ID for cards without one
const generateUniqueId = () => {
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 10000);
  return `card_${timestamp}_${randomPart}`;
};

// NewUserRoute to redirect new users to dashboard
function NewUserRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  
  useEffect(() => {
    // Avoid multiple redirects
    if (hasRedirected.current) return;
    
    // Only proceed if we have a user
    if (!user) return;
    
    // Clear any new user flags and redirect to dashboard
    localStorage.removeItem('isNewUser');
    hasRedirected.current = true;
    navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Setting up your account...</p>
      </div>
    </div>
  );
}

// Main Dashboard Component
function Dashboard() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState('cards');

  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black dashboard-page">
        {/* Keep actual Header during loading */}
        <Header
          className="header"
          selectedCollection="All Cards"
          collections={{}}
          onCollectionChange={() => {}}
          onSettingsClick={() => {}}
          currentView="cards"
          onViewChange={() => {}}
          onAddCollection={() => {}}
        />
        
        <main className="main-content mobile-dashboard max-w-[1920px] mx-auto">
          <div className="p-4 sm:p-6 pb-20">
            <div className="w-full px-1 sm:px-2 pb-20">
              {/* Statistics Summary Skeleton */}
              <div className="w-full bg-white dark:bg-[#111] rounded-md border border-[#ffffff33] dark:border-[#ffffff1a] mb-3 sm:mb-4">
                <div className="rounded-md p-2 sm:p-4 md:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0">
                    {[
                      { label: 'CARDS', width: 'w-8' },
                      { label: 'PAID', width: 'w-16' },
                      { label: 'VALUE', width: 'w-16' },
                      { label: 'PROFIT', width: 'w-12' }
                    ].map((stat, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 py-3 sm:py-4 md:py-6 border-none"
                      >
                        <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
                          {stat.label}
                        </div>
                        <div className={`h-6 ${stat.width} bg-gray-200 dark:bg-[#333] rounded animate-pulse`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Search toolbar skeleton */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-[#111] p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-[#333]">
                  <div className="flex-1 min-w-0">
                    <div className="w-full h-10 bg-gray-200 dark:bg-[#333] rounded-lg animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-20 h-10 bg-gray-200 dark:bg-[#333] rounded-lg animate-pulse"></div>
                    <div className="w-24 h-10 bg-gray-200 dark:bg-[#333] rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Card grid skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#333] overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#444]"></div>
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-[#333] rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 dark:bg-[#333] rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-[#333] rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Render the dashboard content if authenticated
  return (
    <div className="relative">
      <Outlet context={{ currentView, setCurrentView }} />
      
      {/* Mobile Bottom Navigation - Available across all dashboard routes */}
      {!location.pathname.includes('/pricing') && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <BottomNavBar
            currentView={location.pathname.includes('/settings') ? 'settings' : currentView}
            onViewChange={(view) => {
              try {
                if (view === 'settings') {
                  navigate('/dashboard/settings');
                } else {
                  // If we're on settings page, navigate back to dashboard with the desired view
                  if (location.pathname.includes('/settings')) {
                    navigate('/dashboard', { state: { targetView: view } });
                  } else {
                    // Add a small delay to ensure state updates happen correctly
                    setTimeout(() => {
                      setCurrentView(view);
                    }, 0);
                  }
                }
              } catch (error) {
                // Fallback: try direct view change
                setCurrentView(view);
              }
            }}
            onSettingsClick={() => {
              navigate('/dashboard/settings');
            }}
          />
        </div>
      )}
    </div>
  );
}

// Wrapper for dashboard index route (AppContent)
function DashboardIndex() {
  const { currentView, setCurrentView } = useOutletContext();
  const location = useLocation();
  
  // Handle navigation state from settings page
  useEffect(() => {
    try {
      if (location.state?.targetView) {
        // Add a small delay to ensure state updates happen correctly
        setTimeout(() => {
          setCurrentView(location.state.targetView);
        }, 0);
        // Clear the state to prevent repeated navigation
        window.history.replaceState({}, '', location.pathname);
      }
    } catch (error) {
      // Fallback: just clear the state
      if (location.state?.targetView) {
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [location.state, setCurrentView]);
  
  return <>
    <AppContent currentView={currentView} setCurrentView={setCurrentView} />
  </>;
}

function AppContent({ currentView, setCurrentView }) {
  // Simple test to see if this code runs at all
  if (typeof window !== 'undefined') {
    window.testLog = 'AppContent is running!';
  }
  
  
  
  // Use card modals hook
  const {
    showNewCardForm,
    selectedCard,
    initialCardCollection,
    openNewCardForm,
    closeNewCardForm,
    openCardDetails,
    closeCardDetails,
    setShowNewCardForm,
    setSelectedCard,
    setInitialCardCollection
  } = useCardModals();

  const [showSettings, setShowSettings] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [profitChangeData, setProfitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0
  });
  const [selectedCollection, setSelectedCollection] = useState('All Cards');
  const [collections, setCollections] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { registerAddCardCallback, checkAndStartTutorial, startTutorial } = useTutorial();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    cards,
    loading,
    error,
    exchangeRate,
    selectCard,
    clearSelectedCard,
    updateCard,
    deleteCard,
    addCard
  } = useCardData();

  const handleCloseDetailsModal = () => {
    closeCardDetails();
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
      // Silently handle card update errors 
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

  // Register the add card callback when component mounts
  // Using a ref to ensure we only register the callback once
  const callbackRegistered = useRef(false);
  
  useEffect(() => {
    if (!callbackRegistered.current) {
      registerAddCardCallback(() => setShowNewCardForm(true));
      callbackRegistered.current = true;
    }
  }, [registerAddCardCallback]);

  // Check if this is a new user and start the tutorial
  useEffect(() => {
    if (user) {
      // Start the tutorial for new users after a short delay
      // to ensure the UI is fully loaded
      setTimeout(() => {
        checkAndStartTutorial();
      }, 1000);
    }
  }, [user, checkAndStartTutorial]);

  // Check if device is mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update currentView based on location changes
  useEffect(() => {
    try {
      const path = location.pathname;
      
      // Extract the view from the path
      if (path.includes('/purchase-invoices')) {
        setCurrentView('purchase-invoices');
      } else if (path.includes('/sold-items')) {
        setCurrentView('sold-items');
      } else if (path.includes('/sold')) {
        setCurrentView('sold');
      } else if (path.includes('/marketplace')) {
        setCurrentView('marketplace');
      } else if (path.includes('/marketplace-selling')) {
        setCurrentView('marketplace-selling');
      } else if (path.includes('/marketplace-messages')) {
        setCurrentView('marketplace-messages');
      } else if (path.includes('/settings')) {
        setCurrentView('settings');
      } else if (path === '/dashboard') {
        // Check if there's a target view from navigation state first
        if (location.state?.targetView) {
          setCurrentView(location.state.targetView);
        } else if (!currentView || currentView === 'settings') {
          // Only default to cards if we don't have a current view or coming from settings
          setCurrentView('cards');
        }
        // If currentView is already set to a valid dashboard view, preserve it
      }
    } catch (error) {
      // Fallback: only set to cards if we don't have a current view
      if (!currentView) {
        setCurrentView('cards');
      }
    }
  }, [location.pathname, location.state?.targetView, setCurrentView]);

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
  }, [showNewCardForm, selectedCard, showSettings, showProfitModal]);

  // Calculate total profit for a collection
  const calculateTotalProfit = useCallback((cards) => {
    return cards.reduce((total, card) => {
      const currentValue = parseFloat(card.currentValueAUD) || 0;
      const purchasePrice = parseFloat(card.investmentAUD) || 0;
      return total + (currentValue - purchasePrice);
    }, 0);
  }, []);

  const handleCollectionChange = useCallback((collection) => {
    setSelectedCollection(collection);
    clearSelectedCard();
    localStorage.setItem('selectedCollection', collection);
  }, [clearSelectedCard]);

  // Load collections from IndexedDB on mount
  useEffect(() => {
    const initializeDatabaseAndLoadCollections = async () => {
      try {
        // Loading state is now managed by useCardData hook
        
        // Use a silent initialization approach for first login
        try {
          logger.debug('Initializing database on app startup');
          
          // Instead of forcing a reset immediately, first try to open the database normally
          await db.silentInitialize();
                } catch (initError) {
        logger.warn('Silent initialization failed, will try normal operations', initError);
          // Continue anyway - we'll try to recover with normal operations
        }
        
        // Attempt to load collections from IndexedDB
        const savedCollections = await db.getCollections().catch(error => {
          logger.warn('Failed to load collections, using default collection');
          return { 'Default Collection': [] };
        });
        
        // Get saved collection from localStorage
        const savedSelectedCollection = localStorage.getItem('selectedCollection');

        if (Object.keys(savedCollections).length > 0) {
          setCollections(savedCollections);
          
          // Always default to 'All Cards' when the app loads, regardless of what's in localStorage
          setSelectedCollection('All Cards');
          localStorage.setItem('selectedCollection', 'All Cards');

        } else {
          // No collections found in DB at all

          const defaultCollections = { 'Default Collection': [] };
          setCollections(defaultCollections);
          
          // Even with a new default collection, we want to start with All Cards view
          setSelectedCollection('All Cards');
          localStorage.setItem('selectedCollection', 'All Cards');
        }
      } catch (error) {
        logger.warn('Error during initialization, using default collections');
        
        // Set default collections as fallback
        const defaultCollections = { 'Default Collection': [] };
        setCollections(defaultCollections);
        setSelectedCollection('Default Collection');
      } finally {
        // Loading state is now managed by useCardData hook
      }
    };

    initializeDatabaseAndLoadCollections();
  }, []);

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
    settingsManager.openSettings(isMobile, setCurrentView, setShowSettings, navigate);
  };

  const handleCloseSettings = () => {
    settingsManager.closeSettings(isMobile, currentView, setCurrentView, setShowSettings);
  };

  const handleNewCollectionCreation = useCallback(async (newCollectionName) => {
    await collectionManager.createCollection(newCollectionName, {
      collections,
      setCollections,
      setSelectedCollection
    });
  }, [collections, setCollections, setSelectedCollection]);

  // Removed export functionality
  // Removed import functionality

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-black dashboard-page">
        {/* Keep actual Header during loading */}
        <Header
          className="header"
          selectedCollection="All Cards"
          collections={{}}
          onCollectionChange={() => {}}
          onSettingsClick={() => {}}
          currentView="cards"
          onViewChange={() => {}}
          onAddCollection={() => {}}
        />
        
        <main className="main-content mobile-dashboard max-w-[1920px] mx-auto">
          <div className="p-4 sm:p-6 pb-20">
            <div className="w-full px-1 sm:px-2 pb-20">
              {/* Statistics Summary Skeleton */}
              <div className="w-full bg-white dark:bg-[#111] rounded-md border border-[#ffffff33] dark:border-[#ffffff1a] mb-3 sm:mb-4">
                <div className="rounded-md p-2 sm:p-4 md:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0">
                    {[
                      { label: 'CARDS', width: 'w-8' },
                      { label: 'PAID', width: 'w-16' },
                      { label: 'VALUE', width: 'w-16' },
                      { label: 'PROFIT', width: 'w-12' }
                    ].map((stat, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 py-3 sm:py-4 md:py-6 border-none"
                      >
                        <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
                          {stat.label}
                        </div>
                        <div className={`h-6 ${stat.width} bg-gray-200 dark:bg-[#333] rounded animate-pulse`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Search toolbar skeleton */}
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-[#111] p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-[#333]">
                  <div className="flex-1 min-w-0">
                    <div className="w-full h-10 bg-gray-200 dark:bg-[#333] rounded-lg animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-20 h-10 bg-gray-200 dark:bg-[#333] rounded-lg animate-pulse"></div>
                    <div className="w-24 h-10 bg-gray-200 dark:bg-[#333] rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Card grid skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#333] overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#444]"></div>
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-[#333] rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 dark:bg-[#333] rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-[#333] rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black dashboard-page">
      {/* Hide Header on mobile when in settings or cards view */}
      {!(isMobile && (currentView === 'settings' || currentView === 'cards')) && (
        <Header
          className="header"
          selectedCollection={selectedCollection}
          collections={collections} 
          onCollectionChange={setSelectedCollection}
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
            collectionManager.renameCollection(oldName, newName, {
              collections,
              setCollections,
              selectedCollection,
              setSelectedCollection,
              user
            });
          }}
          onDeleteCollection={async (name) => {
            await collectionManager.deleteCollection(name, {
              collections,
              user,
              selectedCollection,
              setCollections,
              setSelectedCollection
            });
          }}
          userData={user}
          onSignOut={logout}
        />
      )}
      
      <main className="main-content mobile-dashboard max-w-[1920px] mx-auto mt-4">
        {/* Settings Modal - Available for all views */}
        {showSettings && !isMobile && (
          <SettingsModal
            isOpen={showSettings}
            onClose={handleCloseSettings}
            selectedCollection={selectedCollection}
            collections={collections}
            onStartTutorial={startTutorial}
            onSignOut={logout}
            onRenameCollection={(oldName, newName) => {
              collectionManager.renameCollection(oldName, newName, {
                collections,
                setCollections,
                selectedCollection,
                setSelectedCollection,
                user
              });
            }}
            onDeleteCollection={async (name) => {
              await collectionManager.deleteCollection(name, {
                collections,
                user,
                selectedCollection,
                setCollections,
                setSelectedCollection
              });
            }}
          />
        )}

        {currentView === 'cards' ? (
          <div className="flex-1 overflow-y-auto">
            {/* Main content */}
            <div className="p-4 sm:p-6 pb-20">

              {/* Trial Status Banner - now in correct place */}
              <TrialStatusBanner />

              {/* Card List */}
              {loading ? (
                <div className="w-full px-1 sm:px-2 pb-20">
                  {/* Skeleton Statistics Summary */}
                  <div className="w-full bg-white dark:bg-[#111] rounded-md border border-[#ffffff33] dark:border-[#ffffff1a] mb-3 sm:mb-4">
                    <div className="rounded-md p-2 sm:p-4 md:p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0">
                        {[
                          { label: 'CARDS', width: 'w-8' },
                          { label: 'PAID', width: 'w-16' },
                          { label: 'VALUE', width: 'w-16' },
                          { label: 'PROFIT', width: 'w-12' }
                        ].map((stat, index) => (
                          <div
                            key={index}
                            className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 py-3 sm:py-4 md:py-6 border-none"
                          >
                            <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2 uppercase">
                              {stat.label}
                            </div>
                            <div className={`h-6 ${stat.width} bg-gray-200 dark:bg-[#333] rounded animate-pulse`}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Search Toolbar - Keep functional */}
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-white dark:bg-[#111] p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-[#333]">
                      {/* Search Input */}
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">search</span>
                          <input
                            type="text"
                            placeholder="Search cards..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled
                          />
                        </div>
                      </div>
                      
                      {/* View Mode and Sort Controls */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                          <button className="p-2 rounded-md bg-blue-600 text-white" disabled>
                            <span className="material-icons text-lg">grid_view</span>
                          </button>
                          <button className="p-2 rounded-md text-gray-600 dark:text-gray-400" disabled>
                            <span className="material-icons text-lg">view_list</span>
                          </button>
                        </div>
                        
                        {/* Add Card Button */}
                        <button
                          onClick={() => openNewCardForm()}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                          <span className="material-icons text-lg mr-2">add</span>
                          <span className="hidden sm:inline">Add Card</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Collection Selector Skeleton */}
                  <div className="mb-2">
                    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-200 dark:bg-[#333] rounded animate-pulse"></div>
                          <div className="w-32 h-4 bg-gray-200 dark:bg-[#333] rounded animate-pulse"></div>
                        </div>
                        <div className="w-4 h-4 bg-gray-200 dark:bg-[#333] rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Skeleton Card Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1 sm:gap-2">
                    {Array.from({ length: 14 }, (_, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-[#333] overflow-hidden animate-pulse"
                      >
                        {/* Card Image Skeleton */}
                        <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#444] relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"></div>
                        </div>
                        
                        {/* Card Content Skeleton */}
                        <div className="p-2 space-y-2">
                          {/* Title */}
                          <div className="h-3 bg-gray-200 dark:bg-[#333] rounded w-3/4"></div>
                          
                          {/* Subtitle */}
                          <div className="h-2 bg-gray-200 dark:bg-[#333] rounded w-1/2"></div>
                          
                          {/* Price */}
                          <div className="h-4 bg-gray-200 dark:bg-[#333] rounded w-2/3"></div>
                          
                          {/* Grade */}
                          <div className="flex justify-between items-center">
                            <div className="h-3 bg-gray-200 dark:bg-[#333] rounded w-1/3"></div>
                            <div className="w-6 h-6 bg-gray-200 dark:bg-[#333] rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <span className="material-icons text-6xl mb-4 text-gray-400 dark:text-gray-600">inventory_2</span>
                  <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">No cards in your collection</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                    Start building your Pokemon card collection by adding your first card!
                  </p>
                  <button
                    onClick={() => openNewCardForm()}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <span className="material-icons text-lg mr-2">add</span>
                    Add Your First Card
                  </button>
                </div>
              ) : (
                <CardList
                  cards={cards} 
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
                    openCardDetails(card, actualCollectionName);
                  }}
                  onDeleteCard={deleteCard}
                  onUpdateCard={updateCard}
                  onAddCard={() => openNewCardForm()}
                  selectedCollection={selectedCollection}
                  collections={collections}
                  setCollections={setCollections}
                  onCollectionChange={(collection) => {
                    setSelectedCollection(collection);
                    localStorage.setItem('selectedCollection', collection);
                  }}
                  onSelectionChange={setSelectedCards}
                />
              )}
              
              {/* Floating Add Button - Mobile Only */}
              {!selectedCards.size && (
                <button
                  onClick={() => openNewCardForm()}
                  className="sm:hidden fixed right-4 z-50 w-14 h-14 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full shadow-lg border-2 border-white dark:border-gray-800 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    bottom: 'calc(4rem + 8px)'
                  }}
                  aria-label="Add new card"
                >
                  <span className="material-icons text-2xl font-bold">add</span>
                </button>
              )}
            </div>
          </div>
        ) : currentView === 'purchase-invoices' || currentView === 'sold' ? (
          <PurchaseInvoices />
        ) : currentView === 'marketplace' ? (
          <Marketplace currentView={currentView} onViewChange={setCurrentView} />
        ) : currentView === 'marketplace-selling' ? (
          <MarketplaceSelling currentView={currentView} onViewChange={setCurrentView} />
        ) : currentView === 'marketplace-messages' ? (
          <MarketplaceMessages currentView={currentView} onViewChange={setCurrentView} />
        ) : currentView === 'sold-items' ? (
          <SoldItems />
        ) : currentView === 'settings' && isMobile ? (
          <MobileSettingsModal
            isOpen={showSettings}
            onClose={handleCloseSettings}
            selectedCollection={selectedCollection}
            collections={collections} 
            onStartTutorial={startTutorial} 
            onRenameCollection={(oldName, newName) => {
              collectionManager.renameCollection(oldName, newName, {
                collections,
                setCollections,
                selectedCollection,
                setSelectedCollection,
                user
              });
            }}
            onDeleteCollection={async (name) => {
              await collectionManager.deleteCollection(name, {
                collections,
                user,
                selectedCollection,
                setCollections,
                setSelectedCollection
              });
            }}
            userData={user}
            onSignOut={logout}
          />
        ) : null}
      </main>

      {showNewCardForm && (
        <AddCardModal
          isOpen={showNewCardForm}
          onClose={() => closeNewCardForm()}
          onSave={(cardData, imageFile, targetCollection) => addCard(cardData, imageFile)}
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

      {showProfitModal && (
        <ProfitChangeModal
          isOpen={showProfitModal}
          onClose={() => setShowProfitModal(false)}
          profitChangeData={{
            previousProfit: profitChangeData.oldProfit,
            newProfit: profitChangeData.newProfit
          }}
        />
      )}

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

// Export Dashboard and DashboardIndex for router
export { Dashboard, DashboardIndex };

export default Dashboard;
