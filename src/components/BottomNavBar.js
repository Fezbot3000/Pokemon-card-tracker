import React from 'react';

const BottomNavBar = ({ currentView, onViewChange, onAddCard, onMenuClick }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1B2131] border-t border-gray-200 dark:border-gray-700 z-50 flex items-center justify-around h-14">
      <button
        onClick={() => onViewChange('cards')}
        className={`flex flex-col items-center justify-center w-1/4 py-1 ${
          currentView === 'cards'
            ? 'text-primary'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <span className="material-icons text-xl">grid_view</span>
        <span className="text-xs mt-0.5">Cards</span>
      </button>
      
      <button
        onClick={() => onViewChange('sold')}
        className={`flex flex-col items-center justify-center w-1/4 py-1 ${
          currentView === 'sold'
            ? 'text-primary'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <span className="material-icons text-xl">sell</span>
        <span className="text-xs mt-0.5">Sold</span>
      </button>
      
      <button
        onClick={onAddCard}
        className="flex flex-col items-center justify-center w-1/4 py-1 text-gray-500 dark:text-gray-400"
      >
        <span className="material-icons text-xl">add_circle</span>
        <span className="text-xs mt-0.5">Add Card</span>
      </button>
      
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center w-1/4 py-1 text-gray-500 dark:text-gray-400"
      >
        <span className="material-icons text-xl">menu</span>
        <span className="text-xs mt-0.5">Menu</span>
      </button>
    </div>
  );
};

export default BottomNavBar; 