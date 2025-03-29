import React from 'react';
import { useAutoSync } from '../contexts/AutoSyncContext';
import { useTheme } from '../contexts/ThemeContext';

const SyncProgressToast = () => {
  const { syncInProgress, syncProgress } = useAutoSync();
  const { isDarkMode } = useTheme();
  
  if (!syncInProgress) {
    return null;
  }
  
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`px-4 py-3 rounded-lg shadow-lg flex flex-col items-center
                      ${isDarkMode ? 'bg-[#1E293B] text-white' : 'bg-white text-gray-800'}
                      border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center mb-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2"></div>
          <span className="font-medium">Syncing with cloud...</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-xs">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${syncProgress}%` }}
          ></div>
        </div>
        <span className="text-xs mt-1 text-gray-500 dark:text-gray-400">{syncProgress}%</span>
      </div>
    </div>
  );
};

export default SyncProgressToast; 