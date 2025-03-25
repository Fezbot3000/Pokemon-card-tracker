import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, listAll } from 'firebase/storage';

const verifyCloudBackup = async () => {
  try {
    setIsLoading(true);
    const firestore = getFirestore();
    const storage = getStorage();
    
    // Check collections in Firestore
    const collectionsData = {};
    const collectionsRef = collection(firestore, `users/${user.uid}/collections`);
    const collectionsSnapshot = await getDocs(collectionsRef);
    
    let totalCards = 0;
    collectionsSnapshot.forEach(doc => {
      const data = doc.data();
      const collectionName = doc.id;
      const cardsCount = data.cards?.length || 0;
      totalCards += cardsCount;
      collectionsData[collectionName] = cardsCount;
    });
    
    // Check images in Storage
    const imagesRef = ref(storage, `users/${user.uid}/cards`);
    let imagesList = [];
    try {
      const imageResults = await listAll(imagesRef);
      imagesList = imageResults.items.map(item => item.name);
    } catch (error) {
      console.error("Error listing images:", error);
    }
    
    // Create verification report
    const verificationReport = {
      collections: collectionsData,
      totalCollections: collectionsSnapshot.size,
      totalCards: totalCards,
      totalImages: imagesList.length,
      timestamp: new Date().toISOString(),
      userId: user.uid
    };
    
    console.log("Cloud Backup Verification Report:", verificationReport);
    
    // Show verification results to user
    setIsLoading(false);
    alert(`
Cloud Backup Verification:
• Total Collections: ${verificationReport.totalCollections}
• Total Cards: ${verificationReport.totalCards}
• Total Images: ${verificationReport.totalImages}
• Collection Details: ${Object.entries(collectionsData).map(([name, count]) => `\n  - ${name}: ${count} cards`).join('')}
    `);
    
    return verificationReport;
  } catch (error) {
    console.error("Error verifying cloud backup:", error);
    setIsLoading(false);
    alert(`Error verifying cloud backup: ${error.message}`);
    return null;
  }
};

const syncImagesFromFirebase = async () => {
  try {
    setIsLoading(true);
    
    // Show loading toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-blue-500 text-white transition-opacity duration-300';
    toast.textContent = 'Synchronizing images from Firebase Storage...';
    document.body.appendChild(toast);
    
    // Sync images
    const result = await db.syncImagesFromStorage(user.uid);
    
    // Update toast with results
    toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
    toast.textContent = `Sync complete: ${result.synced} of ${result.total} images synchronized.`;
    
    // Remove toast after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 5000);
    
    setIsLoading(false);
  } catch (error) {
    console.error('Error synchronizing images:', error);
    
    // Show error toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-red-500 text-white transition-opacity duration-300';
    toast.textContent = `Error synchronizing images: ${error.message}`;
    document.body.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 5000);
    
    setIsLoading(false);
  }
};

// Add this UI section wherever appropriate in your settings component, perhaps after the export section
// Find a section like "Export Data" or "Backup & Restore" and add this underneath
<div className="mb-6 p-4 bg-white rounded-lg shadow">
  <h3 className="text-lg font-semibold mb-2">Backup Verification</h3>
  <div className="flex flex-col gap-2">
    <button
      onClick={verifyCloudBackup}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Verifying...
        </>
      ) : (
        "Verify Cloud Backup"
      )}
    </button>
    <button
      onClick={syncImagesFromFirebase}
      className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Syncing...
        </>
      ) : (
        "Sync Images from Cloud"
      )}
    </button>
    <p className="text-sm text-gray-600 mt-1">
      Check if your data is properly backed up to Firebase and verify image synchronization.
    </p>
  </div>
</div>

const handleImportCSV = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    setIsLoading(true);
    const csvData = await parseCSV(file);
    
    // Show loading toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-blue-500 text-white transition-opacity duration-300';
    toast.textContent = `Processing ${csvData.length} cards from CSV...`;
    document.body.appendChild(toast);
    
    // Process the data
    const result = await importCsvData(csvData);
    
    // Organize cards by collection
    const collections = {};
    result.forEach(card => {
      const collectionName = card.set || 'Uncategorized';
      if (!collections[collectionName]) {
        collections[collectionName] = [];
      }
      collections[collectionName].push(card);
    });
    
    // Update toast
    toast.textContent = `Saving ${Object.keys(collections).length} collections with ${result.length} cards...`;
    
    // Save collections using the new batch approach
    await cardService.batchSaveCollections(user.uid, collections, 1); // Process one collection at a time for reliability
    
    // Update toast with success message
    toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-opacity duration-300';
    toast.textContent = `Successfully imported ${result.length} cards into ${Object.keys(collections).length} collections!`;
    
    // Add a button to sync images
    const syncButton = document.createElement('button');
    syncButton.className = 'ml-2 bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-1 rounded text-sm';
    syncButton.textContent = 'Sync Images';
    syncButton.onclick = async () => {
      toast.textContent = 'Synchronizing images...';
      try {
        await db.syncImagesFromStorage(user.uid);
        toast.textContent = 'Import and image sync complete!';
      } catch (error) {
        console.error('Error syncing images:', error);
        toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-yellow-500 text-white transition-opacity duration-300';
        toast.textContent = `Import successful but image sync failed: ${error.message}`;
      }
    };
    toast.appendChild(syncButton);
    
    // Remove toast after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 10000);
    
  } catch (error) {
    console.error('Error importing CSV data:', error);
    
    // Show error toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg bg-red-500 text-white transition-opacity duration-300';
    toast.textContent = `Error importing CSV: ${error.message}`;
    
    if (error.details) {
      const details = document.createElement('div');
      details.className = 'text-sm mt-2';
      details.textContent = `${error.details.success} collections saved, ${error.details.failed} failed.`;
      toast.appendChild(details);
    }
    
    document.body.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 8000);
  } finally {
    setIsLoading(false);
    event.target.value = ''; // Reset file input
  }
}; 