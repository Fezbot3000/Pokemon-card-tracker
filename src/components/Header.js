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
  onDeleteCollection,
  onViewChange,
  currentView
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

        try {
          if (file.name.endsWith('.zip')) {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            // Check if collections.json exists
            const collectionsFile = zipContent.file("data/collections.json");
            if (!collectionsFile) {
              throw new Error("Invalid backup file: missing collections.json");
            }
            
            // Load collections data
            const collectionsJson = await collectionsFile.async("string");
            const collectionsData = JSON.parse(collectionsJson);
            
            // Validate format
            if (!collectionsData.collections) {
              throw new Error("Invalid backup format");
            }
            
            // Extract images with error handling
            const imagePromises = [];
            let failedImages = 0;
            
            zipContent.folder("images")?.forEach((relativePath, file) => {
              if (!file.dir) {
                const promise = (async () => {
                  try {
                    const content = await file.async("blob");
                    const fileName = relativePath.split("/").pop();
                    const serialNumber = fileName.split(".")[0];
                    
                    if (serialNumber) {
                      await db.saveImage(serialNumber, content);
                    }
                  } catch (error) {
                    console.error(`Failed to import image ${relativePath}:`, error);
                    failedImages++;
                  }
                })();
                imagePromises.push(promise);
              }
            });
            
            // Wait for all images to be processed
            await Promise.all(imagePromises);
            
            // Save each collection with error handling
            let failedCollections = 0;
            for (const [collectionName, cards] of Object.entries(collectionsData.collections)) {
              try {
                await db.saveCollection(collectionName, cards);
                console.log(`Imported collection: ${collectionName} with ${cards.length} cards`);
              } catch (error) {
                console.error(`Failed to import collection ${collectionName}:`, error);
                failedCollections++;
              }
            }
            
            // Show appropriate success/warning message
            if (failedImages > 0 || failedCollections > 0) {
              showToast(
                `Import completed with some issues: ${failedCollections ? `${failedCollections} collections failed` : ''} ${failedImages ? `${failedImages} images failed` : ''}. Check console for details.`,
                'warning'
              );
            } else {
              showToast('Backup imported successfully!');
            }
            
            // Refresh collections
            const savedCollections = await db.getCollections();
            refreshCollections(savedCollections);
          }
        } finally {
          // Remove loading message
          document.body.removeChild(loadingEl);
        }
      } catch (error) {
        console.error("Import error:", error);
        showToast(`Error importing backup: ${error.message}`, 'error');
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
    <div className="app-header">
      <div className="header-content">
        <div className="header-left">
          <img src="/icon-192x192.png" alt="Logo" className="w-8 h-8 rounded-lg mr-3" />
          <h1 className="text-2xl font-bold text-white">Pokemon Card Tracker</h1>
        </div>

        <div className="header-center">
          {selectedCollection && (
            <CollectionSelector
              collections={collections}
              selectedCollection={selectedCollection}
              onCollectionChange={onCollectionChange}
              onAddCollection={handleAddNewCollection}
            />
          )}
        </div>

        <div className="header-right">
          {selectedCollection && (
            <>
              <button
                onClick={() => onImportClick('baseData')}
                className="btn btn-secondary flex items-center gap-2"
                title="Import Base Data"
              >
                <span className="material-icons">upload_file</span>
                <span className="hidden xl:inline">Import Base Data</span>
              </button>
              <button
                onClick={() => onImportClick('priceUpdate')}
                className="btn btn-secondary flex items-center gap-2"
                title="Update Prices"
              >
                <span className="material-icons">update</span>
                <span className="hidden xl:inline">Update Prices</span>
              </button>
            </>
          )}

          <button
            onClick={() => onViewChange(currentView === 'collection' ? 'sold' : 'collection')}
            className="btn btn-secondary flex items-center gap-2"
            title={currentView === 'collection' ? "View Sold Cards" : "View Collection"}
          >
            <span className="material-icons">
              {currentView === 'collection' ? 'sell' : 'grid_view'}
            </span>
            <span className="hidden xl:inline">
              {currentView === 'collection' ? 'Sold Cards' : 'Collection'}
            </span>
          </button>

          <button
            onClick={toggleTheme}
            className="btn btn-secondary flex items-center gap-2"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span className="material-icons">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="hidden xl:inline">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            onClick={toggleSettings}
            className="btn btn-secondary flex items-center gap-2"
            title="Settings"
          >
            <span className="material-icons">settings</span>
            <span className="hidden xl:inline">Settings</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden btn btn-secondary"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="material-icons">menu</span>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            {selectedCollection && (
              <>
                <button
                  onClick={() => {
                    onImportClick('baseData');
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item"
                >
                  <span className="material-icons mr-2">upload_file</span>
                  Import Base Data
                </button>
                <button
                  onClick={() => {
                    onImportClick('priceUpdate');
                    setIsMobileMenuOpen(false);
                  }}
                  className="mobile-menu-item"
                >
                  <span className="material-icons mr-2">update</span>
                  Update Prices
                </button>
              </>
            )}

            <button
              onClick={() => {
                onViewChange(currentView === 'collection' ? 'sold' : 'collection');
                setIsMobileMenuOpen(false);
              }}
              className="mobile-menu-item"
            >
              <span className="material-icons mr-2">
                {currentView === 'collection' ? 'sell' : 'grid_view'}
              </span>
              {currentView === 'collection' ? 'Sold Cards' : 'Collection'}
            </button>

            <button
              onClick={() => {
                toggleTheme();
                setIsMobileMenuOpen(false);
              }}
              className="mobile-menu-item"
            >
              <span className="material-icons mr-2">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              onClick={() => {
                toggleSettings();
                setIsMobileMenuOpen(false);
              }}
              className="mobile-menu-item"
            >
              <span className="material-icons mr-2">settings</span>
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg
                     ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Header;