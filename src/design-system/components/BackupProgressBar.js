import React from 'react';
import { useBackup } from '../contexts/BackupContext';

/**
 * A progress bar component that displays the current backup progress
 * This is shown at the bottom of the screen when a backup is in progress
 */
const BackupProgressBar = () => {
  const { isBackingUp, backupProgress, backupStatus } = useBackup();

  if (!isBackingUp) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3 shadow-lg">
      <div className="container mx-auto">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Backing Up to Cloud
            </span>
            <span className="text-sm font-bold">{backupProgress}%</span>
          </div>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-3">
            <div 
              className="bg-white h-3 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${backupProgress}%` }}
            ></div>
          </div>
          <div className="text-xs mt-2 text-white font-medium">{backupStatus}</div>
        </div>
      </div>
    </div>
  );
};

export default BackupProgressBar;
