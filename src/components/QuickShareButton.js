import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { Button } from '../design-system';
import CollectionSharing from './CollectionSharing';

const QuickShareButton = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showSharingModal, setShowSharingModal] = useState(false);

  if (!currentUser) {
    return null;
  }

  const handleShareClick = () => {
    setShowSharingModal(true);
  };

  const handleSettingsShare = () => {
    navigate('/dashboard/settings');
    // Use setTimeout to ensure navigation completes before setting tab
    setTimeout(() => {
      // Dispatch a custom event to set the sharing tab
      window.dispatchEvent(new CustomEvent('openSharingTab'));
    }, 100);
  };

  return (
    <>
      <Button
        onClick={handleShareClick}
        variant="outline"
        className={`flex items-center space-x-2 ${className}`}
      >
        <span>🔗</span>
        <span className="hidden sm:inline">Share Collection</span>
        <span className="sm:hidden">Share</span>
      </Button>

      {/* Sharing Modal */}
      {showSharingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Share Your Collection
                </h2>
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <CollectionSharing />
              
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  You can also access sharing settings from{' '}
                  <button
                    onClick={handleSettingsShare}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    Settings → Collection Sharing
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickShareButton;
