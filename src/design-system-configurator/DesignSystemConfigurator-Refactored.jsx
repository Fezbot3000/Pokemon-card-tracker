import React, { useEffect } from 'react';
import { applyCSSVariables, getTypographyStyle } from './config/configManager';
import { getTextColorStyle, getBackgroundColorStyle, getBorderColorStyle, getSurfaceStyle } from './utils/styleUtils';
import { useCards } from '../contexts/CardContext';
import { useButtonStyles } from './hooks/useButtonStyles';
import { useComponentManagement } from './hooks/useComponentManagement';
import { useConfigurationManagement } from './hooks/useConfigurationManagement';
import { defaultComponents } from './config/defaultComponents';
import ConfigurationPanel from './components/ConfigurationPanel';
import StatisticsComponent from './components/StatisticsComponent';
import SearchBarComponent from './components/SearchBarComponent';
import CollectionSelectorComponent from './components/CollectionSelectorComponent';
import CardListComponent from './components/CardListComponent';
import ToastMessagesComponent from './components/ToastMessagesComponent';

/**
 * Main Design System Configurator Component
 * Refactored to use extracted hooks and components for better maintainability
 */
const DesignSystemConfigurator = () => {
  // Configuration Management Hook
  const {
    config,
    setConfig,
    isDarkMode,
    setIsDarkMode,
    primaryStyle,
    setPrimaryStyle,
    activeSection,
    setActiveSection,
    applyColorPreset,
    exportConfig,
    resetToDefaults,
    isTypographyStyleUsed,
    isConfigSectionUsed,
    sections,
    unusedSections
  } = useConfigurationManagement();

  // Component Management Hook
  const {
    components,
    addComponent,
    removeComponent,
    isComponentSectionUsed
  } = useComponentManagement(defaultComponents);

  // Button Styles Hook
  const { getPrimaryButtonStyle, getSecondaryButtonStyle, getTertiaryButtonStyle } = useButtonStyles(
    config,
    isDarkMode,
    primaryStyle
  );

  // Real data from CardContext
  const { 
    cards, 
    collections, 
    selectedCollection, 
    setSelectedCollection, 
    loading: cardsLoading 
  } = useCards();

  // Apply CSS variables when config changes
  useEffect(() => {
    applyCSSVariables(config, isDarkMode);
  }, [config, isDarkMode]);

  // Extract colors based on theme
  const colors = isDarkMode ? config.theme?.darkColors : config.colors;

  // Bound helper functions
  const boundGetTypographyStyle = getTypographyStyle(config);
  const boundGetTextColorStyle = getTextColorStyle(config, isDarkMode);
  const boundGetBackgroundColorStyle = getBackgroundColorStyle(config, isDarkMode);
  const boundGetBorderColorStyle = getBorderColorStyle(config, isDarkMode);
  const boundGetSurfaceStyle = getSurfaceStyle(config, isDarkMode);

  // Component categories for library
  const componentCategories = [{
    name: 'UI Components',
    components: [
      { type: 'statistics', name: 'Statistics', icon: '📊', description: 'Display key metrics' },
      { type: 'searchBar', name: 'Search Bar', icon: '🔍', description: 'Search with filters' },
      { type: 'collectionSelector', name: 'Collection Selector', icon: '📚', description: 'Select collections' },
      { type: 'cardList', name: 'Card List', icon: '🃏', description: 'Display card items' },
      { type: 'toastMessages', name: 'Toast Messages', icon: '🔔', description: 'Show notifications' }
    ]
  }];

  // Render individual components
  const renderComponent = (component) => {
    const sharedProps = {
      config,
      isDarkMode,
      colors,
      getTypographyStyle: boundGetTypographyStyle,
      getTextColorStyle: boundGetTextColorStyle,
      getBackgroundColorStyle: boundGetBackgroundColorStyle,
      getBorderColorStyle: boundGetBorderColorStyle,
      getSurfaceStyle: boundGetSurfaceStyle,
      getPrimaryButtonStyle,
      primaryStyle
    };

    const componentMap = {
      statistics: StatisticsComponent,
      searchBar: SearchBarComponent,
      collectionSelector: CollectionSelectorComponent,
      cardList: CardListComponent,
      toastMessages: ToastMessagesComponent
    };

    const ComponentToRender = componentMap[component.type];
    if (!ComponentToRender) return null;

    return (
      <div key={component.id} className="relative group">
        <div className="absolute -top-2 -right-2 z-10">
          <button
            onClick={() => removeComponent(component.id)}
            className="size-6 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: colors?.error }}
          >
            ×
          </button>
        </div>
        
        <ComponentToRender
          {...sharedProps}
          {...component}
          data={component}
          realCards={cards}
          cardsLoading={cardsLoading}
          selectedCollection={selectedCollection}
          setSelectedCollection={setSelectedCollection}
          collections={collections}
          getInteractiveStyle={boundGetSurfaceStyle}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: colors?.backgroundSecondary }}>
      <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 
              className="text-3xl font-bold"
              style={{
                ...boundGetTypographyStyle('display'),
                ...boundGetTextColorStyle('primary')
              }}
            >
              Design System Configurator
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="px-4 py-2 rounded-lg font-medium transition-colors border"
              style={{
                ...boundGetBackgroundColorStyle('surface'),
                ...boundGetTextColorStyle('primary'),
                ...boundGetBorderColorStyle('primary')
              }}
            >
              {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'} Mode
            </button>
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 rounded-lg font-medium transition-colors border"
              style={{
                borderColor: colors?.error,
                color: colors?.error,
                ...boundGetBackgroundColorStyle('surface')
              }}
            >
              🔄 Reset All
            </button>
            <button
              onClick={exportConfig}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={getPrimaryButtonStyle()}
            >
              📥 Export Configuration
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(100vh-12rem)]">
          {/* Left Third - Configuration Panel */}
          <div className="flex flex-col min-h-0 lg:col-span-1">
            <div className="rounded-lg p-4 border mb-6" style={{
              backgroundColor: colors?.surface,
              borderColor: colors?.border
            }}>
              <h2 
                className="text-lg font-semibold mb-4"
                style={{
                  ...boundGetTypographyStyle('heading'),
                  ...boundGetTextColorStyle('primary')
                }}
              >
                Configuration
              </h2>
              <div className="relative">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-lg border text-sm font-medium transition-all duration-200 appearance-none cursor-pointer focus:outline-none focus:ring-2"
                  style={{
                    '--tw-ring-color': `${colors?.secondary}33`,
                    ...boundGetBackgroundColorStyle('surface'),
                    ...boundGetTextColorStyle('primary'),
                    ...boundGetBorderColorStyle('primary')
                  }}
                >
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.icon} {section.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Configuration Content */}
            <div className="rounded-lg p-6 border flex-1 overflow-y-auto" style={{
              backgroundColor: colors?.surface,
              borderColor: colors?.border
            }}>
              <ConfigurationPanel
                config={config}
                setConfig={setConfig}
                isDarkMode={isDarkMode}
                activeSection={activeSection}
                colors={colors}
                primaryStyle={primaryStyle}
                setPrimaryStyle={setPrimaryStyle}
                applyColorPreset={applyColorPreset}
                getTypographyStyle={boundGetTypographyStyle}
                getTextColorStyle={boundGetTextColorStyle}
                getBackgroundColorStyle={boundGetBackgroundColorStyle}
                getBorderColorStyle={boundGetBorderColorStyle}
                getSurfaceStyle={boundGetSurfaceStyle}
                getPrimaryButtonStyle={getPrimaryButtonStyle}
                unusedSections={unusedSections}
                isTypographyStyleUsed={isTypographyStyleUsed}
                isConfigSectionUsed={isConfigSectionUsed}
              />
            </div>
          </div>

          {/* Right Two-Thirds - Component Preview */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="rounded-lg p-6 border mb-6" style={{
              backgroundColor: colors?.surface,
              borderColor: colors?.border
            }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={boundGetTextColorStyle('primary')}>
                  Component Library
                </h2>
                <div className="px-3 py-1 rounded-full text-sm font-medium" style={{
                  backgroundColor: (colors?.secondary || '#0ea5e9') + '20',
                  color: colors?.secondary || '#0ea5e9'
                }}>
                  {components.length} Components
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {componentCategories[0].components.map(component => (
                  <button
                    key={component.type}
                    onClick={() => addComponent(component.type)}
                    className="p-4 rounded-lg border text-left transition-colors"
                    style={{
                      borderColor: colors?.border,
                      backgroundColor: colors?.surfaceSecondary
                    }}
                  >
                    <div className="text-2xl mb-2">{component.icon}</div>
                    <h4 className="font-medium mb-1" style={boundGetTextColorStyle('primary')}>
                      {component.name}
                    </h4>
                    <p className="text-sm" style={boundGetTextColorStyle('secondary')}>
                      {component.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Component Preview */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
                Component Preview
              </h3>
              
              {components.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎨</div>
                  <h4 className="text-lg font-medium mb-2" style={boundGetTextColorStyle('primary')}>
                    No Components Added
                  </h4>
                  <p className="text-sm" style={boundGetTextColorStyle('secondary')}>
                    Add components from the library above to see them in action
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {components.map(component => renderComponent(component))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemConfigurator; 