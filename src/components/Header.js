import React, { useState } from 'react';

const Header = ({ 
  onAddCard, 
  selectedCollection, 
  collections, 
  onCollectionChange, 
  onAddCollection,
  onRenameCollection
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    // Reset rename state when closing settings
    if (!isSettingsOpen) {
      setNewCollectionName(selectedCollection);
      setIsRenaming(false);
    }
  };

  const handleAddNewCollection = () => {
    setNewCollectionName('');
    setIsNewCollectionModalOpen(true);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      // Check if collection name already exists
      if (!collections.includes(newCollectionName.trim())) {
        onAddCollection(newCollectionName.trim());
        setIsNewCollectionModalOpen(false);
        setNewCollectionName('');
      }
    }
  };

  const handleRenameCollection = () => {
    const trimmedName = newCollectionName.trim();
    if (trimmedName && trimmedName !== selectedCollection) {
      // Check if the new name doesn't already exist
      if (!collections.includes(trimmedName)) {
        onRenameCollection(selectedCollection, trimmedName);
        setIsRenaming(false);
      } else {
        alert('A collection with this name already exists');
      }
    }
  };

  const startRenaming = () => {
    setNewCollectionName(selectedCollection);
    setIsRenaming(true);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <span className="lock-icon">🔒</span>
          <div className="dropdown-container">
            <h1 className="app-title">{selectedCollection}</h1>
            <button className="dropdown-button" onClick={toggleDropdown}>▼</button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                {collections.map((collection, index) => (
                  <button 
                    key={index}
                    className="dropdown-item"
                    onClick={() => {
                      onCollectionChange(collection);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {collection}
                  </button>
                ))}
                <button 
                  className="dropdown-item add-collection"
                  onClick={() => {
                    handleAddNewCollection();
                    setIsDropdownOpen(false);
                  }}
                >
                  ➕ Add New Collection
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <button className="icon-button">📊</button>
          <button className="icon-button" onClick={toggleSettings}>⚙️</button>
          <button className="icon-button" onClick={onAddCard}>+</button>
        </div>
      </header>

      {isSettingsOpen && (
        <div className="settings-modal">
          <div className="settings-content">
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="close-button" onClick={toggleSettings}>×</button>
            </div>
            <div className="settings-body">
              <div className="settings-section">
                <h3>Collection Settings</h3>
                <div className="settings-option collection-rename">
                  <label>Collection Name:</label>
                  {isRenaming ? (
                    <div className="rename-input-group">
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="rename-input"
                      />
                      <button 
                        className="rename-button save"
                        onClick={handleRenameCollection}
                      >
                        Save
                      </button>
                      <button 
                        className="rename-button cancel"
                        onClick={() => setIsRenaming(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="collection-name-display">
                      <span>{selectedCollection}</span>
                      <button 
                        className="rename-button"
                        onClick={startRenaming}
                      >
                        Rename
                      </button>
                    </div>
                  )}
                </div>
                <div className="settings-option">
                  <label>
                    <input type="checkbox" /> Show archived collections
                  </label>
                </div>
              </div>
              <div className="settings-section">
                <h3>General</h3>
                <div className="settings-option">
                  <label>
                    <input type="checkbox" /> Dark Mode
                  </label>
                </div>
                <div className="settings-option">
                  <label>
                    <input type="checkbox" /> Auto-save changes
                  </label>
                </div>
              </div>
              <div className="settings-section">
                <h3>Currency</h3>
                <div className="settings-option">
                  <label>
                    Display Currency:
                    <select className="currency-select">
                      <option value="AUD">AUD</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <div className="settings-footer">
              <button className="save-button" onClick={toggleSettings}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {isNewCollectionModalOpen && (
        <div className="settings-modal">
          <div className="settings-content">
            <div className="settings-header">
              <h2>Create New Collection</h2>
              <button 
                className="close-button" 
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="settings-body">
              <div className="settings-section">
                <div className="settings-option collection-rename">
                  <label>Collection Name:</label>
                  <div className="rename-input-group">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="rename-input"
                      placeholder="Enter collection name"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="settings-footer">
              <button 
                className="rename-button cancel"
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;