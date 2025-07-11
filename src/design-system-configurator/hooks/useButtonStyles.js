import { defaultConfig } from '../config/defaultConfig';

/**
 * Custom hook for managing button styles in the design configurator
 * Extracts all button style logic from the main configurator file
 */
export const useButtonStyles = (config, isDarkMode, primaryStyle) => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);

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
    const gradients = isDarkMode ? 
      (config.theme?.darkGradients || defaultConfig.theme.darkGradients) : 
      (config.gradients || defaultConfig.gradients);
    
    const baseStyle = getBaseButtonStyle();
    
    // Determine primary style colors and background
    let styleSpecific = {};
    if ((primaryStyle === 'gradient' || buttonConfig.primaryStyle === 'gradient') && gradients?.primary) {
      styleSpecific = {
        background: `linear-gradient(${gradients.primary.direction || '135deg'}, ${gradients.primary.from || defaultConfig.gradients.primary.from}, ${gradients.primary.to || defaultConfig.gradients.primary.to})`,
        color: colors?.background || defaultConfig.colors.background,
        borderColor: 'transparent'
      };
    } else if (buttonConfig.primaryStyle === 'outline') {
      styleSpecific = {
        backgroundColor: 'transparent',
        color: colors?.primary || defaultConfig.colors.primary,
        borderColor: colors?.primary || defaultConfig.colors.primary
      };
    } else if (buttonConfig.primaryStyle === 'ghost') {
      styleSpecific = {
        backgroundColor: 'transparent',
        color: colors?.primary || defaultConfig.colors.primary,
        borderColor: 'transparent'
      };
    } else {
      styleSpecific = {
        backgroundColor: colors?.primary || defaultConfig.colors.primary,
        color: colors?.background || defaultConfig.colors.background,
        borderColor: colors?.primary || defaultConfig.colors.primary
      };
    }
    
    return {
      ...baseStyle,
      ...styleSpecific
    };
  };

  const getSecondaryButtonStyle = () => {
    const buttonConfig = config.components?.buttons || defaultConfig.components.buttons;
    const baseStyle = getBaseButtonStyle();
    
    return {
      ...baseStyle,
      background: 'transparent',
      backgroundColor: 'transparent',
      color: colors?.text || defaultConfig.colors.text,
      borderColor: colors?.text || defaultConfig.colors.text,
      border: `${buttonConfig.borderWidth || '0.5px'} solid ${colors?.text || defaultConfig.colors.text}`
    };
  };

  const getTertiaryButtonStyle = () => {
    const baseStyle = getBaseButtonStyle();
    
    return {
      ...baseStyle,
      background: 'transparent',
      backgroundColor: 'transparent',
      color: colors?.text || defaultConfig.colors.text,
      border: 'none',
      borderColor: 'transparent'
    };
  };

  return {
    getBaseButtonStyle,
    getPrimaryButtonStyle,
    getSecondaryButtonStyle,
    getTertiaryButtonStyle
  };
}; 