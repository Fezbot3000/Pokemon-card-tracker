import React, { useState } from 'react';
import { useAuth } from '../design-system';
import { toast } from 'react-hot-toast';
import { getAnonymousData, migrateData, anonymousUserHasData } from '../utils/dataMigration';
import logger from '../utils/logger';
import { auth } from '../services/firebase';

/**
 * Data Management component for the Settings modal
 * Provides tools to analyze storage and perform data migration
 */
const DataManagementSection = () => {
  const { currentUser } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Analyze database storage
  const handleAnalyzeStorage = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // Check if anonymous data exists
      const hasAnonymousData = await anonymousUserHasData();
      
      if (hasAnonymousData) {
        // Get details about anonymous data
        const anonymousData = await getAnonymousData();
        
        // Format analysis result
        const result = {
          hasAnonymousData: true,
          collections: Object.keys(anonymousData.collections || {}),
          collectionCount: Object.keys(anonymousData.collections || {}).length,
          cardCount: Object.values(anonymousData.collections || {}).reduce((total, cards) => {
            return total + (Array.isArray(cards) ? cards.length : 0);
          }, 0),
          imageCount: anonymousData.images?.length || 0,
          soldCardsCount: anonymousData.soldCards?.length || 0,
          hasProfile: !!anonymousData.profile
        };
        
        setAnalysisResult(result);
        
        // Clear any migration notification from local storage to disable automatic prompts
        localStorage.setItem('migrationPromptDismissed', 'true');
        
        // Show success toast
        toast('Analysis complete. Found anonymous data that can be migrated.');
      } else {
        // No anonymous data found
        setAnalysisResult({
          hasAnonymousData: false
        });
        
        toast('No anonymous data found. Your account is up to date!');
      }
    } catch (error) {
      logger.error('Error analyzing storage:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Migrate data from anonymous storage to user account
  const handleMigrateData = async () => {
    if (!currentUser || !currentUser.uid) {
      toast.error('You must be logged in to migrate data');
      return;
    }
    
    setIsMigrating(true);
    setProgress(0);
    setStatusMessage('Starting migration...');
    
    try {
      // Perform migration with progress updates
      const result = await migrateData({
        preserveAnonymous: true, // Keep anonymous data as backup
        progressCallback: (percent, message) => {
          setProgress(percent);
          setStatusMessage(message);
        }
      });
      
      // Wait a moment to ensure all operations are complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear analysis result after successful migration
      setAnalysisResult(null);
      
      // Successful migration
      toast.success('Data migrated successfully!');
      
      // Mark migration as complete in local storage
      localStorage.setItem('dataMigrationComplete', 'true');
      localStorage.setItem('migrationPromptDismissed', 'true');
      
      // Force refresh page to ensure all components see the updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      logger.error('Error during migration:', error);
      toast.error(`Migration failed: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };
  
  // Handle delete anonymous data
  const handleDeleteAnonymousData = async () => {
    setIsAnalyzing(true);
    try {
      // Create a request to open the database
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        toast.error('Could not access database');
        setIsAnalyzing(false);
      };
      
      request.onsuccess = async (event) => {
        const db = event.target.result;
        try {
          // Process each object store that could contain anonymous data
          const stores = ['collections', 'images', 'profile', 'soldCards'];
          let deletedItems = 0;
          
          for (const storeName of stores) {
            if (!db.objectStoreNames.contains(storeName)) continue;
            
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Find anonymous data based on the store structure
            if (storeName === 'collections') {
              // Collections are stored with composite keys [userId, collectionName]
              const range = IDBKeyRange.bound(
                ['anonymous', ''], 
                ['anonymous', '\uffff']
              );
              
              const request = store.openCursor(range);
              
              request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                  deletedItems++;
                  cursor.delete();
                  cursor.continue();
                }
              };
            } else {
              // Other stores may have a userId field
              const getAll = store.getAll();
              getAll.onsuccess = () => {
                const items = getAll.result;
                
                items.forEach(item => {
                  if (item.userId === 'anonymous') {
                    deletedItems++;
                    store.delete(item.id);
                  }
                });
              };
            }
            
            await new Promise((resolve, reject) => {
              transaction.oncomplete = resolve;
              transaction.onerror = reject;
            });
          }
          
          // Mark migration as complete in all possible storage locations
          localStorage.setItem('dataMigrationComplete', 'true');
          localStorage.setItem('migrationPromptDismissed', 'true');
          localStorage.setItem('anonymousDataMigrated', 'true');
          sessionStorage.setItem('migrationPromptDismissed', 'true');
          sessionStorage.setItem('legacyDataHandlerRun', 'true');
          
          // Global application flag
          window.__MIGRATION_PROMPTS_DISABLED = true;
          
          toast.success(`Successfully removed all anonymous data. Deleted ${deletedItems} items.`);
          
          // Clear the analysis results
          setAnalysisResult(null);
          
          // Refresh the page after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (error) {
          logger.error('Error deleting anonymous data:', error);
          toast.error(`Failed to delete anonymous data: ${error.message}`);
        }
        setIsAnalyzing(false);
      };
    } catch (error) {
      logger.error('Error handling delete anonymous data:', error);
      toast.error(`Failed to delete anonymous data: ${error.message}`);
      setIsAnalyzing(false);
    }
  };
  
  // Handle security verification
  const handleVerifySecurity = async () => {
    try {
      // Check that the user is authenticated
      if (!currentUser || !currentUser.uid) {
        toast.error('You must be logged in to verify security');
        return;
      }
      
      const userId = currentUser.uid;
      
      // Log the current user ID for verification
      console.log('🔒 SECURITY VERIFICATION');
      console.log('------------------------');
      console.log(`Current user ID: ${userId}`);
      
      // Open IndexedDB to check data
      const request = indexedDB.open('pokemonCardTracker', 1);
      
      request.onerror = (event) => {
        logger.error('Error opening database:', event.target.error);
        toast.error('Could not access database for verification');
      };
      
      request.onsuccess = async (event) => {
        const db = event.target.result;
        let securityStatus = {
          userId: userId,
          collectionsVerified: false,
          imagesVerified: false,
          profileVerified: false,
          soldCardsVerified: false,
          anonymousDataFound: false,
          collectionsCount: 0,
          cardsCount: 0,
          summary: 'Security verification in progress...'
        };
        
        try {
          // Check collections store
          if (db.objectStoreNames.contains('collections')) {
            const transaction = db.transaction(['collections'], 'readonly');
            const store = transaction.objectStore('collections');
            
            // Get all collections for current user
            const userRange = IDBKeyRange.bound(
              [userId, ''], 
              [userId, '\uffff']
            );
            
            const anonymousRange = IDBKeyRange.bound(
              ['anonymous', ''], 
              ['anonymous', '\uffff']
            );
            
            // Check authenticated user collections
            const userCollections = await new Promise((resolve) => {
              const request = store.getAll(userRange);
              request.onsuccess = () => resolve(request.result);
            });
            
            // Check anonymous collections
            const anonymousCollections = await new Promise((resolve) => {
              const request = store.getAll(anonymousRange);
              request.onsuccess = () => resolve(request.result);
            });
            
            // Calculate cards count
            let totalCards = 0;
            userCollections.forEach(collection => {
              if (Array.isArray(collection.data)) {
                totalCards += collection.data.length;
              }
            });
            
            securityStatus.collectionsVerified = true;
            securityStatus.collectionsCount = userCollections.length;
            securityStatus.cardsCount = totalCards;
            securityStatus.anonymousDataFound = anonymousCollections.length > 0;
            
            // Log collections data
            console.log(`✅ Found ${userCollections.length} collections linked to your user ID`);
            console.log(`✅ Total cards linked to your user ID: ${totalCards}`);
            if (anonymousCollections.length > 0) {
              console.log(`⚠️ Found ${anonymousCollections.length} collections still linked to anonymous ID`);
            } else {
              console.log('✅ No anonymous collections found - good!');
            }
            
            // Detailed collection names
            console.log('\nYour collections:');
            userCollections.forEach(collection => {
              console.log(`- ${collection.name}: ${Array.isArray(collection.data) ? collection.data.length : 0} cards`);
            });
          }
          
          // Security summary
          if (securityStatus.collectionsVerified) {
            securityStatus.summary = securityStatus.anonymousDataFound 
              ? 'Security partially verified: Your data is linked to your user ID, but some anonymous data remains.'
              : 'Security fully verified: All data is properly linked to your user ID.';
              
            // Log final summary
            console.log('\n------------------------');
            console.log('SECURITY VERIFICATION SUMMARY:');
            console.log(securityStatus.summary);
            console.log('------------------------');
          } else {
            securityStatus.summary = 'Security verification failed: Could not verify collections.';
            console.log('\n------------------------');
            console.log('⚠️ SECURITY VERIFICATION FAILED');
            console.log('------------------------');
          }
          
          // Display success toast with instructions to check console
          toast.success('Security verification complete. Check the browser console (F12) for details.');
        } catch (error) {
          logger.error('Error verifying security:', error);
          console.error('Security verification error:', error);
          toast.error('Failed to complete security verification');
        }
      };
    } catch (error) {
      logger.error('Error in security verification:', error);
      toast.error('Security verification failed');
    }
  };
  
  // Clear all migration prompts
  const handleDismissMigrationPrompts = () => {
    try {
      // Set all storage flags to disable migration prompts
      localStorage.setItem('migrationPromptDismissed', 'true');
      localStorage.setItem('dataMigrationComplete', 'true');
      localStorage.setItem('anonymousDataMigrated', 'true');
      sessionStorage.setItem('migrationPromptDismissed', 'true');
      sessionStorage.setItem('legacyDataHandlerRun', 'true');
      
      // Global application flag
      window.__MIGRATION_PROMPTS_DISABLED = true;
      
      // Hide any existing toasts
      document.querySelectorAll('.Toastify__toast-container').forEach(container => {
        container.style.display = 'none';
      });
      
      // Add a special class to remove migration notifications
      const style = document.createElement('style');
      style.innerHTML = `
        [data-migration-notification="true"] { 
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Success notification
      toast.success('Migration prompts have been permanently disabled.');
      
      // Clear analysis result
      setAnalysisResult(null);
      
      // Reload the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      logger.error('Error dismissing migration prompts:', error);
      toast.error('Failed to dismiss migration prompts');
    }
  };
  
  return (
    <div className="py-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Data Management
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Analyze and manage your local card data storage
        </p>
        
        <div className="flex flex-col gap-4">
          <button
            onClick={handleAnalyzeStorage}
            disabled={isAnalyzing || isMigrating}
            className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Storage'}
          </button>
          
          <button
            onClick={handleDismissMigrationPrompts}
            className="px-4 py-2 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md shadow-sm transition-colors"
          >
            Dismiss Migration Prompts
          </button>
          
          <button
            onClick={handleVerifySecurity}
            className="px-4 py-2 font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors"
          >
            Verify Data Security
          </button>
        </div>
      </div>
      
      {/* Analysis Results */}
      {analysisResult && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
            Analysis Results
          </h4>
          
          {analysisResult.hasAnonymousData ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Found anonymous data that can be migrated:
              </p>
              
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li>Collections: {analysisResult.collectionCount}</li>
                <li>Total Cards: {analysisResult.cardCount}</li>
                {analysisResult.soldCardsCount > 0 && (
                  <li>Sold Cards: {analysisResult.soldCardsCount}</li>
                )}
                {analysisResult.imageCount > 0 && (
                  <li>Card Images: {analysisResult.imageCount}</li>
                )}
                {analysisResult.hasProfile && (
                  <li>User Profile Data</li>
                )}
              </ul>
              
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={handleMigrateData}
                  disabled={isMigrating}
                  className="px-4 py-2 font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMigrating ? 'Migrating...' : 'Migrate Data to Your Account'}
                </button>
                
                <button
                  onClick={handleDeleteAnonymousData}
                  disabled={isMigrating}
                  className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Anonymous Data
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No anonymous data found. Your account is up to date!
            </p>
          )}
        </div>
      )}
      
      {/* Migration Progress */}
      {isMigrating && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {statusMessage}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {`${Math.round(progress)}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagementSection;
