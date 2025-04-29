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
      <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Dashboard</h2>
        <p className="text-gray-700 dark:text-gray-300">
          You don't have permission to access the admin dashboard.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PSA Database Statistics */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">PSA Database</h3>
          <PSADatabaseStats />
        </div>
        
        {/* Other admin features */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Admin Controls</h3>
          <div className="space-y-4">
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              onClick={() => alert('This would trigger a manual PSA database cleanup')}
            >
              Clean Up Old PSA Records
            </button>
            
            <button 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
