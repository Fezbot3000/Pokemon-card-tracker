import React from 'react';
import { Icon, SettingsPanel } from '../../design-system';

/**
 * Appearance Settings Component
 * Handles theme selection (light/dark mode)
 */
const AppearanceSettings = ({ isDarkMode, toggleTheme }) => {
  return (
    <SettingsPanel
      title="Appearance"
      description="Choose your preferred light or dark theme."
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div 
          className={`
            flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
            ${!isDarkMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-gray-700'}
          `}
          onClick={() => toggleTheme('light')}
        >
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">Light Mode</h4>
            {!isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-2">
            <div className="mb-2 h-2 w-8 rounded bg-blue-500"></div>
            <div className="mb-2 h-2 w-16 rounded bg-gray-300"></div>
            <div className="h-2 w-10 rounded bg-gray-300"></div>
          </div>
        </div>
        
        <div 
          className={`
            flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
            ${isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-gray-200 dark:border-gray-700'}
          `}
          onClick={() => toggleTheme('dark')}
        >
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
            {isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
          </div>
          <div className="rounded-md border border-gray-700 bg-gray-900 p-2">
            <div className="mb-2 h-2 w-8 rounded bg-blue-500"></div>
            <div className="mb-2 h-2 w-16 rounded bg-gray-700"></div>
            <div className="h-2 w-10 rounded bg-gray-700"></div>
          </div>
        </div>
      </div>
    </SettingsPanel>
  );
};

export default AppearanceSettings;
