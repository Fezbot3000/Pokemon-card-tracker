import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import { db } from './services/db';
import { useTheme } from './contexts/ThemeContext';
import './styles/main.css';
import SoldItems from './components/SoldItems/SoldItems';
import SettingsModal from './components/SettingsModal';
import JSZip from 'jszip';

function App() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
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
  
  const { isDark } = useTheme();

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
    const card = collections[selectedCollection].find(c => c.slabSerial === cardId);
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

  // Handle resetting all data
  const handleResetAllData = async () => {
    setShowResetConfirm(true);
  };
  
  const confirmResetAllData = async () => {
    if (resetConfirmation !== 'RESET') {
      alert('Please type RESET to confirm data deletion');
      return;
    }
    
    try {
      setIsResetting(true);
      const result = await db.resetAllData();
      if (result) {
        alert('All data has been reset successfully. The application will reload.');
        window.location.reload();
      } else {
        throw new Error('Failed to reset data');
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('There was an error resetting data: ' + error.message);
    } finally {
      setIsResetting(false);
      setResetConfirmation('');
      setShowResetConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Reset Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className={`w-full max-w-md p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-semibold text-red-500`}>Reset All Data</h3>
              <button 
                className={`text-2xl ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'}`}
                onClick={() => setShowResetConfirm(false)}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                This action will permanently delete all your collections, sold items, and card images. 
                This cannot be undone. To confirm, type "RESET" in the field below.
              </p>
              
              <input
                type="text"
                placeholder="Type RESET to confirm"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className={`px-4 py-2 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetAllData}
                  disabled={resetConfirmation !== 'RESET' || isResetting}
                  className={`
                    px-4 py-2 rounded-lg font-medium flex items-center justify-center
                    ${resetConfirmation === 'RESET' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : isDark 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isResetting ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-sm mr-1">delete_forever</span>
                      Reset All Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reset All Data Button at the very top */}
      <div className={`sticky top-0 z-[99] w-full py-2 px-4 text-center ${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-red-50 border-b border-red-200'}`}>
        <button 
          onClick={handleResetAllData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center mx-auto"
        >
          <span className="material-icons mr-2">delete_forever</span>
          Reset All Data
        </button>
      </div>
      
      <div className={`max-w-7xl mx-auto px-4 py-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
        <Header 
          onAddCard={handleShowNewCardForm}
          selectedCollection={selectedCollection}
          collections={Object.keys(collections)}
          onCollectionChange={handleCollectionChange}
          onAddCollection={handleAddCollection}
          onRenameCollection={handleRenameCollection}
          onDeleteCollection={handleDeleteCollection}
          onImportClick={handleOpenImportModal}
          collectionData={collections[selectedCollection] || []}
          exchangeRate={exchangeRate}
          refreshCollections={loadCollections}
        />
        <main className="mt-6">
          <ImportModal
            isOpen={importModalOpen}
            onClose={() => setImportModalOpen(false)}
            mode={importMode}
            onImport={(file) => handleCsvImport(file, importMode)}
            loading={loading}
          />
          
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-600">
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
              cards={collections[selectedCollection] || []}
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

export default App;