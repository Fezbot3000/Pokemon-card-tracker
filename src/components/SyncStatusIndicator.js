import React, { useState, useEffect } from 'react';
import { Icon } from '../design-system';
import featureFlags from '../utils/featureFlags';
import { auth } from '../services/firebase';
import shadowSync from '../services/shadowSync';

/**
 * SyncStatusIndicator Component
 * 
 * A small, unobtrusive indicator that shows the current sync status
 * when Firestore integration is enabled. Only visible when the
 * enableFirestoreSync feature flag is on.
 */
const SyncStatusIndicator = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncActivity, setSyncActivity] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check sync status when feature flags change
  useEffect(() => {
    setSyncEnabled(featureFlags.enableFirestoreSync);
    
    // Listen for feature flag changes
    const handleStorageChange = () => {
      try {
        const flags = JSON.parse(localStorage.getItem('appFeatureFlags')) || {};
        setSyncEnabled(flags.enableFirestoreSync);
      } catch (error) {
        console.error('Error parsing feature flags:', error);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Watch online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Watch auth status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Listen for sync activity (for animation purposes)
  useEffect(() => {
    if (!syncEnabled) return;
    
    // Create a custom event for shadow sync activity
    const handleSyncActivity = () => {
      setSyncActivity(true);
      setTimeout(() => setSyncActivity(false), 1000); // Reset after animation
    };
    
    window.addEventListener('shadow-sync-activity', handleSyncActivity);
    return () => window.removeEventListener('shadow-sync-activity', handleSyncActivity);
  }, [syncEnabled]);
  
  // Always return null to hide the indicator
  return null;
  
  // Determine status and icon
  let statusIcon = 'cloud_off';
  let statusColor = 'text-gray-400';
  let tooltip = 'Firestore sync disabled';
  
  if (syncEnabled) {
    if (!isAuthenticated) {
      statusIcon = 'cloud_off';
      statusColor = 'text-yellow-500';
      tooltip = 'Not signed in';
    } else if (!isOnline) {
      statusIcon = 'cloud_off';
      statusColor = 'text-yellow-500';
      tooltip = 'Offline - changes will sync when online';
    } else {
      statusIcon = syncActivity ? 'cloud_sync' : 'cloud_done';
      statusColor = syncActivity ? 'text-blue-500' : 'text-green-500';
      tooltip = syncActivity ? 'Syncing with cloud...' : 'Synced with cloud';
    }
  }
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-50 cursor-pointer rounded-full bg-white p-2 shadow-md dark:bg-gray-800"
      title={tooltip}
    >
      <Icon 
        name={statusIcon} 
        className={`${statusColor} ${syncActivity ? 'animate-pulse' : ''}`} 
        size="md"
      />
    </div>
  );
};

export default SyncStatusIndicator;
