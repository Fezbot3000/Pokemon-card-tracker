/* eslint-disable tailwindcss/classnames-order */
import React from 'react';
import { useRestore } from '../contexts/RestoreContext';

/**
 * A progress bar component that displays the current restore progress
 * This is shown in the header when a restore is in progress
 */
const RestoreProgressBar = () => {
  const { isRestoring, restoreProgress, restoreStatus } = useRestore();

  if (!isRestoring) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] bg-gradient-to-r from-blue-600 to-indigo-700 p-3 text-white shadow-lg">
      <div className="container mx-auto">
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center text-sm font-medium">
              <svg
                className="-ml-1 mr-2 size-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Restoring from Cloud Backup
            </span>
            <span className="text-sm font-bold">{restoreProgress}%</span>
          </div>
          <div className="bg-white/30 h-3 w-full rounded-full">
            <div
              className="h-3 rounded-full bg-white transition-all duration-300 ease-in-out"
              style={{ width: `${restoreProgress}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs font-medium text-white">
            {restoreStatus}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestoreProgressBar;
