import { toast } from 'react-hot-toast';
import {
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../services/firebase';
import db from '../services/firestore/dbAdapter';
import shadowSync from '../services/shadowSync';
import { CardRepository } from '../repositories/CardRepository';
import logger from './logger';

/**
 * Comprehensive data reset manager
 * Handles clearing all local and cloud data
 */
export const dataResetManager = {
  /**
   * Reset all application data (local and cloud)
   * @param {Object} params - Reset parameters
   * @param {Object} params.user - Current user object
   * @param {Function} params.setCollections - Function to update collections state
   * @param {Function} params.setSelectedCollection - Function to update selected collection
   * @returns {Promise<void>}
   */
  async resetAllData({ user, setCollections, setSelectedCollection }) {
    try {
      // Show loading toast with longer duration since this is a complex operation
      toast.loading('Resetting all data...', {
        duration: 30000,
        id: 'reset-data',
      });

      // Track progress for detailed feedback
      const updateProgress = message => {
        logger.debug(`Reset progress: ${message}`);
        toast.loading(`Resetting: ${message}`, { id: 'reset-data' });
      };

      // Delete cloud data if user is logged in
      if (user) {
        try {
          updateProgress('Cleaning up cloud data');
          logger.debug('Deleting cloud data for user:', user.uid);

          // 1. Clean up shadowSync listeners first to prevent race conditions
          shadowSync.cleanupListeners();

          // 2. Use CardRepository for comprehensive cloud cleanup
          const repository = new CardRepository(user.uid);

          // 3. Delete all user data in Firestore and Storage
          await repository.deleteAllUserData();

          // Verify cards are actually deleted from Firestore
          try {
            updateProgress('Verifying card deletion');
            const verifyCardsRef = collection(
              firestoreDb,
              'users',
              user.uid,
              'cards'
            );
            const verifySnapshot = await getDocs(verifyCardsRef);

            if (!verifySnapshot.empty) {
              logger.warn(
                `Found ${verifySnapshot.size} cards still in Firestore, forcing direct deletion`
              );
              updateProgress(
                `Forcing deletion of ${verifySnapshot.size} remaining cards`
              );

              const deletePromises = [];
              verifySnapshot.forEach(doc => {
                logger.debug(`Directly deleting card: ${doc.id}`);
                deletePromises.push(deleteDoc(doc.ref));
              });

              await Promise.all(deletePromises);
              logger.debug('Direct card deletion completed');
            }
          } catch (verifyError) {
            logger.error('Error during verification step:', verifyError);
          }

          // 4. Additional cleanup for purchase invoices if they exist
          try {
            updateProgress('Removing purchase invoices');
            const purchaseInvoicesRef = collection(
              firestoreDb,
              'users',
              user.uid,
              'purchase-invoices'
            );
            const invoicesSnapshot = await getDocs(purchaseInvoicesRef);

            if (!invoicesSnapshot.empty) {
              const batch = writeBatch(firestoreDb);
              let operationCount = 0;

              invoicesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
                operationCount++;
              });

              if (operationCount > 0) {
                await batch.commit();
                logger.debug(
                  `Deleted ${operationCount} purchase invoices from Firestore`
                );
              }
            }
          } catch (invoiceError) {
            logger.error('Error deleting purchase invoices:', invoiceError);
          }

          // 5. Clean up user preferences in Firestore
          try {
            updateProgress('Resetting user preferences');
            const userPrefsRef = doc(
              firestoreDb,
              'users',
              user.uid,
              'preferences',
              'app'
            );
            await setDoc(userPrefsRef, {
              preferredCurrency: 'AUD',
              updatedAt: serverTimestamp(),
            });
            logger.debug('Reset user preferences in Firestore');
          } catch (prefsError) {
            logger.error('Error resetting user preferences:', prefsError);
          }

          logger.debug('Successfully deleted cloud data');
        } catch (cloudError) {
          logger.error('Error deleting cloud data:', cloudError);
        }
      }

      // Reset local data
      updateProgress('Clearing local database');

      // Call the database service to reset all data in IndexedDB
      try {
        await db.clearCards();
        await db.resetAllData();
      } catch (dbError) {
        logger.error('Error resetting local database:', dbError);
      }

      // Clear localStorage items (except auth-related and user preference ones)
      updateProgress('Clearing local storage');
      const keysToPreserve = [
        'firebase:authUser', 
        'firebase:previousAuthUser',
        'pokemon_tracker_onboarding_complete', // Preserve tutorial completion
        'hasShownPremiumWelcome', // Preserve premium welcome flag  
        'hasShownTrialWelcome' // Preserve trial welcome flag
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!keysToPreserve.some(preserveKey => key.includes(preserveKey))) {
          localStorage.removeItem(key);
        }
      }

      // Reset essential app state
      localStorage.setItem('selectedCollection', 'All Cards');

      // Reset application state
      updateProgress('Resetting application state');
      setCollections({});
      setSelectedCollection('All Cards');

      // Force immediate cache clear
      if (window.caches) {
        try {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
              logger.debug(`Deleted cache: ${name}`);
            });
          });
        } catch (cacheError) {
          logger.error('Error clearing caches:', cacheError);
        }
      }

      // Force a hard reload to ensure everything is refreshed
      updateProgress('Preparing for complete reload');
      toast.success('Reset complete - reloading application', {
        id: 'reset-data',
        duration: 3000,
      });
      logger.debug('Reset complete - forcing hard reload');

      // Use a hard reload to ensure all caches are cleared
      setTimeout(() => {
        window.location.href =
          window.location.origin +
          window.location.pathname +
          '?reset=' +
          Date.now();
      }, 2000);
    } catch (error) {
      logger.error('Error resetting data:', error);
      toast.error(`Failed to reset data: ${error.message}`, {
        id: 'reset-data',
      });
    }
  },
};
