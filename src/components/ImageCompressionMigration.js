import React, { useState } from 'react';
import db from '../services/db';
import { toast } from 'react-hot-toast';

const ImageCompressionMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const startMigration = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setMigrationStatus({
      total: 0,
      processed: 0,
      compressed: 0,
      status: 'Starting...'
    });

    try {
      const result = await db.migrateAndCompressImages((progress) => {
        setMigrationStatus(progress);
      });

      toast.success(
        `Migration complete! Compressed ${result.compressed} of ${result.total} images.`
      );
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Error during migration: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-[#1B2131] rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Image Compression Migration
      </h2>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This will compress all existing card images to reduce storage usage while maintaining quality.
      </p>

      {migrationStatus && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress: {migrationStatus.processed} / {migrationStatus.total}</span>
            <span>Compressed: {migrationStatus.compressed}</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{
                width: migrationStatus.total > 0
                  ? `${(migrationStatus.processed / migrationStatus.total) * 100}%`
                  : '0%'
              }}
            />
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {migrationStatus.status}
          </p>
        </div>
      )}

      <button
        onClick={startMigration}
        disabled={isRunning}
        className={`w-full px-4 py-2 rounded-lg text-white transition-colors
          ${isRunning
            ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
            : 'bg-primary hover:bg-primary/90'
          }`}
      >
        {isRunning ? 'Migration in Progress...' : 'Start Migration'}
      </button>
    </div>
  );
};

export default ImageCompressionMigration; 