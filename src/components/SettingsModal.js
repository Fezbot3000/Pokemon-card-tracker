import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/db';

const SettingsModal = ({ isOpen, onClose, selectedCollection, onRenameCollection, onImportCollection, onExportData }) => {
  const { isDark, toggleTheme } = useTheme();
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleResetData = async () => {
    // Check confirmation text
    if (resetConfirmation !== 'RESET') {
      alert('Please type RESET to confirm data deletion');
      return;
    }
    
    try {
      setIsResetting(true);
      const result = await db.resetAllData();
      if (result) {
        alert('All data has been reset successfully. The application will reload.');
        window.location.reload();
      } else {
        throw new Error('Failed to reset data');
      }
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('There was an error resetting data: ' + error.message);
    } finally {
      setIsResetting(false);
      setResetConfirmation('');
    }
  };
  
  const handleStartRenaming = () => {
    if (selectedCollection === 'All Cards') {
      alert('Cannot rename the "All Cards" view');
      return;
    }
    setNewCollectionName(selectedCollection);
    setIsRenaming(true);
  };
  
  const handleRenameConfirm = () => {
    if (newCollectionName && newCollectionName !== selectedCollection) {
      onRenameCollection(selectedCollection, newCollectionName);
      setIsRenaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`w-full max-w-lg p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            <span className="material-icons align-middle mr-2">settings</span>
            Settings
          </h2>
          <button 
            className={`text-2xl ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'}`}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Theme Setting */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              <span className="material-icons align-middle mr-2 text-base">palette</span>
              Theme
            </h3>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
              <button 
                onClick={toggleTheme}
                className={`
                  px-4 py-2 rounded-lg transition-colors
                  ${isDark 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-primary hover:bg-primary/90 text-white'
                  }
                `}
              >
                <span className="material-icons align-middle mr-1">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
                Switch to {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>

          {/* Collection Settings - only if selectedCollection is provided */}
          {selectedCollection && (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                <span className="material-icons align-middle mr-2 text-base">folder</span>
                Collection Settings
              </h3>
              {selectedCollection !== 'All Cards' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Current Collection: </span>
                      <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>{selectedCollection}</span>
                    </div>
                    <button
                      onClick={handleStartRenaming}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        isDark 
                          ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Rename
                    </button>
                  </div>
                  
                  {isRenaming && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none ${
                          isDark 
                            ? 'bg-gray-800 border-gray-600 text-gray-200' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      />
                      <button
                        onClick={handleRenameConfirm}
                        className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsRenaming(false)}
                        className={`px-3 py-2 rounded-lg ${
                          isDark 
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Data Management */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              <span className="material-icons align-middle mr-2 text-base">storage</span>
              Data Management
            </h3>
            <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Export or import your collection data for backup and transfer.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onExportData}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isDark
                    ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-800/50'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <span className="material-icons text-sm">download</span>
                Export Data
              </button>
              
              <button
                onClick={onImportCollection}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isDark
                    ? 'bg-green-900/30 text-green-400 hover:bg-green-800/50'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <span className="material-icons text-sm">upload</span>
                Import Data
              </button>
            </div>
          </div>
          
          {/* Reset Data */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700 border border-red-800' : 'bg-gray-50 border border-red-200'}`}>
            <h3 className={`text-lg font-medium mb-3 text-red-500`}>
              <span className="material-icons align-middle mr-2 text-base">warning</span>
              Reset All Data
            </h3>
            <p className={`mb-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              This action will permanently delete all your collections, sold items, and card images. 
              This cannot be undone. To confirm, type "RESET" in the field below.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Type RESET to confirm"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none ${
                  isDark 
                    ? 'bg-gray-800 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
              <button
                onClick={handleResetData}
                disabled={resetConfirmation !== 'RESET' || isResetting}
                className={`
                  px-4 py-2 rounded-lg font-medium flex items-center justify-center
                  ${resetConfirmation === 'RESET' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : isDark 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isResetting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                    Resetting...
                  </>
                ) : (
                  <>
                    <span className="material-icons text-sm mr-1">delete_forever</span>
                    Reset All Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 