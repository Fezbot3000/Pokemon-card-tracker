import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { subscriptionStatus, fixSubscription } = useSubscription();

  const handleUpgradeClick = async () => {
    // Try to fix subscription first
    try {
      const result = await fixSubscription();
      if (!result.success) {
        // Only navigate to pricing if fix wasn't successful
        window.location.href = '/dashboard/pricing';
      }
    } catch (error) {
      console.error('Error fixing subscription:', error);
      window.location.href = '/dashboard/pricing';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Backup & Restore</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Save your collection data or restore from a previous backup
        </p>
        <div className="flex gap-4">
          <button className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center">
            <span className="material-icons mr-2">download</span>
            Backup Data
          </button>
          <button className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center">
            <span className="material-icons mr-2">upload</span>
            Restore Backup
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Cloud Backup</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Sync your collection to the cloud so you can access it on any device
        </p>
        {subscriptionStatus.status !== 'active' ? (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-white">
            <div className="flex items-center mb-4">
              <span className="material-icons text-2xl mr-2">stars</span>
              <h4 className="text-lg font-semibold">Premium Feature</h4>
            </div>
            <p className="mb-4">
              Cloud backup requires a premium subscription. Upgrade to access cloud backup and more!
            </p>
            <button
              onClick={handleUpgradeClick}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-6 py-2 rounded-lg flex items-center justify-center"
            >
              <span className="material-icons mr-2">upgrade</span>
              Upgrade Now
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center">
              <span className="material-icons mr-2">cloud_upload</span>
              Backup to Cloud
            </button>
            <button className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center">
              <span className="material-icons mr-2">cloud_download</span>
              Restore from Cloud
            </button>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Help & Guidance</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Learn how to use the app with our step-by-step tutorial
        </p>
        <button className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-4 py-2 rounded-lg flex items-center">
          <span className="material-icons mr-2">help_outline</span>
          Start Tutorial
        </button>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4">Reset Application</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Start fresh by deleting all your collections and settings. Warning: This cannot be undone.
        </p>
        <button className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 px-4 py-2 rounded-lg flex items-center">
          <span className="material-icons mr-2">delete_forever</span>
          Reset App
        </button>
      </section>
    </div>
  );
} 