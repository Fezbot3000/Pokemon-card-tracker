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
import {
  Header,
  useAuth,
  SettingsModal,
  toastService, // Import toastService
} from './design-system';
import Settings from './components/Settings';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import AddCardModal from './components/AddCardModal';
import ProfitChangeModal from './components/ProfitChangeModal';
import useCardData from './hooks/useCardData';
import db from './services/firestore/dbAdapter';
import { useTutorial } from './contexts/TutorialContext';
import './styles/globals.css';
import './styles/utilities.css';

import SoldItems from './components/SoldItems/SoldItems';
import PurchaseInvoices from './components/PurchaseInvoices/PurchaseInvoices';
import Marketplace from './components/Marketplace/Marketplace';
import MarketplaceSelling from './components/Marketplace/MarketplaceSelling';
import MarketplaceMessages from './components/Marketplace/MarketplaceMessages';
import BottomNavBar from './components/BottomNavBar';
import TrialStatusBanner from './components/TrialStatusBanner';

import logger from './utils/logger'; // Import the logger utility
import RestoreListener from './components/RestoreListener';
import SyncStatusIndicator from './components/SyncStatusIndicator'; // Import the SyncStatusIndicator

import TutorialModal from './components/TutorialModal'; // Add back this import
import { settingsManager } from './utils/settingsManager'; // Import settings manager
import { useCardModals } from './hooks/useCardModals'; // Import card modals hook
import { collectionManager } from './utils/collectionManager'; // Import collection manager


// Main Dashboard Component
function Dashboard() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState('cards');

  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <div className="dashboard-page min-h-screen bg-gray-100 dark:bg-black">
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

        <main className="main-content mobile-dashboard mx-auto max-w-[1920px]">
          <div className="p-4 pb-20 sm:p-6">
            <div className="w-full px-1 pb-20 sm:px-2">
              {/* Statistics Summary Skeleton */}
              <div className="mb-3 w-full rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-black sm:mb-4">
                <div className="rounded-md p-2 sm:p-4 md:p-6">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0">
                    {[
                      { label: 'CARDS', width: 'w-8' },
                      { label: 'PAID', width: 'w-16' },
                      { label: 'VALUE', width: 'w-16' },
                      { label: 'PROFIT', width: 'w-12' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center justify-center border-none p-2 py-3 sm:p-3 sm:py-4 md:p-4 md:py-6"
                      >
                        <div className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-sm">
                          {stat.label}
                        </div>
                        <div
                          className={`h-6 ${stat.width} animate-pulse rounded bg-gray-200 dark:bg-[#333]`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search toolbar skeleton */}
              <div className="mb-4">
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-[#333] dark:bg-black sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
                  </div>
                </div>
              </div>

              {/* Card grid skeleton */}
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={`loading-skeleton-${index}`}
                    className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#333] dark:bg-black"
                  >
                    <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#444]"></div>
                    <div className="space-y-2 p-2">
                      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-[#333]"></div>
                      <div className="h-2 w-1/2 rounded bg-gray-200 dark:bg-[#333]"></div>
                      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-[#333]"></div>
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
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <BottomNavBar
            currentView={
              location.pathname.includes('/settings') ? 'settings' : currentView
            }
            onViewChange={view => {
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
  }, [location.state, location.pathname, setCurrentView]);

  return (
    <>
      <AppContent currentView={currentView} setCurrentView={setCurrentView} />
    </>
  );
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
  } = useCardModals();

  const [showSettings, setShowSettings] = useState(false);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [profitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0,
  });
  const [selectedCollection, setSelectedCollection] = useState('All Cards');
  const [collections, setCollections] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { registerAddCardCallback, checkAndStartTutorial, startTutorial } =
    useTutorial();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    cards,
    loading,
    exchangeRate,
    updateCard,
    deleteCard,
    addCard,
  } = useCardData();

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

  if (loading) {
    return (
      <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
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

        <main className="main-content mobile-dashboard mx-auto max-w-[1920px]">
          <div className="p-4 pb-20 sm:p-6">
            <div className="w-full px-1 pb-20 sm:px-2">
              {/* Statistics Summary Skeleton */}
              <div className="mb-3 w-full rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#111] sm:mb-4">
                <div className="rounded-md p-2 sm:p-4 md:p-6">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0">
                    {[
                      { label: 'CARDS', width: 'w-8' },
                      { label: 'PAID', width: 'w-16' },
                      { label: 'VALUE', width: 'w-16' },
                      { label: 'PROFIT', width: 'w-12' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col items-center justify-center border-none p-2 py-3 sm:p-3 sm:py-4 md:p-4 md:py-6"
                      >
                        <div className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-sm">
                          {stat.label}
                        </div>
                        <div
                          className={`h-6 ${stat.width} animate-pulse rounded bg-gray-200 dark:bg-[#333]`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search toolbar skeleton */}
              <div className="mb-4">
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-[#333] dark:bg-[#111] sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]"></div>
                  </div>
                </div>
              </div>

              {/* Card grid skeleton */}
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {Array.from({ length: 14 }, (_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#333] dark:bg-[#111]"
                  >
                    <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#444]"></div>
                    <div className="space-y-2 p-2">
                      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-[#333]"></div>
                      <div className="h-2 w-1/2 rounded bg-gray-200 dark:bg-[#333]"></div>
                      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-[#333]"></div>
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

  // Determine layout classes based on current view and header visibility
  const getMainLayoutClasses = () => {
    const baseClasses = 'main-content mobile-dashboard mx-auto max-w-[1920px]';
    
    if (!isMobile) {
      // Desktop keeps existing behavior
      return `${baseClasses} mt-4`;
    }
    
    // Mobile layout logic
    const hasHeader = !(currentView === 'settings' || currentView === 'cards');
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    
    let layoutClasses = baseClasses;
    
    if (hasHeader) {
      layoutClasses += ' with-header';
    } else {
      layoutClasses += ' no-header';
    }
    
    if (isPWA) {
      layoutClasses += ' pwa-mode';
    }
    
    return layoutClasses;
  };

  return (
    <div className="dashboard-page min-h-screen bg-gray-50 dark:bg-black">
      {/* Hide Header on mobile when in settings or cards view */}
      {!(
        isMobile &&
        (currentView === 'settings' || currentView === 'cards')
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

      <main className={getMainLayoutClasses()}>
        {currentView === 'cards' ? (
          <div className="flex-1 overflow-y-auto">
            {/* Main content */}
            <div className={`pb-20 sm:p-6 ${isMobile ? 'px-4 pt-2' : 'p-4'}`}>
              {/* Trial Status Banner - now in correct place */}
              <TrialStatusBanner />

              {/* Card List */}
              {loading ? (
                <div className="w-full px-1 pb-20 sm:px-2">
                  {/* Skeleton Statistics Summary */}
                  <div className="mb-3 w-full rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-black sm:mb-4">
                    <div className="rounded-md p-2 sm:p-4 md:p-6">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0">
                        {[
                          { label: 'CARDS', width: 'w-8' },
                          { label: 'PAID', width: 'w-16' },
                          { label: 'VALUE', width: 'w-16' },
                          { label: 'PROFIT', width: 'w-12' },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="flex flex-col items-center justify-center border-none p-2 py-3 sm:p-3 sm:py-4 md:p-4 md:py-6"
                          >
                            <div className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-sm">
                              {stat.label}
                            </div>
                            <div
                              className={`h-6 ${stat.width} animate-pulse rounded bg-gray-200 dark:bg-[#333]`}
                            ></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Search Toolbar - Keep functional */}
                  <div className="mb-4">
                    <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-[#333] dark:bg-black sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                      {/* Search Input */}
                      <div className="min-w-0 flex-1">
                        <div className="relative">
                          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                            search
                          </span>
                          <input
                            type="text"
                            placeholder="Search cards..."
                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                            disabled
                          />
                        </div>
                      </div>

                      {/* View Mode and Sort Controls */}
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* View Mode Toggle */}
                        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                          <button
                            className="rounded-md bg-blue-600 p-2 text-white"
                            disabled
                          >
                            <span className="material-icons text-lg">
                              grid_view
                            </span>
                          </button>
                          <button
                            className="rounded-md p-2 text-gray-600 dark:text-gray-400"
                            disabled
                          >
                            <span className="material-icons text-lg">
                              view_list
                            </span>
                          </button>
                        </div>

                        {/* Add Card Button */}
                        <button
                          onClick={() => openNewCardForm()}
                          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          <span className="material-icons mr-2 text-lg">
                            add
                          </span>
                          <span className="hidden sm:inline">Add Card</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Collection Selector Skeleton */}
                  <div className="mb-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-[#333] dark:bg-black">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="size-6 animate-pulse rounded bg-gray-200 dark:bg-[#333]"></div>
                          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-[#333]"></div>
                        </div>
                        <div className="size-4 animate-pulse rounded bg-gray-200 dark:bg-[#333]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Skeleton Card Grid */}
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 sm:gap-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {Array.from({ length: 14 }, (_, index) => (
                      <div
                        key={index}
                        className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#333] dark:bg-black"
                      >
                        {/* Card Image Skeleton */}
                        <div className="relative aspect-[2.5/3.5] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#333] dark:to-[#444]">
                          <div className="absolute inset-0 -skew-x-12 animate-pulse bg-gradient-to-r from-transparent to-transparent"></div>
                        </div>

                        {/* Card Content Skeleton */}
                        <div className="space-y-2 p-2">
                          {/* Title */}
                          <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-[#333]"></div>

                          {/* Subtitle */}
                          <div className="h-2 w-1/2 rounded bg-gray-200 dark:bg-[#333]"></div>

                          {/* Price */}
                          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-[#333]"></div>

                          {/* Grade */}
                          <div className="flex items-center justify-between">
                            <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-[#333]"></div>
                            <div className="size-6 rounded bg-gray-200 dark:bg-[#333]"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : cards.length === 0 ? (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center">
                  <span className="material-icons mb-4 text-6xl text-gray-400 dark:text-gray-600">
                    inventory_2
                  </span>
                  <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                    No cards in your collection
                  </h2>
                  <p className="mb-6 max-w-md text-center text-gray-500 dark:text-gray-400">
                    Start building your Pokemon card collection by adding your
                    first card!
                  </p>
                  <button
                    onClick={() => openNewCardForm()}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <span className="material-icons mr-2 text-lg">add</span>
                    Add Your First Card
                  </button>
                </div>
              ) : (
                <CardList
                  cards={cards}
                  exchangeRate={exchangeRate}
                  onCardClick={card => {
                    let actualCollectionName = selectedCollection;
                    if (selectedCollection === 'All Cards') {
                      for (const [
                        collName,
                        cardsInCollection,
                      ] of Object.entries(collections)) {
                        if (
                          Array.isArray(cardsInCollection) &&
                          cardsInCollection.some(
                            c => c.slabSerial === card.slabSerial
                          )
                        ) {
                          actualCollectionName = collName;
                          break;
                        }
                      }
                      if (actualCollectionName === 'All Cards') {
                        logger.warn(
                          'Could not determine original collection for card: ',
                          card.slabSerial
                        );
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
                  onCollectionChange={collection => {
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
                  className="fixed right-4 z-50 flex size-14 items-center justify-center rounded-full border-2 border-white bg-[#ef4444] text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#dc2626] active:scale-95 dark:border-gray-800 sm:hidden"
                  style={{
                    bottom: 'calc(4rem + 8px)',
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
          <Marketplace
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        ) : currentView === 'marketplace-selling' ? (
          <MarketplaceSelling
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        ) : currentView === 'marketplace-messages' ? (
          <MarketplaceMessages
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        ) : currentView === 'sold-items' ? (
          <SoldItems />
        ) : currentView === 'settings' ? (
          <div className={`min-h-screen bg-gray-50 dark:bg-black ${isMobile ? 'settings-mobile' : ''}`}>
            <Settings />
          </div>
        ) : null}
      </main>

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
        />
      )}

      {showNewCardForm && (
        <AddCardModal
          isOpen={showNewCardForm}
          onClose={() => closeNewCardForm()}
          onSave={(cardData, imageFile) =>
            addCard(cardData, imageFile)
          }
          collections={Object.keys(collections)}
          onNewCollectionCreated={handleNewCollectionCreation}
          defaultCollection={
            selectedCollection !== 'All Cards' && selectedCollection !== 'Sold'
              ? selectedCollection
              : ''
          }
        />
      )}

      {selectedCard && (
        <CardDetails
          card={{
            ...selectedCard,
            // Ensure these fields are explicitly set to avoid undefined values
            collection: selectedCard.collection || initialCardCollection,
            collectionId:
              selectedCard.collectionId ||
              selectedCard.collection ||
              initialCardCollection,
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
            newProfit: profitChangeData.newProfit,
          }}
        />
      )}

      {/* Add RestoreListener at the App component level where state setters are in scope */}
      <RestoreListener
        onRefreshData={() => {
          logger.log('App: Refreshing data after restore/backup');
          // Refresh collections from the database
          db.getCollections()
            .then(savedCollections => {
              if (Object.keys(savedCollections).length > 0) {
                setCollections(savedCollections);
                // If there are collections but none is selected, select the first one
                if (
                  !selectedCollection ||
                  (selectedCollection !== 'All Cards' &&
                    !savedCollections[selectedCollection])
                ) {
                  const newCollection = Object.keys(savedCollections)[0];
                  setSelectedCollection(newCollection);
                  localStorage.setItem('selectedCollection', newCollection);
                  logger.log(
                    `App: Selected new collection after restore: ${newCollection}`
                  );
                }
                toastService.success(
                  'Data restored successfully! Your collections are now available.'
                );
              }
            })
            .catch(error => {
              logger.error(
                'Error refreshing collections after restore:',
                error
              );
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
