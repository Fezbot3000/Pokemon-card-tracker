import React from 'react';

const Header = ({ onAddCard }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <span className="lock-icon">🔒</span>
        <h1 className="app-title">1999 BASE SET UNLIMITED</h1>
        <button className="dropdown-button">▼</button>
      </div>
      
      <div className="header-right">
        <button className="icon-button">📊</button>
        <button className="icon-button">⚙️</button>
        <button className="icon-button" onClick={onAddCard}>+</button>
      </div>
    </header>
  );
};

export default Header;