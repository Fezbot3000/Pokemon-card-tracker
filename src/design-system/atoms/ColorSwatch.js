import React from 'react';

/**
 * ColorSwatch Component
 *
 * Displays a color sample with its name and optional description.
 */
const ColorSwatch = ({ colorValue, name, description = '' }) => {
  // Function to determine if text should be light or dark based on background color
  const getTextColor = hexColor => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate brightness (YIQ formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return white for dark backgrounds, black for light backgrounds
    return brightness < 128 ? 'text-white' : 'text-gray-900';
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div
        className={`flex h-24 items-center justify-center ${getTextColor(colorValue)}`}
        style={{ backgroundColor: colorValue }}
      >
        <span className="font-mono text-sm">{colorValue}</span>
      </div>
      <div className="bg-white p-2 dark:bg-gray-800">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {name}
        </p>
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default ColorSwatch;
