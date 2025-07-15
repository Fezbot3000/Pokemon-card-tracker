import React from 'react';
import ComponentLibraryNav from './components/ComponentLibraryNav';
import { useComponentLibrary } from './hooks/useComponentLibrary';

/**
 * ComponentLibrary - Main component library page
 * 
 * This is the refactored version of the original ComponentLibrary.jsx
 * that has been modularized into smaller, focused components.
 */
const ComponentLibrary = () => {
  const {
    // Navigation
    activeTab,
    activeSection,
    navigateToTab,
    navigateToSection,
    
    // Theme
    theme,
    toggleTheme,
    
    // Color customization
    customColors,
    colorMap,
    handleSaveColor,
    resetColors,
    getColorValue,
    isColorCustomized,
    
    // Modal states
    isModalOpen,
    setIsModalOpen,
    isCardDetailsModalOpen,
    setIsCardDetailsModalOpen,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    
    // Form states
    textValue,
    numberValue,
    errorText,
    errorNumber,
    handleTextChange,
    handleNumberChange,
    
    // Dropdown states
    dropdownIsOpen,
    selectedItem,
    handleDropdownToggle,
    handleItemSelect,
    
    // Toggle states
    toggleStates,
    handleToggleChange,
    
    // Sold items
    soldItems,
    setSoldItems,
    
    // Modern form states
    selectValue,
    checkboxes,
    radioValue,
    switchStates,
    activeModernTab,
    modernInputValue,
    modernInputError,
    handleSelectChange,
    handleCheckboxChange,
    handleRadioChange,
    handleSwitchChange,
    handleModernTabChange,
    handleModernInputChange,
    
    // Mock handlers
    handleMockLogin,
    handleMockSignUpClick,
    handleMockForgotPasswordClick,
    handleMockGoogleLogin,
    handleMockAppleLogin,
  } = useComponentLibrary();

  /**
   * Renders the appropriate section based on active tab and section
   * 
   * @returns {JSX.Element} The rendered section component
   */
  const renderActiveSection = () => {
    // Import sections dynamically to avoid circular dependencies
    const sections = {
      // Atomic sections
      colors: () => import('./sections/ColorSystemSection').then(m => m.default),
      buttons: () => import('./sections/ButtonSection').then(m => m.default),
      cards: () => import('./sections/CardSection').then(m => m.default),
      'form-elements': () => import('./sections/FormElementsSection').then(m => m.default),
      'modern-forms': () => import('./sections/ModernFormsSection').then(m => m.default),
      navigation: () => import('./sections/NavigationSection').then(m => m.default),
      icons: () => import('./sections/IconSection').then(m => m.default),
      toggle: () => import('./sections/ToggleSection').then(m => m.default),
      dropdown: () => import('./sections/DropdownSection').then(m => m.default),
      toast: () => import('./sections/ToastSection').then(m => m.default),
      'integration-tests': () => import('./sections/IntegrationTestsSection').then(m => m.default),
      
      // Composite sections
      header: () => import('./sections/HeaderSection').then(m => m.default),
      modal: () => import('./sections/ModalSection').then(m => m.default),
      'card-details-modal': () => import('./sections/CardDetailsModalSection').then(m => m.default),
      'statistics-summary': () => import('./sections/StatisticsSummarySection').then(m => m.default),
      'search-toolbar': () => import('./sections/SearchToolbarSection').then(m => m.default),
      'login-modal': () => import('./sections/LoginModalSection').then(m => m.default),
      'settings-modal': () => import('./sections/SettingsModalSection').then(m => m.default),
      'sold-items-view': () => import('./sections/SoldItemsSection').then(m => m.default),
    };

    const SectionComponent = sections[activeSection];
    
    if (!SectionComponent) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">
            Section "{activeSection}" not found
          </p>
        </div>
      );
    }

    // For now, return a placeholder until we create all section components
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1).replace('-', ' ')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Section component will be implemented here
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Navigation Sidebar */}
        <ComponentLibraryNav
          activeTab={activeTab}
          activeSection={activeSection}
          onTabChange={navigateToTab}
          onSectionChange={navigateToSection}
          toggleTheme={toggleTheme}
          theme={theme}
        />

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Component Library
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Explore and test all available components in the design system
              </p>
            </div>

            {/* Color Customizer */}
            {activeSection === 'colors' && (
              <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Color Customizer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(colorMap).map(([variable, defaultValue]) => (
                    <div key={variable} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {variable}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="color"
                          value={getColorValue(variable)}
                          onChange={(e) => handleSaveColor(variable, e.target.value)}
                          className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600"
                        />
                        <input
                          type="text"
                          value={getColorValue(variable)}
                          onChange={(e) => handleSaveColor(variable, e.target.value)}
                          className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                        {isColorCustomized(variable) && (
                          <button
                            onClick={() => handleSaveColor(variable, defaultValue)}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button
                    onClick={resetColors}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    Reset All Colors
                  </button>
                </div>
              </div>
            )}

            {/* Section Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentLibrary; 