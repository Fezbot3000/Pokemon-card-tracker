import React from 'react';
import { useAuth } from '../design-system';
import PSADatabaseStats from './PSADatabaseStats';

/**
 * Admin Dashboard Component
 * Shows admin-only features and statistics
 */
const AdminDashboard = () => {
  const { currentUser } = useAuth();
  
  // Simple admin check - in a real app, you'd use a more robust role system
  const isAdmin = currentUser && (
    currentUser.email === 'your-admin-email@example.com' || 
    currentUser.email.endsWith('@yourcompany.com')
  );
  
  if (!isAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
        <p className="text-gray-700 dark:text-gray-300">
          You don't have permission to access the admin dashboard.
        </p>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PSA Database Statistics */}
        <div>
          <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">PSA Database</h3>
          <PSADatabaseStats />
        </div>
        
        {/* Other admin features */}
        <div>
          <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Admin Controls</h3>
          <div className="space-y-4">
            <button 
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              onClick={() => alert('This would trigger a manual PSA database cleanup')}
            >
              Clean Up Old PSA Records
            </button>
            
            <button 
              className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
              onClick={() => alert('This would export PSA database statistics')}
            >
              Export PSA Database Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
