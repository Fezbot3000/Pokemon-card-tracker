/**
 * Pokemon Card Tracker Color Palette
 * 
 * This file defines only the colors actually used in the application,
 * with no duplications.
 */

// Base colors definition
export const baseColors = {
  // Primary palette
  primaryDefault: '#ef4444', // Red-500
  primaryHover: '#dc2626', // Red-600
  primaryLight: '#fca5a5', // Red-300
  primaryDark: '#b91c1c', // Red-700

  // Backgrounds - Light mode
  lightBackgroundPrimary: '#ffffff', // White
  lightBackgroundTertiary: '#F3F4F6', // Gray-100

  // Backgrounds - Dark mode
  darkBackgroundPrimary: '#000000', // Black (IMPORTANT: Must be kept as #000000)
  darkBackgroundSecondary: '#0F0F0F', // Custom dark gray
  
  // Text colors - Light mode
  lightTextPrimary: '#111827', // Gray-900
  lightTextSecondary: '#374151', // Gray-700
  lightTextTertiary: '#6B7280', // Gray-500
  
  // Text colors - Dark mode
  darkTextPrimary: '#F9FAFB', // Gray-50 
  darkTextSecondary: '#D1D5DB', // Gray-300
  darkTextTertiary: '#9CA3AF', // Gray-400

  // Status colors
  error: '#ef4444', // Red-500
  success: '#22c55e', // Green-500
  warning: '#f59e0b', // Amber-500
  info: '#3b82f6', // Blue-500
  
  // Form elements
  placeholder: '#9CA3AF', // Gray-400
  placeholderDark: '#6B7280', // Gray-500
  
  // Border colors
  borderLight: '#E5E7EB', // Gray-200
  borderDark: '#374151', // Gray-700
};

// Gradients definitions
export const gradients = {
  primary: 'linear-gradient(to right, #ef4444, #db2777)',
  primaryPosition: '0% 0%'
};

// Light Mode Theme
export const lightTheme = {
  backgroundPrimary: baseColors.lightBackgroundPrimary,
  backgroundTertiary: baseColors.lightBackgroundTertiary,
  textPrimary: baseColors.lightTextPrimary,
  textSecondary: baseColors.lightTextSecondary,
  textTertiary: baseColors.lightTextTertiary,
  border: baseColors.borderLight,
};

// Dark Mode Theme
export const darkTheme = {
  backgroundPrimary: baseColors.darkBackgroundPrimary, // Black (#000000)
  backgroundSecondary: baseColors.darkBackgroundSecondary,
  textPrimary: baseColors.darkTextPrimary,
  textSecondary: baseColors.darkTextSecondary,
  textTertiary: baseColors.darkTextTertiary,
  border: baseColors.borderDark,
};

// Export the complete color palette
export const colorPalette = {
  base: baseColors,
  light: lightTheme,
  dark: darkTheme,
  gradients: gradients
};

// Direct exports for important colors to make them easier to access
export const DARK_BG_PRIMARY = baseColors.darkBackgroundPrimary; // #000000
export const LIGHT_BG_PRIMARY = baseColors.lightBackgroundPrimary; // #ffffff

export default colorPalette;
