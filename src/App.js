import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';

import {
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
  useOutletContext,
} from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header, useAuth, toastService } from './design-system';

// Removed inline modal/view imports after refactor
import useCardsSource from './hooks/useCardsSource';
import db from './services/firestore/dbAdapter';
import { useTutorial } from './contexts/TutorialContext';
import LoggingService from './services/LoggingService';
import './styles/globals.css';
import './styles/utilities.css';

// Views are now imported inside DashboardViewRouter
// import Settings from './components/Settings';
import BottomNavBar from './components/BottomNavBar';
import TrialStatusBanner from './components/TrialStatusBanner';

import logger from './utils/logger';
import SyncStatusIndicator from './components/SyncStatusIndicator';

import TutorialModal from './components/TutorialModal';
import { settingsManager } from './utils/settingsManager';
import { useCardModals } from './hooks/useCardModals';
import { collectionManager } from './utils/collectionManager';
import DashboardViewRouter from './dashboard/containers/DashboardViewRouter';
import DashboardModals from './dashboard/containers/DashboardModals';

// LoggingService already filters external noise and manages console output.

// Main Dashboard Component
function Dashboard() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState(() => {
    // Initialize from localStorage if available, otherwise default to 'cards'
    const saved = localStorage.getItem('currentView');
    return saved || 'cards';
  });

  // Create a wrapper function that updates both state and localStorage
  const updateCurrentView = (newView) => {
    setCurrentView(newView);
    localStorage.setItem('currentView', newView);
  };
  
  // Get data loading state to combine with auth loading (only if authenticated)
  const { loading: dataLoading } = useCardsSource();

  // Debug tool will be rendered in AppContent with proper selectedCollection prop

  // Show simple loading indicator while auth is loading
  if (authLoading) {
    return (
      <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
        {/* Keep actual Header during loading */}
        <Header
          className="header"
          selectedCollection="All Cards"
          collections={{}}
          onCollectionChange={() => {}}
          onSettingsClick={() => {}}
          currentView={currentView}
          onViewChange={() => {}}
          onAddCollection={() => {}}
        />

        <main className={`main-content mobile-dashboard mx-auto max-w-[1920px] ${window.innerWidth <= 768 ? 'no-header' : 'mt-4'}`}>
          <div className="flex-1 overflow-y-auto">
            <div className={`pb-20 sm:p-6 ${window.innerWidth <= 768 ? 'px-2 pt-2' : 'p-4'}`}>
              <div className="w-full px-1 pb-20 sm:px-2">
                {/* Simple loading spinner */}
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Add BottomNavBar to loading state */}
        <BottomNavBar 
          currentView={currentView}
          onViewChange={updateCurrentView}
          onSettingsClick={() => updateCurrentView('settings')}
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show simple loading indicator for data loading (only after auth is confirmed)
  if (dataLoading) {
    return (
      <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
        {/* Keep actual Header during loading */}
        <Header
          className="header"
          selectedCollection="All Cards"
          collections={{}}
          onCollectionChange={() => {}}
          onSettingsClick={() => {}}
          currentView={currentView}
          onViewChange={() => {}}
          onAddCollection={() => {}}
        />

        <main className={`main-content mobile-dashboard mx-auto max-w-[1920px] ${window.innerWidth <= 768 ? 'no-header' : 'mt-4'}`}>
          <div className="flex-1 overflow-y-auto">
            <div className={`pb-20 sm:p-6 ${window.innerWidth <= 768 ? 'px-2 pt-2' : 'p-4'}`}>
              <div className="w-full px-1 pb-20 sm:px-2">
                {/* Simple loading spinner */}
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Add BottomNavBar to loading state */}
        <BottomNavBar 
          currentView={currentView}
          onViewChange={updateCurrentView}
          onSettingsClick={() => updateCurrentView('settings')}
        />
      </div>
    );
  }

  // Render the dashboard content if authenticated
  return (
    <div className="relative">
      <Outlet context={{ currentView, setCurrentView }} />

      {/* Mobile Bottom Navigation - Available across all dashboard routes */}
      {!location.pathname.includes('/pricing') && (
        <BottomNavBar
            currentView={
              location.pathname.includes('/settings') ? 'settings' : currentView
            }
            onViewChange={view => {
              try {
                // If we're on settings page, navigate back to dashboard with the desired view
                if (location.pathname.includes('/settings')) {
                  navigate('/dashboard', { state: { targetView: view } });
                } else {
                  // Add a small delay to ensure state updates happen correctly
                  setTimeout(() => {
                    updateCurrentView(view);
                  }, 0);
                }
              } catch (error) {
                // Fallback: try direct view change
                updateCurrentView(view);
              }
            }}
            onSettingsClick={() => {
              updateCurrentView('settings');
            }}
          />
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
  }, [location.state, location.pathname, setCurrentView]);

  return (
    <>
      <AppContent currentView={currentView} setCurrentView={setCurrentView} />
    </>
  );
}

function AppContent({ currentView, setCurrentView }) {


  // INVESTIGATION: Check if ErrorBoundary caused page reload
  useEffect(() => {
    const errorReload = localStorage.getItem('ERROR_BOUNDARY_RELOAD');
    const errorOther = localStorage.getItem('ERROR_BOUNDARY_OTHER');
    
    if (errorReload) {
      const data = JSON.parse(errorReload);
      LoggingService.error('🚨 PAGE RELOADED BY ERROR BOUNDARY!', data);
      localStorage.removeItem('ERROR_BOUNDARY_RELOAD');
    }
    
    if (errorOther) {
      const data = JSON.parse(errorOther);
      LoggingService.warn('🔍 ERROR BOUNDARY CAUGHT ERROR:', data);
      localStorage.removeItem('ERROR_BOUNDARY_OTHER');
    }
  }, []);

  // Debug: verify AppContent mounts (dev only)
  useEffect(() => {
    logger.debug('[AppContent] mounted');
  }, []);

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
  } = useCardModals();

  const [showSettings, setShowSettings] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [profitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0,
  });
  const [selectedCollection, setSelectedCollection] = useState(() => {
    // Initialize from localStorage if available, otherwise default to 'All Cards'
    const saved = localStorage.getItem('selectedCollection');
    return saved || 'All Cards';
  });
  const [collections, setCollections] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { registerAddCardCallback, checkAndStartTutorial, startTutorial, resetTutorial } =
    useTutorial();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Generate dynamic title based on current view
  const getPageTitle = (view) => {
    const titles = {
      'cards': 'Dashboard | MyCardTracker',
      'marketplace': 'Marketplace | MyCardTracker',
      'marketplace-selling': 'Selling | MyCardTracker',
      'marketplace-messages': 'Messages | MyCardTracker',
      'purchase-invoices': 'Invoices | MyCardTracker',
      'sold-items': 'Sold Items | MyCardTracker',
      'settings': 'Settings | MyCardTracker'
    };
    return titles[view] || 'Dashboard | MyCardTracker';
  };

  // PHASE 2C: PRIMARY - Now using compatibility layer (CardContext underneath)
  const {
    cards,
    loading,
    updateCard,
    deleteCard,
    addCard,
  } = useCardsSource();



  const handleCloseDetailsModal = () => {
    closeCardDetails();
  };

  const handleCardUpdate = async (
    cardId,
    updatedData
  ) => {
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
    if (cards && Array.isArray(cards)) {
      // Check if cards data is available and is an array
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
          newCollectionsState[collectionName] =
            groupedByCollection[collectionName];
        });
        // Ensure collections that exist in prevCollections but not in groupedByCollection
        // (like an empty 'Sold' or a newly created empty collection) are preserved
        Object.keys(prevCollections).forEach(collectionName => {
          if (!newCollectionsState[collectionName]) {
            // Only preserve non-Default collections that are empty
            if (collectionName !== 'Default Collection') {
              newCollectionsState[collectionName] =
                prevCollections[collectionName]; // Preserve existing (potentially empty) collections
            }
          }
        });

        return newCollectionsState;
      });
    }
  }, [cards]); // Dependency: Run whenever the cards array from useCardData changes

  // Register the add card callback when component mounts
  // Using a ref to ensure we only register the callback once
  const callbackRegistered = useRef(false);

  useEffect(() => {
    if (!callbackRegistered.current) {
      registerAddCardCallback(() => setShowNewCardForm(true));
      callbackRegistered.current = true;
    }
  }, [registerAddCardCallback, setShowNewCardForm]);

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

  // Update currentView based on URL changes - simplified hybrid approach
  useEffect(() => {
    try {
      const path = location.pathname;
      const pathSegments = path.split('/');
      const viewFromUrl = pathSegments[pathSegments.length - 1];
      
      // Valid dashboard views
      const validViews = ['cards', 'marketplace', 'marketplace-selling', 'marketplace-messages', 'purchase-invoices', 'sold-items', 'settings'];
      
      if (validViews.includes(viewFromUrl)) {
        setCurrentView(viewFromUrl);
      } else if (path === '/dashboard') {
        // Check if there's a target view from navigation state first
        if (location.state?.targetView) {
          setCurrentView(location.state.targetView);
        } else if (!currentView) {
          // Default to cards for fresh dashboard loads
          setCurrentView('cards');
        }
      }
    } catch (error) {
      // Fallback: only set to cards if we don't have a current view
      if (!currentView) {
        setCurrentView('cards');
      }
    }
  }, [location.pathname, location.state?.targetView, setCurrentView, currentView]);

  // Add keyboard shortcut for settings (press 's' key)
  useEffect(() => {
    const handleKeyDown = e => {
      // Check if the event target is an input, textarea, or select element
      const targetTagName = e.target.tagName.toLowerCase();
      if (
        targetTagName === 'input' ||
        targetTagName === 'textarea' ||
        targetTagName === 'select' ||
        e.target.isContentEditable
      ) {
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
          logger.warn(
            'Silent initialization failed, will try normal operations',
            initError
          );
          // Continue anyway - we'll try to recover with normal operations
        }

        // Attempt to load collections from IndexedDB
        const savedCollections = await db.getCollections().catch(() => {
          logger.warn('Failed to load collections, using default collection');
          return { 'Default Collection': [] };
        });

        if (Object.keys(savedCollections).length > 0) {
          setCollections(savedCollections);

          // Validate the initially loaded collection against available collections
          const currentSelection = selectedCollection; // This comes from localStorage initialization
          
          if (currentSelection && 
              (currentSelection === 'All Cards' || savedCollections[currentSelection])) {
            // Current selection is valid, keep it
            logger.debug(`Validated and kept selected collection: ${currentSelection}`);
            // No need to call setSelectedCollection since it's already set correctly
          } else {
            // Current selection is invalid, reset to 'All Cards'
            setSelectedCollection('All Cards');
            localStorage.setItem('selectedCollection', 'All Cards');
            logger.debug(`Invalid collection "${currentSelection}", reset to All Cards`);
          }
        } else {
          // No collections found in DB at all
          const defaultCollections = { 'Default Collection': [] };
          setCollections(defaultCollections);

          // Validate current selection for default collections scenario
          const currentSelection = selectedCollection;
          if (currentSelection === 'Default Collection') {
            // Current selection is correct for this scenario
            logger.debug('Kept Default Collection selection');
          } else {
            // Update to All Cards if not already set correctly
            setSelectedCollection('All Cards');
            localStorage.setItem('selectedCollection', 'All Cards');
            logger.debug('Updated to All Cards for default collections scenario');
          }
        }
      } catch (error) {
        logger.warn('Error during initialization, using default collections');

        // Set default collections as fallback
        const defaultCollections = { 'Default Collection': [] };
        setCollections(defaultCollections);
        
        // Validate current selection in error scenario
        const currentSelection = selectedCollection;
        if (currentSelection === 'Default Collection') {
          // Current selection is appropriate for error fallback
          logger.debug('Error fallback: Kept Default Collection selection');
        } else {
          setSelectedCollection('Default Collection');
          localStorage.setItem('selectedCollection', 'Default Collection');
          logger.debug('Error fallback: Updated to Default Collection');
        }
      } finally {
        // Loading state is now managed by useCardData hook
      }
    };

    initializeDatabaseAndLoadCollections();
  }, []);

  const handleSettingsClick = () => {
    settingsManager.openSettings(
      isMobile,
      setCurrentView,
      setShowSettings,
      navigate
    );
  };

  const handleCloseSettings = () => {
    settingsManager.closeSettings(
      isMobile,
      currentView,
      setCurrentView,
      setShowSettings
    );
  };

  const handleNewCollectionCreation = useCallback(
    async newCollectionName => {
      await collectionManager.createCollection(newCollectionName, {
        collections,
        setCollections,
        setSelectedCollection,
      });
    },
    [collections, setCollections, setSelectedCollection]
  );

  // Removed export functionality
  // Removed import functionality

  // Removed AppContent loading state - now handled by Dashboard combined loading

  // Determine layout classes based on current view and header visibility
  const getMainLayoutClasses = () => {
    const baseClasses = 'main-content mobile-dashboard mx-auto max-w-[1920px]';
    
    if (!isMobile) {
      // Desktop keeps existing behavior
      return `${baseClasses} mt-4`;
    }
    
    // Mobile layout logic
    const hasHeader = !(currentView === 'settings' || currentView === 'cards');
    
    let layoutClasses = baseClasses;
    
    if (hasHeader) {
      layoutClasses += ' with-header';
    } else {
      layoutClasses += ' no-header';
    }
    
    return layoutClasses;
  };

  return (
    <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
      <Helmet>
        <title>{getPageTitle(currentView)}</title>
        <meta name="description" content="Manage your trading card collection, track values, and monitor your investments with MyCardTracker." />
      </Helmet>
      
      {/* Hide Header on mobile when in cards view only */}
      {!(
        isMobile &&
        currentView === 'cards'
      ) && (
        <Header
          className="header"
          selectedCollection={selectedCollection}
          collections={collections}
          onCollectionChange={setSelectedCollection}
          onSettingsClick={handleSettingsClick}
          currentView={currentView}
          onViewChange={setCurrentView}
          onAddCollection={name => {
            if (name === 'All Cards') {
              toastService.error(
                'Cannot create a collection named "All Cards" - this is a reserved name'
              );
              return;
            }

            const newCollections = {
              ...collections,
              [name]: [],
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
              user,
            });
          }}
          onDeleteCollection={async name => {
            await collectionManager.deleteCollection(name, {
              collections,
              user,
              selectedCollection,
              setCollections,
              setSelectedCollection,
            });
          }}
          userData={user}
          onSignOut={logout}
        />
      )}

      {/* Subscription/Trial banner (globally mounted below Header) */}
      <div className="mt-2">
        <TrialStatusBanner />
      </div>

      <main className={getMainLayoutClasses()}>
        <DashboardViewRouter
          currentView={currentView}
          isMobile={isMobile}
          cards={cards}
          selectedCollection={selectedCollection}
          collections={collections}
          setCollections={setCollections}
          selectedCards={selectedCards}
          openNewCardForm={openNewCardForm}
          openCardDetails={openCardDetails}
          deleteCard={deleteCard}
          updateCard={updateCard}
          setSelectedCollection={setSelectedCollection}
          resetTutorial={resetTutorial}
          logout={logout}
          onViewChange={setCurrentView}
          user={user}
          onRenameCollection={(oldName, newName) => {
            collectionManager.renameCollection(oldName, newName, {
              collections,
              setCollections,
              selectedCollection,
              setSelectedCollection,
              user,
            });
          }}
          onDeleteCollection={(collectionName) => {
            collectionManager.deleteCollection(collectionName, {
              collections,
              setCollections,
              selectedCollection,
              setSelectedCollection,
              user,
            });
          }}
        />
      </main>

      <DashboardModals
        showSettings={showSettings}
        isMobile={isMobile}
        handleCloseSettings={handleCloseSettings}
        selectedCollection={selectedCollection}
        collections={collections}
        resetTutorial={resetTutorial}
        logout={logout}
        onRenameCollection={(oldName, newName) => {
          collectionManager.renameCollection(oldName, newName, {
            collections,
            setCollections,
            selectedCollection,
            setSelectedCollection,
            user,
          });
        }}
        onDeleteCollection={async name => {
          await collectionManager.deleteCollection(name, {
            collections,
            user,
            selectedCollection,
            setCollections,
            setSelectedCollection,
          });
        }}
        showNewCardForm={showNewCardForm}
        closeNewCardForm={() => closeNewCardForm()}
        addCard={async (cardData, imageFile) => {
          await addCard(cardData, imageFile);
          if (cardData.collection && cardData.collection !== selectedCollection) {
            setSelectedCollection(cardData.collection);
            localStorage.setItem('selectedCollection', cardData.collection);
          }
        }}
        handleNewCollectionCreation={handleNewCollectionCreation}
        defaultCollection={
          selectedCollection !== 'All Cards' && selectedCollection !== 'Sold'
            ? selectedCollection
            : ''
        }
        selectedCard={selectedCard}
        initialCardCollection={initialCardCollection}
        handleCloseDetailsModal={handleCloseDetailsModal}
        handleCardUpdate={handleCardUpdate}
        deleteCard={deleteCard}
        showProfitModal={showProfitModal}
        setShowProfitModal={setShowProfitModal}
        profitChangeData={profitChangeData}
      />



      <TutorialModal />
      <SyncStatusIndicator />
      

    </div>
  );
}

// Export Dashboard and DashboardIndex for router
// Keep exports during migration; AppContent is only used by dashboard proxy
export { Dashboard, DashboardIndex, AppContent };

export default Dashboard;
