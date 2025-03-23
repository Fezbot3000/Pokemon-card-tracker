import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import { db } from './services/db';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import './styles/main.css';
import SoldItems from './components/SoldItems/SoldItems';
import SettingsModal from './components/SettingsModal';
import JSZip from 'jszip';

function AppContent() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [isLoading, setIsLoading] = useState(true);
  
  const {
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
  
  const { isDarkMode } = useTheme();

  // Load collections from IndexedDB on mount
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      
      // Record start time
      const startTime = Date.now();
      
      // Fetch collections from database
      const savedCollections = await db.getCollections();
      
      if (Object.keys(savedCollections).length > 0) {
        setCollections(savedCollections);
        
        // Only set selected collection if it doesn't exist in new collections
        if (!savedCollections[selectedCollection]) {
          const savedSelected = Object.keys(savedCollections)[0];
          setSelectedCollection(savedSelected);
        }
        
        console.log('Collections refreshed from database:', savedCollections);
      } else {
        // If no collections found, create a default one
        const defaultCollections = { 'Default Collection': [] };
        setCollections(defaultCollections);
        setSelectedCollection('Default Collection');
        await db.saveCollections(defaultCollections);
      }
      
      // Calculate elapsed time
      const elapsedTime = Date.now() - startTime;
      
      // If less than 3 seconds have passed, wait for the remainder
      const minimumLoadingTime = 3000; // 3 seconds
      if (elapsedTime < minimumLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
      }
      
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowNewCardForm = () => {
    setShowNewCardForm(true);
  };

  const handleAddCard = async (cardData) => {
    await addCard(cardData, selectedCollection);
    setShowNewCardForm(false);
  };

  const handleCardClick = (cardId) => {
    let card;
    if (selectedCollection === 'All Cards') {
      // Search across all collections
      for (const collectionCards of Object.values(collections)) {
        card = collectionCards.find(c => c.slabSerial === cardId);
        if (card) break;
      }
    } else {
      // Search in current collection
      card = collections[selectedCollection].find(c => c.slabSerial === cardId);
    }
    
    if (card) {
      selectCard(card);
    }
  };

  const handleUpdateCard = async (updatedCard) => {
    await updateCard(updatedCard, selectedCollection);
  };

  const handleDeleteCard = async (cardId) => {
    await deleteCard(cardId, selectedCollection);
    clearSelectedCard();
  };

  const handleDeleteCards = async (cardIds) => {
    for (const cardId of cardIds) {
      await deleteCard(cardId, selectedCollection);
    }
  };

  const handleCollectionChange = (collectionName) => {
    setSelectedCollection(collectionName);
  };

  const handleAddCollection = async (collectionName) => {
    const newCollections = {
      ...collections,
      [collectionName]: []
    };
    setCollections(newCollections);
    setSelectedCollection(collectionName);
    await db.saveCollections(newCollections);
  };

  const handleRenameCollection = async (oldName, newName) => {
    const newCollections = { ...collections };
    newCollections[newName] = newCollections[oldName];
    delete newCollections[oldName];
    setCollections(newCollections);
    setSelectedCollection(newName);
    await db.saveCollections(newCollections);
  };

  const handleDeleteCollection = async (collectionName) => {
    const newCollections = { ...collections };
    delete newCollections[collectionName];
    setCollections(newCollections);
    setSelectedCollection(Object.keys(newCollections)[0] || 'Default Collection');
    await db.saveCollections(newCollections);
  };

  const handleOpenImportModal = (mode) => {
    setImportMode(mode);
    setImportModalOpen(true);
  };

  const handleCsvImport = async (file, mode) => {
    try {
      const result = await importCsvData(file, mode);
      if (!result.success) {
        throw new Error(result.message);
      }
      const processedData = processImportedData(result.data, collections[selectedCollection], exchangeRate, mode);
      
      const newCollections = {
        ...collections,
        [selectedCollection]: processedData
      };
      
      setCollections(newCollections);
      await db.saveCollections(newCollections);
      setImportModalOpen(false);
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0F19]">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <Header
          onAddCard={handleShowNewCardForm}
          selectedCollection={selectedCollection}
          collections={Object.keys(collections)}
          onCollectionChange={handleCollectionChange}
          onAddCollection={handleAddCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          onImportClick={handleOpenImportModal}
          collectionData={collections[selectedCollection]}
          exchangeRate={exchangeRate}
          refreshCollections={loadCollections}
        />
        <main>
          <ImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            mode={importMode}
            onImport={(file) => handleCsvImport(file, importMode)}
            loading={loading}
          />
          
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {selectedCard ? (
            <CardDetails
              card={selectedCard}
              onClose={clearSelectedCard}
              onUpdate={handleUpdateCard}
              onDelete={handleDeleteCard}
              exchangeRate={exchangeRate}
            />
          ) : (
            <CardList
              cards={selectedCollection === 'All Cards' 
                ? Object.values(collections).flat()
                : collections[selectedCollection] || []}
              onCardClick={handleCardClick}
              onDeleteCards={handleDeleteCards}
            />
          )}

          {showNewCardForm && (
            <NewCardForm
              onClose={() => setShowNewCardForm(false)}
              onSubmit={handleAddCard}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;