import React from 'react';
import CardList from '../../components/CardList';

function CardsView({
  isMobile,
  cards,
  exchangeRate,
  selectedCollection,
  collections,
  setCollections,
  selectedCards,
  openNewCardForm,
  openCardDetails,
  deleteCard,
  updateCard,
  setSelectedCollection,
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className={`pb-20 sm:p-6 ${isMobile ? 'px-2 pt-2' : 'p-4'}`}>
        {cards.length === 0 ? (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center">
            <span className="material-icons mb-4 text-6xl text-gray-400 dark:text-gray-600">
              inventory_2
            </span>
            <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
              No cards in your collection
            </h2>
            <p className="mb-6 max-w-md text-center text-gray-500 dark:text-gray-400">
              Start building your Pokemon card collection by adding your first card!
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
          // eslint-disable-next-line react/jsx-no-undef
          <CardList
            cards={cards}
            exchangeRate={exchangeRate}
            onCardClick={card => {
              let actualCollectionName = selectedCollection;
              if (selectedCollection === 'All Cards') {
                for (const [collName, cardsInCollection] of Object.entries(collections)) {
                  if (
                    Array.isArray(cardsInCollection) &&
                    cardsInCollection.some(c => c.slabSerial === card.slabSerial)
                  ) {
                    actualCollectionName = collName;
                    break;
                  }
                }
                if (actualCollectionName === 'All Cards') {
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
            onSelectionChange={() => {}}
          />
        )}

        {!selectedCards?.size && (
          <button
            onClick={() => openNewCardForm()}
            className="fixed right-4 z-50 flex size-14 items-center justify-center rounded-full border-2 border-white bg-[#ef4444] text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#dc2626] active:scale-95 dark:border-gray-800 sm:hidden"
            style={{ bottom: 'calc(4rem + 8px)' }}
            aria-label="Add new card"
          >
            <span className="material-icons text-2xl font-bold">add</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default CardsView;


