import { useState, useEffect } from 'react';
import { applyCustomColors, createColorMap } from '../utils/colorUtils';
import {
  baseColors,
  lightTheme,
  darkTheme,
} from '../../design-system/styles/colors';

/**
 * Custom hook for managing color customization in Component Library
 * 
 * @returns {Object} Color customization state and handlers
 */
export const useColorCustomizer = () => {
  const [customColors, setCustomColors] = useState({});
  const [colorMap, setColorMap] = useState({});

  // Initialize color map
  useEffect(() => {
    const map = createColorMap(baseColors, lightTheme, darkTheme);
    setColorMap(map);
  }, []);

  // Apply custom colors to CSS custom properties
  useEffect(() => {
    applyCustomColors(customColors);
  }, [customColors]);

  /**
   * Save a custom color value
   * 
   * @param {string} variable - CSS variable name
   * @param {string} value - Color value
   */
  const handleSaveColor = (variable, value) => {
    setCustomColors(prev => ({
      ...prev,
      [variable]: value,
    }));
  };

  /**
   * Reset all custom colors
   */
  const resetColors = () => {
    setCustomColors({});
  };

  /**
   * Get current color value for a variable
   * 
   * @param {string} variable - CSS variable name
   * @returns {string} Current color value
   */
  const getColorValue = (variable) => {
    return customColors[variable] || colorMap[variable] || '#000000';
  };

  /**
   * Check if a color has been customized
   * 
   * @param {string} variable - CSS variable name
   * @returns {boolean} Whether the color has been customized
   */
  const isColorCustomized = (variable) => {
    return customColors.hasOwnProperty(variable);
  };

  return {
    customColors,
    colorMap,
    handleSaveColor,
    resetColors,
    getColorValue,
    isColorCustomized,
  };
}; 