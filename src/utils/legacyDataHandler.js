/**
 * Legacy Data Handler
 * Permanent solution for handling the transition from anonymous to authenticated storage
 * This runs automatically on app initialization to ensure all legacy data is properly handled
 */

import { auth } from '../services/firebase';
import { migrateData, anonymousUserHasData } from './dataMigration';
import logger from './logger';

/**
 * Silently check and handle legacy data migration
 * This runs automatically on app start and migrates data if needed
 * @returns {Promise<void>}
 */
export const initLegacyDataHandler = async () => {
  try {
    // Only run the check once per session
    if (sessionStorage.getItem('legacyDataHandlerRun') === 'true') {
      return;
    }
    
    // Mark as run to prevent multiple checks in the same session
    sessionStorage.setItem('legacyDataHandlerRun', 'true');
    
    // Check if migration has been dismissed or already completed
    if (localStorage.getItem('migrationPromptDismissed') === 'true' || 
        localStorage.getItem('dataMigrationComplete') === 'true') {
      return;
    }
    
    // Wait for Firebase auth to initialize and user to be determined
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Cleanup listener after first run
      unsubscribe();
      
      if (!user || !user.uid) {
        return; // No authenticated user
      }
      
      try {
        // Check if there's legacy data
        const hasLegacyData = await anonymousUserHasData();
        
        if (hasLegacyData) {
          // Only attempt migration if there's legacy data
          logger.info('Found legacy data. Running silent migration...');
          
          // Perform silent migration
          await migrateData({
            preserveAnonymous: true, // Keep legacy data as backup
            progressCallback: () => {} // Silent migration
          });
          
          // Mark as complete
          localStorage.setItem('dataMigrationComplete', 'true');
          localStorage.setItem('migrationPromptDismissed', 'true');
          logger.info('Silent legacy data migration complete');
        } else {
          // No legacy data, mark as complete
          localStorage.setItem('dataMigrationComplete', 'true');
          localStorage.setItem('migrationPromptDismissed', 'true');
        }
      } catch (error) {
        // Log error but don't interrupt user
        logger.error('Error in legacy data handler:', error);
      }
    });
  } catch (error) {
    logger.error('Failed to initialize legacy data handler:', error);
  }
};

/**
 * Force disable all migration prompts and messages
 * This is a nuclear option to completely stop all migration-related notifications
 */
export const permanentlyDisableMigrationPrompts = () => {
  // Set every possible flag to disable migration prompts
  localStorage.setItem('migrationPromptDismissed', 'true');
  localStorage.setItem('dataMigrationComplete', 'true');
  localStorage.setItem('anonymousDataMigrated', 'true');
  sessionStorage.setItem('migrationPromptDismissed', 'true');
  sessionStorage.setItem('legacyDataHandlerRun', 'true');
  
  // Also add a global flag for components to check
  window.__MIGRATION_PROMPTS_DISABLED = true;
  
  logger.info('Migration prompts permanently disabled');
  
  // Return true to indicate success
  return true;
};

// Export a simple utility function to check if migration prompts are disabled
export const areMigrationPromptsDisabled = () => {
  return localStorage.getItem('migrationPromptDismissed') === 'true' || 
         window.__MIGRATION_PROMPTS_DISABLED === true;
};
