import React, { useState } from 'react';
import Button from '../atoms/Button';

/**
 * ColorCustomizer Component
 * 
 * Allows customization of component colors with a dropdown selector for each color variable.
 */
const ColorCustomizer = ({ componentName, colorVariables, availableColors, onSave }) => {
  const [selectedColors, setSelectedColors] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleColorChange = (variableName, colorValue) => {
    setSelectedColors(prev => ({
      ...prev,
      [variableName]: colorValue
    }));
  };

  const handleSave = () => {
    // Call the onSave callback with all selected colors
    Object.entries(selectedColors).forEach(([variable, value]) => {
      onSave(variable, value);
    });
  };

  return (
    <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        className="flex items-center justify-between w-full text-left text-gray-700 dark:text-gray-300 font-medium"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Customize {componentName} Colors</span>
        <span className="text-gray-500">{isExpanded ? '−' : '+'}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {Object.entries(colorVariables).map(([variableName, defaultValue]) => (
            <div key={variableName} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {variableName}
              </label>
              <select
                className="block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                value={selectedColors[variableName] || defaultValue}
                onChange={(e) => handleColorChange(variableName, e.target.value)}
              >
                <option value="">Default</option>
                {Object.entries(availableColors).map(([colorName, colorValue]) => (
                  <option key={colorName} value={colorValue}>
                    {colorName} ({colorValue})
                  </option>
                ))}
              </select>
            </div>
          ))}
          
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={handleSave}
              className="mt-2"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorCustomizer;
