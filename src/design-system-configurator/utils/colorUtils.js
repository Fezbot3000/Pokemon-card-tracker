// Get color for profit/loss values
export const getValueColor = (value) => {
  if (value > 0) return '#22c55e'; // Green for profit
  if (value < 0) return '#ef4444'; // Red for loss
  return '#6b7280'; // Gray for zero
};

// Get color for grading company and grade
export const getGradingCompanyColor = (company, grade, colors) => {
  if (!company) return colors?.textSecondary || '#6b7280';
  
  const gradeNum = parseFloat(grade);
  
  switch (company.toUpperCase()) {
    case 'PSA':
      if (gradeNum === 10) return colors?.warning || '#f59e0b'; // PSA 10 special color
      if (gradeNum >= 8) return colors?.success || '#22c55e'; // PSA 9 & 8 
      if (gradeNum >= 7) return colors?.success || '#22c55e'; // PSA 7 still success
      return colors?.error || '#ef4444'; // PSA below 7
    case 'BGS':
    case 'BECKETT':
      return colors?.info || '#0ea5e9'; // BGS uses info color
    case 'SGC':
      return colors?.info || '#0ea5e9'; // SGC uses info color
    case 'CGC':
      return colors?.secondary || '#6b7280'; // CGC uses secondary color
    case 'CSG':
      return colors?.secondary || '#6b7280'; // CSG uses secondary color
    default:
      return colors?.textSecondary || '#6b7280';
  }
};

// Get color for statistics labels and values
export const getStatColor = (label, value, isIcon = false) => {
  const upperLabel = label.toUpperCase();
  
  if (upperLabel.includes('PROFIT') || upperLabel.includes('GAIN')) {
    return value > 0 ? '#22c55e' : '#ef4444';
  }
  
  if (upperLabel.includes('LOSS') || upperLabel.includes('DEFICIT')) {
    return value > 0 ? '#ef4444' : '#22c55e';
  }
  
  if (upperLabel.includes('VALUE') || upperLabel.includes('WORTH')) {
    return isIcon ? '#0ea5e9' : '#111827';
  }
  
  if (upperLabel.includes('PAID') || upperLabel.includes('COST')) {
    return isIcon ? '#f59e0b' : '#111827';
  }
  
  if (upperLabel.includes('CARDS') || upperLabel.includes('COUNT')) {
    return isIcon ? '#8b5cf6' : '#111827';
  }
  
  return '#6b7280'; // Default gray
};

// Convert hex to RGB
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Convert RGB to hex
export const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Get contrast color (black or white) for a given background color
export const getContrastColor = (backgroundColor) => {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// Lighten or darken a color by a percentage
export const adjustColor = (color, percent) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const adjust = (c) => {
    const adjusted = Math.round(c * (1 + percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };
  
  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
};

// Generate gradient string from config
export const getGradientString = (gradient) => {
  if (!gradient || !gradient.from || !gradient.to) return null;
  
  const direction = gradient.direction || '135deg';
  return `linear-gradient(${direction}, ${gradient.from}, ${gradient.to})`;
};

// Color palette presets
export const colorPresets = {
  blue: {
    primary: '#0ea5e9',
    secondary: '#000000',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9'
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#000000',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#8b5cf6'
  },
  green: {
    primary: '#10b981',
    secondary: '#000000',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#10b981'
  },
  orange: {
    primary: '#f59e0b',
    secondary: '#000000',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#f59e0b'
  },
  red: {
    primary: '#ef4444',
    secondary: '#000000',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#ef4444'
  },
  gray: {
    primary: '#6b7280',
    secondary: '#000000',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6b7280'
  }
};

export default {
  getValueColor,
  getGradingCompanyColor,
  getStatColor,
  hexToRgb,
  rgbToHex,
  getContrastColor,
  adjustColor,
  getGradientString,
  colorPresets
}; 