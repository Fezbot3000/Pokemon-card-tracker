export const defaultConfig = {
  colors: {
    // Primary color - either gradient or solid
    primary: '#0ea5e9',
    
    // Secondary color - outline style (text only and outline buttons)
    secondary: '#000000',
    secondaryHover: '#000000',
    
    // Semantic colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
    
    // Pill/Tag colors
    pillPrimary: '#ef4444',
    pillSecondary: '#f59e0b',
    pillSuccess: '#10b981',
    pillInfo: '#0ea5e9',
    
    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#fafcff', 
    surface: '#ffffff',
    surfaceSecondary: '#ffffff',
    surfaceTertiary: '#2052b6',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb'
  },
  gradients: {
    primary: {
      from: '#185cfb',
      to: '#9307d5',
      direction: '135deg'
    },
    secondary: {
      from: '#6b7280',
      to: '#9ca3af',
      direction: '135deg'
    }
  },
  typography: {
    // Display Typography (Large headers, hero text)
    display: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '48px',
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
      textTransform: 'none'
    },
    // Heading Typography (H1, H2, H3, etc.)
    heading: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '24px',
      fontWeight: '600',
      lineHeight: '1.2',
      letterSpacing: '-0.01em',
      textTransform: 'none'
    },
    // Subheading Typography (Smaller headers, section titles)
    subheading: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px',
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Body Typography (Main content, paragraphs)
    body: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Small Body Typography (Secondary text, descriptions)
    bodySmall: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '1.4',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Caption Typography (Very small text, footnotes)
    caption: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
      fontWeight: '400',
      lineHeight: '1.3',
      letterSpacing: '0.01em',
      textTransform: 'none'
    },
    // Label Typography (Form labels, small headers)
    label: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.2',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Button Typography (Button text, CTAs)
    button: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.2',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Card Typography (Text within cards)
    card: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      fontWeight: '400',
      lineHeight: '1.4',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Banner Typography (Alert text, notifications)
    banner: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.3',
      letterSpacing: '0em',
      textTransform: 'none'
    },
    // Link Typography (Hyperlinks, navigation links)
    link: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0em',
      textTransform: 'none',
      color: '#3b82f6',
      hoverColor: '#2563eb',
      decoration: 'underline'
    },
    // Financial Typography (Numbers, currency, values)
    financial: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      fontWeight: '600',
      lineHeight: '1.2',
      letterSpacing: '0em',
      textTransform: 'none'
    }
  },
  spacing: {
    unit: '8px',
    scale: '1.5',
    containerPadding: '24px',
    containerMargin: '16px',
    componentGap: '16px',
    sectionGap: '32px',
    cardPadding: '16px',
    cardMargin: '8px',
    buttonPadding: '12px',
    buttonMargin: '4px',
    inputPadding: '12px',
    inputMargin: '8px'
  },
  components: {
    buttons: {
      style: 'gradient',
      size: 'medium',
      corners: 'rounded',
      primaryStyle: 'gradient', // 'gradient' or 'solid'
      cornerRadius: '8px',
      shadow: 'medium',
      border: 'none',
      borderWidth: '0.5px',
      hoverEffect: 'lift',
      focusRing: true,
      focusRingColor: '#3b82f6',
      focusRingWidth: '2px',
      transition: 'all'
    },
    forms: {
      inputStyle: 'bordered',
      labelPosition: 'top',
      validation: 'inline',
      inputCorners: 'rounded',
      inputCornerRadius: '6px',
      inputShadow: 'sm',
      inputBorder: 'solid',
      inputBorderWidth: '0.5px',
      focusStyle: 'ring',
      placeholderOpacity: '0.5'
    },
    cards: {
      style: 'flat',
      padding: 'compact',
      corners: 'rounded',
      cornerRadius: '8px',
      shadow: 'small',
      border: 'none',
      borderWidth: '0.5px',
      hoverEffect: 'glow',
      backgroundOpacity: '1',
      dividers: true,
      dividerStyle: 'solid',
      imageRadius: '8px',
      spacing: 'comfortable',
      headerPadding: '16px',
      contentPadding: '16px',
      footerPadding: '16px',
      transition: 'all'
    },
    modals: {
      backdrop: 'blur',
      animation: 'scale',
      position: 'center',
      corners: 'rounded',
      cornerRadius: '16px',
      shadow: 'xl',
      border: 'none',
      maxWidth: '500px',
      padding: '24px'
    }
  },
  tables: {
    data: {
      style: 'bordered',
      headerStyle: 'elevated',
      density: 'comfortable',
      hoverEffects: true,
      corners: 'rounded',
      cornerRadius: '8px',
      shadow: 'sm',
      border: 'solid',
      borderWidth: '0.5px',
      stripedRows: false,
      headerSticky: true,
      sortable: true,
      cellPadding: '12px',
      headerPadding: '16px',
      fontSize: '14px',
      headerFontWeight: '600',
      dividerStyle: 'solid',
      dividerWidth: '0.5px'
    }
  },
  navigation: {
    style: 'sidebar',
    iconPosition: 'left',
    activeIndicator: 'background',
    corners: 'rounded',
    cornerRadius: '8px',
    spacing: '4px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    hoverEffect: 'background',
    shadow: 'none',
    border: 'none',
    borderWidth: '0.5px',
    dividers: true,
    dividerStyle: 'solid'
  },
  status: {
    badges: {
      style: 'solid',
      shape: 'rounded',
      size: 'medium',
      cornerRadius: '4px',
      shadow: 'none',
      border: 'none',
      borderWidth: '0.5px',
      fontSize: '12px',
      fontWeight: '500',
      padding: '4px 8px',
      margin: '2px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }
  },
  financial: {
    showCurrency: false,
    currencySymbol: 'A$',
    currencyPosition: 'prefix',
    alignment: 'right',
    decimalPlaces: 2,
    thousandSeparator: ',',
    decimalSeparator: '.',
    showPlusSign: false,
    showZeroValues: true,
    currencySpacing: true,
    positiveColor: '#22c55e',
    negativeColor: '#ef4444',
    zeroColor: '#6b7280',
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '0px',
    textTransform: 'none'
  },
  icons: {
    style: 'outline',
    size: 'medium',
    strokeWidth: 1.5,
    cornerRadius: '0px',
    padding: '0px',
    margin: '0px',
    backgroundColor: 'transparent',
    hoverEffect: 'none',
    shadow: 'none',
    border: 'none',
    borderWidth: '0px',
    opacity: '1',
    spacing: '8px'
  },
  theme: {
    mode: 'light',
    darkColors: {
      // Primary color - either gradient or solid
      primary: '#0ea5e9',
      
      // Secondary color - outline style (text only and outline buttons)
      secondary: '#ffffff',
      secondaryHover: '#f3f4f6',
      
      // Semantic colors
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0ea5e9',
      
      // Pill/Tag colors
      pillPrimary: '#ef4444',
      pillSecondary: '#f59e0b',
      pillSuccess: '#10b981',
      pillInfo: '#0ea5e9',
      
      // Background colors
      background: '#000000',
      backgroundSecondary: '#000000',
      surface: '#000000', 
      surfaceSecondary: '#000000',
      surfaceTertiary: '#0f0f0f',
      text: '#f9fafb',
      textSecondary: '#6b7280',
      border: '#374151'
    },
    darkGradients: {
      primary: {
        from: '#185cfb',
        to: '#9307d5',
        direction: '135deg'
      },
      secondary: {
        from: '#6b7280',
        to: '#9ca3af',
        direction: '135deg'
      }
    }
  }
};

// Default components configuration - show key components by default
export const defaultComponents = [
  {
    id: 'statistics-default',
    type: 'statistics'
  },
  {
    id: 'search-bar-default', 
    type: 'search-bar'
  },
  {
    id: 'collection-selector-default',
    type: 'collection-selector'
  },
  {
    id: 'card-list-default',
    type: 'card-list'
  }
];

export default defaultConfig; 