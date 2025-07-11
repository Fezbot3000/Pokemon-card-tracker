import { getGradientString, adjustColor } from './colorUtils.js';
import { defaultConfig } from '../config/defaultConfig.js';

// Get button styles based on variant and configuration
export const getButtonStyle = (config, isDarkMode) => (variant = 'primary') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  const gradients = isDarkMode ? 
    (config.theme?.darkGradients || defaultConfig.theme.darkGradients) : 
    (config.gradients || defaultConfig.gradients);
  
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
  
  // Transition configurations
  const transitionStyles = {
    none: { transition: 'none' },
    all: { transition: 'all 0.2s ease' },
    colors: { transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease' },
    transform: { transition: 'transform 0.2s ease' }
  };
  
  const baseStyle = {
    ...sizeStyles[buttonConfig.size || 'medium'],
    ...cornerStyles[buttonConfig.corners || 'rounded'],
    ...shadowStyles[buttonConfig.shadow || 'medium'],
    ...borderStyles[buttonConfig.border || 'none'],
    ...transitionStyles[buttonConfig.transition || 'all'],
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
    // Focus ring styles
    ...(buttonConfig.focusRing && {
      ':focus': {
        boxShadow: `0 0 0 ${buttonConfig.focusRingWidth || '2px'} ${buttonConfig.focusRingColor || colors.primary}40`
      }
    })
  };
  
  // Style variants
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        if ((buttonConfig.primaryStyle || buttonConfig.style) === 'gradient' && gradients?.primary) {
          return {
            background: getGradientString(gradients.primary),
            color: colors.background,
            borderColor: 'transparent'
          };
        } else if ((buttonConfig.primaryStyle || buttonConfig.style) === 'outline') {
          return {
            backgroundColor: 'transparent',
            color: colors.primary,
            borderColor: colors.primary
          };
        } else if ((buttonConfig.primaryStyle || buttonConfig.style) === 'ghost') {
          return {
            backgroundColor: 'transparent',
            color: colors.primary,
            borderColor: 'transparent'
          };
        }
        return {
          backgroundColor: colors.primary,
          color: colors.background,
          borderColor: colors.primary
        };
      
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: colors.text,
          borderColor: colors.text
        };
      
      case 'tertiary':
        return {
          backgroundColor: 'transparent',
          color: colors.text,
          borderColor: 'transparent'
        };
      
      case 'warning':
        return {
          backgroundColor: colors.warning,
          color: colors.background,
          borderColor: colors.warning
        };
      
      case 'error':
        return {
          backgroundColor: colors.error,
          color: colors.background,
          borderColor: colors.error
        };
      
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: colors.text,
          borderColor: 'transparent'
        };
      
      default:
        return {
          backgroundColor: colors.surface,
          color: colors.text,
          borderColor: colors.border
        };
    }
  };
  
  // Hover effect styles (applied via CSS-in-JS or separate hover states)
  const getHoverStyles = () => {
    switch (buttonConfig.hoverEffect) {
      case 'lift':
        return {
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: shadowStyles[buttonConfig.shadow || 'medium'].boxShadow.replace('rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.15)')
          }
        };
      case 'scale':
        return {
          ':hover': {
            transform: 'scale(1.05)'
          }
        };
      case 'glow':
        return {
          ':hover': {
            boxShadow: `0 0 20px ${colors.primary}40`
          }
        };
      case 'none':
      default:
        return {};
    }
  };
  
  return {
    ...baseStyle,
    ...getVariantStyle(),
    ...getHoverStyles()
  };
};

// Get card styles based on configuration
export const getCardStyle = (config, isDarkMode) => () => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  const cardConfig = config.components?.cards || defaultConfig.components.cards;
  
  // Padding configurations
  const paddingStyles = {
    compact: { padding: '12px' },
    comfortable: { padding: '16px' },
    spacious: { padding: '24px' }
  };
  
  // Corner configurations
  const cornerStyles = {
    square: { borderRadius: '0px' },
    rounded: { borderRadius: cardConfig.cornerRadius || '12px' },
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
    solid: { border: `${cardConfig.borderWidth || '0.5px'} solid ${colors.border}` },
    dashed: { border: `${cardConfig.borderWidth || '0.5px'} dashed ${colors.border}` },
    dotted: { border: `${cardConfig.borderWidth || '0.5px'} dotted ${colors.border}` }
  };
  
  // Style configurations
  const getStyleBase = () => {
    switch (cardConfig.style) {
      case 'flat':
        return {
          backgroundColor: colors.surface,
          boxShadow: 'none'
        };
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: 'none'
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.surface,
          border: cardConfig.border === 'none' ? 'none' : `1px solid ${colors.border}`
        };
    }
  };
  
  // Hover effect configurations
  const getHoverStyles = () => {
    switch (cardConfig.hoverEffect) {
      case 'lift':
        return {
          ':hover': {
            transform: 'translateY(-4px)',
            boxShadow: shadowStyles[cardConfig.shadow || 'large'].boxShadow.replace('rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.15)')
          }
        };
      case 'scale':
        return {
          ':hover': {
            transform: 'scale(1.02)'
          }
        };
      case 'glow':
        return {
          ':hover': {
            boxShadow: `0 0 20px ${colors.primary}20`
          }
        };
      case 'none':
      default:
        return {};
    }
  };
  
  return {
    ...getStyleBase(),
    ...paddingStyles[cardConfig.padding || 'comfortable'],
    ...cornerStyles[cardConfig.corners || 'rounded'],
    ...shadowStyles[cardConfig.shadow || 'large'],
    ...borderStyles[cardConfig.border || 'none'],
    transition: 'all 0.2s ease',
    ...(cardConfig.backgroundOpacity && cardConfig.backgroundOpacity !== '1' && {
      backgroundColor: `${colors.surface}${Math.round(parseFloat(cardConfig.backgroundOpacity) * 255).toString(16).padStart(2, '0')}`
    }),
    ...getHoverStyles()
  };
};

// Get surface styles based on variant
export const getSurfaceStyle = (config, isDarkMode) => (variant = 'primary') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.surface,
        color: colors.text
      };
    
    case 'secondary':
      return {
        backgroundColor: colors.surfaceSecondary,
        color: colors.text
      };
    
    case 'tertiary':
      return {
        backgroundColor: colors.surfaceTertiary,
        color: colors.text
      };
    
    default:
      return {
        backgroundColor: colors.surface,
        color: colors.text
      };
  }
};

// Get interactive styles (hover, focus, etc.)
export const getInteractiveStyle = (config, isDarkMode) => (variant = 'default') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  const baseStyle = {
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  };
  
  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        background: (config.components?.buttons?.primaryStyle || defaultConfig.components.buttons.primaryStyle) === 'solid' 
          ? colors.primary
          : `linear-gradient(${(isDarkMode ? (config.theme?.darkGradients || defaultConfig.theme.darkGradients) : (config.gradients || defaultConfig.gradients)).primary.direction}, ${(isDarkMode ? (config.theme?.darkGradients || defaultConfig.theme.darkGradients) : (config.gradients || defaultConfig.gradients)).primary.from} 0%, ${(isDarkMode ? (config.theme?.darkGradients || defaultConfig.theme.darkGradients) : (config.gradients || defaultConfig.gradients)).primary.to} 100%)`,
        borderColor: colors.primary,
        color: colors.background
      };
    
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderColor: colors.secondary,
        color: colors.secondary
      };
    
    case 'tertiary':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: colors.text
      };
    
    case 'hover':
      return {
        ...baseStyle,
        backgroundColor: adjustColor(colors.surface, 5),
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    
    case 'focus':
      return {
        ...baseStyle,
        outline: 'none',
        boxShadow: `0 0 0 2px ${colors.primary}40`
      };
    
    case 'active':
      return {
        ...baseStyle,
        backgroundColor: adjustColor(colors.surface, -5),
        transform: 'translateY(0px)'
      };
    
    default:
      return {
        ...baseStyle,
        backgroundColor: isDarkMode ? `${colors.surface}80` : `${colors.surface}80`,
        borderColor: isDarkMode ? `${colors.border}80` : `${colors.border}80`
      };
  }
};

// Get text color classes based on variant
export const getTextColorClass = (config, isDarkMode) => (variant = 'primary') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  // Return CSS custom properties that can be used in classes
  const colorMap = {
    primary: colors.text,
    secondary: colors.textSecondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info
  };
  
  return colorMap[variant] || colors.text;
};

// Get text color styles (direct CSS properties)
export const getTextColorStyle = (config, isDarkMode) => (variant = 'primary') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  const colorMap = {
    primary: colors.text,
    secondary: colors.textSecondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info
  };
  
  return {
    color: colorMap[variant] || colors.text
  };
};

// Get background color styles
export const getBackgroundColorStyle = (config, isDarkMode) => (variant = 'primary') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  const colorMap = {
    primary: colors.background,
    secondary: colors.backgroundSecondary,
    surface: colors.surface,
    surfaceSecondary: colors.surfaceSecondary,
    surfaceTertiary: colors.surfaceTertiary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info
  };
  
  return {
    backgroundColor: colorMap[variant] || colors.surface
  };
};

// Get border color styles
export const getBorderColorStyle = (config, isDarkMode) => (variant = 'primary') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  const colorMap = {
    primary: colors.border,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info
  };
  
  return {
    borderColor: colorMap[variant] || colors.border
  };
};

// Get focus ring styles
export const getFocusRingStyle = (config, isDarkMode) => () => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  return {
    outline: 'none',
    boxShadow: `0 0 0 2px ${colors.primary}40`,
    borderColor: colors.primary
  };
};

// Get form input styles based on configuration
export const getFormInputStyle = (config, isDarkMode) => (variant = 'default') => {
  const colors = isDarkMode ? 
    (config.theme?.darkColors || defaultConfig.theme.darkColors) : 
    (config.colors || defaultConfig.colors);
  
  const formConfig = config.components?.forms || defaultConfig.components.forms;
  
  // Corner configurations
  const cornerStyles = {
    square: { borderRadius: '0px' },
    rounded: { borderRadius: formConfig.inputCornerRadius || '6px' },
    pill: { borderRadius: '9999px' }
  };
  
  // Shadow configurations
  const shadowStyles = {
    none: { boxShadow: 'none' },
    sm: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    medium: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
    large: { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }
  };
  
  // Border configurations  
  const borderStyles = {
    none: { border: 'none' },
    solid: { border: `${formConfig.inputBorderWidth || '0.5px'} solid ${colors.border}` },
    dashed: { border: `${formConfig.inputBorderWidth || '0.5px'} dashed ${colors.border}` },
    dotted: { border: `${formConfig.inputBorderWidth || '0.5px'} dotted ${colors.border}` }
  };
  
  // Style configurations
  const getStyleBase = () => {
    switch (formConfig.inputStyle) {
      case 'filled':
        return {
          backgroundColor: colors.surfaceSecondary,
          border: 'none'
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          border: `${formConfig.inputBorderWidth || '0.5px'} solid ${colors.border}`
        };
      case 'bordered':
      default:
        return {
          backgroundColor: colors.surface,
          border: `${formConfig.inputBorderWidth || '0.5px'} solid ${colors.border}`
        };
    }
  };
  
  // Focus styles
  const getFocusStyles = () => {
    switch (formConfig.focusStyle) {
      case 'ring':
        return {
          ':focus': {
            outline: 'none',
            borderColor: colors.primary,
            boxShadow: `0 0 0 2px ${colors.primary}40`
          }
        };
      case 'border':
        return {
          ':focus': {
            outline: 'none',
            borderColor: colors.primary
          }
        };
      case 'glow':
        return {
          ':focus': {
            outline: 'none',
            borderColor: colors.primary,
            boxShadow: `0 0 10px ${colors.primary}40`
          }
        };
      default:
        return {
          ':focus': {
            outline: 'none',
            borderColor: colors.primary
          }
        };
    }
  };
  
  return {
    ...getStyleBase(),
    ...cornerStyles[formConfig.inputCorners || 'rounded'],
    ...shadowStyles[formConfig.inputShadow || 'sm'],
    ...borderStyles[formConfig.inputBorder || 'solid'],
    padding: '12px 16px',
    fontSize: '16px',
    lineHeight: '1.5',
    color: colors.text,
    transition: 'all 0.2s ease',
    width: '100%',
    fontFamily: config.typography?.body?.fontFamily || defaultConfig.typography.body.fontFamily,
    '::placeholder': {
      color: `${colors.textSecondary}${Math.round(parseFloat(formConfig.placeholderOpacity || '0.5') * 255).toString(16).padStart(2, '0')}`,
      opacity: 1
    },
    ...getFocusStyles()
  };
};

// Get shadow styles
export const getShadowStyle = (size = 'medium') => {
  const shadows = {
    none: 'none',
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
    large: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  };
  
  return {
    boxShadow: shadows[size] || shadows.medium
  };
};

// Get spacing styles
export const getSpacingStyle = (config) => (type = 'default') => {
  const spacingMap = {
    container: config.spacing?.containerPadding || defaultConfig.spacing.containerPadding,
    component: config.spacing?.componentGap || defaultConfig.spacing.componentGap,
    section: config.spacing?.sectionGap || defaultConfig.spacing.sectionGap,
    card: config.spacing?.cardPadding || defaultConfig.spacing.cardPadding,
    button: config.spacing?.buttonPadding || defaultConfig.spacing.buttonPadding,
    input: config.spacing?.inputPadding || defaultConfig.spacing.inputPadding
  };
  
  return {
    padding: spacingMap[type] || (config.spacing?.containerPadding || defaultConfig.spacing.containerPadding)
  };
};

export default {
  getButtonStyle,
  getCardStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getTextColorClass,
  getTextColorStyle,
  getBackgroundColorStyle,
  getBorderColorStyle,
  getFocusRingStyle,
  getShadowStyle,
  getSpacingStyle
}; 