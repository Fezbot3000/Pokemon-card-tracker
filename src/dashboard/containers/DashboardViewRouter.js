import React from 'react';
import CardsView from '../views/CardsView';
import SalesView from '../views/SalesView';
import MarketplaceView from '../views/MarketplaceView';
import SettingsView from '../views/SettingsView';

function DashboardViewRouter({
  currentView,
  isMobile,
  cards,
  selectedCollection,
  collections,
  setCollections,
  selectedCards,
  openNewCardForm,
  openCardDetails,
  deleteCard,
  updateCard,
  setSelectedCollection,
  resetTutorial,
  logout,
  onViewChange,
  user,
  onRenameCollection,
  onDeleteCollection,
}) {
  if (currentView === 'cards') {
    return (
      <CardsView
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
      />
    );
  }

  if (currentView === 'purchase-invoices' || currentView === 'sold') {
    return <SalesView currentView={currentView} />;
  }

  if (
    currentView === 'marketplace' ||
    currentView === 'marketplace-selling' ||
    currentView === 'marketplace-messages'
  ) {
    return (
      <MarketplaceView currentView={currentView} onViewChange={onViewChange} />
    );
  }

  if (currentView === 'sold-items') {
    return <SalesView currentView={currentView} />;
  }

  if (
    currentView === 'settings' ||
    currentView === 'settings-account' ||
    currentView === 'settings-marketplace' ||
    currentView === 'settings-sharing'
  ) {
    return (
      <SettingsView
        currentView={currentView}
        selectedCollection={selectedCollection}
        collections={collections}
        onStartTutorial={resetTutorial}
        onSignOut={logout}
        onClose={() => onViewChange('cards')}
        onRenameCollection={onRenameCollection}
        onDeleteCollection={onDeleteCollection}
        // Pass through collection mutators via props if needed by SettingsView
      />
    );
  }

  return null;
}

export default DashboardViewRouter;
