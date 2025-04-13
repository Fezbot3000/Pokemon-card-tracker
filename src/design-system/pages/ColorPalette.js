import React from 'react';
import ColorSwatch from '../atoms/ColorSwatch';
import ColorCategory from '../molecules/ColorCategory';
import { baseColors, lightTheme, darkTheme, semanticColors } from '../styles/colors';

/**
 * ColorPalette Component
 * 
 * Displays the application's color palette organized by categories
 * with no color duplications.
 */
const ColorPalette = () => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-8">Color Palette</h1>
      
      {/* Base Colors */}
      <h2 className="text-2xl font-medium mb-6">Base Colors</h2>
      
      <ColorCategory title="Neutrals">
        <ColorSwatch 
          colorValue={baseColors.white} 
          name="White" 
          description="Used for backgrounds in light mode and text in dark mode"
        />
        <ColorSwatch 
          colorValue={baseColors.black} 
          name="Black" 
          description="Used for text in light mode and backgrounds in dark mode"
        />
      </ColorCategory>
      
      <ColorCategory title="Grays">
        <ColorSwatch 
          colorValue={baseColors.gray50} 
          name="Gray 50" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray100} 
          name="Gray 100" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray200} 
          name="Gray 200" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray300} 
          name="Gray 300" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray400} 
          name="Gray 400" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray500} 
          name="Gray 500" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray600} 
          name="Gray 600" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray700} 
          name="Gray 700" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray800} 
          name="Gray 800" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray900} 
          name="Gray 900" 
        />
        <ColorSwatch 
          colorValue={baseColors.gray950} 
          name="Gray 950" 
        />
      </ColorCategory>
      
      <ColorCategory title="Primary Colors">
        <ColorSwatch 
          colorValue={baseColors.primary500} 
          name="Primary 500" 
          description="Default primary color"
        />
        <ColorSwatch 
          colorValue={baseColors.primary600} 
          name="Primary 600" 
          description="Hover state"
        />
        <ColorSwatch 
          colorValue={baseColors.primary300} 
          name="Primary 300" 
          description="Light variant"
        />
        <ColorSwatch 
          colorValue={baseColors.primary700} 
          name="Primary 700" 
          description="Dark variant"
        />
      </ColorCategory>
      
      <ColorCategory title="Status Colors">
        <ColorSwatch 
          colorValue={baseColors.success} 
          name="Success" 
        />
        <ColorSwatch 
          colorValue={baseColors.error} 
          name="Error" 
        />
        <ColorSwatch 
          colorValue={baseColors.warning} 
          name="Warning" 
        />
        <ColorSwatch 
          colorValue={baseColors.info} 
          name="Info" 
        />
      </ColorCategory>
      
      {/* Light Mode Theme */}
      <div className={isDarkMode ? 'opacity-50' : ''}>
        <h2 className="text-2xl font-medium mb-6 mt-12">Light Mode Theme</h2>
        
        <ColorCategory title="Light Background Colors">
          <ColorSwatch 
            colorValue={lightTheme.backgroundPrimary} 
            name="Background Primary" 
            description="Main background color"
          />
          <ColorSwatch 
            colorValue={lightTheme.backgroundSecondary} 
            name="Background Secondary" 
            description="Secondary background color"
          />
          <ColorSwatch 
            colorValue={lightTheme.backgroundTertiary} 
            name="Background Tertiary" 
            description="Tertiary background color"
          />
        </ColorCategory>
        
        <ColorCategory title="Light Text Colors">
          <ColorSwatch 
            colorValue={lightTheme.textPrimary} 
            name="Text Primary" 
            description="Main text color"
          />
          <ColorSwatch 
            colorValue={lightTheme.textSecondary} 
            name="Text Secondary" 
            description="Secondary text color"
          />
          <ColorSwatch 
            colorValue={lightTheme.textTertiary} 
            name="Text Tertiary" 
            description="Tertiary text color"
          />
        </ColorCategory>
      </div>
      
      {/* Dark Mode Theme */}
      <div className={!isDarkMode ? 'opacity-50' : ''}>
        <h2 className="text-2xl font-medium mb-6 mt-12">Dark Mode Theme</h2>
        
        <ColorCategory title="Dark Background Colors">
          <ColorSwatch 
            colorValue={darkTheme.backgroundPrimary} 
            name="Background Primary" 
            description="Main background color"
          />
          <ColorSwatch 
            colorValue={darkTheme.backgroundSecondary} 
            name="Background Secondary" 
            description="Secondary background color"
          />
          <ColorSwatch 
            colorValue={darkTheme.backgroundTertiary} 
            name="Background Tertiary" 
            description="Tertiary background color"
          />
        </ColorCategory>
        
        <ColorCategory title="Dark Text Colors">
          <ColorSwatch 
            colorValue={darkTheme.textPrimary} 
            name="Text Primary" 
            description="Main text color"
          />
          <ColorSwatch 
            colorValue={darkTheme.textSecondary} 
            name="Text Secondary" 
            description="Secondary text color"
          />
          <ColorSwatch 
            colorValue={darkTheme.textTertiary} 
            name="Text Tertiary" 
            description="Tertiary text color"
          />
        </ColorCategory>
      </div>
      
      {/* Semantic Colors */}
      <div className="mt-12">
        <h2 className="text-2xl font-medium mb-6">Semantic Colors</h2>
        
        <ColorCategory title="Primary Brand Colors">
          <ColorSwatch 
            colorValue={semanticColors.primary} 
            name="Primary" 
            description="Main brand color"
          />
          <ColorSwatch 
            colorValue={semanticColors.primaryHover} 
            name="Primary Hover" 
            description="Hover state for primary color"
          />
          <ColorSwatch 
            colorValue={semanticColors.primaryLight} 
            name="Primary Light" 
            description="Light variant of primary color"
          />
          <ColorSwatch 
            colorValue={semanticColors.primaryDark} 
            name="Primary Dark" 
            description="Dark variant of primary color"
          />
        </ColorCategory>
        
        <ColorCategory title="Status Colors">
          <ColorSwatch 
            colorValue={semanticColors.success} 
            name="Success" 
            description="Used for success states and messages"
          />
          <ColorSwatch 
            colorValue={semanticColors.error} 
            name="Error" 
            description="Used for error states and messages"
          />
          <ColorSwatch 
            colorValue={semanticColors.warning} 
            name="Warning" 
            description="Used for warning states and messages"
          />
          <ColorSwatch 
            colorValue={semanticColors.info} 
            name="Info" 
            description="Used for informational states and messages"
          />
        </ColorCategory>
      </div>
    </div>
  );
};

export default ColorPalette;
