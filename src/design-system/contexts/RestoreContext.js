import React, { createContext, useContext, useState } from 'react';

/**
 * Context for tracking cloud restore progress across the app
 * This allows the restore process to continue even when the settings modal is closed
 */
const RestoreContext = createContext();

export const RestoreProvider = ({ children }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreLogs, setRestoreLogs] = useState([]);

  /**
   * Add a log message to the restore logs
   * @param {string} message - The log message to add
   */
  const addRestoreLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setRestoreLogs(prevLogs => [...prevLogs, logEntry]);
  };

  /**
   * Start the restore process
   */
  const startRestore = () => {
    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreStatus('Starting restore...');
    setRestoreLogs([]);
  };

  /**
   * Complete the restore process
   */
  const completeRestore = () => {
    setIsRestoring(false);
    setRestoreProgress(100);
    setRestoreStatus('Restore complete!');
  };

  /**
   * Cancel the restore process
   */
  const cancelRestore = () => {
    setIsRestoring(false);
    setRestoreStatus('Restore cancelled');
  };

  return (
    <RestoreContext.Provider
      value={{
        isRestoring,
        restoreProgress,
        restoreStatus,
        restoreLogs,
        setIsRestoring,
        setRestoreProgress,
        setRestoreStatus,
        addRestoreLog,
        startRestore,
        completeRestore,
        cancelRestore
      }}
    >
      {children}
    </RestoreContext.Provider>
  );
};

export const useRestore = () => useContext(RestoreContext);

export default RestoreContext;
