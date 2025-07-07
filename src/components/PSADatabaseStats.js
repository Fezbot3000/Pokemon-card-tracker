import React, { useState, useEffect } from 'react';
import { getPSADatabaseStats } from '../services/psaDatabase';
import { useAuth } from '../design-system';

/**
 * PSA Database Statistics Component
 * Shows statistics about the shared PSA database
 */
const PSADatabaseStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  
  // Only admins should be able to see detailed stats
  const isAdmin = currentUser && currentUser.email === 'your-admin-email@example.com';
  
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const dbStats = await getPSADatabaseStats();
        setStats(dbStats);
      } catch (error) {
        console.error('Error fetching PSA database stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-black">
        <div className="flex animate-pulse space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="space-y-2">
              <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-black">
        <p className="text-gray-500 dark:text-gray-400">Unable to load PSA database statistics</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg bg-gray-50 p-4 dark:bg-black">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">PSA Database Statistics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-black">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Cards</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCards.toLocaleString()}</div>
        </div>
        
        <div className="rounded-lg bg-white p-4 shadow dark:bg-black">
          <div className="text-sm text-gray-500 dark:text-gray-400">Recently Updated</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentlyUpdated.toLocaleString()}</div>
        </div>
      </div>
      
      {isAdmin && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last checked: {new Date(stats.lastChecked).toLocaleString()}
          </div>
          
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="font-medium text-blue-800 dark:text-blue-300">API Call Savings</h4>
            <p className="mt-1 text-blue-700 dark:text-blue-400">
              Estimated API calls saved: {Math.round(stats.totalCards * 2.5).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-blue-600 dark:text-blue-500">
              Based on average of 2.5 lookups per card across all users
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PSADatabaseStats;
