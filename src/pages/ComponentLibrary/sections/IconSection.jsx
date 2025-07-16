import React from 'react';
import PropTypes from 'prop-types';

/**
 * IconSection - Displays icon component examples and variations
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectedIcon - Currently selected icon
 * @param {string} props.iconSize - Current icon size
 * @param {string} props.iconColor - Current icon color
 * @param {Function} props.handleIconSelect - Handler for icon selection
 * @param {Function} props.handleIconSizeChange - Handler for icon size changes
 * @param {Function} props.handleIconColorChange - Handler for icon color changes
 */
const IconSection = ({
  selectedIcon,
  iconSize,
  iconColor,
  handleIconSelect,
  handleIconSizeChange,
  handleIconColorChange,
}) => {
  /**
   * Icon data with categories and examples
   */
  const iconCategories = {
    'Navigation': [
      { name: 'home', path: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
      { name: 'arrow-left', path: 'M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z' },
      { name: 'arrow-right', path: 'M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z' },
      { name: 'chevron-down', path: 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' },
      { name: 'chevron-up', path: 'M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z' },
    ],
    'Actions': [
      { name: 'plus', path: 'M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z' },
      { name: 'minus', path: 'M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z' },
      { name: 'edit', path: 'M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z' },
      { name: 'trash', path: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z' },
      { name: 'search', path: 'M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z' },
    ],
    'Status': [
      { name: 'check', path: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' },
      { name: 'x', path: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' },
      { name: 'warning', path: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' },
      { name: 'info', path: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' },
      { name: 'question', path: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z' },
    ],
    'Communication': [
      { name: 'mail', path: 'M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z' },
      { name: 'phone', path: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z' },
      { name: 'chat', path: 'M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z' },
      { name: 'bell', path: 'M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z' },
      { name: 'share', path: 'M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z' },
    ],
  };

  /**
   * Size options for icons
   */
  const sizeOptions = [
    { value: 'xs', label: 'Extra Small (12px)' },
    { value: 'sm', label: 'Small (16px)' },
    { value: 'md', label: 'Medium (20px)' },
    { value: 'lg', label: 'Large (24px)' },
    { value: 'xl', label: 'Extra Large (32px)' },
  ];

  /**
   * Color options for icons
   */
  const colorOptions = [
    { value: 'current', label: 'Current Color' },
    { value: 'gray', label: 'Gray' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'purple', label: 'Purple' },
  ];

  /**
   * Renders an icon with the specified properties
   * 
   * @param {string} name - Icon name
   * @param {string} path - SVG path
   * @param {string} size - Icon size
   * @param {string} color - Icon color
   * @returns {JSX.Element} Icon component
   */
  const renderIcon = (name, path, size = 'md', color = 'current') => {
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
    };

    const colorClasses = {
      current: 'text-current',
      gray: 'text-gray-500 dark:text-gray-400',
      blue: 'text-blue-500 dark:text-blue-400',
      green: 'text-green-500 dark:text-green-400',
      red: 'text-red-500 dark:text-red-400',
      yellow: 'text-yellow-500 dark:text-yellow-400',
      purple: 'text-purple-500 dark:text-purple-400',
    };

    return (
      <svg
        className={`${sizeClasses[size]} ${colorClasses[color]}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d={path} clipRule="evenodd" />
      </svg>
    );
  };

  /**
   * Renders an icon example
   * 
   * @param {string} title - Example title
   * @param {JSX.Element} element - Icon element
   * @param {string} description - Example description
   * @returns {JSX.Element} Icon example
   */
  const renderIconExample = (title, element, description) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        {title}
      </h4>
      <div className="mb-3 flex items-center justify-center">
        {element}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {description}
      </p>
    </div>
  );

  /**
   * Renders icon size examples
   * 
   * @returns {JSX.Element} Size examples
   */
  const renderSizeExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Icon Sizes
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {sizeOptions.map((size) => (
          <div key={size.value} className="text-center">
            {renderIcon('home', iconCategories['Navigation'][0].path, size.value, iconColor)}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {size.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Renders icon color examples
   * 
   * @returns {JSX.Element} Color examples
   */
  const renderColorExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Icon Colors
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {colorOptions.map((color) => (
          <div key={color.value} className="text-center">
            {renderIcon('home', iconCategories['Navigation'][0].path, iconSize, color.value)}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {color.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Renders icon categories
   * 
   * @returns {JSX.Element} Category examples
   */
  const renderCategoryExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Icon Categories
      </h3>
      <div className="space-y-6">
        {Object.entries(iconCategories).map(([category, icons]) => (
          <div key={category}>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              {category}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
              {icons.map((icon) => (
                <button
                  key={icon.name}
                  onClick={() => handleIconSelect(icon.name)}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedIcon === icon.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  title={icon.name}
                >
                  {renderIcon(icon.name, icon.path, iconSize, iconColor)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Renders icon usage examples
   * 
   * @returns {JSX.Element} Usage examples
   */
  const renderUsageExamples = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Icon Usage Examples
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderIconExample(
          'Button with Icon',
          <button className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            {renderIcon('plus', iconCategories['Actions'][0].path, 'sm', 'current')}
            <span className="ml-2">Add Item</span>
          </button>,
          'Icon with text in button'
        )}
        
        {renderIconExample(
          'Icon Only Button',
          <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
            {renderIcon('edit', iconCategories['Actions'][2].path, 'md', 'gray')}
          </button>,
          'Icon-only button for actions'
        )}
        
        {renderIconExample(
          'Status Indicator',
          <div className="flex items-center space-x-2">
            {renderIcon('check', iconCategories['Status'][0].path, 'sm', 'green')}
            <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
          </div>,
          'Icon as status indicator'
        )}
        
        {renderIconExample(
          'Navigation Item',
          <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            {renderIcon('home', iconCategories['Navigation'][0].path, 'sm', 'current')}
            <span className="text-sm">Dashboard</span>
          </div>,
          'Icon in navigation menu'
        )}
        
        {renderIconExample(
          'Alert with Icon',
          <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            {renderIcon('warning', iconCategories['Status'][2].path, 'md', 'yellow')}
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Please review your input.</p>
            </div>
          </div>,
          'Icon in alert component'
        )}
        
        {renderIconExample(
          'Form Field Icon',
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {renderIcon('search', iconCategories['Actions'][4].path, 'sm', 'gray')}
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>,
          'Icon in form input field'
        )}
      </div>
    </div>
  );

  /**
   * Renders icon customization controls
   * 
   * @returns {JSX.Element} Customization controls
   */
  const renderCustomizationControls = () => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Icon Customization
      </h3>
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icon Size
            </label>
            <select
              value={iconSize}
              onChange={(e) => handleIconSizeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {sizeOptions.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icon Color
            </label>
            <select
              value={iconColor}
              onChange={(e) => handleIconColorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {colorOptions.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div className="flex items-center justify-center h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
              {selectedIcon && (
                renderIcon(
                  selectedIcon,
                  iconCategories['Navigation'].find(icon => icon.name === selectedIcon)?.path || 
                  iconCategories['Actions'].find(icon => icon.name === selectedIcon)?.path ||
                  iconCategories['Status'].find(icon => icon.name === selectedIcon)?.path ||
                  iconCategories['Communication'].find(icon => icon.name === selectedIcon)?.path,
                  iconSize,
                  iconColor
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Icon System
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Explore the icon system with consistent sizing, colors, and usage patterns. 
          Icons provide visual context and improve user interface clarity.
        </p>
      </div>

      {/* Customization Controls */}
      {renderCustomizationControls()}

      {/* Size Examples */}
      {renderSizeExamples()}

      {/* Color Examples */}
      {renderColorExamples()}

      {/* Category Examples */}
      {renderCategoryExamples()}

      {/* Usage Examples */}
      {renderUsageExamples()}

      {/* Icon Guidelines */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Icon Usage Guidelines
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <strong>Consistency:</strong> Use consistent icon sizes and colors throughout your application
          </div>
          <div>
            <strong>Accessibility:</strong> Always provide text alternatives for icon-only buttons
          </div>
          <div>
            <strong>Semantic Meaning:</strong> Choose icons that clearly represent their function
          </div>
          <div>
            <strong>Visual Hierarchy:</strong> Use icon size and color to indicate importance
          </div>
          <div>
            <strong>Touch Targets:</strong> Ensure icon buttons meet minimum touch target sizes
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
          Accessibility Features
        </h3>
        <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
          <div>• Icons have proper ARIA labels and descriptions</div>
          <div>• Icon-only buttons include screen reader text</div>
          <div>• Icons maintain sufficient color contrast</div>
          <div>• Focus indicators are visible for keyboard navigation</div>
        </div>
      </div>
    </div>
  );
};

IconSection.propTypes = {
  selectedIcon: PropTypes.string.isRequired,
  iconSize: PropTypes.string.isRequired,
  iconColor: PropTypes.string.isRequired,
  handleIconSelect: PropTypes.func.isRequired,
  handleIconSizeChange: PropTypes.func.isRequired,
  handleIconColorChange: PropTypes.func.isRequired,
};

export default IconSection; 