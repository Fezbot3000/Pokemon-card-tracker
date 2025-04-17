import React from 'react';

const BottomNavBar = ({ 
  currentView, 
  onViewChange, 
  onAddCard, 
  onSettingsClick
}) => {
  return (
    <div className="bottom-nav">
      <button
        className={`bottom-nav-item ${
          currentView === 'cards' ? 'active' : ''
        }`}
        onClick={() => onViewChange('cards')}
      >
        <span className="material-icons">dashboard</span>
        <span className="text-xs">Cards</span>
      </button>
      
      <button
        className={`bottom-nav-item ${
          currentView === 'sold' ? 'active' : ''
        }`}
        onClick={() => onViewChange('sold')}
      >
        <span className="material-icons">sell</span>
        <span className="text-xs">Sold</span>
      </button>
      
      <button
        className="bottom-nav-item"
        onClick={onAddCard}
      >
        <span className="material-icons">add_circle</span>
        <span className="text-xs">Add</span>
      </button>
      
      <button
        className={`bottom-nav-item ${
          currentView === 'settings' ? 'active' : ''
        } hidden sm:flex`}
        onClick={() => onViewChange('settings')}
      >
        <span className="material-icons">settings</span>
        <span className="text-xs">Settings</span>
      </button>
    </div>
  );
};

export default BottomNavBar; 