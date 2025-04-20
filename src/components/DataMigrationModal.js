import React, { useState, useEffect } from 'react';
import { useAuth } from '../design-system';
import { toast } from 'react-hot-toast';
import { checkIfMigrationNeeded, migrateData, anonymousUserHasData } from '../utils/dataMigration';
import logger from '../utils/logger';

/**
 * Modal component that checks for and handles migration of legacy anonymous data to user account
 */
const DataMigrationModal = () => {
  const { currentUser } = useAuth();
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Check if migration is needed when user logs in
  useEffect(() => {
    const checkMigration = async () => {
      // First check if prompts have been dismissed
      const promptsDismissed = localStorage.getItem('migrationPromptDismissed') === 'true' || 
                              sessionStorage.getItem('migrationPromptDismissed') === 'true';
      
      if (promptsDismissed) {
        setShowModal(false);
        return;
      }
      
      if (currentUser && currentUser.uid) {
        try {
          // First check if there's anonymous data to migrate
          const hasAnonymousData = await anonymousUserHasData();
          
          if (hasAnonymousData) {
            // Check if migration is needed
            const migrationStatus = await checkIfMigrationNeeded();
            setMigrationNeeded(migrationStatus === true);
            
            // If migration needed, show modal
            if (migrationStatus === true) {
              setShowModal(true);
            }
            
            // If we need a merge strategy (user already has data), show a different message
            if (migrationStatus === 'merge') {
              toast('We detected data from a previous session. Contact support if you need to merge collections.', 
                { 
                  duration: 6000,
                  icon: 'ℹ️',
                  style: {
                    borderRadius: '10px',
                    background: '#3498db',
                    color: '#fff',
                  },
                }
              );
            }
          }
        } catch (error) {
          logger.error('Error checking migration status:', error);
        }
      }
    };
    
    checkMigration();
  }, [currentUser]);
  
  // Handle migration process
  const handleMigrate = async () => {
    if (!currentUser || !currentUser.uid) {
      toast.error('You must be logged in to migrate data');
      return;
    }
    
    setIsMigrating(true);
    setProgress(0);
    setStatusMessage('Starting migration...');
    
    try {
      // Start migration with progress updates
      await migrateData({
        preserveAnonymous: true, // Keep anonymous data as backup
        progressCallback: (percent, message) => {
          setProgress(percent);
          setStatusMessage(message);
        }
      });
      
      // Migration successful
      toast.success('Data migrated successfully!');
      
      // Close modal after a delay to show completion
      setTimeout(() => {
        setShowModal(false);
        setMigrationNeeded(false);
        
        // Refresh the page to ensure all components see the new data
        window.location.reload();
      }, 2000);
    } catch (error) {
      logger.error('Error during migration:', error);
      toast.error(`Migration failed: ${error.message}`);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };
  
  // Skip migration
  const handleSkip = () => {
    setShowModal(false);
    toast('You can migrate your data later in settings if needed.', {
      icon: 'ℹ️',
      style: {
        borderRadius: '10px',
        background: '#3498db',
        color: '#fff',
      },
    });
  };
  
  // If no modal needed, don't render anything
  if (!showModal) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Data Migration Available
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            We've detected card data from a previous session. Would you like to migrate 
            this data to your account so it's available on all your devices?
          </p>
          
          {isMigrating && (
            <div className="mb-6">
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
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="w-full px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? 'Migrating...' : 'Migrate Data'}
            </button>
            
            <button
              onClick={handleSkip}
              disabled={isMigrating}
              className="w-full px-4 py-2 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip for Now
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Note: This will not delete your previous data. It will just copy it to your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataMigrationModal;
