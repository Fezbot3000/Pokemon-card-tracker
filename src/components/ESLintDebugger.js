import React, { useState, useEffect, useCallback } from 'react';
import LoggingService from '../services/LoggingService';

const ESLintDebugger = () => {
  const [warningCount, setWarningCount] = useState(null);
  const [errorCount, setErrorCount] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoUpdate, setAutoUpdate] = useState(true);

  const fetchLintResults = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to read the ESLint results from a JSON file
      const response = await fetch('/eslint-results.json?' + Date.now());
      if (response.ok) {
        const results = await response.json();
        setWarningCount(results.warnings);
        setErrorCount(results.errors);
        setLastUpdated(new Date(results.lastUpdated).toLocaleTimeString());
      } else {
        // Fallback to triggering the update script
        await triggerESLintUpdate();
      }
    } catch (error) {
      LoggingService.error('Failed to fetch lint results:', error);
      // Fallback to manual update option
      setWarningCount(null);
      setErrorCount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerESLintUpdate = async () => {
    try {
      // This will trigger the Node.js script to run ESLint and update the JSON file
      const response = await fetch('/api/update-eslint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const results = await response.json();
        setWarningCount(results.warnings);
        setErrorCount(results.errors);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        // If API isn't available, show manual update instructions
        LoggingService.info('ESLint API not available, showing manual update option');
      }
    } catch (error) {
      LoggingService.error('Failed to trigger ESLint update:', error);
    }
  };

  useEffect(() => {
    fetchLintResults();
    
    let intervalId;
    if (autoUpdate) {
      // Auto-update every 5 seconds when auto-update is enabled
      intervalId = setInterval(fetchLintResults, 5000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoUpdate, fetchLintResults]);

  const handleManualUpdate = () => {
    fetchLintResults();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 p-2 text-white shadow-lg transition-colors hover:bg-blue-700"
        title="Show ESLint Debug Panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 min-w-[320px] rounded-lg border border-gray-300 bg-white p-4 shadow-lg dark:border-gray-600 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          ESLint Status {autoUpdate && <span className="text-green-500">●</span>}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`rounded px-2 py-1 text-xs text-white transition-colors ${
              autoUpdate ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
            title={autoUpdate ? 'Auto-update ON' : 'Auto-update OFF'}
          >
            {autoUpdate ? '🔄' : '⏸️'}
          </button>
          <button
            onClick={handleManualUpdate}
            disabled={isLoading}
            className="rounded bg-blue-500 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            title="Manual refresh"
          >
            {isLoading ? '⟳' : '↻'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="rounded bg-gray-500 px-2 py-1 text-xs text-white transition-colors hover:bg-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Errors:</span>
          <span className={`font-bold ${errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {errorCount !== null ? errorCount : '...'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Warnings:</span>
          <span className={`font-bold ${warningCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {warningCount !== null ? warningCount : '...'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Total:</span>
          <span className="font-bold text-gray-800 dark:text-white">
            {warningCount !== null && errorCount !== null ? warningCount + errorCount : '...'}
          </span>
        </div>
        
        {lastUpdated && (
          <div className="border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
            Last updated: {lastUpdated}
            {autoUpdate && <span className="ml-2 text-green-500">Auto-updating...</span>}
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Target: 0 errors, &lt;100 warnings
        </div>
      </div>
      
      {/* Progress indicator */}
      {warningCount !== null && (
        <div className="mt-3">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">
            Progress (Goal: 0-100 warnings)
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                warningCount <= 100 ? 'bg-green-500' : 
                warningCount <= 300 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ 
                width: `${Math.min(100, Math.max(0, 100 - (warningCount / 10)))}%` 
              }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {warningCount <= 100 ? '🎉 Goal reached!' : `${warningCount - 100} over target`}
          </div>
        </div>
      )}
      
      {/* Manual update instructions when API isn't available */}
      {warningCount === null && errorCount === null && (
        <div className="mt-3 rounded bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <strong>Manual Update:</strong> Run <code>node update-eslint-count.js</code> in terminal to update counts
        </div>
      )}
    </div>
  );
};

export default ESLintDebugger; 