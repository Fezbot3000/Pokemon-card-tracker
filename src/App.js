import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import ProfitChangeModal from './components/ProfitChangeModal';
import Home from './components/Home';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/Pricing';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import { db } from './services/db';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';
import SoldItems from './components/SoldItems/SoldItems';
import SettingsModal from './components/SettingsModal';
import JSZip from 'jszip';
import { Toaster, toast } from 'react-hot-toast';

function AppContent() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfitChangeModal, setShowProfitChangeModal] = useState(false);
  const [profitChangeData, setProfitChangeData] = useState({
    oldProfit: 0,
    newProfit: 0
  });
  const [currentView, setCurrentView] = useState('cards'); // 'cards' or 'sold'
  
  const {
    cards,
    loading,
    error,
    selectedCard,
    exchangeRate,
    importCsvData,
    selectCard,
    clearSelectedCard,
    updateCard,
    deleteCard,
    addCard
  } = useCardData();

  // Memoized collection data
  const collectionData = useMemo(() => {
    if (selectedCollection === 'All Cards') {
      // Combine cards from all collections, filtering out any non-array values
      return Object.values(collections)
        .filter(Array.isArray)
        .flat()
        .filter(Boolean);
    }
    return collections[selectedCollection] || [];
  }, [collections, selectedCollection]);

  // Memoized callbacks
  const handleAddCard = useCallback(async (cardData, imageFile, targetCollection) => {
    try {
      // Check if a card with this serial number already exists in any collection
      const allCards = Object.values(collections).flat();
      const existingCard = allCards.find(card => card.slabSerial === cardData.slabSerial);
      
      if (existingCard) {
        throw new Error('A card with this serial number already exists');
      }

      // Save the image if provided
      if (imageFile) {
        await db.saveImage(cardData.slabSerial, imageFile);
      }

      // Add card to the target collection
      const updatedCollections = {
        ...collections,
        [targetCollection]: [
          ...(collections[targetCollection] || []),
          cardData
        ]
      };

      // Save to database first
      await db.saveCollections(updatedCollections);

      // Update collections state
      setCollections(updatedCollections);
      
      // Add to useCardData state
      await addCard(cardData);

      // Close the form
      setShowNewCardForm(false);

      // Show success message
      toast.success('Card added successfully');
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error('Error adding card: ' + error.message);
      throw error; // Re-throw to be handled by the form
    }
  }, [collections, addCard]);

  const handleCardUpdate = useCallback(async (updatedCard) => {
    // Handle the special case of "All Cards" view
    if (selectedCollection === 'All Cards') {
      // Find which collection this card actually belongs to
      let cardCollection = null;
      let cardFound = false;
      
      // Look through all collections to find the card
      for (const [collName, cards] of Object.entries(collections)) {
        if (Array.isArray(cards)) {
          const cardIndex = cards.findIndex(c => c.slabSerial === updatedCard.slabSerial);
          if (cardIndex !== -1) {
            cardCollection = collName;
            cardFound = true;
            break;
          }
        }
      }
      
      if (cardFound && cardCollection) {
        // Update the card in its original collection
        const updatedCollections = {
          ...collections,
          [cardCollection]: collections[cardCollection].map(card =>
            card.slabSerial === updatedCard.slabSerial ? updatedCard : card
          )
        };
        
        // Save to database
        await db.saveCollections(updatedCollections);
        
        // Update state
        setCollections(updatedCollections);
        
        // Also update the card in the useCardData hook's state
        updateCard(updatedCard);
      } else {
        console.warn('Could not find the card in any collection');
      }
    } else {
      // Normal case - we're updating a card in the current collection
      const updatedCollections = {
        ...collections,
        [selectedCollection]: collections[selectedCollection].map(card =>
          card.slabSerial === updatedCard.slabSerial ? updatedCard : card
        )
      };
      
      // Save to database
      await db.saveCollections(updatedCollections);
      
      // Update state
      setCollections(updatedCollections);
      
      // Also update the card in the useCardData hook's state
      updateCard(updatedCard);
    }
  }, [collections, selectedCollection, updateCard]);

  // Calculate total profit for a collection
  const calculateTotalProfit = useCallback((cards) => {
    return cards.reduce((total, card) => {
      const currentValue = parseFloat(card.currentValueAUD) || 0;
      const purchasePrice = parseFloat(card.investmentAUD) || 0;
      return total + (currentValue - purchasePrice);
    }, 0);
  }, []);

  const handleImportData = useCallback(async (file) => {
    try {
      // Calculate current total profit before update
      const currentCards = collections[selectedCollection] || [];
      const previousProfit = currentCards.reduce((total, card) => {
        const currentValue = parseFloat(card.currentValueAUD) || 0;
        const purchasePrice = parseFloat(card.investmentAUD) || 0;
        return total + (currentValue - purchasePrice);
      }, 0);

      const result = await importCsvData(file, importMode);
      if (result.success) {
        const processedData = await processImportedData(result.data, currentCards, exchangeRate, importMode);
        
        // Update collections with new data
        const updatedCollections = {
          ...collections,
          [selectedCollection]: processedData
        };
        
        // Save to database to persist changes
        await db.saveCollections(updatedCollections);
        
        // Update state
        setCollections(updatedCollections);

        // Calculate new profit after update
        const newProfit = processedData.reduce((total, card) => {
          const currentValue = parseFloat(card.currentValueAUD) || 0;
          const purchasePrice = parseFloat(card.investmentAUD) || 0;
          return total + (currentValue - purchasePrice);
        }, 0);

        // Show the profit change modal
        setProfitChangeData({
          oldProfit: previousProfit,
          newProfit: newProfit
        });
        setShowProfitChangeModal(true);

        // Show success message
        toast.success('Prices updated successfully');
      }
      setImportModalOpen(false);
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Error updating prices: ' + error.message);
    }
  }, [importCsvData, importMode, selectedCollection, collections, exchangeRate]);

  const handleCollectionChange = useCallback((collection) => {
    setSelectedCollection(collection);
    clearSelectedCard();
    localStorage.setItem('selectedCollection', collection);
  }, [clearSelectedCard]);

  const handleImportClick = (mode) => {
    if (mode === 'priceUpdate' && selectedCollection === 'All Cards') {
      toast.error('Please select a specific collection to update prices');
      return;
    }
    setImportMode(mode === 'baseData' ? 'baseData' : 'priceUpdate');
    setImportModalOpen(true);
  };

  // Load collections from IndexedDB on mount
  useEffect(() => {
    const loadCollections = async () => {
      try {
        setIsLoading(true);
        const savedCollections = await db.getCollections();
        
        // Get saved collection from localStorage
        const savedSelectedCollection = localStorage.getItem('selectedCollection');
        
        if (Object.keys(savedCollections).length > 0) {
          setCollections(savedCollections);
          
          // Handle both regular collections and "All Cards" special case
          if (savedSelectedCollection) {
            if (savedSelectedCollection === 'All Cards' || savedCollections[savedSelectedCollection]) {
              setSelectedCollection(savedSelectedCollection);
            } else {
              // Fall back to first collection if saved one doesn't exist
              setSelectedCollection(Object.keys(savedCollections)[0]);
            }
          } else if (!savedCollections[selectedCollection]) {
            // Fall back if current selection doesn't exist
            setSelectedCollection(Object.keys(savedCollections)[0]);
          }
        } else {
          const defaultCollections = { 'Default Collection': [] };
          setCollections(defaultCollections);
          setSelectedCollection('Default Collection');
          await db.saveCollections(defaultCollections);
        }
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollections();
  }, []);

  // Function to export all collection data as a ZIP file
  const handleExportData = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a new ZIP file
        const zip = new JSZip();
        
        // Get ALL collections data
        const allCollections = await db.getCollections();
        
        // Get profile data
        const profileData = await db.getProfile();
        
        // Get sold cards data
        const soldCardsData = JSON.parse(localStorage.getItem('soldCards') || '[]');
        
        // Create a data folder in the ZIP
        const dataFolder = zip.folder("data");
        
        // Add collections data as JSON - include ALL collections
        const collectionsData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          collections: allCollections,
          settings: {
            defaultCollection: selectedCollection
          },
          profile: profileData,
          soldCards: soldCardsData
        };

        // Add collections.json to the data folder
        dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
        
        // Create an images folder in the ZIP
        const imagesFolder = zip.folder("images");
        
        // Process ALL images from ALL collections and sold cards
        const imagePromises = [];
        
        // Process collection cards
        for (const [collectionName, cards] of Object.entries(allCollections)) {
          if (!Array.isArray(cards)) continue;
          
          for (const card of cards) {
            const promise = (async () => {
              try {
                const imageBlob = await db.getImage(card.slabSerial);
                
                if (!imageBlob) return;
                
                // Add image to ZIP with slab serial as filename
                const extension = imageBlob.type.split('/')[1] || 'jpg';
                const filename = `${card.slabSerial}.${extension}`;
                await imagesFolder.file(filename, imageBlob);
                
                // Update card with image path
                card.imagePath = `images/${filename}`;
              } catch (error) {
                // Silent fail for individual images
                console.error(`Failed to export image for card ${card.slabSerial}:`, error);
              }
            })();
            imagePromises.push(promise);
          }
        }

        // Process sold cards images
        for (const soldCard of soldCardsData) {
          const promise = (async () => {
            try {
              const imageBlob = await db.getImage(soldCard.slabSerial);
              
              if (!imageBlob) return;
              
              // Add image to ZIP with slab serial as filename
              const extension = imageBlob.type.split('/')[1] || 'jpg';
              const filename = `${soldCard.slabSerial}.${extension}`;
              await imagesFolder.file(filename, imageBlob);
              
              // Update card with image path
              soldCard.imagePath = `images/${filename}`;
            } catch (error) {
              // Silent fail for individual images
              console.error(`Failed to export image for sold card ${soldCard.slabSerial}:`, error);
            }
          })();
          imagePromises.push(promise);
        }
        
        try {
          // Wait for all images to be processed
          await Promise.all(imagePromises);
          
          // Update collections data with image paths
          dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
          
          // Add a README file
          const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/collections.json: All collections, card data, profile data, and sold items
- /images/: All card images referenced in collections.json

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your collections, profile, sold items and images will be restored`;
          
          zip.file("README.txt", readme);
          
          // Generate the ZIP file with compression
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
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            document.body.removeChild(link);
          }, 100);

          resolve();
        } catch (error) {
          console.error("Export error:", error);
          reject(error);
        }
      } catch (error) {
        console.error("Export error:", error);
        reject(error);
      }
    });
  };

  // Function to handle collection import (backup file)
  const handleImportCollection = () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        
        // Create a loading overlay
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
        
        // Record start time for minimum loading duration
        const startTime = Date.now();
        
        if (file.name.endsWith('.zip')) {
          // Process ZIP file
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
          
          // Extract images
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
          
          // Save profile data if it exists
          if (collectionsData.profile) {
            await db.saveProfile(collectionsData.profile);
          }
          
          // Save sold cards data if it exists
          if (collectionsData.soldCards) {
            localStorage.setItem('soldCards', JSON.stringify(collectionsData.soldCards));
          }
          
          // Refresh collections
          const savedCollections = await db.getCollections();
          setCollections(savedCollections);
          
          // Switch to "All Cards" view after successful import
          setSelectedCollection('All Cards');
          localStorage.setItem('selectedCollection', 'All Cards');
          
          // Ensure minimum loading time for better UX
          const elapsedTime = Date.now() - startTime;
          const minimumLoadingTime = 3000; // 3 seconds
          if (elapsedTime < minimumLoadingTime) {
            await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
          }
          
          // Remove loading overlay
          document.body.removeChild(loadingEl);
          
          // Show success toast
          toast.success('Backup imported successfully!');
          
          // Close settings modal
          setShowSettings(false);
        } else {
          throw new Error("Unsupported file format. Please upload a .zip backup file.");
        }
      } catch (error) {
        console.error("Import error:", error);
        // Remove loading overlay if it exists
        const loadingEl = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-70');
        if (loadingEl) {
          document.body.removeChild(loadingEl);
        }
        toast.error(`Error importing backup: ${error.message}`);
      }
    };
    
    // Trigger file selection
    input.click();
  };

  const onDeleteCards = useCallback(async (cardIds) => {
    try {
      // Delete images from IndexedDB
      for (const cardId of cardIds) {
        await db.deleteImage(cardId);
      }

      // Delete cards from the useCardData hook's state
      cardIds.forEach(cardId => {
        deleteCard(cardId);
      });
    } catch (error) {
      console.error('Error deleting cards:', error);
      toast.error('Failed to delete cards');
    }
  }, [deleteCard]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111827] dashboard-page">
      <Header
        className="header"
        selectedCollection={selectedCollection}
        collections={Object.keys(collections)}
        onCollectionChange={setSelectedCollection}
        onImportClick={handleImportClick}
        onSettingsClick={() => setShowSettings(true)}
        currentView={currentView}
        onViewChange={setCurrentView}
        refreshCollections={() => {
          // Refresh collections data from the database
          db.getCollections().then(savedCollections => {
            if (Object.keys(savedCollections).length > 0) {
              setCollections(savedCollections);
              // Only switch collection if current isn't "All Cards" and doesn't exist
              if (selectedCollection !== 'All Cards' && !savedCollections[selectedCollection]) {
                const newCollection = Object.keys(savedCollections)[0];
                setSelectedCollection(newCollection);
                localStorage.setItem('selectedCollection', newCollection);
              }
            }
          });
        }}
        onAddCollection={(name) => {
          // Create new collection
          const newCollections = {
            ...collections,
            [name]: []
          };
          db.saveCollections(newCollections).then(() => {
            setCollections(newCollections);
            setSelectedCollection(name);
            localStorage.setItem('selectedCollection', name);
          });
        }}
        onRenameCollection={(oldName, newName) => {
          if (oldName && newName && oldName !== newName) {
            // Create new collection
            const newCollections = {
              ...collections
            };
            // Copy cards to the new collection
            newCollections[newName] = [...(collections[oldName] || [])];
            // Remove old collection
            delete newCollections[oldName];
            
            // Save to database
            db.saveCollections(newCollections).then(() => {
              setCollections(newCollections);
              // Update selected collection if it was renamed
              if (selectedCollection === oldName) {
                setSelectedCollection(newName);
                localStorage.setItem('selectedCollection', newName);
              }
            });
          }
        }}
        onDeleteCollection={(name) => {
          // Only allow deleting non-default collections
          if (name !== 'Default Collection' && collections[name]) {
            const newCollections = {
              ...collections
            };
            // Remove the collection
            delete newCollections[name];
            
            // Save to database
            db.saveCollections(newCollections).then(() => {
              setCollections(newCollections);
              // Update selected collection if it was deleted
              if (selectedCollection === name) {
                // Select first available collection
                const newSelectedCollection = Object.keys(newCollections)[0] || 'Default Collection';
                setSelectedCollection(newSelectedCollection);
                localStorage.setItem('selectedCollection', newSelectedCollection);
              }
            });
          }
        }}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {currentView === 'cards' ? (
          <CardList
            cards={collectionData}
            exchangeRate={exchangeRate}
            onCardClick={(card) => {
              selectCard(card);
            }}
            onDeleteCards={onDeleteCards}
            onUpdateCard={handleCardUpdate}
            onAddCard={() => setShowNewCardForm(true)}
            selectedCollection={selectedCollection}
            collections={collections}
            setCollections={setCollections}
          />
        ) : (
          <SoldItems />
        )}
      </main>

      {showNewCardForm && (
        <NewCardForm
          onSubmit={(cardData, imageFile, targetCollection) => handleAddCard(cardData, imageFile, targetCollection)}
          onClose={() => setShowNewCardForm(false)}
          exchangeRate={exchangeRate}
          collections={collections}
          selectedCollection={selectedCollection}
        />
      )}

      {selectedCard && (
        <CardDetails
          card={selectedCard}
          onClose={clearSelectedCard}
          onUpdate={handleCardUpdate}
          onUpdateCard={handleCardUpdate}
          onDelete={deleteCard}
          exchangeRate={exchangeRate}
        />
      )}

      {importModalOpen && (
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportData}
          mode={importMode}
          loading={loading}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          selectedCollection={selectedCollection}
          collections={Object.keys(collections)}
          onRenameCollection={(oldName, newName) => {
            const newCollections = { ...collections };
            newCollections[newName] = newCollections[oldName];
            delete newCollections[oldName];
            setCollections(newCollections);
            setSelectedCollection(newName);
          }}
          onDeleteCollection={async (name) => {
            try {
              // Get current collections
              const currentCollections = { ...collections };
              
              // Check if collection exists
              if (!currentCollections[name]) {
                throw new Error(`Collection "${name}" does not exist`);
              }
              
              // Check if it's the last collection
              if (Object.keys(currentCollections).length <= 1) {
                throw new Error("Cannot delete the last collection");
              }
              
              // Remove the collection
              delete currentCollections[name];
              
              // Save updated collections to database
              await db.saveCollections(currentCollections);
              
              // Update state
              setCollections(currentCollections);
              
              // Switch to another collection if the deleted one was selected
              if (selectedCollection === name) {
                const newSelection = Object.keys(currentCollections)[0];
                setSelectedCollection(newSelection);
                localStorage.setItem('selectedCollection', newSelection);
              }
            } catch (error) {
              console.error("Error deleting collection:", error);
              toast.error(`Failed to delete collection: ${error.message}`);
            }
          }}
          refreshCollections={() => {
            // Refresh collections data
            db.getCollections().then(savedCollections => {
              if (Object.keys(savedCollections).length > 0) {
                setCollections(savedCollections);
              }
            });
          }}
          onExportData={handleExportData}
          onImportCollection={handleImportCollection}
        />
      )}

      {/* Profit Change Modal */}
      {showProfitChangeModal && (
        <ProfitChangeModal
          isOpen={showProfitChangeModal}
          onClose={() => setShowProfitChangeModal(false)}
          profitChangeData={{
            previousProfit: profitChangeData.oldProfit,
            newProfit: profitChangeData.newProfit
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<AppContent />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/pricing" element={<Pricing />} />
          </Routes>
          <Toaster position="bottom-right" />
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;