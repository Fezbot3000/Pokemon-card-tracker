import React from 'react';

function MarketplaceNavigation({ currentView = 'marketplace', onViewChange = () => {} }) {
  // Determine which tab is active
  const isActive = (view) => {
    return currentView === view;
  };

  return (
    <div className="hidden lg:flex items-center space-x-6 mb-6">
      <button
        onClick={() => onViewChange('marketplace')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive('marketplace')
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <span className="flex items-center">
          <span className="material-icons mr-1 text-lg">store</span>
          Browse
        </span>
      </button>
      
      <button
        onClick={() => onViewChange('marketplace-selling')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive('marketplace-selling')
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <span className="flex items-center">
          <span className="material-icons mr-1 text-lg">sell</span>
          My Listings
        </span>
      </button>
      
      <button
        onClick={() => onViewChange('marketplace-messages')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive('marketplace-messages')
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <span className="flex items-center">
          <span className="material-icons mr-1 text-lg">chat</span>
          Messages
        </span>
      </button>
    </div>
  );
}

export default MarketplaceNavigation;
