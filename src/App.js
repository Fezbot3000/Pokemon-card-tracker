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
import { HelmetProvider } from 'react-helmet-async';
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
import AddCardModal from './components/AddCardModal'; 
import ProfitChangeModal from './components/ProfitChangeModal';
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/Pricing';
import useCardData from './hooks/useCardData';
import db from './services/firestore/dbAdapter';
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
import Marketplace from './components/Marketplace/Marketplace';
import MarketplaceSelling from './components/Marketplace/MarketplaceSelling';
import MarketplaceMessages from './components/Marketplace/MarketplaceMessages';
import BottomNavBar from './components/BottomNavBar';
import CloudSync from './components/CloudSync';
import DashboardPricing from './components/DashboardPricing';
import ComponentLibrary from './pages/ComponentLibrary';
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
  const [profitChangeData, setProfitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0
  });
  const [selectedCollection, setSelectedCollection] = useState('All Cards');
  const [collections, setCollections] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('cards');
  const { registerSettingsCallback, checkAndStartTutorial, startTutorial } = useTutorial();
  const { user, logout } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();
  
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
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update currentView based on location changes
  useEffect(() => {
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
    } else if (path.includes('/settings')) {
      setCurrentView('settings');
    } else {
      // Default to cards view
      setCurrentView('cards');
    }
  }, [location.pathname]);

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
    settingsManager.openSettings(isMobile, setCurrentView, setShowSettings);
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
              setSelectedCollection
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
      
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20">
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
                setSelectedCollection
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
            <div className={`${selectedCard ? 'hidden lg:block' : ''}`}>
              {/* Show cards when settings is not selected */}
              {!showSettings ? (
                <>
                  {/* Card List */}
                  {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <h2 className="text-lg font-bold mb-4">No cards found</h2>
                      <p className="text-gray-500">You don't have any cards in this collection.</p>
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
                    />
                  )}
                </>
              ) : (
                <></>
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
                setSelectedCollection
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
        ) : currentView === 'sold-items' ? (
          <SoldItems />
        ) : (
          <PurchaseInvoices />
        )}
      </main>

      {showNewCardForm && (
        <AddCardModal
          isOpen={showNewCardForm}
          onClose={() => closeNewCardForm()}
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

      {/* Mobile Bottom Navigation */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${selectedCard ? 'bottom-nav-hidden' : ''}`}
      >
        <BottomNavBar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            if (view !== 'settings' && showSettings) {
              setShowSettings(false);
            }
            if (view === 'settings' && !showSettings) {
              setShowSettings(true);
            }
          }}
          onSettingsClick={handleSettingsClick}
          isModalOpen={selectedCard !== null || showNewCardForm}
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

// Export Dashboard and DashboardIndex for router
export { Dashboard, DashboardIndex };

export default Dashboard;