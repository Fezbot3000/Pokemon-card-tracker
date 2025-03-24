import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/db';  // Use the correct db service
import JSZip from 'jszip';
import CollectionSelector from './CollectionSelector';

const Header = ({ 
  selectedCollection, 
  collections, 
  onCollectionChange, 
  onImportClick,
  onSettingsClick,
  refreshCollections,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [toast, setToast] = useState(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle mobile menu close on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint (1024px)
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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
    onSettingsClick();
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

  const handleImportCollection = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        
        // Create loading message
        const loadingEl = document.createElement('div');
        loadingEl.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]';
        loadingEl.innerHTML = `
          <div class="bg-white dark:bg-[#1B2131] p-6 rounded-lg shadow-lg text-center max-w-md">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p class="text-gray-700 dark:text-gray-300">Importing backup...</p>
            <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">This may take a few moments</p>
          </div>
        `;
        document.body.appendChild(loadingEl);
        
        // Start loading timer
        const startTime = Date.now();
        
        if (file.name.endsWith('.zip')) {
          // Process ZIP file
          try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            // Check if collections.json exists in the zip
            const collectionsFile = zipContent.file("data/collections.json");
            if (!collectionsFile) {
              throw new Error("Invalid backup file: missing collections.json");
            }
            
            // Read collections.json
            const collectionsJson = await collectionsFile.async("string");
            const collectionsData = JSON.parse(collectionsJson);
            
            // Validate format
            if (!collectionsData.collections) {
              throw new Error("Invalid backup format");
            }
            
            // Extract all images
            const imagePromises = [];
            zipContent.folder("images")?.forEach((relativePath, file) => {
              if (!file.dir) {
                const promise = (async () => {
                  const content = await file.async("blob");
                  const fileName = relativePath.split("/").pop();
                  const serialNumber = fileName.split(".")[0];
                  
                  if (serialNumber) {
                    await db.saveImage(serialNumber, content);
                  }
                })();
                imagePromises.push(promise);
              }
            });
            
            // Wait for all images to be processed
            await Promise.all(imagePromises);
            
            // Save collections data
            await db.saveCollections(collectionsData.collections);
            
            // Refresh collections in the UI (important!)
            if (refreshCollections) {
              refreshCollections();
            }
            
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
            console.error("Import error:", error);
            // Remove loading message
            document.body.removeChild(loadingEl);
            
            showToast(`Error importing backup: ${error.message}`, 'error');
          }
        } else {
          // Handle JSON files or other formats here
          // ...existing JSON handling code...
        }
      } catch (error) {
        console.error("Import error:", error);
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    
    // Add/remove class to prevent body scrolling when menu is open
    if (!isMobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
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
    
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <CollectionSelector
              collections={collections}
              selectedCollection={selectedCollection}
              onCollectionChange={onCollectionChange}
              onAddCollection={handleAddNewCollection}
            />
          </div>

          {/* Desktop buttons */}
          <div className="header-buttons">
            <button
              className="btn btn-secondary"
              onClick={() => onImportClick('price')}
              aria-label="Update Prices"
            >
              <span className="material-icons">sync</span>
              <span>Update Prices</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onImportClick('baseData')}
              aria-label="Import Base Data"
            >
              <span className="material-icons">file_download</span>
              <span>Import Base Data</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="material-icons">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={toggleSettings}
              aria-label="Settings"
            >
              <span className="material-icons">settings</span>
              <span>Settings</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-button"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <span className="material-icons">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu">
            <div className="mobile-menu-content">
              <button
                className="mobile-menu-item"
                onClick={() => {
                  onImportClick('price');
                  toggleMobileMenu();
                }}
              >
                <span className="material-icons">sync</span>
                <span>Update Prices</span>
              </button>
              <button
                className="mobile-menu-item"
                onClick={() => {
                  onImportClick('baseData');
                  toggleMobileMenu();
                }}
              >
                <span className="material-icons">file_download</span>
                <span>Import Base Data</span>
              </button>
              <button
                className="mobile-menu-item"
                onClick={() => {
                  toggleTheme();
                  toggleMobileMenu();
                }}
              >
                <span className="material-icons">
                  {isDarkMode ? 'light_mode' : 'dark_mode'}
                </span>
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button
                className="mobile-menu-item"
                onClick={() => {
                  toggleSettings();
                  toggleMobileMenu();
                }}
              >
                <span className="material-icons">settings</span>
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}
      </header>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#1B2131] rounded-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700/50">
              <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">New Collection</h2>
              <button 
                className="text-2xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setIsNewCollectionModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Collection Name:
              </label>
              <input
                ref={newCollectionInputRef}
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={handleNewCollectionKeyDown}
                className="w-full px-4 py-2 rounded-xl 
                         border border-gray-200 dark:border-gray-700/50 
                         bg-white dark:bg-[#252B3B]
                         text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                         placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter collection name"
                autoFocus
              />
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  className="px-4 py-2 rounded-lg
                           bg-gray-100 dark:bg-[#252B3B] 
                           text-gray-700 dark:text-gray-300
                           hover:bg-gray-200 dark:hover:bg-[#323B4B]
                           transition-colors"
                  onClick={() => setIsNewCollectionModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 rounded-lg
                           bg-primary text-white
                           hover:bg-primary/90
                           transition-colors"
                  onClick={handleCreateCollection}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;