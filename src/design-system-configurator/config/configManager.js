import { defaultConfig } from './defaultConfig.js';

// Configuration update function for single-level paths
export const updateConfig = (prev, section, key, value) => {
  // Handle nested paths like 'theme.darkColors'
  if (section.includes('.')) {
    const [parentSection, childSection] = section.split('.');
    return {
      ...prev,
      [parentSection]: {
        ...prev[parentSection],
        [childSection]: {
          ...prev[parentSection][childSection],
          [key]: value
        }
      }
    };
  }
  
  // Handle regular single-level paths
  return {
    ...prev,
    [section]: {
      ...prev[section],
      [key]: value
    }
  };
};

// Configuration update function for nested paths
export const updateNestedConfig = (prev, section, subsection, key, value) => {
  // Handle nested paths like 'theme.darkGradients'
  if (section.includes('.')) {
    const [parentSection, childSection] = section.split('.');
    return {
      ...prev,
      [parentSection]: {
        ...prev[parentSection],
        [childSection]: {
          ...prev[parentSection][childSection],
          [subsection]: {
            ...prev[parentSection][childSection][subsection],
            [key]: value
          }
        }
      }
    };
  }
  
  // Handle regular single-level paths
  return {
    ...prev,
    [section]: {
      ...prev[section],
      [subsection]: {
        ...prev[section][subsection],
        [key]: value
      }
    }
  };
};

// Helper function to map old typography references to new semantic structure
export const getTypographyStyle = (config) => (type = 'body') => {
  // Safety check for config and typography section
  if (!config || !config.typography || !config.typography.body || typeof config.typography.body !== 'object') {
    // Old structure fallback
    const fallbackStyles = {
      display: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: '48px',
        fontWeight: (config.typography?.headingWeight) || '700',
        lineHeight: '1.1',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      heading: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.largeTextSize) || '24px',
        fontWeight: (config.typography?.headingWeight) || '600',
        lineHeight: (config.typography?.headingLineHeight) || '1.2',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      subheading: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: '18px',
        fontWeight: (config.typography?.headingWeight) || '600',
        lineHeight: '1.3',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      body: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.fontSize) || '16px',
        fontWeight: (config.typography?.bodyWeight) || '400',
        lineHeight: (config.typography?.lineHeight) || '1.5',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      bodySmall: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.smallTextSize) || '14px',
        fontWeight: (config.typography?.bodyWeight) || '400',
        lineHeight: '1.4',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      caption: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: '12px',
        fontWeight: (config.typography?.bodyWeight) || '400',
        lineHeight: '1.3',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      label: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.statisticsLabelSize) || '14px',
        fontWeight: (config.typography?.statisticsLabelWeight) || '500',
        lineHeight: '1.2',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      button: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.fontSize) || '14px',
        fontWeight: '500',
        lineHeight: '1.2',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      card: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.fontSize) || '15px',
        fontWeight: (config.typography?.bodyWeight) || '400',
        lineHeight: '1.4',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      banner: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.3',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      },
      link: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.fontSize) || '16px',
        fontWeight: '500',
        lineHeight: (config.typography?.lineHeight) || '1.5',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none',
        color: (config.typography?.linkColor) || '#3b82f6',
        hoverColor: (config.typography?.linkHoverColor) || '#2563eb',
        decoration: (config.typography?.linkStyle) || 'underline'
      },
      financial: {
        fontFamily: (config.typography?.fontFamily) || 'Inter, sans-serif',
        fontSize: (config.typography?.statisticsValueSize) || '16px',
        fontWeight: (config.typography?.statisticsValueWeight) || '600',
        lineHeight: '1.2',
        letterSpacing: (config.typography?.letterSpacing) || '0em',
        textTransform: (config.typography?.textTransform) || 'none'
      }
    };
    
    return fallbackStyles[type] || fallbackStyles.body;
  }
  
  // Use the new semantic structure directly with safety checks
  return (config.typography && config.typography[type]) || (config.typography && config.typography.body) || defaultConfig.typography.body;
};

// Export configuration functionality
export const exportConfig = (config) => () => {
  const exportData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: config
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `design-system-config-${new Date().toISOString().slice(0, 10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Reset configuration to defaults
export const resetToDefaults = (setConfig) => () => {
  setConfig(defaultConfig);
};

// Apply CSS custom properties to document root
export const applyCSSVariables = (config, isDarkMode) => {
  const root = document.documentElement;
  const colors = isDarkMode ? config.theme.darkColors : config.colors;
  
  // Primary colors
  root.style.setProperty('--color-primary-default', colors.primary);
  root.style.setProperty('--color-primary-hover', colors.primaryHover || colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight || colors.primary);
  
  // Secondary colors
  root.style.setProperty('--color-secondary-default', colors.secondary);
  root.style.setProperty('--color-secondary-hover', colors.secondaryHover || colors.secondary);
  root.style.setProperty('--color-secondary-light', colors.secondaryLight || colors.secondary);
  
  // Semantic colors
  root.style.setProperty('--color-success-default', colors.success);
  root.style.setProperty('--color-success-hover', colors.successHover || colors.success);
  root.style.setProperty('--color-success-light', colors.successLight || colors.success);
  
  root.style.setProperty('--color-warning-default', colors.warning);
  root.style.setProperty('--color-warning-hover', colors.warningHover || colors.warning);
  root.style.setProperty('--color-warning-light', colors.warningLight || colors.warning);
  
  root.style.setProperty('--color-error-default', colors.error);
  root.style.setProperty('--color-error-hover', colors.errorHover || colors.error);
  root.style.setProperty('--color-error-light', colors.errorLight || colors.error);
  
  root.style.setProperty('--color-info-default', colors.info);
  root.style.setProperty('--color-info-hover', colors.infoHover || colors.info);
  root.style.setProperty('--color-info-light', colors.infoLight || colors.info);
  
  // Pill/Tag colors
  root.style.setProperty('--color-pill-primary', colors.pillPrimary);
  root.style.setProperty('--color-pill-secondary', colors.pillSecondary);
  root.style.setProperty('--color-pill-success', colors.pillSuccess);
  root.style.setProperty('--color-pill-info', colors.pillInfo);
  
  // Background and surface colors
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-background-secondary', colors.backgroundSecondary);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-surface-secondary', colors.surfaceSecondary);
  root.style.setProperty('--color-surface-tertiary', colors.surfaceTertiary);
  root.style.setProperty('--color-surface-quaternary', colors.surfaceQuaternary || colors.surfaceTertiary);
  
  // Text colors
  root.style.setProperty('--color-text-primary', colors.text);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  
  // Border colors
  root.style.setProperty('--color-border', colors.border);
  
  // Set theme mode
  document.documentElement.classList.toggle('dark', isDarkMode);
};

export default {
  updateConfig,
  updateNestedConfig,
  getTypographyStyle,
  exportConfig,
  resetToDefaults,
  applyCSSVariables
}; 