import React, { useState, useEffect } from 'react';
import PersistentViewContainer from './PersistentViewContainer';

/**
 * LazyViewManager - Organizes views and prevents unmounting during navigation
 * This component manages transitions between different views (cards, sold items, settings)
 * without forcing complete unmounts/remounts of components
 */
const LazyViewManager = ({
  activeView = 'cards',
  cardsView,
  soldItemsView,
  settingsView,
  detailsView,
  newCardView,
  onViewChange,
}) => {
  // Track which views have been initialized
  const [initializedViews, setInitializedViews] = useState({
    cards: false,
    sold: false,
    settings: false,
    details: false,
    newCard: false,
  });

  // Set a view as initialized once it becomes active
  useEffect(() => {
    if (!initializedViews[activeView]) {
      setInitializedViews(prev => ({
        ...prev,
        [activeView]: true,
      }));
    }
  }, [activeView, initializedViews]);

  return (
    <div className="view-manager-container">
      {/* Cards View - Always initialize this one first */}
      <PersistentViewContainer
        viewKey="cards"
        isActive={activeView === 'cards'}
        forceRefresh={false}
      >
        {cardsView}
      </PersistentViewContainer>

      {/* Sold Items - Only initialize if it's been viewed */}
      {(initializedViews.sold || activeView === 'sold') && (
        <PersistentViewContainer
          viewKey="sold"
          isActive={activeView === 'sold'}
          forceRefresh={false}
        >
          {soldItemsView}
        </PersistentViewContainer>
      )}

      {/* Settings View - Only initialize if it's been viewed */}
      {(initializedViews.settings || activeView === 'settings') && (
        <PersistentViewContainer
          viewKey="settings"
          isActive={activeView === 'settings'}
          forceRefresh={false}
        >
          {settingsView}
        </PersistentViewContainer>
      )}

      {/* Card Details - Shown when a card is selected */}
      {(initializedViews.details || activeView === 'details') && (
        <PersistentViewContainer
          viewKey="details"
          isActive={activeView === 'details'}
          forceRefresh={true} // Always refresh details view with new data
        >
          {detailsView}
        </PersistentViewContainer>
      )}

      {/* New Card Form */}
      {(initializedViews.newCard || activeView === 'newCard') && (
        <PersistentViewContainer
          viewKey="newCard"
          isActive={activeView === 'newCard'}
          forceRefresh={true} // Always refresh new card form
        >
          {newCardView}
        </PersistentViewContainer>
      )}
    </div>
  );
};

export default LazyViewManager;
