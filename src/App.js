import React, { useState } from 'react';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import './styles/main.css';

function App() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('price'); // 'price' or 'baseData'
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({
    'Default Collection': []
  });
  
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

  // Handle opening the import modal
  const handleOpenImportModal = (mode) => {
    setImportMode(mode);
    setImportModalOpen(true);
  };

  // Handle collection change
  const handleCollectionChange = (collectionName) => {
    setSelectedCollection(collectionName);
  };

  // Handle adding a new collection
  const handleAddCollection = (collectionName) => {
    setCollections(prev => ({
      ...prev,
      [collectionName]: []
    }));
    setSelectedCollection(collectionName);
  };

  // Handle renaming a collection
  const handleRenameCollection = (oldName, newName) => {
    if (collections[oldName] && !collections[newName]) {
      setCollections(prev => {
        const { [oldName]: cards, ...rest } = prev;
        return {
          ...rest,
          [newName]: cards
        };
      });
      setSelectedCollection(newName);
    }
  };

  // Handle the imported CSV file
  const handleCsvImport = async (file, mode) => {
    const result = await importCsvData(file, mode);
    
    if (result.success) {
      // Get the current collection's cards
      const currentCards = collections[selectedCollection] || [];
      
      // Process the imported data with the current collection's cards
      const processedCards = processImportedData(result.data, currentCards, exchangeRate, mode);
      
      // Update only the current collection's cards
      setCollections(prev => ({
        ...prev,
        [selectedCollection]: processedCards
      }));
      
      setImportModalOpen(false);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // Handle card click in the list
  const handleCardClick = (cardId) => {
    const card = collections[selectedCollection].find(c => c.slabSerial === cardId);
    selectCard(card);
  };

  // Handle showing the new card form
  const handleShowNewCardForm = () => {
    setShowNewCardForm(true);
  };
  
  // Handle adding a new card
  const handleAddCard = (newCard) => {
    // Add the card to the current collection
    setCollections(prev => ({
      ...prev,
      [selectedCollection]: [...prev[selectedCollection], newCard]
    }));
    setShowNewCardForm(false);
  };

  // Handle updating a card
  const handleUpdateCard = (updatedCard) => {
    setCollections(prev => ({
      ...prev,
      [selectedCollection]: prev[selectedCollection].map(card =>
        card.slabSerial === updatedCard.slabSerial ? updatedCard : card
      )
    }));
  };

  // Handle deleting a card
  const handleDeleteCard = (cardId) => {
    setCollections(prev => ({
      ...prev,
      [selectedCollection]: prev[selectedCollection].filter(card => card.slabSerial !== cardId)
    }));
    if (selectedCard && selectedCard.slabSerial === cardId) {
      clearSelectedCard();
    }
  };

  // Handle deleting multiple cards
  const handleDeleteCards = (cardIds) => {
    setCollections(prev => ({
      ...prev,
      [selectedCollection]: prev[selectedCollection].filter(
        card => !cardIds.includes(card.slabSerial)
      )
    }));
    
    // Clear selected card if it was in the deleted set
    if (selectedCard && cardIds.includes(selectedCard.slabSerial)) {
      clearSelectedCard();
    }
  };

  return (
    <div className="app">
      <Header 
        onAddCard={handleShowNewCardForm}
        selectedCollection={selectedCollection}
        collections={Object.keys(collections)}
        onCollectionChange={handleCollectionChange}
        onAddCollection={handleAddCollection}
        onRenameCollection={handleRenameCollection}
      />
      <main>
        <div className="import-buttons">
          <button 
            className="import-button"
            onClick={() => handleOpenImportModal('price')}
          >
            Update Prices
          </button>
          <button 
            className="import-button"
            onClick={() => handleOpenImportModal('baseData')}
          >
            Import Base Data
          </button>
        </div>
        
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          mode={importMode}
          onImport={(file) => handleCsvImport(file, importMode)}
          loading={loading}
        />
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <CardList 
          cards={collections[selectedCollection]} 
          exchangeRate={exchangeRate} 
          onCardClick={handleCardClick}
          onDeleteCards={handleDeleteCards}
        />
        
        {selectedCard && (
          <CardDetails 
            card={selectedCard} 
            onClose={clearSelectedCard} 
            onUpdate={handleUpdateCard} 
            onDelete={handleDeleteCard}
            exchangeRate={exchangeRate}
          />
        )}
        
        {showNewCardForm && (
          <NewCardForm 
            onAdd={handleAddCard} 
            onCancel={() => setShowNewCardForm(false)}
          />
        )}
      </main>
    </div>
  );
}

export default App;