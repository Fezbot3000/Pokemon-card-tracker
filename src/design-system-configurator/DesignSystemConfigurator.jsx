import React, { useState, useEffect } from 'react';
import { defaultConfig, defaultComponents } from './config/defaultConfig';

// TODO: This is the OLD BLOATED VERSION - REPLACE WITH REFACTORED VERSION AFTER TESTING
import { updateConfig, updateNestedConfig, getTypographyStyle, applyCSSVariables } from './config/configManager';
import { formatCurrency } from './utils/formatters';
import { getGradingCompanyColor, getValueColor } from './utils/colorUtils';
import { getButtonStyle, getCardStyle, getSurfaceStyle, getInteractiveStyle, getTextColorClass, getTextColorStyle, getBackgroundColorStyle, getBorderColorStyle, getFocusRingStyle, getFormInputStyle } from './utils/styleUtils';
import StatisticsComponent from './components/StatisticsComponent';
import SearchBarComponent from './components/SearchBarComponent';
import CollectionSelectorComponent from './components/CollectionSelectorComponent';
import CardListComponent from './components/CardListComponent';
import ToastMessagesComponent from './components/ToastMessagesComponent';
import { useCards } from '../contexts/CardContext';
import ConfiguratorDropdown from './components/ConfiguratorDropdown';

const DesignSystemConfigurator = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [components, setComponents] = useState(defaultComponents);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState('colors');
  const [primaryStyle, setPrimaryStyle] = useState(
    config.components?.buttons?.primaryStyle || 'gradient'
  ); // 'solid' or 'gradient'
  const [showHiddenSettings, setShowHiddenSettings] = useState(false);
  
  // Use real data from CardContext
  const { 
    cards, 
    collections, 
    selectedCollection, 
    setSelectedCollection, 
    loading: cardsLoading,
    error: cardsError 
  } = useCards();

  // Apply CSS variables when config changes
  useEffect(() => {
    applyCSSVariables(config, isDarkMode);
  }, [config, isDarkMode]);

  // Keep primaryStyle state in sync with config
  useEffect(() => {
    const configPrimaryStyle = config.components?.buttons?.primaryStyle || 'gradient';
    if (primaryStyle !== configPrimaryStyle) {
      setPrimaryStyle(configPrimaryStyle);
    }
  }, [config.components?.buttons?.primaryStyle, primaryStyle]);

  // Bound helper functions for component use
  const boundUpdateConfig = (section, key, value) => setConfig(prev => updateConfig(prev, section, key, value));
  const boundUpdateNestedConfig = (section, subsection, key, value) => setConfig(prev => updateNestedConfig(prev, section, subsection, key, value));
  const boundGetTypographyStyle = getTypographyStyle(config);
  const boundGetSurfaceStyle = getSurfaceStyle(config, isDarkMode);
  const boundGetInteractiveStyle = getInteractiveStyle(config, isDarkMode);
  const boundGetTextColorClass = getTextColorClass(config, isDarkMode);
  const boundGetTextColorStyle = getTextColorStyle(config, isDarkMode);
  const boundGetBackgroundColorStyle = getBackgroundColorStyle(config, isDarkMode);
  const boundGetBorderColorStyle = getBorderColorStyle(config, isDarkMode);
  const boundGetCardStyle = () => getCardStyle(config, isDarkMode)();
  const boundGetFormInputStyle = (variant) => getFormInputStyle(config, isDarkMode)(variant);

  // Extract colors based on theme with proper fallbacks
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);

  // Primary style utility function
  const getBaseButtonStyle = () => {
    const buttonConfig = config.components?.buttons || defaultConfig.components.buttons;
    
    // Size configurations
    const sizeStyles = {
      small: { padding: '8px 12px', fontSize: '14px', minHeight: '32px' },
      medium: { padding: '12px 16px', fontSize: '16px', minHeight: '40px' },
      large: { padding: '16px 24px', fontSize: '18px', minHeight: '48px' }
    };
    
    // Corner configurations
    const cornerStyles = {
      square: { borderRadius: '0px' },
      rounded: { borderRadius: buttonConfig.cornerRadius || '8px' },
      pill: { borderRadius: '9999px' }
    };
    
    // Shadow configurations
    const shadowStyles = {
      none: { boxShadow: 'none' },
      small: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
      medium: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
      large: { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
      xl: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }
    };
    
    // Border configurations
    const borderStyles = {
      none: { border: 'none' },
      solid: { border: `${buttonConfig.borderWidth || '0.5px'} solid` },
      dashed: { border: `${buttonConfig.borderWidth || '0.5px'} dashed` },
      dotted: { border: `${buttonConfig.borderWidth || '0.5px'} dotted` }
    };
    
    // Base style with all component configurations
    return {
      ...sizeStyles[buttonConfig.size || 'medium'],
      ...cornerStyles[buttonConfig.corners || 'rounded'],
      ...shadowStyles[buttonConfig.shadow || 'medium'],
      ...borderStyles[buttonConfig.border || 'none'],
      fontFamily: config.typography?.button?.fontFamily || defaultConfig.typography.button.fontFamily,
      fontWeight: config.typography?.button?.fontWeight || defaultConfig.typography.button.fontWeight,
      lineHeight: config.typography?.button?.lineHeight || defaultConfig.typography.button.lineHeight,
      letterSpacing: config.typography?.button?.letterSpacing || defaultConfig.typography.button.letterSpacing,
      textTransform: config.typography?.button?.textTransform || defaultConfig.typography.button.textTransform,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      outline: 'none',
      transition: buttonConfig.transition === 'none' ? 'none' : 
                 buttonConfig.transition === 'colors' ? 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease' :
                 buttonConfig.transition === 'transform' ? 'transform 0.2s ease' : 'all 0.2s ease'
    };
  };

  const getPrimaryButtonStyle = () => {
    const buttonConfig = config.components?.buttons || defaultConfig.components.buttons;
    const currentColors = isDarkMode ? 
      (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
      (config.colors || defaultConfig.colors);
    const gradients = isDarkMode ? 
      (config.theme?.darkGradients || defaultConfig.theme.darkGradients) : 
      (config.gradients || defaultConfig.gradients);
    
    const baseStyle = getBaseButtonStyle();
    
    // Determine primary style colors and background
    let styleSpecific = {};
    if ((primaryStyle === 'gradient' || buttonConfig.primaryStyle === 'gradient') && gradients?.primary) {
      styleSpecific = {
        background: `linear-gradient(${gradients.primary.direction || '135deg'}, ${gradients.primary.from || defaultConfig.gradients.primary.from}, ${gradients.primary.to || defaultConfig.gradients.primary.to})`,
        color: currentColors?.background || defaultConfig.colors.background,
        borderColor: 'transparent'
      };
    } else if (buttonConfig.primaryStyle === 'outline') {
      styleSpecific = {
        backgroundColor: 'transparent',
        color: currentColors?.primary || defaultConfig.colors.primary,
        borderColor: currentColors?.primary || defaultConfig.colors.primary
      };
    } else if (buttonConfig.primaryStyle === 'ghost') {
      styleSpecific = {
        backgroundColor: 'transparent',
        color: currentColors?.primary || defaultConfig.colors.primary,
        borderColor: 'transparent'
      };
    } else {
      styleSpecific = {
        backgroundColor: currentColors?.primary || defaultConfig.colors.primary,
        color: currentColors?.background || defaultConfig.colors.background,
        borderColor: currentColors?.primary || defaultConfig.colors.primary
      };
    }
    
    return {
      ...baseStyle,
      ...styleSpecific
    };
  };

  const getSecondaryButtonStyle = () => {
    const buttonConfig = config.components?.buttons || defaultConfig.components.buttons;
    const currentColors = isDarkMode ? 
      (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
      (config.colors || defaultConfig.colors);
    
    const baseStyle = getBaseButtonStyle();
    
    return {
      ...baseStyle,
      background: 'transparent',
      backgroundColor: 'transparent',
      color: currentColors?.text || defaultConfig.colors.text,
      borderColor: currentColors?.text || defaultConfig.colors.text,
      border: `${buttonConfig.borderWidth || '0.5px'} solid ${currentColors?.text || defaultConfig.colors.text}`
    };
  };

  const getTertiaryButtonStyle = () => {
    const currentColors = isDarkMode ? 
      (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
      (config.colors || defaultConfig.colors);
    
    const baseStyle = getBaseButtonStyle();
    
    return {
      ...baseStyle,
      background: 'transparent',
      backgroundColor: 'transparent',
      color: currentColors?.text || defaultConfig.colors.text,
      border: 'none',
      borderColor: 'transparent'
    };
  };

  // Usage analysis functions
  const getUsedTypographyStyles = () => {
    // Based on actual component usage analysis
    return new Set([
      'body',       // Used in SearchBarComponent, CollectionSelectorComponent
      'button',     // Used in SearchBarComponent, CollectionSelectorComponent, and button styling
      'caption',    // Used in CollectionSelectorComponent
      'heading',    // Used in CollectionSelectorComponent
      'label',      // Used in StatisticsComponent, CollectionSelectorComponent
      'financial'   // Used in StatisticsComponent
    ]);
  };

  const getUsedComponentSections = () => {
    // Based on actual component usage analysis
    return new Set([
      'buttons',    // Used by all action buttons in components
      'forms',      // Used by SearchBarComponent and other form elements
      'cards'       // Used by card layouts in CardListComponent
    ]);
  };

  const getUsedConfigSections = () => {
    // Sections that are actually implemented and used
    return new Set([
      'colors',
      'gradients', 
      'typography',
      'components',
      'financial',   // Used in StatisticsComponent
      'psaGrading'   // Used for grading colors
    ]);
  };

  const isTypographyStyleUsed = (style) => {
    return getUsedTypographyStyles().has(style);
  };

  const isComponentSectionUsed = (section) => {
    return getUsedComponentSections().has(section);
  };

  const isConfigSectionUsed = (section) => {
    return getUsedConfigSections().has(section);
  };

  // Component management
  const addComponent = (type) => {
    const newComponent = {
      id: `${type}-${Date.now()}`,
      type,
      ...getComponentData(type)
    };
    setComponents([...components, newComponent]);
  };

  const removeComponent = (id) => {
    setComponents(components.filter(c => c.id !== id));
  };

  const getComponentData = (type) => {
    // Calculate real statistics from cards
    const realCards = cards || [];
    
    const totalCards = realCards.length;
    // Use original amounts for calculations like production code
    const totalInvestment = realCards.reduce((sum, card) => {
      const investment = card.originalInvestmentAmount !== undefined ? card.originalInvestmentAmount : 0;
      return sum + investment;
    }, 0);
    const totalValue = realCards.reduce((sum, card) => {
      const value = card.originalCurrentValueAmount !== undefined ? card.originalCurrentValueAmount : 0;
      return sum + value;
    }, 0);
    const totalProfit = totalValue - totalInvestment;
    


    // Get real collections with "All Cards" option, filtering out sold collections
    const realCollections = ['All Cards', ...(collections || []).filter(col => (col.name || col.id || '').toLowerCase() !== 'sold').map(col => col.name || col.id)];

    // Get unique categories from cards
    const realCategories = ['All Categories', ...new Set(realCards.map(card => card.category).filter(Boolean))];
    
    // Get unique grading companies from cards
    const realGradingCompanies = ['All Grading Companies', ...new Set(realCards.map(card => card.gradingCompany).filter(Boolean))];

    // Get unique grades from cards
    const realGrades = ['All Grades', ...Array.from(new Set(realCards.map(card => card.grade).filter(Boolean))).sort((a, b) => parseFloat(b) - parseFloat(a))];

    const baseData = {
      title: 'Portfolio Summary',
      stats: [
        { label: 'PAID', value: totalInvestment, isCount: false },
        { label: 'VALUE', value: totalValue, isCount: false },
        { label: 'PROFIT', value: totalProfit, isCount: false },
        { label: 'CARDS', value: totalCards, isCount: true }
      ],
      // Search Bar Properties
      placeholder: 'Search cards by name, set, or year...',
      showFilter: true,
      showAddButton: true,
      addButtonText: 'Add Card',
      filterOptions: {
        category: realCategories.map(cat => ({ value: cat === 'All Categories' ? '' : cat, label: cat })),
        gradingCompany: realGradingCompanies.map(company => ({ value: company === 'All Grading Companies' ? '' : company, label: company })),
        grade: realGrades.map(grade => ({ value: grade === 'All Grades' ? '' : grade, label: grade === 'All Grades' ? grade : `Grade ${grade}` })),
        sortBy: [
          { value: 'value', label: 'Sort by Value (High to Low)' },
          { value: 'value_low', label: 'Sort by Value (Low to High)' },
          { value: 'profit', label: 'Sort by Profit (High to Low)' },
          { value: 'profit_low', label: 'Sort by Profit (Low to High)' },
          { value: 'name', label: 'Sort by Name (A-Z)' },
          { value: 'year', label: 'Sort by Year (Newest First)' },
          { value: 'grade', label: 'Sort by Grade (High to Low)' }
        ]
      },
      search: {
        searchValue: '',
        selectedCollection: selectedCollection?.name || 'All Cards',
        selectedCategory: 'All Categories',
        selectedGrade: 'All Grades',
        selectedCompany: 'All Companies',
        viewMode: 'grid'
      },
      collections: realCollections,
      cards: realCards,
      showSelectionControls: true,
      viewMode: 'grid'
    };

    return baseData;
  };

  const renderComponent = (component) => {
    const latestData = getComponentData(component.type);
    const commonProps = {
      config,
      isDarkMode,
      cards,
      realCards: cards,
      collections,
      selectedCollection,
      setSelectedCollection,
      cardsLoading,
      cardsError,
      removeComponent,
      getTypographyStyle: boundGetTypographyStyle,
      getTextColorStyle: boundGetTextColorStyle,
      getBackgroundColorStyle: boundGetBackgroundColorStyle,
      getSurfaceStyle: boundGetSurfaceStyle,
      getInteractiveStyle: boundGetInteractiveStyle,
      getTextColorClass: boundGetTextColorClass,
      getBorderColorStyle: boundGetBorderColorStyle,
      getPrimaryButtonStyle,
      primaryStyle,
      colors
    };

    switch (component.type) {
      case 'statistics':
        return <StatisticsComponent key={component.id} data={{ ...latestData, id: component.id }} {...commonProps} />;
      case 'search-bar':
        return <SearchBarComponent key={component.id} data={{ ...latestData, id: component.id }} {...commonProps} />;
      case 'collection-selector':
        return <CollectionSelectorComponent key={component.id} data={{ ...latestData, id: component.id }} {...commonProps} />;
      case 'card-list':
        return <CardListComponent key={component.id} data={{ ...latestData, id: component.id }} {...commonProps} />;
      case 'toast-messages':
        return <ToastMessagesComponent key={component.id} data={{ ...latestData, id: component.id }} {...commonProps} />;
      case 'multi-select-panel':
        return (
          <div key={component.id} className="mb-8">
            <div className="p-6 rounded-lg border border-dashed text-center"
                         style={{
          borderColor: colors?.border || defaultConfig.colors.border,
          ...boundGetBackgroundColorStyle('surface')
        }}>
              <div className="text-4xl mb-2">☑️</div>
              <h4 className={`font-semibold mb-2`}
                  style={boundGetTextColorStyle('primary')}>
                Multi-Select Actions Panel
              </h4>
              <p className={`text-sm mb-4`}
                 style={boundGetTextColorStyle('secondary')}>
                This panel automatically appears at the bottom when cards are selected in the Card List component.
                Select some cards above to see it in action!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Move', 'Sell', 'Export', 'Duplicate', 'Edit', 'Delete'].map((action, index) => {
                  const getActionColor = (actionName) => {
                    switch(actionName) {
                      case 'Move': return { bg: colors?.info || colors?.primary, text: colors?.background };
                      case 'Sell': return { bg: colors?.success, text: colors?.background };
                      case 'Export': return { bg: colors?.textSecondary, text: colors?.background };
                      case 'Duplicate': return { bg: colors?.warning, text: colors?.text };
                      case 'Edit': return { bg: colors?.warning, text: colors?.text };
                      case 'Delete': return { bg: colors?.error, text: colors?.background };
                      default: return { bg: colors?.primary, text: colors?.background };
                    }
                  };
                  const actionColors = getActionColor(action);
                  return (
                    <span key={action} className="px-2 py-1 text-xs rounded" 
                          style={{ 
                            backgroundColor: actionColors.bg, 
                            color: actionColors.text 
                          }}>
                      {action}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const componentCategories = [
    {
      name: 'Built Components',
      components: [
        { type: 'statistics', name: 'Statistics Summary', icon: '📊', description: 'Financial summary with profit/loss display (PAID, VALUE, PROFIT, CARDS)' },
        { type: 'search-bar', name: 'Search Bar', icon: '🔍', description: 'Search input with advanced filtering and add button' },
        { type: 'collection-selector', name: 'Collection Selector', icon: '📁', description: 'Dropdown selector for managing and switching between collections' },
        { type: 'card-list', name: 'Card List', icon: '🃏', description: 'Interactive card grid/list with selection, view modes, and financial data' },
        { type: 'toast-messages', name: 'Toast Messages Library', icon: '💬', description: 'Complete collection of all toast messages used across the application with live testing' },
        { type: 'multi-select-panel', name: 'Multi-Select Actions', icon: '☑️', description: 'Bottom panel with bulk actions for selected cards (auto-shows when cards selected)' }
      ]
    }
  ];

  const applyColorPreset = (preset) => {
    const presets = {
      'pokemon-red': { 
        colors: { 
          primary: '#e53e3e', 
          secondary: '#000000',
          secondaryHover: '#000000',
          success: '#38a169',
          pillPrimary: '#e53e3e',
          pillSecondary: '#f59e0b',
          pillSuccess: '#38a169',
          pillInfo: '#0ea5e9'
        },
        gradient: { from: '#e53e3e', to: '#ff6b6b', direction: '135deg' }
      },
      'ocean-blue': { 
        colors: { 
          primary: '#0ea5e9', 
          secondary: '#06b6d4',
          secondaryHover: '#06b6d4',
          success: '#10b981',
          pillPrimary: '#0ea5e9',
          pillSecondary: '#06b6d4',
          pillSuccess: '#10b981',
          pillInfo: '#3b82f6'
        },
        gradient: { from: '#0ea5e9', to: '#06b6d4', direction: '135deg' }
      },
      'forest-green': { 
        colors: { 
          primary: '#059669', 
          secondary: '#10b981',
          secondaryHover: '#10b981',
          success: '#22c55e',
          pillPrimary: '#059669',
          pillSecondary: '#10b981',
          pillSuccess: '#22c55e',
          pillInfo: '#0ea5e9'
        },
        gradient: { from: '#059669', to: '#10b981', direction: '135deg' }
      },
      'royal-purple': { 
        colors: { 
          primary: '#7c3aed', 
          secondary: '#a855f7',
          secondaryHover: '#a855f7',
          success: '#10b981',
          pillPrimary: '#7c3aed',
          pillSecondary: '#a855f7',
          pillSuccess: '#10b981',
          pillInfo: '#3b82f6'
        },
        gradient: { from: '#7c3aed', to: '#a855f7', direction: '135deg' }
      }
    };

    const selectedPreset = presets[preset];
    if (selectedPreset) {
      // Apply colors
      Object.entries(selectedPreset.colors).forEach(([key, value]) => {
        if (isDarkMode) {
          boundUpdateNestedConfig('theme', 'darkColors', key, value);
        } else {
          boundUpdateConfig('colors', key, value);
        }
      });
      
      // Apply gradients
      if (isDarkMode) {
        boundUpdateNestedConfig('theme', 'darkGradients', 'primary', selectedPreset.gradient);
      } else {
        boundUpdateNestedConfig('gradients', 'primary', 'from', selectedPreset.gradient.from);
        boundUpdateNestedConfig('gradients', 'primary', 'to', selectedPreset.gradient.to);
        boundUpdateNestedConfig('gradients', 'primary', 'direction', selectedPreset.gradient.direction);
      }
    }
  };

  const exportConfig = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-system-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This will clear all your configurations and components.')) {
      setConfig(defaultConfig);
      setComponents(defaultComponents);
      setIsDarkMode(false);
      setActiveSection('colors');
    }
  };

  const allSections = [
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'typography', label: 'Typography', icon: '📝' },
    { id: 'spacing', label: 'Spacing', icon: '📏' },
    { id: 'components', label: 'Components', icon: '🧩' },
    { id: 'tables', label: 'Tables & Data', icon: '📊' },
    { id: 'navigation', label: 'Navigation', icon: '🧭' },
    { id: 'status', label: 'Status & Badges', icon: '🏷️' },
    { id: 'grading', label: 'PSA & Grading', icon: '🏆' },
    { id: 'financial', label: 'Financial Display', icon: '💰' },
    { id: 'icons', label: 'Icons', icon: '✨' },
    { id: 'theme', label: 'Theme', icon: '🌙' }
  ];

  // Filter sections to only show used ones
  const usedSections = allSections.filter(section => isConfigSectionUsed(section.id));
  const unusedSections = allSections.filter(section => !isConfigSectionUsed(section.id));
  
  const sections = [
    ...usedSections,
    ...(unusedSections.length > 0 ? [{ id: 'hidden', label: `Hidden Sections (${unusedSections.length})`, icon: '👁️‍🗨️' }] : [])
  ];

  const renderConfigurationSection = () => {
    const sectionStyles = {
      input: {
        ...boundGetBackgroundColorStyle('surface'),
        ...boundGetTextColorStyle('primary'),
        ...boundGetBorderColorStyle('primary'),
        padding: '8px 12px',
        borderRadius: '6px',
        border: `1px solid ${colors?.border || defaultConfig.colors.border}`,
        width: '100%'
      },
      label: {
        ...boundGetTextColorStyle('primary'),
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '4px',
        display: 'block'
      },
      colorInput: {
        width: '40px',
        height: '32px',
        borderRadius: '6px',
        border: `1px solid ${colors?.border || defaultConfig.colors.border}`,
        cursor: 'pointer'
      }
    };

    switch (activeSection) {
      case 'colors':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              🎨 Color Configuration
            </h3>
            
            {/* Color Presets */}
            <div className="mb-8">
              <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Color Presets</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'pokemon-red', name: 'Pokemon Red', colors: ['#e53e3e', '#ff6b6b'] },
                  { key: 'ocean-blue', name: 'Ocean Blue', colors: ['#0ea5e9', '#06b6d4'] },
                  { key: 'forest-green', name: 'Forest Green', colors: ['#059669', '#10b981'] },
                  { key: 'royal-purple', name: 'Royal Purple', colors: ['#7c3aed', '#a855f7'] }
                ].map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => applyColorPreset(preset.key)}
                    className="p-3 rounded-lg border text-left transition-colors"
                    style={{
                      borderColor: colors?.border || defaultConfig.colors.border,
                      backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary
                    }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {preset.colors.map(color => (
                        <div
                          key={color}
                          className="size-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-medium" style={boundGetTextColorStyle('primary')}>
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary CTA Style Toggle */}
            <div className="mb-8">
              <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Primary CTA Style</h4>
                              <div className="flex rounded-lg border p-1" style={{ borderColor: colors?.border || defaultConfig.colors.border, backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary }}>
                <button
                  onClick={() => {
                    setPrimaryStyle('solid');
                    boundUpdateNestedConfig('components', 'buttons', 'primaryStyle', 'solid');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200`}
                  style={primaryStyle === 'solid' ? 
                    { ...getPrimaryButtonStyle() } : 
                    { ...boundGetTextColorStyle('secondary'), ...boundGetBackgroundColorStyle('surface') }
                  }
                >
                  Solid Color
                </button>
                <button
                  onClick={() => {
                    setPrimaryStyle('gradient');
                    boundUpdateNestedConfig('components', 'buttons', 'primaryStyle', 'gradient');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200`}
                  style={primaryStyle === 'gradient' ? 
                    { ...getPrimaryButtonStyle() } : 
                    { ...boundGetTextColorStyle('secondary'), ...boundGetBackgroundColorStyle('surface') }
                  }
                >
                  Gradient
                </button>
              </div>
            </div>

            {/* Primary Style Configuration */}
            {primaryStyle === 'solid' ? (
              <div className="mb-8">
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Primary Color</h4>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={colors?.primary || defaultConfig.colors.primary}
                    onChange={(e) => isDarkMode ? 
                      boundUpdateNestedConfig('theme', 'darkColors', 'primary', e.target.value) : 
                      boundUpdateConfig('colors', 'primary', e.target.value)
                    }
                    style={sectionStyles.colorInput}
                  />
                  <label style={sectionStyles.label} className="flex-1">
                    Primary Color
                  </label>
                  <input
                    type="text"
                    value={colors?.primary || defaultConfig.colors.primary}
                    onChange={(e) => isDarkMode ? 
                      boundUpdateNestedConfig('theme', 'darkColors', 'primary', e.target.value) : 
                      boundUpdateConfig('colors', 'primary', e.target.value)
                    }
                    style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Primary Gradient</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={isDarkMode ? 
                        (config.theme?.darkGradients?.primary?.from || config.gradients?.primary?.from || defaultConfig.gradients.primary.from) : 
                        (config.gradients?.primary?.from || defaultConfig.gradients.primary.from)
                      }
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkGradients', 'primary', { 
                          ...(config.theme?.darkGradients?.primary || {}), 
                          from: e.target.value 
                        }) : 
                        boundUpdateNestedConfig('gradients', 'primary', 'from', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="w-20">From Color</label>
                    <input
                      type="text"
                      value={isDarkMode ? 
                        (config.theme?.darkGradients?.primary?.from || config.gradients?.primary?.from || defaultConfig.gradients.primary.from) : 
                        (config.gradients?.primary?.from || defaultConfig.gradients.primary.from)
                      }
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkGradients', 'primary', { 
                          ...(config.theme?.darkGradients?.primary || {}), 
                          from: e.target.value 
                        }) : 
                        boundUpdateNestedConfig('gradients', 'primary', 'from', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={isDarkMode ? 
                        (config.theme?.darkGradients?.primary?.to || config.gradients?.primary?.to || defaultConfig.gradients.primary.to) : 
                        (config.gradients?.primary?.to || defaultConfig.gradients.primary.to)
                      }
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkGradients', 'primary', { 
                          ...(config.theme?.darkGradients?.primary || {}), 
                          to: e.target.value 
                        }) : 
                        boundUpdateNestedConfig('gradients', 'primary', 'to', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="w-20">To Color</label>
                    <input
                      type="text"
                      value={isDarkMode ? 
                        (config.theme?.darkGradients?.primary?.to || config.gradients?.primary?.to || defaultConfig.gradients.primary.to) : 
                        (config.gradients?.primary?.to || defaultConfig.gradients.primary.to)
                      }
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkGradients', 'primary', { 
                          ...(config.theme?.darkGradients?.primary || {}), 
                          to: e.target.value 
                        }) : 
                        boundUpdateNestedConfig('gradients', 'primary', 'to', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <label style={sectionStyles.label} className="w-20">Direction</label>
                    <ConfiguratorDropdown
                      options={[
                        { value: "0deg", label: "0° (Top to Bottom)" },
                        { value: "45deg", label: "45° (Top-left to Bottom-right)" },
                        { value: "90deg", label: "90° (Left to Right)" },
                        { value: "135deg", label: "135° (Bottom-left to Top-right)" },
                        { value: "180deg", label: "180° (Bottom to Top)" },
                        { value: "225deg", label: "225° (Bottom-right to Top-left)" },
                        { value: "270deg", label: "270° (Right to Left)" },
                        { value: "315deg", label: "315° (Top-right to Bottom-left)" }
                      ]}
                      value={isDarkMode ? 
                        (config.theme?.darkGradients?.primary?.direction || config.gradients?.primary?.direction || defaultConfig.gradients.primary.direction) : 
                        (config.gradients?.primary?.direction || defaultConfig.gradients.primary.direction)
                      }
                      onChange={(value) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkGradients', 'primary', { 
                          ...(config.theme?.darkGradients?.primary || {}), 
                          direction: value 
                        }) : 
                        boundUpdateNestedConfig('gradients', 'primary', 'direction', value)
                      }
                      width="140px"
                      style={{...sectionStyles.input}}
                    />
                  </div>
                  
                  {/* Gradient Preview */}
                  <div className="mt-3">
                    <label style={sectionStyles.label}>Preview</label>
                    <div 
                      className="w-full h-12 rounded-lg border"
                      style={{
                        background: `linear-gradient(${
                          isDarkMode ? 
                            (config.theme?.darkGradients?.primary?.direction || config.gradients?.primary?.direction || defaultConfig.gradients.primary.direction) : 
                            (config.gradients?.primary?.direction || defaultConfig.gradients.primary.direction)
                        }, ${
                          isDarkMode ? 
                            (config.theme?.darkGradients?.primary?.from || config.gradients?.primary?.from || defaultConfig.gradients.primary.from) : 
                            (config.gradients?.primary?.from || defaultConfig.gradients.primary.from)
                        }, ${
                          isDarkMode ? 
                            (config.theme?.darkGradients?.primary?.to || config.gradients?.primary?.to || defaultConfig.gradients.primary.to) : 
                            (config.gradients?.primary?.to || defaultConfig.gradients.primary.to)
                        })`,
                        borderColor: colors?.border || defaultConfig.colors.border
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Other Colors */}
            <div className="space-y-4">
              <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Other Colors</h4>
              {Object.entries(colors).filter(([key]) => key !== 'primary').map(([key, value]) => (
                <div key={key} className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => isDarkMode ? 
                      boundUpdateNestedConfig('theme', 'darkColors', key, e.target.value) : 
                      boundUpdateConfig('colors', key, e.target.value)
                    }
                    style={sectionStyles.colorInput}
                  />
                  <label style={sectionStyles.label} className="flex-1 capitalize">
                    {key === 'background' ? 'Primary CTA Text' : key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => isDarkMode ? 
                      boundUpdateNestedConfig('theme', 'darkColors', key, e.target.value) : 
                      boundUpdateConfig('colors', key, e.target.value)
                    }
                    style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                  />
                </div>
              ))}
            </div>
          </div>
        );



      case 'typography':
        const popularGoogleFonts = [
          'Inter, sans-serif',
          'Roboto, sans-serif',
          'Open Sans, sans-serif',
          'Poppins, sans-serif',
          'Lato, sans-serif',
          'Montserrat, sans-serif',
          'Source Sans Pro, sans-serif',
          'Nunito, sans-serif',
          'Raleway, sans-serif',
          'Merriweather, serif',
          'Playfair Display, serif',
          'Oswald, sans-serif'
        ];
        
        // Typography style descriptions and usage context
        const typographyStyles = {
          display: {
            title: 'Display Text',
            description: 'Large hero text, main page titles, and prominent headings',
            example: 'Welcome to Your Collection',
            usage: 'Hero sections, page headers, marketing copy'
          },
          heading: {
            title: 'Headings',
            description: 'Section titles, modal headers, and primary content headings',
            example: 'Card Collection Dashboard',
            usage: 'Page sections, modal titles, main content headers'
          },
          subheading: {
            title: 'Subheadings',
            description: 'Secondary headings, subsection titles, and card headers',
            example: 'Recent Activity',
            usage: 'Card titles, widget headers, secondary sections'
          },
          body: {
            title: 'Body Text',
            description: 'Main content, descriptions, and readable text',
            example: 'This is your main content text that users will read.',
            usage: 'Content paragraphs, descriptions, readable text'
          },
          bodySmall: {
            title: 'Small Body',
            description: 'Secondary information, metadata, and supporting text',
            example: 'Added 2 hours ago • Last updated today',
            usage: 'Timestamps, metadata, secondary descriptions'
          },
          caption: {
            title: 'Captions',
            description: 'Very small text, footnotes, and fine print',
            example: 'Terms and conditions apply',
            usage: 'Image captions, footnotes, fine print'
          },
          label: {
            title: 'Labels',
            description: 'Form labels, field names, and small headers',
            example: 'Card Name',
            usage: 'Form fields, input labels, small section headers'
          },
          button: {
            title: 'Buttons',
            description: 'Button text, call-to-action text, and interactive elements',
            example: 'Add to Collection',
            usage: 'Button text, CTAs, navigation links'
          },
          card: {
            title: 'Card Text',
            description: 'Text within cards, list items, and compact layouts',
            example: 'Pokemon Base Set Charizard',
            usage: 'Card content, list items, compact information'
          },
          banner: {
            title: 'Banners',
            description: 'Alert text, notifications, and status messages',
            example: 'Your collection has been updated successfully',
            usage: 'Alerts, notifications, status messages'
          },
          link: {
            title: 'Links',
            description: 'Hyperlinks, navigation links, and clickable text',
            example: 'View collection details',
            usage: 'Navigation, hyperlinks, clickable text'
          },
          financial: {
            title: 'Financial',
            description: 'Currency values, numbers, and financial data',
            example: '$2,450.00',
            usage: 'Card values, prices, financial information'
          }
        };
        
        // Separate used and unused typography styles
        const usedTypographyEntries = Object.entries(config.typography || {}).filter(([key]) => isTypographyStyleUsed(key));
        const unusedTypographyEntries = Object.entries(config.typography || {}).filter(([key]) => !isTypographyStyleUsed(key));
        
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              📝 Typography Configuration
            </h3>
            
            {/* Active Typography Styles */}
            <div className="space-y-6">
              {usedTypographyEntries.map(([key, value]) => {
                const styleInfo = typographyStyles[key] || {
                  title: key.replace(/([A-Z])/g, ' $1').trim(),
                  description: 'Typography style configuration',
                  example: 'Sample text',
                  usage: 'Various UI elements'
                };
                
                return (
                  <div key={key} className="border rounded-lg p-6" style={{ borderColor: colors.border, ...boundGetSurfaceStyle('primary') }}>
                    {/* Header with title and description */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold" style={boundGetTextColorStyle('primary')}>
                          {styleInfo.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className="text-xs px-2 py-1 rounded-full border" style={{ 
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + '20',
                            color: colors.primary,
                            fontWeight: '500'
                          }}>
                            ✓ ACTIVE
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full border" style={{ 
                            borderColor: colors.border, 
                            backgroundColor: colors.surfaceSecondary,
                            ...boundGetTextColorStyle('secondary')
                          }}>
                            {key}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm mb-2" style={boundGetTextColorStyle('secondary')}>
                        {styleInfo.description}
                      </p>
                      <p className="text-xs" style={boundGetTextColorStyle('secondary')}>
                        <span className="font-medium">Used in:</span> {styleInfo.usage}
                      </p>
                    </div>
                    
                    {/* Live Preview */}
                    <div className="mb-4 p-4 rounded-lg border" style={{ 
                      borderColor: colors.border, 
                      backgroundColor: colors.surfaceSecondary 
                    }}>
                      <div className="text-xs font-medium mb-2" style={boundGetTextColorStyle('secondary')}>
                        Live Preview:
                      </div>
                      <div style={{
                        fontFamily: value.fontFamily,
                        fontSize: value.fontSize,
                        fontWeight: value.fontWeight,
                        lineHeight: value.lineHeight,
                        letterSpacing: value.letterSpacing,
                        textTransform: value.textTransform,
                        color: value.color || colors.text,
                        textDecoration: value.decoration || 'none'
                      }}>
                        {styleInfo.example}
                      </div>
                    </div>
                    
                    {/* Configuration Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(value).map(([prop, val]) => {
                        // Skip color properties in the main typography section
                        if (prop === 'color' || prop === 'hoverColor' || prop === 'decoration') {
                          return null;
                        }
                        
                        const propLabels = {
                          fontFamily: 'Font Family',
                          fontSize: 'Font Size',
                          fontWeight: 'Font Weight',
                          lineHeight: 'Line Height',
                          letterSpacing: 'Letter Spacing',
                          textTransform: 'Text Transform'
                        };
                        
                        const propDescriptions = {
                          fontFamily: 'The font family to use',
                          fontSize: 'Size in pixels (e.g., 16px)',
                          fontWeight: 'Weight from 100-900 (e.g., 400, 500, 600)',
                          lineHeight: 'Line height as decimal (e.g., 1.5)',
                          letterSpacing: 'Letter spacing in em (e.g., 0.01em)',
                          textTransform: 'Text transformation (none, uppercase, lowercase, capitalize)'
                        };
                        
                        return (
                          <div key={prop} className="space-y-2">
                            <label className="block text-sm font-medium" style={boundGetTextColorStyle('primary')}>
                              {propLabels[prop] || prop.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <div className="text-xs mb-2" style={boundGetTextColorStyle('secondary')}>
                              {propDescriptions[prop] || 'Configure this property'}
                            </div>
                            
                            {prop === 'fontFamily' ? (
                              <ConfiguratorDropdown
                                options={popularGoogleFonts.map(font => ({
                                  value: font,
                                  label: font.split(',')[0]
                                }))}
                                value={val}
                                onChange={(value) => boundUpdateNestedConfig('typography', key, prop, value)}
                                width="100%"
                                style={{ 
                                  ...boundGetSurfaceStyle('primary'),
                                  borderColor: colors.border,
                                  ...boundGetTextColorStyle('primary')
                                }}
                              />
                            ) : prop === 'fontWeight' ? (
                              <ConfiguratorDropdown
                                options={[
                                  { value: "100", label: "100 - Thin" },
                                  { value: "200", label: "200 - Extra Light" },
                                  { value: "300", label: "300 - Light" },
                                  { value: "400", label: "400 - Regular" },
                                  { value: "500", label: "500 - Medium" },
                                  { value: "600", label: "600 - Semi Bold" },
                                  { value: "700", label: "700 - Bold" },
                                  { value: "800", label: "800 - Extra Bold" },
                                  { value: "900", label: "900 - Black" }
                                ]}
                                value={val}
                                onChange={(value) => boundUpdateNestedConfig('typography', key, prop, value)}
                                width="100%"
                                style={{ 
                                  ...boundGetSurfaceStyle('primary'),
                                  borderColor: colors.border,
                                  ...boundGetTextColorStyle('primary')
                                }}
                              />
                            ) : prop === 'textTransform' ? (
                              <ConfiguratorDropdown
                                options={[
                                  { value: "none", label: "None" },
                                  { value: "uppercase", label: "UPPERCASE" },
                                  { value: "lowercase", label: "lowercase" },
                                  { value: "capitalize", label: "Capitalize" }
                                ]}
                                value={val}
                                onChange={(value) => boundUpdateNestedConfig('typography', key, prop, value)}
                                width="100%"
                                style={{ 
                                  ...boundGetSurfaceStyle('primary'),
                                  borderColor: colors.border,
                                  ...boundGetTextColorStyle('primary')
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => boundUpdateNestedConfig('typography', key, prop, e.target.value)}
                                className="w-full p-2 border rounded-md"
                                style={{ 
                                  ...boundGetSurfaceStyle('primary'),
                                  borderColor: colors.border,
                                  ...boundGetTextColorStyle('primary')
                                }}
                                placeholder={prop === 'fontSize' ? '16px' : 
                                            prop === 'lineHeight' ? '1.5' : 
                                            prop === 'letterSpacing' ? '0em' : ''}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Hidden Typography Styles */}
            {unusedTypographyEntries.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowHiddenSettings(!showHiddenSettings)}
                  className="flex items-center gap-2 text-sm font-medium p-3 rounded-lg border w-full" 
                  style={{
                    backgroundColor: colors?.surfaceSecondary || colors?.surface || defaultConfig.colors.surface,
                    borderColor: colors?.border || defaultConfig.colors.border,
                    color: colors?.textSecondary || defaultConfig.colors.textSecondary
                  }}
                >
                  <span>{showHiddenSettings ? '🔽' : '▶️'}</span>
                  <span>Hidden Typography Styles ({unusedTypographyEntries.length} unused)</span>
                  <span className="text-xs opacity-70">- Not used by any components</span>
                </button>
                
                {showHiddenSettings && (
                  <div className="mt-4 space-y-4 p-4 rounded-lg border" style={{
                    backgroundColor: colors?.surfaceTertiary || colors?.surface || defaultConfig.colors.surface,
                    borderColor: colors?.border || defaultConfig.colors.border,
                    opacity: 0.7
                  }}>
                    {unusedTypographyEntries.map(([key, value]) => {
                      const styleInfo = typographyStyles[key] || {
                        title: key.replace(/([A-Z])/g, ' $1').trim(),
                        description: 'Typography style configuration',
                        example: 'Sample text',
                        usage: 'Various UI elements'
                      };
                      
                      return (
                        <div key={key} className="p-4 rounded border" style={{
                          backgroundColor: colors?.surface || defaultConfig.colors.surface,
                          borderColor: colors?.border || defaultConfig.colors.border
                        }}>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium" style={boundGetTextColorStyle('primary')}>
                              {styleInfo.title}
                            </h5>
                            <div className="text-xs px-2 py-1 rounded-full border" style={{ 
                              borderColor: colors?.textSecondary || defaultConfig.colors.textSecondary,
                              backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surface,
                              color: colors?.textSecondary || defaultConfig.colors.textSecondary
                            }}>
                              HIDDEN
                            </div>
                          </div>
                          <p className="text-sm mb-2" style={boundGetTextColorStyle('secondary')}>
                            {styleInfo.description}
                          </p>
                          <p className="text-xs" style={boundGetTextColorStyle('secondary')}>
                            Not currently used by any components in the configurator.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'spacing':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              📏 Spacing Configuration
            </h3>
            
            {Object.entries(config.spacing || {}).map(([key, value]) => (
              <div key={key} className="mb-4">
                <div className="flex items-center space-x-3">
                  <label style={sectionStyles.label} className="flex-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => boundUpdateConfig('spacing', key, e.target.value)}
                    style={{...sectionStyles.input, width: '80px'}}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 'components':
        const usedComponentEntries = Object.entries(config.components || {}).filter(([key]) => isComponentSectionUsed(key));
        const unusedComponentEntries = Object.entries(config.components || {}).filter(([key]) => !isComponentSectionUsed(key));
        
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              🧩 Component Configuration
            </h3>
            
            {usedComponentEntries.map(([key, value]) => (
              <div key={key} className="mb-8">
                <h4 className="font-medium mb-4 capitalize" style={boundGetTextColorStyle('primary')}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                
                {/* Live Preview */}
                <div className="mb-6 p-4 rounded-lg border" style={{
                  backgroundColor: colors?.surface || defaultConfig.colors.surface,
                  borderColor: colors?.border || defaultConfig.colors.border
                }}>
                  <div className="text-sm font-medium mb-3" style={boundGetTextColorStyle('secondary')}>
                    Live Preview
                  </div>
                  
                  {key === 'buttons' && (
                    <div className="flex flex-wrap gap-3">
                      <button style={getPrimaryButtonStyle()}>
                        Primary Button
                      </button>
                      <button style={getSecondaryButtonStyle()}>
                        Secondary Button
                      </button>
                      <button style={getTertiaryButtonStyle()}>
                        Tertiary Button
                      </button>
                    </div>
                  )}
                  
                  {key === 'forms' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={boundGetTextColorStyle('primary')}>
                          Sample Input Field
                        </label>
                        <input
                          type="text"
                          placeholder="Enter text here..."
                          className="w-full"
                          style={{
                            ...boundGetFormInputStyle('default'),
                            backgroundColor: colors?.surface || defaultConfig.colors.surface,
                            borderColor: colors?.border || defaultConfig.colors.border,
                            color: colors?.text || defaultConfig.colors.text
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={boundGetTextColorStyle('primary')}>
                          Sample Select
                        </label>
                        <select
                          className="w-full"
                          style={{
                            ...boundGetFormInputStyle('default'),
                            backgroundColor: colors?.surface || defaultConfig.colors.surface,
                            borderColor: colors?.border || defaultConfig.colors.border,
                            color: colors?.text || defaultConfig.colors.text
                          }}
                        >
                          <option>Choose an option</option>
                          <option>Option 1</option>
                          <option>Option 2</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                                    {key === 'cards' && (
                    <div className="space-y-4">
                      <div className="text-sm" style={boundGetTextColorStyle('secondary')}>
                        Live preview of your card styling using real card data
                      </div>
                      
                      {/* Card Preview Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Grid View Preview */}
                        <div>
                          <div className="text-xs font-medium mb-2" style={boundGetTextColorStyle('primary')}>
                            Grid View
                          </div>
                          <div 
                            className="relative cursor-pointer transition-all duration-200 overflow-hidden" 
                            style={{
                              ...boundGetCardStyle(),
                              minHeight: '200px'
                            }}
                          >
                            {/* Card image placeholder */}
                                                         <div className="relative h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-t-lg mb-3 flex items-center justify-center">
                               <div className="text-xs text-gray-500 dark:text-gray-400">
                                 {cards && cards.length > 0 ? cards[0].card || 'Card Image' : 'Card Image'}
                               </div>
                             </div>
                             
                             {/* Card content */}
                             <div className="space-y-2">
                               <div className="font-medium text-sm" style={boundGetTextColorStyle('primary')}>
                                 {cards && cards.length > 0 ? cards[0].card || 'Sample Card' : 'Sample Card'}
                               </div>
                               <div className="text-xs" style={boundGetTextColorStyle('secondary')}>
                                 {cards && cards.length > 0 ? `${cards[0].set || 'Unknown Set'} • ${cards[0].year || '2023'}` : 'Pokemon Base Set • 1998'}
                               </div>
                               
                               {/* Grade badge */}
                               <div className="flex items-center gap-2">
                                 <span className="px-2 py-1 text-xs rounded-full font-medium" style={{
                                   backgroundColor: colors?.success || defaultConfig.colors.success,
                                   color: colors?.background || defaultConfig.colors.background
                                 }}>
                                   {cards && cards.length > 0 ? `${cards[0].gradingCompany || 'PSA'} ${cards[0].grade || '10'}` : 'PSA 10'}
                                 </span>
                               </div>
                               
                               {/* Value */}
                               <div className="pt-2 border-t" style={{ borderColor: colors?.border || defaultConfig.colors.border }}>
                                 <div className="text-xs" style={boundGetTextColorStyle('secondary')}>Current Value</div>
                                 <div className="font-semibold text-sm" style={boundGetTextColorStyle('primary')}>
                                   {cards && cards.length > 0 ? `$${cards[0].currentValue || '0'}` : '$1,250'}
                                 </div>
                               </div>
                            </div>
                          </div>
                        </div>

                        {/* List View Preview */}
                        <div>
                          <div className="text-xs font-medium mb-2" style={boundGetTextColorStyle('primary')}>
                            List View
                          </div>
                          <div 
                            className="flex items-center space-x-3 cursor-pointer transition-all duration-200" 
                            style={{
                              ...boundGetCardStyle(),
                              minHeight: '80px'
                            }}
                          >
                                                         {/* Card image */}
                             <div className="w-12 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded flex items-center justify-center shrink-0">
                               <div className="text-xs text-gray-500 dark:text-gray-400">IMG</div>
                             </div>
                             
                             {/* Card info */}
                             <div className="flex-1 min-w-0">
                               <div className="font-medium text-sm mb-1" style={boundGetTextColorStyle('primary')}>
                                 {cards && cards.length > 0 ? cards[0].card || 'Sample Card' : 'Sample Card'}
                               </div>
                               <div className="text-xs mb-1" style={boundGetTextColorStyle('secondary')}>
                                 {cards && cards.length > 0 ? `${cards[0].set || 'Unknown Set'} • ${cards[0].year || '2023'}` : 'Pokemon Base Set • 1998'}
                               </div>
                               <div className="flex items-center gap-2">
                                 <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{
                                   backgroundColor: colors?.success || defaultConfig.colors.success,
                                   color: colors?.background || defaultConfig.colors.background
                                 }}>
                                   {cards && cards.length > 0 ? `${cards[0].gradingCompany || 'PSA'} ${cards[0].grade || '10'}` : 'PSA 10'}
                                 </span>
                                 <span className="text-xs font-medium" style={boundGetTextColorStyle('primary')}>
                                   {cards && cards.length > 0 ? `$${cards[0].currentValue || '0'}` : '$1,250'}
                                 </span>
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Style Variations */}
                      <div>
                        <div className="text-xs font-medium mb-2" style={boundGetTextColorStyle('primary')}>
                          Style Variations
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Elevated */}
                          <div 
                            className="p-3 text-center text-xs transition-all duration-200" 
                            style={{
                              ...boundGetCardStyle(),
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            }}
                          >
                            <div style={boundGetTextColorStyle('primary')}>Elevated</div>
                          </div>
                          
                          {/* Flat */}
                          <div 
                            className="p-3 text-center text-xs transition-all duration-200" 
                            style={{
                              backgroundColor: colors?.surface || defaultConfig.colors.surface,
                              color: colors?.text || defaultConfig.colors.text,
                              borderRadius: config.components?.cards?.cornerRadius || '12px',
                              boxShadow: 'none'
                            }}
                          >
                            <div style={boundGetTextColorStyle('primary')}>Flat</div>
                          </div>
                          
                          {/* Outlined */}
                          <div 
                            className="p-3 text-center text-xs transition-all duration-200" 
                            style={{
                              backgroundColor: colors?.surface || defaultConfig.colors.surface,
                              color: colors?.text || defaultConfig.colors.text,
                              borderRadius: config.components?.cards?.cornerRadius || '12px',
                              border: `${config.components?.cards?.borderWidth || '0.5px'} solid ${colors?.border || defaultConfig.colors.border}`,
                              boxShadow: 'none'
                            }}
                          >
                            <div style={boundGetTextColorStyle('primary')}>Outlined</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {key === 'modals' && (
                    <div className="relative">
                      <div className="border-2 border-dashed p-6 rounded-lg text-center" style={{
                        borderColor: colors?.border || defaultConfig.colors.border
                      }}>
                        <div className="text-sm font-medium mb-2" style={boundGetTextColorStyle('primary')}>
                          Modal Preview
                        </div>
                        <div className="text-xs" style={boundGetTextColorStyle('secondary')}>
                          Modal components use the configured corner radius, shadow, and border settings
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Configuration Controls */}
                <div className="space-y-3">
                  {Object.entries(value).map(([prop, val]) => (
                    <div key={prop} className="flex items-center space-x-3">
                      <label style={sectionStyles.label} className="flex-1 capitalize">
                        {prop.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {prop === 'primaryStyle' || prop === 'style' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "solid", label: "Solid Color" },
                            { value: "gradient", label: "Gradient" },
                            { value: "outline", label: "Outline" },
                            { value: "ghost", label: "Ghost" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'size' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "small", label: "Small" },
                            { value: "medium", label: "Medium" },
                            { value: "large", label: "Large" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'corners' || prop === 'inputCorners' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "square", label: "Square" },
                            { value: "rounded", label: "Rounded" },
                            { value: "pill", label: "Pill" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'shadow' || prop === 'inputShadow' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "none", label: "None" },
                            { value: "small", label: "Small" },
                            { value: "medium", label: "Medium" },
                            { value: "large", label: "Large" },
                            { value: "xl", label: "Extra Large" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'hoverEffect' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "none", label: "None" },
                            { value: "lift", label: "Lift" },
                            { value: "scale", label: "Scale" },
                            { value: "glow", label: "Glow" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'transition' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "none", label: "None" },
                            { value: "all", label: "All" },
                            { value: "colors", label: "Colors" },
                            { value: "transform", label: "Transform" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'border' || prop === 'inputBorder' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "none", label: "None" },
                            { value: "solid", label: "Solid" },
                            { value: "dashed", label: "Dashed" },
                            { value: "dotted", label: "Dotted" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'inputStyle' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "bordered", label: "Bordered" },
                            { value: "filled", label: "Filled" },
                            { value: "outlined", label: "Outlined" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'labelPosition' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "top", label: "Top" },
                            { value: "left", label: "Left" },
                            { value: "inside", label: "Inside" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'focusStyle' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "ring", label: "Ring" },
                            { value: "border", label: "Border" },
                            { value: "glow", label: "Glow" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'padding' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "compact", label: "Compact" },
                            { value: "comfortable", label: "Comfortable" },
                            { value: "spacious", label: "Spacious" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'backgroundOpacity' ? (
                        <ConfiguratorDropdown
                          options={[
                            { value: "0.1", label: "10%" },
                            { value: "0.2", label: "20%" },
                            { value: "0.3", label: "30%" },
                            { value: "0.4", label: "40%" },
                            { value: "0.5", label: "50%" },
                            { value: "0.6", label: "60%" },
                            { value: "0.7", label: "70%" },
                            { value: "0.8", label: "80%" },
                            { value: "0.9", label: "90%" },
                            { value: "1", label: "100%" }
                          ]}
                          value={val}
                          onChange={(value) => boundUpdateNestedConfig('components', key, prop, value)}
                          width="120px"
                          style={{...sectionStyles.input}}
                        />
                      ) : prop === 'hoverEffect' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="none">None</option>
                          <option value="lift">Lift</option>
                          <option value="scale">Scale</option>
                          <option value="glow">Glow</option>
                          <option value="shadow">Shadow</option>
                        </select>
                      ) : prop === 'style' && key === 'cards' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="elevated">Elevated</option>
                          <option value="flat">Flat</option>
                          <option value="outlined">Outlined</option>
                        </select>
                      ) : prop === 'dividerStyle' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      ) : prop === 'spacing' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="compact">Compact</option>
                          <option value="comfortable">Comfortable</option>
                          <option value="spacious">Spacious</option>
                        </select>
                      ) : prop.includes('Padding') ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="8px">8px</option>
                          <option value="12px">12px</option>
                          <option value="16px">16px</option>
                          <option value="20px">20px</option>
                          <option value="24px">24px</option>
                          <option value="32px">32px</option>
                        </select>
                      ) : prop.includes('Radius') ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="0px">0px</option>
                          <option value="2px">2px</option>
                          <option value="4px">4px</option>
                          <option value="6px">6px</option>
                          <option value="8px">8px</option>
                          <option value="12px">12px</option>
                          <option value="16px">16px</option>
                          <option value="20px">20px</option>
                          <option value="24px">24px</option>
                          <option value="9999px">Round</option>
                        </select>
                      ) : typeof val === 'boolean' ? (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.checked)}
                            className="rounded"
                          />
                          <span style={boundGetTextColorStyle('secondary')} className="text-sm">
                            {val ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('components', key, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Hidden Component Sections */}
            {unusedComponentEntries.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowHiddenSettings(!showHiddenSettings)}
                  className="flex items-center gap-2 text-sm font-medium p-3 rounded-lg border w-full" 
                  style={{
                    backgroundColor: colors?.surfaceSecondary || colors?.surface || defaultConfig.colors.surface,
                    borderColor: colors?.border || defaultConfig.colors.border,
                    color: colors?.textSecondary || defaultConfig.colors.textSecondary
                  }}
                >
                  <span>{showHiddenSettings ? '🔽' : '▶️'}</span>
                  <span>Hidden Component Sections ({unusedComponentEntries.length} unused)</span>
                  <span className="text-xs opacity-70">- Not used by any preview components</span>
                </button>
                
                {showHiddenSettings && (
                  <div className="mt-4 space-y-4 p-4 rounded-lg border" style={{
                    backgroundColor: colors?.surfaceTertiary || colors?.surface || defaultConfig.colors.surface,
                    borderColor: colors?.border || defaultConfig.colors.border,
                    opacity: 0.7
                  }}>
                    {unusedComponentEntries.map(([key, value]) => (
                      <div key={key} className="p-4 rounded border" style={{
                        backgroundColor: colors?.surface || defaultConfig.colors.surface,
                        borderColor: colors?.border || defaultConfig.colors.border
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium capitalize" style={boundGetTextColorStyle('primary')}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h5>
                          <div className="text-xs px-2 py-1 rounded-full border" style={{ 
                            borderColor: colors?.textSecondary || defaultConfig.colors.textSecondary,
                            backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surface,
                            color: colors?.textSecondary || defaultConfig.colors.textSecondary
                          }}>
                            HIDDEN
                          </div>
                        </div>
                        <p className="text-sm" style={boundGetTextColorStyle('secondary')}>
                          This component section is not currently used by any preview components.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'financial':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              💰 Financial Display Configuration
            </h3>
            
            {Object.entries(config.financial || {}).map(([key, value]) => (
              <div key={key} className="mb-4">
                <div className="flex items-center space-x-3">
                  <label style={sectionStyles.label} className="flex-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {key === 'alignment' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('financial', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  ) : key === 'currencyPosition' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('financial', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="prefix">Prefix (A$100)</option>
                      <option value="suffix">Suffix (100A$)</option>
                    </select>
                  ) : key === 'textTransform' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('financial', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="none">None</option>
                      <option value="uppercase">Uppercase</option>
                      <option value="lowercase">Lowercase</option>
                      <option value="capitalize">Capitalize</option>
                    </select>
                  ) : key === 'positiveColor' || key === 'negativeColor' || key === 'zeroColor' ? (
                    <>
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => boundUpdateConfig('financial', key, e.target.value)}
                        style={sectionStyles.colorInput}
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => boundUpdateConfig('financial', key, e.target.value)}
                        style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                      />
                    </>
                  ) : typeof value === 'boolean' ? (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => boundUpdateConfig('financial', key, e.target.checked)}
                        className="rounded"
                      />
                      <span style={boundGetTextColorStyle('secondary')} className="text-sm">
                        {value ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : typeof value === 'number' ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => boundUpdateConfig('financial', key, parseInt(e.target.value))}
                      style={{...sectionStyles.input, width: '80px'}}
                      min="0"
                      max={key === 'decimalPlaces' ? 4 : undefined}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => boundUpdateConfig('financial', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'tables':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              📊 Table Configuration
            </h3>
            
            {Object.entries(config.tables || {}).map(([tableType, tableConfig]) => (
              <div key={tableType} className="mb-6">
                <h4 className="font-medium mb-3 capitalize" style={boundGetTextColorStyle('primary')}>
                  {tableType.replace(/([A-Z])/g, ' $1').trim()} Table
                </h4>
                <div className="space-y-2">
                  {Object.entries(tableConfig).map(([prop, val]) => (
                    <div key={prop} className="flex items-center space-x-3">
                      <label style={sectionStyles.label} className="flex-1 capitalize">
                        {prop.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {prop === 'style' || prop === 'headerStyle' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('tables', tableType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="simple">Simple</option>
                          <option value="bordered">Bordered</option>
                          <option value="striped">Striped</option>
                          <option value="elevated">Elevated</option>
                        </select>
                      ) : prop === 'density' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('tables', tableType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="compact">Compact</option>
                          <option value="comfortable">Comfortable</option>
                          <option value="spacious">Spacious</option>
                        </select>
                      ) : prop === 'shadow' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('tables', tableType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="none">None</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                        </select>
                      ) : prop === 'border' || prop === 'dividerStyle' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('tables', tableType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="none">None</option>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      ) : typeof val === 'boolean' ? (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => boundUpdateNestedConfig('tables', tableType, prop, e.target.checked)}
                            className="rounded"
                          />
                          <span style={boundGetTextColorStyle('secondary')} className="text-sm">
                            {val ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('tables', tableType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'navigation':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              🧭 Navigation Configuration
            </h3>
            
            {Object.entries(config.navigation || {}).map(([key, value]) => (
              <div key={key} className="mb-4">
                <div className="flex items-center space-x-3">
                  <label style={sectionStyles.label} className="flex-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {key === 'style' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="sidebar">Sidebar</option>
                      <option value="topbar">Top Bar</option>
                      <option value="tabs">Tabs</option>
                      <option value="pills">Pills</option>
                    </select>
                  ) : key === 'iconPosition' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="top">Top</option>
                      <option value="none">No Icon</option>
                    </select>
                  ) : key === 'activeIndicator' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="background">Background</option>
                      <option value="border">Border</option>
                      <option value="underline">Underline</option>
                      <option value="dot">Dot</option>
                    </select>
                  ) : key === 'hoverEffect' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="background">Background</option>
                      <option value="scale">Scale</option>
                      <option value="glow">Glow</option>
                      <option value="none">None</option>
                    </select>
                  ) : key === 'shadow' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="none">None</option>
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                    </select>
                  ) : key === 'border' || key === 'dividerStyle' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="none">None</option>
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  ) : typeof value === 'boolean' ? (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => boundUpdateConfig('navigation', key, e.target.checked)}
                        className="rounded"
                      />
                      <span style={boundGetTextColorStyle('secondary')} className="text-sm">
                        {value ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => boundUpdateConfig('navigation', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'grading':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              🏆 PSA & Grading Configuration
            </h3>
            
            <div className="space-y-6">
              {/* PSA Grade Colors */}
              <div>
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>PSA Grade Colors</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={colors?.warning || defaultConfig.colors.warning}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'warning', e.target.value) : 
                        boundUpdateConfig('colors', 'warning', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="flex-1">
                      PSA 10 (Perfect)
                    </label>
                    <input
                      type="text"
                      value={colors?.warning || defaultConfig.colors.warning}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'warning', e.target.value) : 
                        boundUpdateConfig('colors', 'warning', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={colors?.success || defaultConfig.colors.success}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'success', e.target.value) : 
                        boundUpdateConfig('colors', 'success', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="flex-1">
                      PSA 9 & 8 (Mint/Near Mint)
                    </label>
                    <input
                      type="text"
                      value={colors?.success || defaultConfig.colors.success}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'success', e.target.value) : 
                        boundUpdateConfig('colors', 'success', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={colors?.error || defaultConfig.colors.error}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'error', e.target.value) : 
                        boundUpdateConfig('colors', 'error', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="flex-1">
                      PSA 7 & Below (Good/Fair)
                    </label>
                    <input
                      type="text"
                      value={colors?.error || defaultConfig.colors.error}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'error', e.target.value) : 
                        boundUpdateConfig('colors', 'error', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                </div>
              </div>
              
              {/* Other Grading Companies */}
              <div>
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Other Grading Companies</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={colors?.info || defaultConfig.colors.info}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'info', e.target.value) : 
                        boundUpdateConfig('colors', 'info', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="flex-1">
                      BGS/Beckett & SGC
                    </label>
                    <input
                      type="text"
                      value={colors?.info || defaultConfig.colors.info}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'info', e.target.value) : 
                        boundUpdateConfig('colors', 'info', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={colors?.secondary || defaultConfig.colors.secondary}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'secondary', e.target.value) : 
                        boundUpdateConfig('colors', 'secondary', e.target.value)
                      }
                      style={sectionStyles.colorInput}
                    />
                    <label style={sectionStyles.label} className="flex-1">
                      CGC & CSG
                    </label>
                    <input
                      type="text"
                      value={colors?.secondary || defaultConfig.colors.secondary}
                      onChange={(e) => isDarkMode ? 
                        boundUpdateNestedConfig('theme', 'darkColors', 'secondary', e.target.value) : 
                        boundUpdateConfig('colors', 'secondary', e.target.value)
                      }
                      style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                    />
                  </div>
                </div>
              </div>
              
              {/* Pill Colors */}
              <div>
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Pill/Tag Colors</h4>
                <div className="space-y-3">
                  {Object.entries(colors).filter(([key]) => key.startsWith('pill')).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => isDarkMode ? 
                          boundUpdateNestedConfig('theme', 'darkColors', key, e.target.value) : 
                          boundUpdateConfig('colors', key, e.target.value)
                        }
                        style={sectionStyles.colorInput}
                      />
                      <label style={sectionStyles.label} className="flex-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => isDarkMode ? 
                          boundUpdateNestedConfig('theme', 'darkColors', key, e.target.value) : 
                          boundUpdateConfig('colors', key, e.target.value)
                        }
                        style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Grade Badge Preview */}
              <div>
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>Grade Badge Preview</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { company: 'PSA', grade: '10', color: colors?.warning || defaultConfig.colors.warning },
                    { company: 'PSA', grade: '9', color: colors?.success || defaultConfig.colors.success },
                    { company: 'PSA', grade: '8', color: colors?.success || defaultConfig.colors.success },
                    { company: 'PSA', grade: '7', color: colors?.error || defaultConfig.colors.error },
                    { company: 'BGS', grade: '9.5', color: colors?.info || defaultConfig.colors.info },
                    { company: 'CGC', grade: '10', color: colors?.secondary || defaultConfig.colors.secondary },
                  ].map((badge, index) => (
                    <div key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold"
                         style={{
                           backgroundColor: badge.color,
                           color: colors?.background || defaultConfig.colors.background
                         }}>
                      {badge.company} {badge.grade}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'status':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              🏷️ Status & Badge Configuration
            </h3>
            
            {Object.entries(config.status || {}).map(([statusType, statusConfig]) => (
              <div key={statusType} className="mb-6">
                <h4 className="font-medium mb-3 capitalize" style={boundGetTextColorStyle('primary')}>
                  {statusType.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <div className="space-y-2">
                  {Object.entries(statusConfig).map(([prop, val]) => (
                    <div key={prop} className="flex items-center space-x-3">
                      <label style={sectionStyles.label} className="flex-1 capitalize">
                        {prop.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      {prop === 'style' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="solid">Solid</option>
                          <option value="outline">Outline</option>
                          <option value="soft">Soft</option>
                          <option value="ghost">Ghost</option>
                        </select>
                      ) : prop === 'shape' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="square">Square</option>
                          <option value="rounded">Rounded</option>
                          <option value="pill">Pill</option>
                          <option value="circle">Circle</option>
                        </select>
                      ) : prop === 'size' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      ) : prop === 'shadow' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="none">None</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                        </select>
                      ) : prop === 'border' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="none">None</option>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      ) : prop === 'textTransform' ? (
                        <select
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        >
                          <option value="none">None</option>
                          <option value="uppercase">Uppercase</option>
                          <option value="lowercase">Lowercase</option>
                          <option value="capitalize">Capitalize</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => boundUpdateNestedConfig('status', statusType, prop, e.target.value)}
                          style={{...sectionStyles.input, width: '120px'}}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'icons':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              ✨ Icon Configuration
            </h3>
            
            {Object.entries(config.icons || {}).map(([key, value]) => (
              <div key={key} className="mb-4">
                <div className="flex items-center space-x-3">
                  <label style={sectionStyles.label} className="flex-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {key === 'style' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('icons', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="outline">Outline</option>
                      <option value="solid">Solid</option>
                      <option value="mini">Mini</option>
                    </select>
                  ) : key === 'size' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('icons', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="small">Small (16px)</option>
                      <option value="medium">Medium (20px)</option>
                      <option value="large">Large (24px)</option>
                      <option value="xl">Extra Large (32px)</option>
                    </select>
                  ) : key === 'hoverEffect' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('icons', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="none">None</option>
                      <option value="scale">Scale</option>
                      <option value="rotate">Rotate</option>
                      <option value="color">Color Change</option>
                    </select>
                  ) : key === 'shadow' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('icons', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="none">None</option>
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                    </select>
                  ) : key === 'border' ? (
                    <select
                      value={value}
                      onChange={(e) => boundUpdateConfig('icons', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    >
                      <option value="none">None</option>
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => boundUpdateConfig('icons', key, e.target.value)}
                      style={{...sectionStyles.input, width: '120px'}}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'theme':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              🌙 Theme Configuration
            </h3>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label style={sectionStyles.label}>Dark Mode</label>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{
                    ...boundGetBackgroundColorStyle('surface'),
                    ...boundGetTextColorStyle('primary'),
                    ...boundGetBorderColorStyle('primary')
                  }}
                >
                  {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3" style={boundGetTextColorStyle('primary')}>
                  {isDarkMode ? 'Dark Mode Colors' : 'Light Mode Colors'}
                </h4>
                <div className="space-y-2">
                  {Object.entries(colors || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => isDarkMode ? 
                          boundUpdateNestedConfig('theme', 'darkColors', key, e.target.value) : 
                          boundUpdateConfig('colors', key, e.target.value)
                        }
                        style={sectionStyles.colorInput}
                      />
                      <label style={sectionStyles.label} className="flex-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => isDarkMode ? 
                          boundUpdateNestedConfig('theme', 'darkColors', key, e.target.value) : 
                          boundUpdateConfig('colors', key, e.target.value)
                        }
                        style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'hidden':
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              👁️‍🗨️ Hidden Configuration Sections
            </h3>
            <p className="text-sm mb-6" style={boundGetTextColorStyle('secondary')}>
              These configuration sections are not currently used by any components in the preview. 
              They are hidden to keep the interface clean and focused on what actually matters.
            </p>
            
            <div className="space-y-4">
              {unusedSections.map(section => (
                <div key={section.id} className="p-4 rounded-lg border" style={{
                  backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary,
                  borderColor: colors?.border || defaultConfig.colors.border,
                  opacity: 0.7
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium" style={boundGetTextColorStyle('primary')}>
                      {section.icon} {section.label}
                    </h4>
                    <div className="text-xs px-2 py-1 rounded-full border" style={{ 
                      borderColor: colors?.textSecondary || defaultConfig.colors.textSecondary,
                      backgroundColor: colors?.surface || defaultConfig.colors.surface,
                      color: colors?.textSecondary || defaultConfig.colors.textSecondary
                    }}>
                      HIDDEN
                    </div>
                  </div>
                  <p className="text-sm" style={boundGetTextColorStyle('secondary')}>
                    This section is hidden because it's not used by any components in the configurator preview.
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6" style={boundGetTextColorStyle('primary')}>
              Configuration
            </h3>
            <p style={boundGetTextColorStyle('secondary')}>
              Select a configuration section from the dropdown above to customize your design system.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: colors?.backgroundSecondary || defaultConfig.colors.backgroundSecondary }}>
      <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 
              className={`text-3xl font-bold`}
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors border`}
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors border`}
              style={{
                borderColor: colors?.error || defaultConfig.colors.error,
                color: colors?.error || defaultConfig.colors.error,
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
              backgroundColor: colors?.surface || defaultConfig.colors.surface,
              borderColor: colors?.border || defaultConfig.colors.border
            }}>
              <h2 
                className={`text-lg font-semibold mb-4`}
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
                  className={`w-full pl-4 pr-10 py-3 rounded-lg border text-sm font-medium transition-all duration-200 appearance-none cursor-pointer focus:outline-none focus:ring-2`}
                  style={{
                    '--tw-ring-color': `${colors?.secondary || defaultConfig.colors.secondary}33`,
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
            <div className={`rounded-lg p-6 border flex-1 overflow-y-auto`} style={{
              backgroundColor: colors?.surface || defaultConfig.colors.surface,
              borderColor: colors?.border || defaultConfig.colors.border
            }}>
              {renderConfigurationSection()}
            </div>
          </div>

          {/* Right Two-Thirds - Component Preview */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="rounded-lg p-6 border mb-6" style={{
              backgroundColor: colors?.surface || defaultConfig.colors.surface,
              borderColor: colors?.border || defaultConfig.colors.border
            }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold`} style={boundGetTextColorStyle('primary')}>
                  Component Library
                </h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium`} style={{
                  backgroundColor: (colors?.secondary || defaultConfig.colors.secondary) + '20',
                  color: colors?.secondary || defaultConfig.colors.secondary
                }}>
                  {components.length} Components
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {componentCategories[0].components.map(component => (
                  <button
                    key={component.type}
                    onClick={() => addComponent(component.type)}
                    className={`p-4 rounded-lg border text-left transition-colors`}
                    style={{
                      borderColor: colors?.border || defaultConfig.colors.border,
                      backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary
                    }}
                  >
                    <div className="text-2xl mb-2">{component.icon}</div>
                    <h4 className={`font-medium mb-1`} style={boundGetTextColorStyle('primary')}>
                      {component.name}
                    </h4>
                    <p className={`text-sm`} style={boundGetTextColorStyle('secondary')}>
                      {component.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Component Preview */}
            <div className="flex-1 overflow-y-auto">
              <h3 className={`text-xl font-semibold mb-6`} style={boundGetTextColorStyle('primary')}>
                Component Preview
              </h3>
              
              {components.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎨</div>
                  <h4 className={`text-lg font-medium mb-2`} style={boundGetTextColorStyle('primary')}>
                    No Components Added
                  </h4>
                  <p className={`text-sm`} style={boundGetTextColorStyle('secondary')}>
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