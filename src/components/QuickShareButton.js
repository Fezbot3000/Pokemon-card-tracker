import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../design-system';
import { Button } from '../design-system';
import CollectionSharing from './CollectionSharing';

const QuickShareButton = ({ className = '' }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

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

      {/* Sharing Modal - MADE MORE TRANSPARENT */}
      {showSharingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border shadow-2xl"
            style={{
              backgroundColor: isDarkMode
                ? 'rgb(0, 0, 0)'
                : 'rgb(255, 255, 255)',
              borderColor: isDarkMode
                ? 'rgba(55, 65, 81, 0.5)'
                : 'rgba(229, 231, 235, 0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Share Your Collection
                </h2>
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <CollectionSharing isInModal={true} />

              <div
                className="mt-6 border-t pt-4"
                style={{
                  borderColor: isDarkMode
                    ? 'rgba(55, 65, 81, 0.5)'
                    : 'rgba(229, 231, 235, 0.5)',
                }}
              >
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  You can also access sharing settings from{' '}
                  <button
                    onClick={handleSettingsShare}
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
