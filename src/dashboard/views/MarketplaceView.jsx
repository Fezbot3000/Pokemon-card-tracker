import React from 'react';
import Marketplace from '../../components/Marketplace/Marketplace';
import MarketplaceSelling from '../../components/Marketplace/MarketplaceSelling';
import MarketplaceMessages from '../../components/Marketplace/MarketplaceMessages';

function MarketplaceView({ currentView, onViewChange }) {
  if (currentView === 'marketplace') {
    return <Marketplace currentView={currentView} onViewChange={onViewChange} />;
  }

  if (currentView === 'marketplace-selling') {
    return (
      <MarketplaceSelling currentView={currentView} onViewChange={onViewChange} />
    );
  }

  // default to messages variant
  return (
    <MarketplaceMessages currentView={currentView} onViewChange={onViewChange} />
  );
}

export default MarketplaceView;


