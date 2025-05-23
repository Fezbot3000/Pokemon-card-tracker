import React, { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Header, 
  useTheme, 
  useAuth,
  toast,
  SettingsModal, 
  Icon
} from './design-system';
import MobileSettingsModal from './components/MobileSettingsModal'; 
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import ProfitChangeModal from './components/ProfitChangeModal';
import AddCardModal from './components/AddCardModal';
import SoldItems from './components/SoldItems/SoldItems';
import PurchaseInvoices from './components/PurchaseInvoices/PurchaseInvoices';
import Marketplace from './components/Marketplace/Marketplace';
import MarketplaceSelling from './components/Marketplace/MarketplaceSelling';
import MarketplaceMessages from './components/Marketplace/MarketplaceMessages';
import BottomNavBar from './components/BottomNavBar';
import CloudSync from './components/CloudSync';
import TutorialModal from './components/TutorialModal';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import db from './services/firestore/dbAdapter';
import { useTutorial } from './contexts/TutorialContext';
import { useSubscription } from './contexts/SubscriptionContext';
import logger from './utils/logger';
import RestoreListener from './components/RestoreListener';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import featureFlags from './utils/featureFlags';
import { CardRepository } from './repositories/CardRepository';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { db as firestoreDb, storage } from './services/firebase';
import shadowSync from './services/shadowSync';
import JSZip from 'jszip';

// Helper function to generate a unique ID for cards without one
const generateUniqueId = () => {
  const timestamp = new Date().getTime();
  const randomPart = Math.floor(Math.random() * 10000);
  return `card_${timestamp}_${randomPart}`;
};

function AppContent() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('All Cards');
  const [collections, setCollections] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfitChangeModal, setShowProfitChangeModal] = useState(false);
  const [profitChangeData, setProfitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0
  });
  const [currentView, setCurrentView] = useState('cards');
  const [initialCardCollection, setInitialCardCollection] = useState(null);
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
    setInitialCardCollection(null);
  };

  const handleCardUpdate = async (cardId, updatedData, originalCollectionName) => {
    try {
      await updateCard(cardId, updatedData, originalCollectionName);
      toast.success('Card updated successfully');
    } catch (error) {
      logger.error('Error updating card:', error);
      toast.error('Failed to update card');
    }
  };

  // Add this state to track modal open status
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  // Update modal status whenever any modal opens/closes
  useEffect(() => {
    const isModalOpen = showNewCardForm || importModalOpen || showSettings || showProfitChangeModal || selectedCard !== null;
    setIsAnyModalOpen(isModalOpen);
  }, [showNewCardForm, importModalOpen, showSettings, showProfitChangeModal, selectedCard]);

  // Listen for modal open events from other components
  useEffect(() => {
    const handleModalOpen = (event) => {
      setIsAnyModalOpen(event.detail.isOpen);
    };

    window.addEventListener('modalStateChange', handleModalOpen);
    return () => window.removeEventListener('modalStateChange', handleModalOpen);
  }, []);

  // Initialize collections from database
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const savedCollections = await db.getCollections();
        if (Object.keys(savedCollections).length > 0) {
          setCollections(savedCollections);
          
          // Check if we have a saved selected collection
          const savedSelectedCollection = localStorage.getItem('selectedCollection');
          if (savedSelectedCollection && (savedSelectedCollection === 'All Cards' || savedCollections[savedSelectedCollection])) {
            setSelectedCollection(savedSelectedCollection);
          } else {
            // Default to 'All Cards' if no saved selection or saved selection doesn't exist
            setSelectedCollection('All Cards');
            localStorage.setItem('selectedCollection', 'All Cards');
          }
        } else {
          // Create default collection if none exist
          const defaultCollection = { 
            id: 'default', 
            name: 'Default Collection', 
            cards: [] 
          };
          await db.saveCollection('Default Collection', defaultCollection);
          setCollections({ 'Default Collection': defaultCollection });
          setSelectedCollection('Default Collection');
          localStorage.setItem('selectedCollection', 'Default Collection');
        }
      } catch (error) {
        logger.error('Error loading collections:', error);
        toast.error('Failed to load collections');
      } finally {
        setIsLoading(false);
      }
    };

    loadCollections();
  }, []);

  // Save selected collection to localStorage whenever it changes
  useEffect(() => {
    if (selectedCollection && selectedCollection !== 'All Cards') {
      localStorage.setItem('selectedCollection', selectedCollection);
    }
  }, [selectedCollection]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Register settings callback for tutorial
  useEffect(() => {
    registerSettingsCallback(() => setShowSettings(true));
  }, [registerSettingsCallback]);

  // Check if tutorial should start
  useEffect(() => {
    if (!isLoading && user) {
      checkAndStartTutorial();
    }
  }, [isLoading, user, checkAndStartTutorial]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Cmd/Ctrl + N: New card
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewCardForm(true);
      }

      // Cmd/Ctrl + I: Import
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setImportModalOpen(true);
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (selectedCard) {
          clearSelectedCard();
        } else if (showNewCardForm) {
          setShowNewCardForm(false);
        } else if (importModalOpen) {
          setImportModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard, showNewCardForm, importModalOpen, clearSelectedCard]);

  // Filter cards based on selected collection
  const filteredCards = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    
    if (selectedCollection === 'All Cards') {
      return cards;
    }
    
    const collection = collections[selectedCollection];
    if (!collection || !collection.cards) return [];
    
    return cards.filter(card => collection.cards.includes(card.id));
  }, [cards, selectedCollection, collections]);

  // Calculate total profit
  const totalProfit = useMemo(() => {
    return filteredCards.reduce((sum, card) => {
      const investment = parseFloat(card.investmentAUD) || 0;
      const currentValue = parseFloat(card.currentValueAUD) || 0;
      return sum + (currentValue - investment);
    }, 0);
  }, [filteredCards]);

  // Watch for profit changes
  useEffect(() => {
    const savedProfit = localStorage.getItem('lastKnownProfit');
    if (savedProfit && totalProfit !== parseFloat(savedProfit)) {
      setProfitChangeData({
        oldProfit: parseFloat(savedProfit),
        newProfit: totalProfit
      });
      setShowProfitChangeModal(true);
    }
    localStorage.setItem('lastKnownProfit', totalProfit.toString());
  }, [totalProfit]);

  const handleAddCard = async (cardData) => {
    try {
      // Ensure the card has an ID
      if (!cardData.id) {
        cardData.id = generateUniqueId();
      }

      // Add the card to the database
      await addCard(cardData);

      // If a specific collection is selected (not "All Cards"), add the card to it
      if (selectedCollection && selectedCollection !== 'All Cards') {
        const collection = collections[selectedCollection];
        if (collection) {
          const updatedCollection = {
            ...collection,
            cards: [...(collection.cards || []), cardData.id]
          };
          
          await db.saveCollection(selectedCollection, updatedCollection);
          
          setCollections(prev => ({
            ...prev,
            [selectedCollection]: updatedCollection
          }));
        }
      }

      toast.success('Card added successfully');
      setShowNewCardForm(false);
    } catch (error) {
      logger.error('Error adding card:', error);
      toast.error('Failed to add card');
    }
  };

  const handleImportData = async (data, mode) => {
    try {
      const processedData = processImportedData(data, mode);
      
      if (mode === 'priceUpdate') {
        // Update existing cards with new prices
        for (const update of processedData) {
          const existingCard = cards.find(card => 
            card.name === update.name || card.id === update.id
          );
          
          if (existingCard) {
            await updateCard(existingCard.id, {
              currentValueAUD: update.currentValueAUD,
              currentValueUSD: update.currentValueUSD
            });
          }
        }
        toast.success(`Updated prices for ${processedData.length} cards`);
      } else {
        // Add new cards
        for (const cardData of processedData) {
          await handleAddCard(cardData);
        }
        toast.success(`Imported ${processedData.length} cards`);
      }
      
      setImportModalOpen(false);
    } catch (error) {
      logger.error('Error importing data:', error);
      toast.error('Failed to import data');
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await deleteCard(cardId);
      
      // Remove card from all collections
      const updatedCollections = { ...collections };
      for (const [collectionName, collection] of Object.entries(updatedCollections)) {
        if (collection.cards && collection.cards.includes(cardId)) {
          collection.cards = collection.cards.filter(id => id !== cardId);
          await db.saveCollection(collectionName, collection);
        }
      }
      
      setCollections(updatedCollections);
      toast.success('Card deleted successfully');
    } catch (error) {
      logger.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  };

  const handleDeleteCards = async (cardIds) => {
    try {
      // Delete each card
      for (const cardId of cardIds) {
        await deleteCard(cardId);
      }
      
      // Remove cards from all collections
      const updatedCollections = { ...collections };
      for (const [collectionName, collection] of Object.entries(updatedCollections)) {
        if (collection.cards) {
          const originalLength = collection.cards.length;
          collection.cards = collection.cards.filter(id => !cardIds.includes(id));
          
          if (collection.cards.length !== originalLength) {
            await db.saveCollection(collectionName, collection);
          }
        }
      }
      
      setCollections(updatedCollections);
      toast.success(`Deleted ${cardIds.length} cards successfully`);
    } catch (error) {
      logger.error('Error deleting cards:', error);
      toast.error('Failed to delete cards');
    }
  };

  const handleCollectionChange = (newCollection) => {
    setSelectedCollection(newCollection);
    localStorage.setItem('selectedCollection', newCollection);
  };

  const handleCardClick = (card) => {
    selectCard(card);
    setInitialCardCollection(selectedCollection);
  };

  const handleImportClick = (mode) => {
    setImportMode(mode);
    setImportModalOpen(true);
  };

  // Initialize database and load collections
  const initializeDatabaseAndLoadCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Ensure database is initialized
      await db.ensureDB();
      
      // Load collections
      const savedCollections = await db.getCollections();
      
      if (Object.keys(savedCollections).length > 0) {
        setCollections(savedCollections);
        
        // Check if we have a saved selected collection
        const savedSelectedCollection = localStorage.getItem('selectedCollection');
        if (savedSelectedCollection && (savedSelectedCollection === 'All Cards' || savedCollections[savedSelectedCollection])) {
          setSelectedCollection(savedSelectedCollection);
        } else {
          setSelectedCollection('All Cards');
          localStorage.setItem('selectedCollection', 'All Cards');
        }
      } else {
        // Create default collection if none exist
        const defaultCollection = { 
          id: 'default', 
          name: 'Default Collection', 
          cards: [] 
        };
        await db.saveCollection('Default Collection', defaultCollection);
        setCollections({ 'Default Collection': defaultCollection });
        setSelectedCollection('Default Collection');
        localStorage.setItem('selectedCollection', 'Default Collection');
      }
    } catch (error) {
      logger.error('Error initializing database and loading collections:', error);
      toast.error('Failed to initialize database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // The rest of your AppContent component code continues here...
  // Due to length constraints, I'll include the key parts and structure

  const handleExportData = async (options = {}) => {
    // Your existing export logic
  };

  const handleImportCollection = async (file, options = {}) => {
    // Your existing import logic
  };

  const processImportFile = async (file, loadingEl, options = {}) => {
    // Your existing import file processing logic
  };

  const handleSettingsClick = () => {
    if (isMobile) {
      // Dispatch custom event for mobile settings
      window.dispatchEvent(new CustomEvent('openMobileSettings'));
    } else {
      setShowSettings(true);
    }
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    // Check if tutorial should start after settings close
    if (user) {
      checkAndStartTutorial();
    }
  };

  const handleResetData = async () => {
    // Your existing reset data logic
  };

  const handleModalOpenEvent = (event) => {
    setIsAnyModalOpen(event.detail.isOpen);
  };

  // Listen for modal state changes
  useEffect(() => {
    window.addEventListener('modalStateChange', handleModalOpenEvent);
    return () => window.removeEventListener('modalStateChange', handleModalOpenEvent);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col">
      {/* Desktop Header */}
      {!isMobile && (
        <Header 
          onAddCard={() => setShowNewCardForm(true)}
          onImportClick={handleImportClick}
          onExportClick={() => handleExportData()}
          selectedCollection={selectedCollection}
          collections={collections}
          onCollectionChange={handleCollectionChange}
          setCollections={setCollections}
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            if (view === 'settings') {
              setShowSettings(true);
            }
          }}
          onSettingsClick={handleSettingsClick}
          isModalOpen={selectedCard !== null || showNewCardForm || isAnyModalOpen}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'cards' && (
          <CardList
            cards={filteredCards}
            exchangeRate={exchangeRate}
            onCardClick={handleCardClick}
            onDeleteCard={handleDeleteCard}
            onDeleteCards={handleDeleteCards}
            onUpdateCard={updateCard}
            onAddCard={() => setShowNewCardForm(true)}
            selectedCollection={selectedCollection}
            collections={collections}
            setCollections={setCollections}
            onCollectionChange={handleCollectionChange}
          />
        )}
        
        {currentView === 'sold-items' && (
          <SoldItems />
        )}
        
        {currentView === 'purchase-invoices' && (
          <PurchaseInvoices />
        )}
        
        {currentView === 'marketplace' && (
          <Marketplace />
        )}
        
        {currentView === 'marketplace-selling' && (
          <MarketplaceSelling />
        )}
        
        {currentView === 'marketplace-messages' && (
          <MarketplaceMessages />
        )}
        
        {currentView === 'cloud-sync' && (
          <CloudSync
            onImportAndMigrate={(file) => importAndCloudMigrate(file)}
            onUploadImages={(file) => uploadImagesFromZip(file)}
            onImportSoldItems={(file) => importSoldItemsFromZip(file)}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
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
          isModalOpen={selectedCard !== null || showNewCardForm || isAnyModalOpen}
        />
      )}

      {/* Modals */}
      {selectedCard && (
        <CardDetails
          card={selectedCard}
          onClose={handleCloseDetailsModal}
          onUpdate={handleCardUpdate}
          onDelete={handleDeleteCard}
          exchangeRate={exchangeRate}
          initialCollection={initialCardCollection}
        />
      )}

      {showNewCardForm && (
        <AddCardModal
          isOpen={showNewCardForm}
          onClose={() => setShowNewCardForm(false)}
          onSave={handleAddCard}
          selectedCollection={selectedCollection === 'All Cards' ? null : selectedCollection}
        />
      )}

      {importModalOpen && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportData}
          mode={importMode}
        />
      )}

      {showSettings && !isMobile && (
        <SettingsModal
          isOpen={showSettings}
          onClose={handleCloseSettings}
          onResetData={handleResetData}
          onExportData={handleExportData}
          onImportData={handleImportCollection}
        />
      )}

      {showProfitChangeModal && (
        <ProfitChangeModal
          isOpen={showProfitChangeModal}
          onClose={() => setShowProfitChangeModal(false)}
          oldProfit={profitChangeData.oldProfit}
          newProfit={profitChangeData.newProfit}
        />
      )}

      {/* Mobile Settings Modal */}
      {isMobile && (
        <MobileSettingsModal
          onResetData={handleResetData}
          onExportData={handleExportData}
          onImportData={handleImportCollection}
        />
      )}

      {/* Add RestoreListener at the App component level */}
      <RestoreListener 
        onRefreshData={() => {
          logger.log('App: Refreshing data after restore/backup');
          db.getCollections().then(savedCollections => {
            if (Object.keys(savedCollections).length > 0) {
              setCollections(savedCollections);
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

export default AppContent;
