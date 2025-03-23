import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/db';  // Use the correct db service
import JSZip from 'jszip';

const Header = ({ 
  onAddCard, 
  selectedCollection, 
  collections, 
  onCollectionChange, 
  onAddCollection,
  onRenameCollection,
  onImportClick,
  onDeleteCollection,
  collectionData,
  exchangeRate,
  refreshCollections
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const dropdownRef = useRef(null);
  const newCollectionInputRef = useRef(null);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key press for settings modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isSettingsOpen) {
          toggleSettings();
        }
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isSettingsOpen]);

  // Handle escape key press for new collection modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isNewCollectionModalOpen) {
          setIsNewCollectionModalOpen(false);
        }
      }
    };

    if (isNewCollectionModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isNewCollectionModalOpen]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    if (!isSettingsOpen) {
      setNewCollectionName(selectedCollection);
      setIsRenaming(false);
    }
  };

  const handleCollectionSelect = (collection) => {
    onCollectionChange(collection);
    setIsDropdownOpen(false);
  };

  const handleAddNewCollection = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsNewCollectionModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim() && !collections.includes(newCollectionName.trim())) {
      onAddCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsNewCollectionModalOpen(false);
    }
  };

  const handleRenameCollection = () => {
    if (newCollectionName && newCollectionName !== selectedCollection) {
      onRenameCollection(selectedCollection, newCollectionName);
    }
    setIsRenaming(false);
  };

  const handleDeleteCollection = () => {
    if (collections.length > 1) {
      onDeleteCollection(selectedCollection);
      setIsSettingsOpen(false);
    } else {
      alert('Cannot delete the last collection');
    }
  };

  const startRenaming = () => {
    setNewCollectionName(selectedCollection);
    setIsRenaming(true);
  };

  // Function to show a toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleExportData = async () => {
    try {
      // Create a new ZIP file
      const zip = new JSZip();
      
      // Get ALL collections data from database
      const allCollections = await db.getCollections();
      
      // Create a data folder in the ZIP
      const dataFolder = zip.folder("data");
      
      // Add collections data as JSON - include ALL collections
      const collectionsData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        collections: allCollections,
        settings: {
          defaultCollection: selectedCollection
        }
      };

      // Add collections.json to the data folder
      dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
      
      // Create an images folder in the ZIP
      const imagesFolder = zip.folder("images");
      
      // Process ALL images from ALL collections
      const imagePromises = [];
      
      // Loop through all collections
      for (const [collectionName, cards] of Object.entries(allCollections)) {
        if (!Array.isArray(cards)) continue;
        
        for (const card of cards) {
          // Get image from database using slabSerial as ID
          const promise = (async () => {
            try {
              const imageBlob = await db.getImage(card.slabSerial);
              
              if (!imageBlob) {
                return;
              }
              
              // Add image to ZIP with slab serial as filename
              const extension = imageBlob.type.split('/')[1] || 'jpg';
              const filename = `${card.slabSerial}.${extension}`;
              await imagesFolder.file(filename, imageBlob);
              
              // Update card with image path
              card.imagePath = `images/${filename}`;
            } catch (error) {
              // Silent fail for individual images
            }
          })();
          imagePromises.push(promise);
        }
      }
      
      try {
        // Wait for all images to be processed
        await Promise.all(imagePromises);
        
        // Update collections data with image paths
        collectionsData.collections = allCollections;
        dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
        
        // Add a README file
        const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/collections.json: All collections and card data
- /images/: All card images referenced in collections.json

To import this backup:
1. Use the "Import Collection" button in the app settings
2. Select this ZIP file
3. All your collections and images will be restored`;
        
        zip.file("README.txt", readme);
        
        // Generate the ZIP file with maximum compression
        const content = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: {
            level: 9
          }
        });
        
        // Create download link for ZIP file
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `pokemon-card-tracker-backup-${timestamp}.zip`;
        document.body.appendChild(link); // Ensure the link is in the DOM
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }, 100);

        // Show success toast
        showToast('Backup exported successfully!');
      } catch (error) {
        showToast('Error creating backup. Please try again.', 'error');
      }
    } catch (error) {
      showToast('Error exporting data. Please try again.', 'error');
    }
  };

  const handleImportCollection = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json,.csv';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Create loading message element
      const loadingEl = document.createElement('div');
      loadingEl.style.position = 'fixed';
      loadingEl.style.top = '0';
      loadingEl.style.left = '0';
      loadingEl.style.right = '0';
      loadingEl.style.bottom = '0';
      loadingEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      loadingEl.style.display = 'flex';
      loadingEl.style.alignItems = 'center';
      loadingEl.style.justifyContent = 'center';
      loadingEl.style.zIndex = '9999';
      loadingEl.style.color = 'white';
      loadingEl.style.fontSize = '24px';
      loadingEl.style.fontWeight = 'bold';
      loadingEl.innerHTML = '<div>Importing data, please wait...</div>';
      document.body.appendChild(loadingEl);
      
      // Record start time
      const startTime = Date.now();
      
      try {
        if (file.name.endsWith('.zip')) {
          // Handle ZIP import
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const zip = new JSZip();
              const zipContent = await zip.loadAsync(event.target.result);
              
              // Read collections data
              const collectionsJsonFile = zipContent.file("data/collections.json");
              if (!collectionsJsonFile) {
                throw new Error('Invalid backup format: collections.json not found');
              }
              
              const collectionsJson = await collectionsJsonFile.async("text");
              const importedData = JSON.parse(collectionsJson);
              
              // Validate backup format
              if (!importedData.collections) {
                throw new Error('Invalid backup format: missing collections data');
              }
              
              // Process images from ALL collections
              const allCollections = importedData.collections;
              
              for (const collectionName of Object.keys(allCollections)) {
                const collectionData = allCollections[collectionName];
                if (!Array.isArray(collectionData)) {
                  continue;
                }
                
                for (const card of collectionData) {
                  if (card.imagePath) {
                    try {
                      // Get image from ZIP
                      const imageFile = zipContent.file(card.imagePath);
                      if (imageFile) {
                        const imageBlob = await imageFile.async("blob");
                        // Save the image to our database
                        await db.saveImage(card.slabSerial, imageBlob);
                      }
                    } catch (error) {
                      // Silent fail for individual images
                    }
                  }
                }
              }
              
              // Save ALL collections to database, replacing existing collections
              await db.saveCollections(allCollections);
              
              // Refresh the collections in the parent component
              await refreshCollections();
              
              // Ensure minimum loading time of 3 seconds
              const elapsedTime = Date.now() - startTime;
              const minimumLoadingTime = 3000; // 3 seconds
              if (elapsedTime < minimumLoadingTime) {
                await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
              }
              
              // Remove loading message
              document.body.removeChild(loadingEl);
              
              // Show success toast
              showToast('Backup imported successfully!');
              
              // Close settings modal
              setIsSettingsOpen(false);
            } catch (error) {
              // Remove loading message
              document.body.removeChild(loadingEl);
              
              showToast(`Error importing backup: ${error.message}`, 'error');
            }
          };
          reader.readAsArrayBuffer(file);
        } else if (file.name.endsWith('.json')) {
          // Handle JSON import
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const importedData = JSON.parse(event.target.result);
              
              // Validate backup format
              if (!importedData.collections) {
                throw new Error('Invalid backup file format: missing collections data');
              }

              // Save ALL collections to database, replacing existing collections
              await db.saveCollections(importedData.collections);

              // Process and save ALL images
              if (importedData.images) {
                for (const [slabSerial, base64Data] of Object.entries(importedData.images)) {
                  try {
                    // Convert base64 back to blob
                    const response = await fetch(base64Data);
                    const blob = await response.blob();
                    
                    // Save the image to our database
                    await db.saveImage(slabSerial, blob);
                  } catch (error) {
                    // Silent fail for individual images
                  }
                }
              }

              // Update UI
              const collections = Object.keys(importedData.collections);
              if (collections.length > 0) {
                onCollectionChange(collections[0]);
              }

              // Refresh the collections in the parent component
              await refreshCollections();

              // Ensure minimum loading time of 3 seconds
              const elapsedTime = Date.now() - startTime;
              const minimumLoadingTime = 3000; // 3 seconds
              if (elapsedTime < minimumLoadingTime) {
                await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
              }
              
              // Remove loading message
              document.body.removeChild(loadingEl);
              
              // Show success toast
              showToast('Backup imported successfully!');
              
              // Close settings modal
              setIsSettingsOpen(false);
            } catch (error) {
              // Remove loading message
              document.body.removeChild(loadingEl);
              
              showToast(`Error importing backup: ${error.message}`, 'error');
            }
          };
          reader.readAsText(file);
        } else {
          // Handle legacy CSV import
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const csvContent = event.target.result;
              const lines = csvContent.split('\n');
              const headers = lines[0].split(',');
              
              const serialIndex = headers.indexOf('Slab Serial #');
              const playerIndex = headers.indexOf('Player');
              const cardIndex = headers.indexOf('Card');
              const setIndex = headers.indexOf('Set');
              const yearIndex = headers.indexOf('Year');
              const categoryIndex = headers.indexOf('Category');
              const conditionIndex = headers.indexOf('Condition');
              const investmentIndex = headers.indexOf('Investment (AUD)');
              const currentValueIndex = headers.indexOf('Current Value (AUD)');
              
              if (serialIndex === -1 || investmentIndex === -1 || currentValueIndex === -1) {
                const error = 'Invalid CSV format: Missing required columns. Please use a file exported from this app.';
                document.body.removeChild(loadingEl);
                showToast(error, 'error');
                return;
              }
              
              const cards = lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                  const values = line.split(',');
                  return {
                    slabSerial: values[serialIndex],
                    player: values[playerIndex]?.replace(/^"|"$/g, '') || '',
                    card: values[cardIndex]?.replace(/^"|"$/g, '') || '',
                    set: values[setIndex]?.replace(/^"|"$/g, '') || '',
                    year: values[yearIndex] || '',
                    category: values[categoryIndex]?.replace(/^"|"$/g, '') || '',
                    condition: values[conditionIndex]?.replace(/^"|"$/g, '') || '',
                    investmentAUD: parseFloat(values[investmentIndex]),
                    currentValueAUD: parseFloat(values[currentValueIndex]),
                    potentialProfit: parseFloat(values[currentValueIndex]) - parseFloat(values[investmentIndex])
                  };
                });

              // Create a new collection with imported data
              const newCollectionName = `${selectedCollection} (Imported)`;
              
              // Get existing collections
              const existingCollections = await db.getCollections();
              
              // Add the new collection
              const newCollections = {
                ...existingCollections,
                [newCollectionName]: cards
              };
              
              // Save all collections
              await db.saveCollections(newCollections);
              
              // Switch to the new collection
              onCollectionChange(newCollectionName);
              
              // Refresh the collections in the parent component
              await refreshCollections();
              
              // Ensure minimum loading time of 3 seconds
              const elapsedTime = Date.now() - startTime;
              const minimumLoadingTime = 3000; // 3 seconds
              if (elapsedTime < minimumLoadingTime) {
                await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
              }
              
              // Remove loading message
              document.body.removeChild(loadingEl);
              
              // Show success toast
              showToast('Collection imported successfully!');
              
              // Close settings modal
              setIsSettingsOpen(false);
            } catch (error) {
              // Remove loading message
              document.body.removeChild(loadingEl);
              
              showToast(`Error importing CSV: ${error.message}`, 'error');
            }
          };
          reader.readAsText(file);
        }
      } catch (error) {
        // Remove loading message
        document.body.removeChild(loadingEl);
        
        showToast(`Error importing file: ${error.message}`, 'error');
      }
    };
    
    input.click();
  };

  const handleNewCollectionKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateCollection();
    }
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg
                     ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
        >
          {toast.message}
        </div>
      )}
    
      <header className="sticky top-[44px] z-40 flex justify-between items-center px-6 py-4 bg-white dark:bg-[#0B0F19] border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-4">
          <span className="text-[#4F46E5] text-xl material-icons">lock</span>
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252B3B] transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                toggleDropdown();
              }}
            >
              <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200 select-none">{selectedCollection}</h1>
              <span className="material-icons text-gray-600 dark:text-gray-400">expand_more</span>
            </button>

            {isDropdownOpen && (
              <div className="dropdown-menu bg-white dark:bg-[#1B2131] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/50 overflow-hidden py-1">
                <button
                  className="dropdown-item text-gray-700 dark:text-gray-200"
                  onClick={() => {
                    onCollectionChange('All Cards');
                    setIsDropdownOpen(false);
                  }}
                >
                  {selectedCollection === 'All Cards' && (
                    <span className="material-icons text-[#4F46E5] text-sm">check</span>
                  )}
                  <span>All Cards</span>
                </button>
                
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                
                {collections.map(collection => (
                  <button
                    key={collection}
                    className="dropdown-item text-gray-700 dark:text-gray-200"
                    onClick={() => {
                      onCollectionChange(collection);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {collection === selectedCollection && (
                      <span className="material-icons text-[#4F46E5] text-sm">check</span>
                    )}
                    <span>{collection}</span>
                  </button>
                ))}
                
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                
                <button
                  className="dropdown-item text-[#4F46E5]"
                  onClick={handleAddNewCollection}
                >
                  <span className="material-icons text-sm">add</span>
                  <span>New Collection</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="header-nav">
            <button 
              type="button"
              className="btn btn-primary flex items-center gap-2"
              onClick={() => onImportClick('price')}
            >
              <span className="material-icons">update</span>
              Update Prices
            </button>
            <button 
              type="button"
              className="btn btn-secondary flex items-center gap-2"
              onClick={() => onImportClick('baseData')}
            >
              <span className="material-icons">upload_file</span>
              Import Base Data
            </button>
          </div>
        </div>

        <div className="header-buttons">
          <button 
            type="button"
            className="btn btn-secondary flex items-center gap-2"
            onClick={toggleTheme}
          >
            <span className="material-icons">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button 
            type="button"
            className="btn btn-secondary flex items-center gap-2"
            onClick={toggleSettings}
          >
            <span className="material-icons">settings</span>
            Settings
          </button>
          <button 
            type="button"
            className="btn btn-primary flex items-center gap-2"
            onClick={onAddCard}
          >
            <span className="material-icons">add</span>
            Add Card
          </button>
        </div>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span className="material-icons">menu</span>
        </button>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? '' : 'hidden'}`}>
        <div className="mobile-menu-header">
          <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">Menu</h2>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#252B3B]"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="mobile-menu-content">
          <button 
            className="mobile-menu-item"
            onClick={() => {
              onImportClick('price');
              setIsMobileMenuOpen(false);
            }}
          >
            <span className="material-icons">update</span>
            Update Prices
          </button>
          
          <button 
            className="mobile-menu-item"
            onClick={() => {
              onImportClick('baseData');
              setIsMobileMenuOpen(false);
            }}
          >
            <span className="material-icons">upload_file</span>
            Import Base Data
          </button>
          
          <button 
            className="mobile-menu-item"
            onClick={() => {
              toggleTheme();
              setIsMobileMenuOpen(false);
            }}
          >
            <span className="material-icons">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          
          <button 
            className="mobile-menu-item"
            onClick={() => {
              toggleSettings();
              setIsMobileMenuOpen(false);
            }}
          >
            <span className="material-icons">settings</span>
            Settings
          </button>
          
          <button 
            className="mobile-menu-item"
            onClick={() => {
              onAddCard();
              setIsMobileMenuOpen(false);
            }}
          >
            <span className="material-icons">add</span>
            Add Card
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#1B2131] rounded-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700/50">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Settings</h2>
              <button 
                type="button"
                className="text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" 
                onClick={toggleSettings}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-lg mb-4 text-gray-800 dark:text-gray-200">Collection Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-2">Collection Name:</label>
                    {isRenaming ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-[#252B3B] border border-gray-300 dark:border-gray-700/50 rounded-lg text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        />
                        <button 
                          type="button"
                          className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4F46E5]/90 transition-colors"
                          onClick={handleRenameCollection}
                        >
                          Save
                        </button>
                        <button 
                          type="button"
                          className="px-4 py-2 bg-gray-200 dark:bg-[#252B3B] text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-[#323B4B] transition-colors"
                          onClick={() => setIsRenaming(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <span className="text-gray-700 dark:text-gray-200">{selectedCollection}</span>
                        <button 
                          type="button"
                          className="px-4 py-2 bg-gray-100 dark:bg-[#252B3B] text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-[#323B4B] transition-colors"
                          onClick={startRenaming}
                        >
                          Rename
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Data Import/Export section */}
                  <div>
                    <h4 className="text-gray-600 dark:text-gray-300 mb-2 font-medium">Data Management</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">These buttons work globally across all collections.</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        type="button"
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                        onClick={handleExportData}
                      >
                        <span className="material-icons text-base">download</span>
                        Export All Data
                      </button>
                      <button 
                        type="button"
                        className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors flex items-center gap-2"
                        onClick={handleImportCollection}
                      >
                        <span className="material-icons text-base">upload</span>
                        Import Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700/50 pt-6">
                <h3 className="text-red-600 dark:text-red-500 font-medium mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Once you delete a collection, there is no going back. Please be certain.
                </p>
                <button 
                  type="button"
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                  onClick={handleDeleteCollection}
                >
                  Delete Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {isNewCollectionModalOpen && (
        <div className="modal" onClick={() => setIsNewCollectionModalOpen(false)}>
          <div 
            className="modal-content"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">New Collection</h2>
              <button 
                className="modal-close"
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <label className="modal-label">
                Collection Name:
              </label>
              <input
                ref={newCollectionInputRef}
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={handleNewCollectionKeyDown}
                className="modal-input"
                placeholder="Enter collection name"
              />
              
              <div className="modal-footer">
                <button 
                  className="modal-btn-cancel"
                  onClick={() => setIsNewCollectionModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn-create"
                  onClick={handleCreateCollection}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="collection-info">
        <span className="material-icons">view_list</span>
        Total Cards: {selectedCollection === 'All Cards' 
          ? Object.values(collections).flat().length 
          : (collectionData ? collectionData.length : 0)}
      </div>
    </>
  );
};

export default Header;