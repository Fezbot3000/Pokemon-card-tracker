import { useState } from 'react';
import { defaultConfig, defaultComponents } from '../config/defaultConfig';

/**
 * Custom hook for managing configuration in the design configurator
 * Extracts all configuration management logic from the main configurator file
 */
export const useConfigurationManagement = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [primaryStyle, setPrimaryStyle] = useState('gradient');
  const [activeSection, setActiveSection] = useState('colors');
  const [showHiddenSettings, setShowHiddenSettings] = useState(false);

  const applyColorPreset = (preset) => {
    const presets = {
      'pokemon-red': {
        primary: '#e53e3e',
        secondary: '#ff6b6b',
        accent: '#feb2b2',
        gradient: { from: '#e53e3e', to: '#ff6b6b', direction: '135deg' }
      },
      'ocean-blue': {
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        accent: '#7dd3fc',
        gradient: { from: '#0ea5e9', to: '#06b6d4', direction: '135deg' }
      },
      'forest-green': {
        primary: '#059669',
        secondary: '#10b981',
        accent: '#6ee7b7',
        gradient: { from: '#059669', to: '#10b981', direction: '135deg' }
      },
      'royal-purple': {
        primary: '#7c3aed',
        secondary: '#a855f7',
        accent: '#c4b5fd',
        gradient: { from: '#7c3aed', to: '#a855f7', direction: '135deg' }
      }
    };

    const selectedPreset = presets[preset];
    if (selectedPreset) {
      if (isDarkMode) {
        setConfig(prev => ({
          ...prev,
          theme: {
            ...prev.theme,
            darkColors: {
              ...prev.theme.darkColors,
              primary: selectedPreset.primary,
              secondary: selectedPreset.secondary,
              accent: selectedPreset.accent
            },
            darkGradients: {
              ...prev.theme.darkGradients,
              primary: selectedPreset.gradient
            }
          }
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          colors: {
            ...prev.colors,
            primary: selectedPreset.primary,
            secondary: selectedPreset.secondary,
            accent: selectedPreset.accent
          },
          gradients: {
            ...prev.gradients,
            primary: selectedPreset.gradient
          }
        }));
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
    if (window.confirm('Are you sure you want to reset all settings to defaults? This will clear all your configurations.')) {
      setConfig(defaultConfig);
      setIsDarkMode(false);
      setActiveSection('colors');
      setPrimaryStyle('gradient');
    }
  };

  const getUsedTypographyStyles = () => {
    return new Set([
      'body',
      'button',
      'caption',
      'heading',
      'subheading',
      'display',
      'label'
    ]);
  };

  const getUsedConfigSections = () => {
    return new Set([
      'colors',
      'typography',
      'components',
      'theme'
    ]);
  };

  const isTypographyStyleUsed = (style) => {
    return getUsedTypographyStyles().has(style);
  };

  const isConfigSectionUsed = (section) => {
    return getUsedConfigSections().has(section);
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

  const usedSections = allSections.filter(section => isConfigSectionUsed(section.id));
  const unusedSections = allSections.filter(section => !isConfigSectionUsed(section.id));
  
  const sections = [
    ...usedSections,
    ...(unusedSections.length > 0 ? [{ id: 'hidden', label: `Hidden Sections (${unusedSections.length})`, icon: '👁️‍🗨️' }] : [])
  ];

  return {
    config,
    setConfig,
    isDarkMode,
    setIsDarkMode,
    primaryStyle,
    setPrimaryStyle,
    activeSection,
    setActiveSection,
    showHiddenSettings,
    setShowHiddenSettings,
    applyColorPreset,
    exportConfig,
    resetToDefaults,
    getUsedTypographyStyles,
    getUsedConfigSections,
    isTypographyStyleUsed,
    isConfigSectionUsed,
    sections,
    allSections,
    usedSections,
    unusedSections
  };
}; 