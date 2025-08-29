import React from 'react';
import { SettingsModal } from '../../design-system';
import AddCardModal from '../../components/AddCardModal';
import CardDetails from '../../components/CardDetails';
import ProfitChangeModal from '../../components/ProfitChangeModal';

function DashboardModals({
  // Settings modal
  showSettings,
  isMobile,
  handleCloseSettings,
  selectedCollection,
  collections,
  resetTutorial,
  logout,
  onRenameCollection,
  onDeleteCollection,
  // Add card modal
  showNewCardForm,
  closeNewCardForm,
  addCard,
  handleNewCollectionCreation,
  defaultCollection,
  // Card details modal
  selectedCard,
  initialCardCollection,
  handleCloseDetailsModal,
  handleCardUpdate,
  deleteCard,
  // Profit change modal
  showProfitModal,
  setShowProfitModal,
  profitChangeData,
}) {
  return (
    <>
      {showSettings && !isMobile && (
        <SettingsModal
          isOpen={showSettings}
          onClose={handleCloseSettings}
          selectedCollection={selectedCollection}
          collections={collections}
          onStartTutorial={resetTutorial}
          onSignOut={logout}
          onRenameCollection={onRenameCollection}
          onDeleteCollection={onDeleteCollection}
        />
      )}

      {showNewCardForm && (
        <AddCardModal
          isOpen={showNewCardForm}
          onClose={closeNewCardForm}
          onSave={addCard}
          collections={Object.keys(collections)}
          onNewCollectionCreated={handleNewCollectionCreation}
          defaultCollection={defaultCollection}
        />
      )}

      {selectedCard && (
        <CardDetails
          card={{
            ...selectedCard,
            collection: selectedCard.collection || initialCardCollection,
            collectionId:
              selectedCard.collectionId ||
              selectedCard.collection ||
              initialCardCollection,
            set: selectedCard.set || selectedCard.setName || '',
            setName: selectedCard.setName || selectedCard.set || '',
            investmentUSD: selectedCard.investmentUSD || 0,
            currentValueUSD: selectedCard.currentValueUSD || 0,
            investmentAUD: parseFloat(selectedCard.investmentAUD) || 0,
            currentValueAUD: parseFloat(selectedCard.currentValueAUD) || 0,
          }}
          onClose={handleCloseDetailsModal}
          initialCollectionName={initialCardCollection}
          onUpdateCard={handleCardUpdate}
          onDelete={deleteCard}
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
    </>
  );
}

export default DashboardModals;
