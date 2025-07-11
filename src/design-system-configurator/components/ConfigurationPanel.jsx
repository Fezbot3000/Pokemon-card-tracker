import React from 'react';
import { updateConfig, updateNestedConfig } from '../config/configManager';
import { defaultConfig } from '../config/defaultConfig';

/**
 * Configuration panel component that handles all the complex configuration UI
 * Extracted from the main configurator file to reduce its size
 */
const ConfigurationPanel = ({ 
  config, 
  setConfig, 
  isDarkMode, 
  activeSection, 
  colors, 
  primaryStyle, 
  setPrimaryStyle,
  applyColorPreset,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getBorderColorStyle,
  getSurfaceStyle,
  getPrimaryButtonStyle,
  unusedSections,
  showHiddenSettings,
  isTypographyStyleUsed,
  isConfigSectionUsed
}) => {
  const boundUpdateConfig = (section, key, value) => setConfig(prev => updateConfig(prev, section, key, value));
  const boundUpdateNestedConfig = (section, subsection, key, value) => setConfig(prev => updateNestedConfig(prev, section, subsection, key, value));

  const sectionStyles = {
    input: {
      ...getBackgroundColorStyle('surface'),
      ...getTextColorStyle('primary'),
      ...getBorderColorStyle('primary'),
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${colors?.border || defaultConfig.colors.border}`,
      width: '100%'
    },
    label: {
      ...getTextColorStyle('primary'),
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '4px',
      display: 'block'
    },
    colorInput: {
      width: '40px',
      height: '32px',
      borderRadius: '6px',
      border: `1px solid ${colors?.border || defaultConfig.colors.border}`,
      cursor: 'pointer'
    }
  };

  const renderColorsSection = () => (
    <div>
      <h3 className="text-xl font-semibold mb-6" style={getTextColorStyle('primary')}>
        🎨 Color Configuration
      </h3>
      
      {/* Color Presets */}
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Color Presets</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'pokemon-red', name: 'Pokemon Red', colors: [colors?.error || '#e53e3e', colors?.secondary || '#ff6b6b'] },
            { key: 'ocean-blue', name: 'Ocean Blue', colors: [colors?.info || '#0ea5e9', colors?.primary || '#06b6d4'] },
            { key: 'forest-green', name: 'Forest Green', colors: [colors?.success || '#059669', colors?.accent || '#10b981'] },
            { key: 'royal-purple', name: 'Royal Purple', colors: [colors?.primary || '#7c3aed', colors?.secondary || '#a855f7'] }
          ].map(preset => (
            <button
              key={preset.key}
              onClick={() => applyColorPreset(preset.key)}
              className="p-3 rounded-lg border text-left transition-colors"
              style={{
                borderColor: colors?.border || defaultConfig.colors.border,
                backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary
              }}
            >
              <div className="flex items-center space-x-2 mb-2">
                {preset.colors.map(color => (
                  <div
                    key={color}
                    className="size-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="text-sm font-medium" style={getTextColorStyle('primary')}>
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Primary CTA Style Toggle */}
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Primary CTA Style</h4>
        <div className="flex rounded-lg border p-1" style={{ borderColor: colors?.border || defaultConfig.colors.border, backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary }}>
          <button
            onClick={() => setPrimaryStyle('solid')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200`}
            style={primaryStyle === 'solid' ? 
              { ...getPrimaryButtonStyle() } : 
              { ...getTextColorStyle('secondary'), ...getBackgroundColorStyle('surface') }
            }
          >
            Solid Color
          </button>
          <button
            onClick={() => setPrimaryStyle('gradient')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200`}
            style={primaryStyle === 'gradient' ? 
              { ...getPrimaryButtonStyle() } : 
              { ...getTextColorStyle('secondary'), ...getBackgroundColorStyle('surface') }
            }
          >
            Gradient
          </button>
        </div>
      </div>

      {/* Primary Color Configuration */}
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Primary Color</h4>
        <div className="flex items-center space-x-3">
          <input
            type="color"
            value={colors?.primary || defaultConfig.colors.primary}
            onChange={(e) => isDarkMode ? 
              boundUpdateNestedConfig('theme', 'darkColors', 'primary', e.target.value) : 
              boundUpdateConfig('colors', 'primary', e.target.value)
            }
            style={sectionStyles.colorInput}
          />
          <label style={sectionStyles.label} className="flex-1">
            Primary Color
          </label>
          <input
            type="text"
            value={colors?.primary || defaultConfig.colors.primary}
            onChange={(e) => isDarkMode ? 
              boundUpdateNestedConfig('theme', 'darkColors', 'primary', e.target.value) : 
              boundUpdateConfig('colors', 'primary', e.target.value)
            }
            style={{...sectionStyles.input, width: '80px', fontSize: '12px'}}
          />
        </div>
      </div>

      {/* Background Colors */}
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Background Colors</h4>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={colors?.background || defaultConfig.colors.background}
              onChange={(e) => isDarkMode ? 
                boundUpdateNestedConfig('theme', 'darkColors', 'background', e.target.value) : 
                boundUpdateConfig('colors', 'background', e.target.value)
              }
              style={sectionStyles.colorInput}
            />
            <label style={sectionStyles.label} className="flex-1">Background</label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={colors?.surface || defaultConfig.colors.surface}
              onChange={(e) => isDarkMode ? 
                boundUpdateNestedConfig('theme', 'darkColors', 'surface', e.target.value) : 
                boundUpdateConfig('colors', 'surface', e.target.value)
              }
              style={sectionStyles.colorInput}
            />
            <label style={sectionStyles.label} className="flex-1">Surface</label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTypographySection = () => (
    <div>
      <h3 className="text-xl font-semibold mb-6" style={getTextColorStyle('primary')}>
        📝 Typography Configuration
      </h3>
      
      {Object.entries(config.typography || defaultConfig.typography).map(([styleName, styleProps]) => (
        <div key={styleName} className="mb-6">
          <h4 className="font-medium mb-3 capitalize" style={getTextColorStyle('primary')}>
            {styleName} Style
            {!isTypographyStyleUsed(styleName) && (
              <span className="ml-2 px-2 py-1 text-xs rounded" style={{
                backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary,
                color: colors?.textSecondary || defaultConfig.colors.textSecondary
              }}>
                UNUSED
              </span>
            )}
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={sectionStyles.label}>Font Family</label>
              <input
                type="text"
                value={styleProps.fontFamily || ''}
                onChange={(e) => boundUpdateNestedConfig('typography', styleName, 'fontFamily', e.target.value)}
                style={sectionStyles.input}
              />
            </div>
            <div>
              <label style={sectionStyles.label}>Font Size</label>
              <input
                type="text"
                value={styleProps.fontSize || ''}
                onChange={(e) => boundUpdateNestedConfig('typography', styleName, 'fontSize', e.target.value)}
                style={sectionStyles.input}
              />
            </div>
            <div>
              <label style={sectionStyles.label}>Font Weight</label>
              <select
                value={styleProps.fontWeight || '400'}
                onChange={(e) => boundUpdateNestedConfig('typography', styleName, 'fontWeight', e.target.value)}
                style={sectionStyles.input}
              >
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semi Bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="800">Extra Bold (800)</option>
              </select>
            </div>
            <div>
              <label style={sectionStyles.label}>Line Height</label>
              <input
                type="text"
                value={styleProps.lineHeight || ''}
                onChange={(e) => boundUpdateNestedConfig('typography', styleName, 'lineHeight', e.target.value)}
                style={sectionStyles.input}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderComponentsSection = () => (
    <div>
      <h3 className="text-xl font-semibold mb-6" style={getTextColorStyle('primary')}>
        🧩 Component Configuration
      </h3>
      
      {/* Button Configuration */}
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Button Components</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={sectionStyles.label}>Corner Radius</label>
            <input
              type="text"
              value={config.components?.buttons?.cornerRadius || '8px'}
              onChange={(e) => boundUpdateNestedConfig('components', 'buttons', 'cornerRadius', e.target.value)}
              style={sectionStyles.input}
            />
          </div>
          <div>
            <label style={sectionStyles.label}>Border Width</label>
            <input
              type="text"
              value={config.components?.buttons?.borderWidth || '0.5px'}
              onChange={(e) => boundUpdateNestedConfig('components', 'buttons', 'borderWidth', e.target.value)}
              style={sectionStyles.input}
            />
          </div>
        </div>
      </div>

      {/* Card Configuration */}
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Card Components</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={sectionStyles.label}>Corner Radius</label>
            <input
              type="text"
              value={config.components?.cards?.cornerRadius || '8px'}
              onChange={(e) => boundUpdateNestedConfig('components', 'cards', 'cornerRadius', e.target.value)}
              style={sectionStyles.input}
            />
          </div>
          <div>
            <label style={sectionStyles.label}>Border Width</label>
            <input
              type="text"
              value={config.components?.cards?.borderWidth || '0.5px'}
              onChange={(e) => boundUpdateNestedConfig('components', 'cards', 'borderWidth', e.target.value)}
              style={sectionStyles.input}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderThemeSection = () => (
    <div>
      <h3 className="text-xl font-semibold mb-6" style={getTextColorStyle('primary')}>
        🌙 Theme Configuration
      </h3>
      
      <div className="mb-8">
        <h4 className="font-medium mb-3" style={getTextColorStyle('primary')}>Dark Mode Colors</h4>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={config.theme?.darkColors?.primary || defaultConfig.theme.darkColors.primary}
              onChange={(e) => boundUpdateNestedConfig('theme', 'darkColors', 'primary', e.target.value)}
              style={sectionStyles.colorInput}
            />
            <label style={sectionStyles.label} className="flex-1">Primary (Dark)</label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={config.theme?.darkColors?.background || defaultConfig.theme.darkColors.background}
              onChange={(e) => boundUpdateNestedConfig('theme', 'darkColors', 'background', e.target.value)}
              style={sectionStyles.colorInput}
            />
            <label style={sectionStyles.label} className="flex-1">Background (Dark)</label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={config.theme?.darkColors?.surface || defaultConfig.theme.darkColors.surface}
              onChange={(e) => boundUpdateNestedConfig('theme', 'darkColors', 'surface', e.target.value)}
              style={sectionStyles.colorInput}
            />
            <label style={sectionStyles.label} className="flex-1">Surface (Dark)</label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHiddenSection = () => (
    <div>
      <h3 className="text-xl font-semibold mb-6" style={getTextColorStyle('primary')}>
        👁️‍🗨️ Hidden Sections
      </h3>
      
      <div className="space-y-4">
        {unusedSections.map(section => (
          <div key={section.id} className="p-4 rounded-lg border" style={{
            borderColor: colors?.border || defaultConfig.colors.border,
            backgroundColor: colors?.surfaceSecondary || defaultConfig.colors.surfaceSecondary
          }}>
            <div className="flex items-center justify-between">
              <h4 className="font-medium" style={getTextColorStyle('primary')}>
                {section.icon} {section.label}
              </h4>
              <div className="px-2 py-1 rounded text-xs" style={{
                backgroundColor: colors?.surface || defaultConfig.colors.surface,
                color: colors?.textSecondary || defaultConfig.colors.textSecondary
              }}>
                HIDDEN
              </div>
            </div>
            <p className="text-sm mt-2" style={getTextColorStyle('secondary')}>
              This section is hidden because it's not used by any components in the configurator preview.
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // Main render switch
  switch (activeSection) {
    case 'colors':
      return renderColorsSection();
    case 'typography':
      return renderTypographySection();
    case 'components':
      return renderComponentsSection();
    case 'theme':
      return renderThemeSection();
    case 'hidden':
      return renderHiddenSection();
    default:
      return (
        <div>
          <h3 className="text-xl font-semibold mb-6" style={getTextColorStyle('primary')}>
            Configuration
          </h3>
          <p style={getTextColorStyle('secondary')}>
            Select a configuration section from the dropdown above to customize your design system.
          </p>
        </div>
      );
  }
};

export default ConfigurationPanel; 