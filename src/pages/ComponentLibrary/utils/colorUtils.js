/**
 * Color Utilities for Component Library
 * 
 * This file contains utility functions for color manipulation and conversion
 * used throughout the Component Library.
 */

/**
 * Converts RGB color string to hexadecimal format
 * 
 * @param {string} rgb - RGB color string (e.g., "rgb(255, 255, 255)")
 * @returns {string} Hexadecimal color string (e.g., "#FFFFFF")
 */
export const rgbToHex = (rgb) => {
  // Handle non-string inputs
  if (!rgb || typeof rgb !== 'string') return '#000000';

  // If it's already a hex color, return it
  if (rgb.startsWith('#')) return rgb;

  // Extract the RGB values
  const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);

    // Convert to hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  // If the format is not recognized, return a default color
  return '#000000';
};

/**
 * Creates a flattened color map for the color customizer
 * 
 * @param {Object} baseColors - Base color definitions
 * @param {Object} lightTheme - Light theme colors
 * @param {Object} darkTheme - Dark theme colors
 * @returns {Object} Flattened color map
 */
export const createColorMap = (baseColors, lightTheme, darkTheme) => ({
  // Primary colors
  Primary: rgbToHex(baseColors.primaryDefault || ''),
  'Primary Hover': rgbToHex(baseColors.primaryHover || ''),
  'Primary Light': rgbToHex(baseColors.primaryLight || ''),
  'Primary Dark': rgbToHex(baseColors.primaryDark || ''),

  // Light mode colors
  'Light Background Primary': rgbToHex(lightTheme.backgroundPrimary || ''),
  'Light Text Secondary': rgbToHex(lightTheme.textSecondary || ''),
  'Light Background Tertiary': rgbToHex(lightTheme.backgroundTertiary || ''),
  'Light Text Tertiary': rgbToHex(lightTheme.textTertiary || ''),

  // Dark mode colors
  'Dark Background Primary': rgbToHex(darkTheme.backgroundPrimary || ''),
  'Dark Background Secondary': rgbToHex(darkTheme.backgroundSecondary || ''),
  'Dark Text Secondary': rgbToHex(darkTheme.textSecondary || ''),
  'Dark Text Tertiary': rgbToHex(darkTheme.textTertiary || ''),
});

/**
 * Applies custom colors to CSS custom properties
 * 
 * @param {Object} customColors - Object with color variable names and values
 */
export const applyCustomColors = (customColors) => {
  Object.entries(customColors).forEach(([variable, value]) => {
    document.documentElement.style.setProperty(`--${variable}`, value);
  });
};

/**
 * Resets custom colors to default values
 * 
 * @param {Object} defaultColors - Default color values
 */
export const resetCustomColors = (defaultColors) => {
  Object.entries(defaultColors).forEach(([variable, value]) => {
    document.documentElement.style.setProperty(`--${variable}`, value);
  });
}; 