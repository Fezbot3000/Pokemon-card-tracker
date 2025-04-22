import React, { createContext, useContext, useState } from 'react';

// Create the BackupContext
const BackupContext = createContext({
  isBackingUp: false,
  backupProgress: 0,
  backupStatus: '',
  backupLogs: [],
  startBackup: () => {},
  completeBackup: () => {},
  cancelBackup: () => {},
  setBackupProgress: () => {},
  setBackupStatus: () => {},
  addBackupLog: () => {},
});

// Custom hook to use the BackupContext
export const useBackup = () => useContext(BackupContext);

// BackupProvider component to wrap the app
export const BackupProvider = ({ children }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState('');
  const [backupLogs, setBackupLogs] = useState([]);

  // Start the backup process
  const startBackup = () => {
    setIsBackingUp(true);
    setBackupProgress(0);
    setBackupStatus('Starting backup...');
    setBackupLogs([]);
  };

  // Complete the backup process
  const completeBackup = () => {
    setBackupProgress(100);
    setBackupStatus('Backup complete!');
    setTimeout(() => {
      setIsBackingUp(false);
    }, 2000); // Keep the progress bar visible for 2 seconds after completion
  };

  // Cancel the backup process
  const cancelBackup = () => {
    setIsBackingUp(false);
    setBackupProgress(0);
    setBackupStatus('Backup cancelled');
  };

  // Add a log entry
  const addBackupLog = (message) => {
    setBackupLogs(prev => [...prev, message]);
  };

  return (
    <BackupContext.Provider
      value={{
        isBackingUp,
        backupProgress,
        backupStatus,
        backupLogs,
        startBackup,
        completeBackup,
        cancelBackup,
        setBackupProgress,
        setBackupStatus,
        addBackupLog,
      }}
    >
      {children}
    </BackupContext.Provider>
  );
};

export default BackupContext;
