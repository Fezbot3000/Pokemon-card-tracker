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
      <div className="flex flex-col sm:flex-row gap-4">
        <div 
          className={`
            flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
            ${!isDarkMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 dark:border-gray-700'}
          `}
          onClick={() => toggleTheme('light')}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Light Mode</h4>
            {!isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-2">
            <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
            <div className="h-2 w-16 bg-gray-300 rounded mb-2"></div>
            <div className="h-2 w-10 bg-gray-300 rounded"></div>
          </div>
        </div>
        
        <div 
          className={`
            flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
            ${isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-gray-200 dark:border-gray-700'}
          `}
          onClick={() => toggleTheme('dark')}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
            {isDarkMode && <Icon name="check_circle" className="text-blue-500" />}
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-md p-2">
            <div className="h-2 w-8 bg-blue-500 rounded mb-2"></div>
            <div className="h-2 w-16 bg-gray-700 rounded mb-2"></div>
            <div className="h-2 w-10 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </SettingsPanel>
  );
};

export default AppearanceSettings;
