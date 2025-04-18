import React, { useState, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { useAuth } from '../design-system';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionBanner from './SubscriptionBanner';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';

const CloudSync = ({ onExportData, onImportCollection }) => {
  const { currentUser } = useAuth();
  const { subscriptionStatus, isLoading: isLoadingSubscription } = useSubscription();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint in Tailwind
    };
    
    checkMobile(); // Check on initial load
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleSyncToCloud = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to use cloud sync');
      return;
    }

    // Check if user has premium subscription
    if (subscriptionStatus.status !== 'active') {
      toast.error('Cloud sync requires a premium subscription');
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

    // Check if user has premium subscription
    if (subscriptionStatus.status !== 'active') {
      toast.error('Cloud sync requires a premium subscription');
      return;
    }

    setIsImporting(true);
    setDownloadProgress(0);

    try {
      // Reference to the latest backup
      const storageRef = ref(storage, `users/${currentUser.uid}/backups/latest-backup.zip`);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Use blob() method which is more widely supported
      const response = await fetch(downloadURL);
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      // Show indeterminate progress since we can't track progress with blob()
      setDownloadProgress(50);
      
      // Get the blob directly
      const blob = await response.blob();
      
      // Import the downloaded ZIP using the existing import function
      const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
      await onImportCollection(file);
      
      toast.success('Data imported from cloud successfully!');
      setDownloadProgress(100);
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

  // Show premium upgrade banner if user doesn't have premium subscription
  if (subscriptionStatus.status !== 'active' && !isLoadingSubscription) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 text-white relative overflow-hidden">
        <div className="absolute -right-4 -top-4 text-yellow-300 opacity-10">
          <span className="material-icons" style={{ fontSize: '6rem' }}>star</span>
        </div>
        
        <div className="flex items-start">
          <div className="mr-3 p-2 bg-white/20 rounded-full">
            <span className="material-icons text-yellow-300">workspace_premium</span>
          </div>
          
          <div className="flex-grow">
            <h4 className="text-lg font-semibold mb-1">Premium Feature</h4>
            <p className="text-sm opacity-90 mb-3">
              Cloud backup requires a premium subscription. Upgrade to access cloud backup and more!
            </p>
            
            <Link
              to="/dashboard/pricing"
              className="inline-flex items-center bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span className="material-icons text-sm mr-1">upgrade</span>
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col gap-2 mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last synced: {getLastSyncTime()}
        </p>
      </div>
      
      <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex gap-2'}`}>
        <button
          onClick={handleSyncToCloud}
          disabled={isSyncing || !currentUser || isLoadingSubscription || subscriptionStatus.status !== 'active'}
          className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
          style={{ minWidth: '110px' }}
        >
          {isSyncing ? (
            <>Saving...</>
          ) : isLoadingSubscription ? (
            <>Checking subscription...</>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '20px' }}>cloud_upload</span>
              <span>Backup to Cloud</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleImportFromCloud}
          disabled={isImporting || !currentUser || isLoadingSubscription || subscriptionStatus.status !== 'active'}
          className={`btn btn-primary ${isMobile ? 'w-full' : 'flex-1'}`}
          style={{ minWidth: '110px' }}
        >
          {isImporting ? (
            <>Loading...</>
          ) : isLoadingSubscription ? (
            <>Checking subscription...</>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '20px' }}>cloud_download</span>
              <span>Restore from Cloud</span>
            </>
          )}
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