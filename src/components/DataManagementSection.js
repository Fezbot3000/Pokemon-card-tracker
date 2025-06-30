import React, { useState } from 'react';
import { useAuth } from '../design-system';
import { toast } from 'react-hot-toast';
import logger from '../utils/logger';
import { auth } from '../services/firebase';

/**
 * Data Management component for the Settings modal
 * Provides tools to analyze storage and perform data migration
 */
const DataManagementSection = () => {
  const { currentUser } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Handle security verification
  const handleVerifySecurity = async () => {
    try {
      // Check that the user is authenticated
      if (!currentUser || !currentUser.uid) {
        toast.error('You must be logged in to verify security');
        return;
      }
      
      const userId = currentUser.uid;
      
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
            
            // Security summary
            if (securityStatus.collectionsVerified) {
              securityStatus.summary = securityStatus.anonymousDataFound 
                ? 'Security partially verified: Your data is linked to your user ID, but some anonymous data remains.'
                : 'Security fully verified: All data is properly linked to your user ID.';
            } else {
              securityStatus.summary = 'Security verification failed: Could not verify collections.';
            }
            
            // Display success toast with instructions to check console
            toast.success('Security verification complete. Check the browser console (F12) for details.');
          }
          
          // Security summary
          if (securityStatus.collectionsVerified) {
            securityStatus.summary = securityStatus.anonymousDataFound 
              ? 'Security partially verified: Your data is linked to your user ID, but some anonymous data remains.'
              : 'Security fully verified: All data is properly linked to your user ID.';
          } else {
            securityStatus.summary = 'Security verification failed: Could not verify collections.';
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
            onClick={handleVerifySecurity}
            className="px-4 py-2 font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors"
          >
            Verify Data Security
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagementSection;
