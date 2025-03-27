import React, { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';

const CloudSync = ({ onExportData, onImportCollection }) => {
  const { currentUser } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleSyncToCloud = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to use cloud sync');
      return;
    }

    setIsSyncing(true);
    setUploadProgress(0);

    try {
      // Use the existing export function to get the data ZIP
      const exportedZip = await onExportData({ returnBlob: true });
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      const uploadTask = uploadBytesResumable(storageRef, exportedZip);

      // Monitor upload progress
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          toast.error('Failed to upload backup: ' + error.message);
          setIsSyncing(false);
        },
        async () => {
          // Upload completed successfully
          toast.success('Backup synced to cloud successfully!');
          
          // Store timestamp of latest backup
          localStorage.setItem('lastCloudSync', new Date().toISOString());
          setIsSyncing(false);
        }
      );
    } catch (error) {
      console.error('Cloud sync error:', error);
      toast.error('Failed to sync to cloud: ' + error.message);
      setIsSyncing(false);
    }
  };

  const handleImportFromCloud = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to import from cloud');
      return;
    }

    setIsImporting(true);
    setDownloadProgress(0);

    try {
      // Reference to the latest backup
      const storageRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Create a fetch request that can track progress
      const response = await fetch(downloadURL);
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      // Get total size
      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      
      // Create a reader to track download progress
      const reader = response.body.getReader();
      let receivedLength = 0;
      let chunks = [];

      // Read the data
      while(true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress
        setDownloadProgress((receivedLength / total) * 100);
      }
      
      // Combine chunks into a single Uint8Array
      let chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for(let chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      
      // Create a blob from the data
      const blob = new Blob([chunksAll]);
      
      // Import the downloaded ZIP using the existing import function
      const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
      await onImportCollection(file);
      
      toast.success('Data imported from cloud successfully!');
      setIsImporting(false);
    } catch (error) {
      console.error('Cloud import error:', error);
      toast.error('Failed to import from cloud: ' + error.message);
      setIsImporting(false);
    }
  };

  const getLastSyncTime = () => {
    const lastSync = localStorage.getItem('lastCloudSync');
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    return date.toLocaleString();
  };

  return (
    <div className="py-4 space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cloud Sync</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        Sync your data to the cloud to access it from any device
      </p>
      
      <div className="flex flex-col gap-2 mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last synced: {getLastSyncTime()}
        </p>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={handleSyncToCloud}
          disabled={isSyncing || !currentUser}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
        </button>
        
        <button
          onClick={handleImportFromCloud}
          disabled={isImporting || !currentUser}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isImporting ? 'Importing...' : 'Import from Cloud'}
        </button>
      </div>
      
      {(isSyncing || isImporting) && (
        <div className="w-full mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isSyncing ? 'Uploading...' : 'Downloading...'}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isSyncing 
                ? `${Math.round(uploadProgress)}%` 
                : `${Math.round(downloadProgress)}%`
              }
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ 
                width: `${isSyncing ? uploadProgress : downloadProgress}%` 
              }}
            ></div>
          </div>
        </div>
      )}
      
      {!currentUser && (
        <p className="text-sm text-amber-500 dark:text-amber-400 mt-2">
          You need to be logged in to use cloud sync features.
        </p>
      )}
    </div>
  );
};

export default CloudSync; 