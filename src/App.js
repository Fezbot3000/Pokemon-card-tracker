import React, { useState } from 'react';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import CSVImporter from './components/CSVImporter';
import BaseDataImporter from './components/BaseDataImporter';
import NewCardForm from './components/NewCardForm';
import useCardData from './hooks/useCardData';
import './styles/main.css';

function App() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [activeImporter, setActiveImporter] = useState('price'); // 'price' or 'baseData'
  
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

  // Handle the imported CSV file
  const handleCsvImport = async (file, mode) => {
    const result = await importCsvData(file, mode);
    
    if (!result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // Handle card click in the list
  const handleCardClick = (cardId) => {
    selectCard(cardId);
  };

  // Handle showing the new card form
  const handleShowNewCardForm = () => {
    setShowNewCardForm(true);
  };
  
  // Handle adding a new card
  const handleAddCard = (newCard) => {
    addCard(newCard);
    setShowNewCardForm(false);
  };

  return (
    <div className="app">
      <Header onAddCard={handleShowNewCardForm} />
      <main>
        <div className="importer-toggle">
          <button 
            className={`toggle-button ${activeImporter === 'price' ? 'active' : ''}`}
            onClick={() => setActiveImporter('price')}
          >
            Update Prices
          </button>
          <button 
            className={`toggle-button ${activeImporter === 'baseData' ? 'active' : ''}`}
            onClick={() => setActiveImporter('baseData')}
          >
            Import Base Data
          </button>
        </div>
        
        {activeImporter === 'price' ? (
          <CSVImporter onImport={(file) => handleCsvImport(file, 'priceUpdate')} loading={loading} />
        ) : (
          <BaseDataImporter onImport={(file) => handleCsvImport(file, 'baseData')} loading={loading} />
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <CardList 
          cards={cards} 
          exchangeRate={exchangeRate} 
          onCardClick={handleCardClick}
        />
        
        {selectedCard && (
          <CardDetails 
            card={selectedCard} 
            onClose={clearSelectedCard} 
            onUpdate={updateCard} 
            onDelete={deleteCard}
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