import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import CardList from './components/CardList';
import CardDetails from './components/CardDetails';
import NewCardForm from './components/NewCardForm';
import ImportModal from './components/ImportModal';
import useCardData from './hooks/useCardData';
import { processImportedData } from './utils/dataProcessor';
import { db } from './services/db';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/main.css';
import SoldItems from './components/SoldItems/SoldItems';
import SettingsModal from './components/SettingsModal';
import JSZip from 'jszip';

// Loading Skeleton component
const LoadingSkeleton = () => (
  <div className="max-w-7xl mx-auto px-6 py-4 space-y-8">
    <div className="skeleton h-16 w-full rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton h-32 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="skeleton h-64 rounded-xl" />
      ))}
    </div>
  </div>
);

function AppContent() {
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('priceUpdate');
  const [selectedCollection, setSelectedCollection] = useState('Default Collection');
  const [collections, setCollections] = useState({ 'Default Collection': [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
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
      // Combine cards from all collections
      return Object.values(collections).flat();
    }
    return collections[selectedCollection] || [];
  }, [collections, selectedCollection]);

  // Memoized callbacks
  const handleAddCard = useCallback(async (cardData) => {
    await addCard(cardData);
    setShowNewCardForm(false);
  }, [addCard]);

  const handleCardUpdate = useCallback(async (updatedCard) => {
    // Update the card in the current collection
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
  }, [collections, selectedCollection, updateCard]);

  const handleImportData = useCallback(async (file) => {
    const result = await importCsvData(file, importMode);
    if (result.success) {
      const processedData = await processImportedData(result.data, collections[selectedCollection], exchangeRate, importMode);
      // Update collections with new data
      setCollections(prev => ({
        ...prev,
        [selectedCollection]: processedData
      }));
    }
    setImportModalOpen(false);
  }, [importCsvData, importMode, selectedCollection, collections, exchangeRate]);

  const handleCollectionChange = useCallback((collection) => {
    setSelectedCollection(collection);
    clearSelectedCard();
  }, [clearSelectedCard]);

  const handleImportClick = (mode) => {
    setImportMode(mode === 'baseData' ? 'baseData' : 'priceUpdate');
    setImportModalOpen(true);
  };

  // Load collections from IndexedDB on mount
  useEffect(() => {
    const loadCollections = async () => {
      try {
        setIsLoading(true);
        const startTime = Date.now();
        
        const savedCollections = await db.getCollections();
        
        if (Object.keys(savedCollections).length > 0) {
          setCollections(savedCollections);
          if (!savedCollections[selectedCollection]) {
            setSelectedCollection(Object.keys(savedCollections)[0]);
          }
        } else {
          const defaultCollections = { 'Default Collection': [] };
          setCollections(defaultCollections);
          setSelectedCollection('Default Collection');
          await db.saveCollections(defaultCollections);
        }
        
        const elapsedTime = Date.now() - startTime;
        const minimumLoadingTime = 3000; // 3 seconds
        if (elapsedTime < minimumLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
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
    try {
      // Create a new ZIP file
      const zip = new JSZip();
      
      // Get ALL collections data
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
      
      try {
        // Wait for all images to be processed
        await Promise.all(imagePromises);
        
        // Update collections data with image paths
        dataFolder.file("collections.json", JSON.stringify(collectionsData, null, 2));
        
        // Add a README file
        const readme = `Pokemon Card Tracker Backup
Created: ${new Date().toISOString()}

This ZIP file contains:
- /data/collections.json: All collections and card data
- /images/: All card images referenced in collections.json

To import this backup:
1. Use the "Import Backup" button in the app settings
2. Select this ZIP file
3. All your collections and images will be restored`;
        
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
        
      } catch (error) {
        console.error("Export error:", error);
        alert(`Error exporting data: ${error.message}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(`Error exporting data: ${error.message}`);
    }
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
          
          // Refresh collections
          const savedCollections = await db.getCollections();
          setCollections(savedCollections);
          
          // Switch to first collection if needed
          if (Object.keys(savedCollections).length > 0 && 
              !savedCollections[selectedCollection]) {
            setSelectedCollection(Object.keys(savedCollections)[0]);
          }
          
          // Ensure minimum loading time for better UX
          const elapsedTime = Date.now() - startTime;
          const minimumLoadingTime = 3000; // 3 seconds
          if (elapsedTime < minimumLoadingTime) {
            await new Promise(resolve => setTimeout(resolve, minimumLoadingTime - elapsedTime));
          }
          
          // Remove loading overlay
          document.body.removeChild(loadingEl);
          
          // Show success message
          alert('Backup imported successfully!');
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
        alert(`Error importing backup: ${error.message}`);
      }
    };
    
    // Trigger file selection
    input.click();
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19]">
      <Header
        onAddCard={() => setShowNewCardForm(true)}
        selectedCollection={selectedCollection}
        collections={Object.keys(collections)}
        onCollectionChange={handleCollectionChange}
        onImportClick={handleImportClick}
        collectionData={collectionData}
        exchangeRate={exchangeRate}
        onSettingsClick={() => setShowSettings(true)}
        refreshCollections={() => {
          // Refresh collections data from the database
          db.getCollections().then(savedCollections => {
            if (Object.keys(savedCollections).length > 0) {
              setCollections(savedCollections);
              // If current collection no longer exists, switch to the first available
              if (!savedCollections[selectedCollection]) {
                setSelectedCollection(Object.keys(savedCollections)[0]);
              }
            }
          });
        }}
      />

      <main className="max-w-7xl mx-auto px-6 py-4">
        <CardList
          cards={collectionData}
          exchangeRate={exchangeRate}
          onCardClick={selectCard}
          onDeleteCards={deleteCard}
          onUpdateCard={handleCardUpdate}
        />
      </main>

      {showNewCardForm && (
        <NewCardForm
          onSubmit={handleAddCard}
          onClose={() => setShowNewCardForm(false)}
          exchangeRate={exchangeRate}
        />
      )}

      {selectedCard && (
        <CardDetails
          card={selectedCard}
          onClose={clearSelectedCard}
          onUpdate={handleCardUpdate}
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
                setSelectedCollection(Object.keys(currentCollections)[0]);
              }
              
              // Close settings modal
              setShowSettings(false);
            } catch (error) {
              console.error("Error deleting collection:", error);
              alert(`Failed to delete collection: ${error.message}`);
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
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;