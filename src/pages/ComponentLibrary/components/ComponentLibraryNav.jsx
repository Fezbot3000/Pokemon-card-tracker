import React from 'react';
import PropTypes from 'prop-types';
import { Button, Icon } from '../../../design-system';

/**
 * ComponentLibraryNav - Navigation sidebar for Component Library
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab
 * @param {string} props.activeSection - Currently active section
 * @param {Function} props.onTabChange - Handler for tab changes
 * @param {Function} props.onSectionChange - Handler for section changes
 * @param {Function} props.toggleTheme - Theme toggle function
 * @param {string} props.theme - Current theme
 */
const ComponentLibraryNav = ({
  activeTab,
  activeSection,
  onTabChange,
  onSectionChange,
  toggleTheme,
  theme,
}) => {
  // Navigation items configuration
  const navigationItems = {
    atomic: [
      { id: 'colors', label: 'Color System', icon: 'palette' },
      { id: 'buttons', label: 'Buttons', icon: 'mouse-pointer' },
      { id: 'cards', label: 'Cards', icon: 'credit-card' },
      { id: 'form-elements', label: 'Form Elements', icon: 'edit' },
      { id: 'modern-forms', label: 'Modern Forms', icon: 'file-text' },
      { id: 'navigation', label: 'Navigation', icon: 'compass' },
      { id: 'icons', label: 'Icons', icon: 'star' },
      { id: 'toggle', label: 'Toggle', icon: 'toggle-left' },
      { id: 'dropdown', label: 'Dropdown', icon: 'chevron-down' },
      { id: 'toast', label: 'Toast', icon: 'message-circle' },
      { id: 'integration-tests', label: 'Integration Tests', icon: 'test-tube' },
    ],
    composite: [
      { id: 'header', label: 'Header', icon: 'header' },
      { id: 'modal', label: 'Modal', icon: 'maximize-2' },
      { id: 'card-details-modal', label: 'Card Details Modal', icon: 'credit-card' },
      { id: 'statistics-summary', label: 'Statistics Summary', icon: 'bar-chart-2' },
      { id: 'search-toolbar', label: 'Search Toolbar', icon: 'search' },
      { id: 'login-modal', label: 'Login Modal', icon: 'log-in' },
      { id: 'settings-modal', label: 'Settings Modal', icon: 'settings' },
      { id: 'sold-items-view', label: 'Sold Items View', icon: 'package' },
    ],
  };

  /**
   * Renders a navigation item
   * 
   * @param {Object} item - Navigation item configuration
   * @returns {JSX.Element} Navigation item component
   */
  const renderNavItem = (item) => {
    const isActive = activeSection === item.id;
    
    return (
      <button
        key={item.id}
        onClick={() => onSectionChange(item.id)}
        className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <Icon name={item.icon} className="w-4 h-4" />
        <span className="text-sm font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Component Library
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="p-2"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Categories
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onTabChange('atomic')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'atomic'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            Atomic
          </button>
          <button
            onClick={() => onTabChange('composite')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'composite'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            Composite
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {activeTab === 'atomic' ? 'Atomic Components' : 'Composite Components'}
        </div>
        <div className="space-y-1">
          {navigationItems[activeTab]?.map(renderNavItem)}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Quick Actions
        </div>
        <div className="space-y-1">
          <button
            onClick={() => window.open('/docs/design-system', '_blank')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon name="book-open" className="w-4 h-4" />
            <span className="text-sm font-medium">Documentation</span>
          </button>
          <button
            onClick={() => window.open('/storybook', '_blank')}
            className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon name="layers" className="w-4 h-4" />
            <span className="text-sm font-medium">Storybook</span>
          </button>
        </div>
      </div>
    </div>
  );
};

ComponentLibraryNav.propTypes = {
  activeTab: PropTypes.string.isRequired,
  activeSection: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  onSectionChange: PropTypes.func.isRequired,
  toggleTheme: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
};

export default ComponentLibraryNav; 