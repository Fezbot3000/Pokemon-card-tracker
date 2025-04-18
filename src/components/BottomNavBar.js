import React from 'react';
import PropTypes from 'prop-types';

const BottomNavBar = ({ 
  currentView, 
  onViewChange, 
  onAddCard, 
  onSettingsClick
}) => {
  return (
    <div className="fixed sm:hidden bottom-0 left-0 w-full z-40 bg-[#000000] border-t border-gray-800 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex justify-around items-center py-2">
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            currentView === 'cards' 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => onViewChange('cards')}
        >
          <span className={`material-icons text-2xl ${currentView === 'cards' ? 'text-[#ef4444]' : ''}`}>dashboard</span>
          <span className={`text-xs mt-1 ${currentView === 'cards' ? 'text-[#ef4444]' : ''}`}>Cards</span>
        </button>
        
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            currentView === 'sold' 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
          onClick={() => onViewChange('sold')}
        >
          <span className={`material-icons text-2xl ${currentView === 'sold' ? 'text-[#ef4444]' : ''}`}>sell</span>
          <span className={`text-xs mt-1 ${currentView === 'sold' ? 'text-[#ef4444]' : ''}`}>Sold</span>
        </button>
        
        <button
          className="flex flex-col items-center justify-center px-4 py-1 text-gray-500 hover:text-gray-300"
          onClick={onAddCard}
        >
          <span className="material-icons text-2xl">add_circle</span>
          <span className="text-xs mt-1">Add</span>
        </button>
        
        <button
          className={`flex flex-col items-center justify-center px-4 py-1 ${
            currentView === 'settings' 
              ? 'text-[#ef4444]' 
              : 'text-gray-500 hover:text-gray-300'
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
  onAddCard: PropTypes.func.isRequired,
  onSettingsClick: PropTypes.func.isRequired
};

export default BottomNavBar;