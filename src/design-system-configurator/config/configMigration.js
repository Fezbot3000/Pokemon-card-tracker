// Migration function to convert old typography structure to new one
export const migrateTypographyConfig = (oldConfig) => {
  // Check if it's already the new structure
  if (oldConfig.typography && typeof oldConfig.typography.body === 'object') {
    return oldConfig; // Already migrated
  }
  
  // Convert old structure to new semantic structure
  const newTypography = {
    display: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: '48px',
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
      textTransform: 'none'
    },
    heading: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: '24px',
      fontWeight: oldConfig.typography?.headingWeight || '600',
      lineHeight: oldConfig.typography?.headingLineHeight || '1.2',
      letterSpacing: '-0.01em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    subheading: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: '18px',
      fontWeight: oldConfig.typography?.headingWeight || '600',
      lineHeight: '1.3',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    body: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.fontSize || '16px',
      fontWeight: oldConfig.typography?.bodyWeight || '400',
      lineHeight: oldConfig.typography?.lineHeight || '1.5',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    bodySmall: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.smallTextSize || '14px',
      fontWeight: oldConfig.typography?.bodyWeight || '400',
      lineHeight: '1.4',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    caption: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: '12px',
      fontWeight: oldConfig.typography?.bodyWeight || '400',
      lineHeight: '1.3',
      letterSpacing: '0.01em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    label: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.statisticsLabelSize || '14px',
      fontWeight: oldConfig.typography?.statisticsLabelWeight || '500',
      lineHeight: '1.2',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    button: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.fontSize || '14px',
      fontWeight: '500',
      lineHeight: '1.2',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    card: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.fontSize || '15px',
      fontWeight: oldConfig.typography?.bodyWeight || '400',
      lineHeight: '1.4',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    banner: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.3',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    },
    link: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.fontSize || '16px',
      fontWeight: '500',
      lineHeight: oldConfig.typography?.lineHeight || '1.5',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none',
      color: oldConfig.typography?.linkColor || '#3b82f6',
      hoverColor: oldConfig.typography?.linkHoverColor || '#2563eb',
      decoration: oldConfig.typography?.linkStyle || 'underline'
    },
    financial: {
      fontFamily: oldConfig.typography?.fontFamily || 'Inter, sans-serif',
      fontSize: oldConfig.typography?.statisticsValueSize || '16px',
      fontWeight: oldConfig.typography?.statisticsValueWeight || '600',
      lineHeight: '1.2',
      letterSpacing: '0em',
      textTransform: oldConfig.typography?.textTransform || 'none'
    }
  };
  
  // Return the migrated configuration
  return {
    ...oldConfig,
    typography: newTypography
  };
};

// Main migration function that handles all config migrations
export const migrateConfig = (config) => {
  let migratedConfig = { ...config };
  
  // Apply typography migration
  migratedConfig = migrateTypographyConfig(migratedConfig);
  
  // Add version info for future migrations
  migratedConfig.version = '1.0.0';
  migratedConfig.migrationDate = new Date().toISOString();
  
  return migratedConfig;
};

// Check if configuration needs migration
export const needsMigration = (config) => {
  // Check if it's the old typography structure
  if (config.typography && typeof config.typography.body !== 'object') {
    return true;
  }
  
  // Check if version is missing or old
  if (!config.version || config.version !== '1.0.0') {
    return true;
  }
  
  return false;
};

export default {
  migrateTypographyConfig,
  migrateConfig,
  needsMigration
}; 