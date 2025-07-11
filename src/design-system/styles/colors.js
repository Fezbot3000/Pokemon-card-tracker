/**
 * Pokemon Card Tracker Color Palette
 *
 * This file defines only the colors actually used in the application,
 * with no duplications.
 */

// Base colors definition
export const baseColors = {
  // Primary palette
  primaryDefault: '#0ea5e9', // Sky-500 (Ocean Blue)
  primaryHover: '#0284c7', // Sky-600
  primaryLight: '#7dd3fc', // Sky-300
  primaryDark: '#0369a1', // Sky-700

  // Secondary palette
  secondary: '#000000', // Black
  secondaryHover: '#000000', // Black

  // Backgrounds - Light mode
  lightBackgroundPrimary: '#ffffff', // White
  lightBackgroundSecondary: '#fafcff', // Very light blue/gray
  lightBackgroundTertiary: '#f3f4f6', // Gray-100

  // Backgrounds - Dark mode
  darkBackgroundPrimary: '#000000', // Black
  darkBackgroundSecondary: '#000000', // Black
  darkBackgroundTertiary: '#0f0f0f', // Dark gray

  // Text colors - Light mode
  lightTextPrimary: '#111827', // Dark gray/black
  lightTextSecondary: '#6b7280', // Gray
  lightTextTertiary: '#6b7280', // Gray

  // Text colors - Dark mode
  darkTextPrimary: '#f9fafb', // Light gray
  darkTextSecondary: '#6b7280', // Gray-500
  darkTextTertiary: '#6b7280', // Gray-500

  // Dark mode specific colors
  darkSecondary: '#ffffff', // White
  darkSecondaryHover: '#f3f4f6', // Light gray
  darkSurface: '#000000', // Black
  darkSurfaceSecondary: '#000000', // Black
  darkSurfaceTertiary: '#0f0f0f', // Dark gray
  darkPrimaryCtaText: '#000000', // Black
  darkBorder: '#374151', // Gray-700

  // Status colors
  error: '#ef4444', // Red-500
  success: '#10b981', // Emerald-500
  warning: '#f59e0b', // Amber-500
  info: '#0ea5e9', // Sky-500 (Ocean Blue)

  // Pill colors
  pillPrimary: '#ef4444', // Red-500
  pillSecondary: '#f59e0b', // Amber-500
  pillSuccess: '#10b981', // Emerald-500
  pillInfo: '#0ea5e9', // Sky-500

  // CTA colors
  primaryCtaText: '#ffffff', // White

  // Surface colors - Light mode
  surface: '#ffffff', // White
  surfaceSecondary: '#ffffff', // White
  surfaceTertiary: '#2052b6', // Blue

  // Form elements
  placeholder: '#9CA3AF', // Gray-400
  placeholderDark: '#6B7280', // Gray-500

  // Border colors
  borderLight: '#e5e7eb', // Light gray
  borderDark: '#374151', // Gray-700
};

// Gradients definitions
export const gradients = {
  primary: 'linear-gradient(to right, #0ea5e9, #06b6d4)',
  primaryPosition: '0% 0%',
};

// Light Mode Theme - Updated with new default colors
export const lightTheme = {
  backgroundPrimary: baseColors.lightBackgroundPrimary,
  backgroundSecondary: baseColors.lightBackgroundSecondary,
  backgroundTertiary: baseColors.lightBackgroundTertiary,
  textPrimary: baseColors.lightTextPrimary,
  textSecondary: baseColors.lightTextSecondary,
  textTertiary: baseColors.lightTextTertiary,
  border: baseColors.borderLight,
  secondary: baseColors.secondary,
  secondaryHover: baseColors.secondaryHover,
  success: baseColors.success,
  warning: baseColors.warning,
  error: baseColors.error,
  info: baseColors.info,
  pillPrimary: baseColors.pillPrimary,
  pillSecondary: baseColors.pillSecondary,
  pillSuccess: baseColors.pillSuccess,
  pillInfo: baseColors.pillInfo,
  primaryCtaText: baseColors.primaryCtaText,
  surface: baseColors.surface,
  surfaceSecondary: baseColors.surfaceSecondary,
  surfaceTertiary: baseColors.surfaceTertiary,
};

// Dark Mode Theme - Updated with new default colors
export const darkTheme = {
  backgroundPrimary: baseColors.darkBackgroundPrimary,
  backgroundSecondary: baseColors.darkBackgroundSecondary,
  backgroundTertiary: baseColors.darkBackgroundTertiary,
  textPrimary: baseColors.darkTextPrimary,
  textSecondary: baseColors.darkTextSecondary,
  textTertiary: baseColors.darkTextTertiary,
  border: baseColors.darkBorder,
  secondary: baseColors.darkSecondary,
  secondaryHover: baseColors.darkSecondaryHover,
  success: baseColors.success,
  warning: baseColors.warning,
  error: baseColors.error,
  info: baseColors.info,
  pillPrimary: baseColors.pillPrimary,
  pillSecondary: baseColors.pillSecondary,
  pillSuccess: baseColors.pillSuccess,
  pillInfo: baseColors.pillInfo,
  primaryCtaText: baseColors.darkPrimaryCtaText,
  surface: baseColors.darkSurface,
  surfaceSecondary: baseColors.darkSurfaceSecondary,
  surfaceTertiary: baseColors.darkSurfaceTertiary,
};

// Export the complete color palette
export const colorPalette = {
  base: baseColors,
  light: lightTheme,
  dark: darkTheme,
  gradients: gradients,
};

// Direct exports for important colors to make them easier to access
export const DARK_BG_PRIMARY = baseColors.darkBackgroundPrimary; // #000000
export const LIGHT_BG_PRIMARY = baseColors.lightBackgroundPrimary; // #ffffff

export default colorPalette;
