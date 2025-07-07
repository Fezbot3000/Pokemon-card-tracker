import React from 'react';
import PropTypes from 'prop-types';

const BottomNavBar = ({ currentView, onViewChange, onSettingsClick }) => {
  // Helper function to check if current view is in the sold section
  const isSoldSection = () => {
    return ['sold', 'sold-items', 'purchase-invoices'].includes(currentView);
  };

  // Helper function to check if current view is in the marketplace section
  const isMarketplaceSection = () => {
    return [
      'marketplace',
      'marketplace-selling',
      'marketplace-messages',
    ].includes(currentView);
  };

  // Check if we're in an active chat in the marketplace messages section
  const isInActiveChat = () => {
    // Check if we're in marketplace messages and if there's an active chat
    if (currentView === 'marketplace-messages') {
      // Check if there's an active chat by looking for the hide-header-footer class
      return document.body.classList.contains('hide-header-footer');
    }
    return false;
  };

  // Safe navigation handler
  const handleNavigation = targetView => {
    try {
      // Add a small delay to ensure any ongoing state updates complete
      setTimeout(() => {
        if (onViewChange && typeof onViewChange === 'function') {
          onViewChange(targetView);
        }
      }, 0);
    } catch (error) {
      console.error('Error navigating to view:', targetView, error);
      // Fallback: try direct navigation
      if (onViewChange && typeof onViewChange === 'function') {
        onViewChange(targetView);
      }
    }
  };

  // Safe settings handler
  const handleSettingsClick = () => {
    try {
      if (onSettingsClick && typeof onSettingsClick === 'function') {
        onSettingsClick();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  };

  // Don't render the bottom nav bar if we're in an active chat
  if (isInActiveChat()) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full border-t border-gray-200 bg-white pb-2 dark:border-gray-800 dark:bg-black sm:hidden">
      <div className="flex items-center justify-around py-1">
        <button
          className={`flex flex-col items-center justify-center px-3 py-0.5 ${
            currentView === 'cards'
              ? 'text-[#ef4444]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleNavigation('cards')}
        >
          <span
            className={`material-icons text-xl ${currentView === 'cards' ? 'text-[#ef4444]' : ''}`}
          >
            dashboard
          </span>
          <span
            className={`mt-0.5 text-xs ${currentView === 'cards' ? 'text-[#ef4444]' : ''}`}
          >
            Cards
          </span>
        </button>

        <button
          className={`flex flex-col items-center justify-center px-3 py-0.5 ${
            isSoldSection()
              ? 'text-[#ef4444]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleNavigation('purchase-invoices')}
        >
          <span
            className={`material-icons text-xl ${isSoldSection() ? 'text-[#ef4444]' : ''}`}
          >
            sell
          </span>
          <span
            className={`mt-0.5 text-xs ${isSoldSection() ? 'text-[#ef4444]' : ''}`}
          >
            Invoices
          </span>
        </button>

        <button
          className={`flex flex-col items-center justify-center px-3 py-0.5 ${
            isMarketplaceSection()
              ? 'text-[#ef4444]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleNavigation('marketplace')}
        >
          <span
            className={`material-icons text-xl ${isMarketplaceSection() ? 'text-[#ef4444]' : ''}`}
          >
            storefront
          </span>
          <span
            className={`mt-0.5 text-xs ${isMarketplaceSection() ? 'text-[#ef4444]' : ''}`}
          >
            Marketplace
          </span>
        </button>

        {/* Add button removed from bottom nav */}

        <button
          className={`flex flex-col items-center justify-center px-3 py-0.5 ${
            currentView === 'settings'
              ? 'text-[#ef4444]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={handleSettingsClick}
        >
          <span
            className={`material-icons text-xl ${currentView === 'settings' ? 'text-[#ef4444]' : ''}`}
          >
            settings
          </span>
          <span
            className={`mt-0.5 text-xs ${currentView === 'settings' ? 'text-[#ef4444]' : ''}`}
          >
            Settings
          </span>
        </button>
      </div>
    </div>
  );
};

BottomNavBar.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
  onSettingsClick: PropTypes.func.isRequired,
};

export default BottomNavBar;
