import React from 'react';
import PropTypes from 'prop-types';

const BottomNavBar = ({ 
  currentView, 
  onViewChange, 
  onSettingsClick
}) => {
  // Helper function to check if current view is in the sold section
  const isSoldSection = () => {
    return ['sold', 'sold-items', 'purchase-invoices'].includes(currentView);
  };
  return (
    <div className="fixed sm:hidden bottom-0 left-0 w-full z-40 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex justify-around items-center py-2">
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            currentView === 'cards' 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => onViewChange('cards')}
        >
          <span className={`material-icons text-2xl ${currentView === 'cards' ? 'text-[#ef4444]' : ''}`}>dashboard</span>
          <span className={`text-xs mt-1 ${currentView === 'cards' ? 'text-[#ef4444]' : ''}`}>Cards</span>
        </button>
        
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            isSoldSection() 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => onViewChange('purchase-invoices')}
        >
          <span className={`material-icons text-2xl ${isSoldSection() ? 'text-[#ef4444]' : ''}`}>sell</span>
          <span className={`text-xs mt-1 ${isSoldSection() ? 'text-[#ef4444]' : ''}`}>Invoices</span>
        </button>
        
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            currentView === 'marketplace' 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => onViewChange('marketplace')}
        >
          <span className={`material-icons text-2xl ${currentView === 'marketplace' ? 'text-[#ef4444]' : ''}`}>storefront</span>
          <span className={`text-xs mt-1 ${currentView === 'marketplace' ? 'text-[#ef4444]' : ''}`}>Marketplace</span>
        </button>
        
        {/* Add button removed from bottom nav */}
        
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            currentView === 'settings' 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={onSettingsClick}
        >
          <span className={`material-icons text-2xl ${currentView === 'settings' ? 'text-[#ef4444]' : ''}`}>settings</span>
          <span className={`text-xs mt-1 ${currentView === 'settings' ? 'text-[#ef4444]' : ''}`}>Settings</span>
        </button>
      </div>
    </div>
  );
};

BottomNavBar.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
  onSettingsClick: PropTypes.func.isRequired
};

export default BottomNavBar;