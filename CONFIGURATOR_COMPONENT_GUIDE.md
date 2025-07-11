# Design System Configurator Component Guide

## Overview
This guide provides a comprehensive framework for building components within the design system configurator. It ensures consistency, proper integration with live data, and adherence to the established design patterns.

## 🎯 Core Principles

### 1. **Live Data Integration**
- **NEVER use dummy data** - Always integrate with real data sources
- Use the `useCards` hook from `CardContext` for card-related data
- Handle loading states and errors gracefully
- Provide fallbacks when real data is unavailable

### 2. **Configuration-Driven Styling**
- All styling must be derived from the configuration object
- Use the provided utility functions for consistent styling
- Support both light and dark modes
- Respect user customizations (colors, typography, spacing)

### 3. **Component Composability**
- Build components that can be easily composed and reused
- Accept standardized props for styling and behavior
- Support responsive design patterns

## 📋 Component Structure Checklist

### ✅ Required Imports
```javascript
import React, { useState, useEffect, useRef } from 'react';
// Utility functions - ALWAYS import these for consistent styling
import { formatCurrency } from '../utils/formatters';
import { getGradingCompanyColor, getValueColor } from '../utils/colorUtils';
// Configuration utilities
import { getTypographyStyle } from '../config/configManager';
import { getSurfaceStyle, getInteractiveStyle, getTextColorStyle, getBackgroundColorStyle } from '../utils/styleUtils';
```

### ✅ Standard Props Interface
Every configurator component MUST accept these props:
```javascript
const YourComponent = ({ 
  // Data and configuration
  data,                    // Component-specific data
  config,                  // Design system configuration
  isDarkMode,              // Theme state
  
  // Real data sources (when applicable)
  realCards,               // Live card data
  cardsLoading,            // Loading state
  selectedCollection,      // Current collection
  setSelectedCollection,   // Collection setter
  collections,             // Available collections
  
  // Styling utility functions
  getTypographyStyle,      // Typography styles
  getTextColorStyle,       // Text color utilities
  getBackgroundColorStyle, // Background color utilities
  getSurfaceStyle,         // Surface styling
  getInteractiveStyle,     // Interactive element styling
  getPrimaryButtonStyle,   // Primary button styling
  
  // Theme-specific
  primaryStyle,            // Primary style variant
  colors                   // Current color palette
}) => {
```

### ✅ State Management Pattern
```javascript
// 1. Component-specific state
const [localState, setLocalState] = useState(initialValue);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

// 2. UI state for interactions
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const [selectedItems, setSelectedItems] = useState(new Set());
const [hoveredItem, setHoveredItem] = useState(null);

// 3. Responsive state
const [isMobileView, setIsMobileView] = useState(false);
const dropdownRef = useRef(null);
```

### ✅ Data Processing Pattern
```javascript
// Always prioritize real data over fallback data
const useRealData = realCards && realCards.length > 0 && !cardsLoading;
const processedData = useRealData ? 
  realCards.map(item => ({
    // Transform real data to component format
    id: item.id || item.slabSerial || `item-${Math.random()}`,
    name: item.name || item.cardName || 'Unknown Item',
    // ... other transformations
  })) : 
  data.fallbackData || [];

// Handle empty states
if (processedData.length === 0 && !cardsLoading) {
  return <EmptyState />;
}
```

## 🎨 Styling Guidelines

### 1. **Color Usage**
```javascript
// ✅ CORRECT: Use colors from the configuration
const getItemStyle = () => ({
  backgroundColor: colors.surface,
  color: colors.text,
  borderColor: colors.border
});

// ❌ INCORRECT: Hard-coded colors
const getItemStyle = () => ({
  backgroundColor: '#ffffff',
  color: '#000000'
});
```

### 2. **Typography Application**
```javascript
// ✅ CORRECT: Use typography utilities
<div style={{
  ...getTypographyStyle('body'),
  ...getTextColorStyle('primary')
}}>
  Content
</div>

// ❌ INCORRECT: Hard-coded typography
<div style={{
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333'
}}>
  Content
</div>
```

### 3. **Surface and Interactive Styles**
```javascript
// ✅ CORRECT: Use surface utilities
<div style={{
  ...getSurfaceStyle('primary'),
  ...getInteractiveStyle('default')
}}>
  
// ✅ CORRECT: Consistent button styling
<button style={{
  ...getPrimaryButtonStyle(),
  ...getTypographyStyle('button')
}}>
```

### 4. **Responsive Design**
```javascript
// Handle responsive behavior
useEffect(() => {
  const checkMobileView = () => {
    setIsMobileView(window.innerWidth < 640);
  };
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
  return () => window.removeEventListener('resize', checkMobileView);
}, []);
```

## 🔧 Component Implementation Steps

### Step 1: Component Planning
1. Define the component's purpose and data requirements
2. Identify which real data sources it needs
3. Plan the state management approach
4. Design the props interface

### Step 2: Data Integration
1. Connect to real data sources (useCards, etc.)
2. Implement data transformation logic
3. Handle loading and error states
4. Provide meaningful fallbacks

### Step 3: Styling Implementation
1. Use configuration-driven styling
2. Apply typography utilities consistently
3. Implement interactive states (hover, focus, active)
4. Test both light and dark modes

### Step 4: Interaction Handling
1. Implement proper event handlers
2. Handle keyboard navigation
3. Manage focus states
4. Add accessibility attributes

### Step 5: Performance Optimization
1. Implement proper memoization
2. Optimize re-renders
3. Handle large datasets efficiently
4. Add loading states for async operations

## 📝 Code Examples

### Complete Component Template
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../utils/formatters';
import { getGradingCompanyColor } from '../utils/colorUtils';

const ExampleComponent = ({ 
  data, 
  config, 
  isDarkMode, 
  realCards, 
  cardsLoading,
  selectedCollection,
  setSelectedCollection,
  collections,
  getTypographyStyle,
  getTextColorStyle,
  getBackgroundColorStyle,
  getSurfaceStyle,
  getInteractiveStyle,
  getPrimaryButtonStyle,
  primaryStyle,
  colors
}) => {
  // State management
  const [localState, setLocalState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const componentRef = useRef(null);

  // Data processing
  const useRealData = realCards && realCards.length > 0 && !cardsLoading;
  const processedData = useRealData ? 
    realCards.map(item => ({
      id: item.id || `item-${Math.random()}`,
      name: item.name || 'Unknown Item',
      value: item.currentValueAUD || 0,
      // ... other transformations
    })) : 
    data.fallbackData || [];

  // Responsive handling
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Event handlers
  const handleItemClick = (item) => {
    // Handle interaction
  };

  // Styling functions
  const getItemStyle = (item) => ({
    ...getSurfaceStyle('primary'),
    ...getInteractiveStyle('default'),
    borderColor: colors.border,
    borderWidth: config.components?.cards?.borderWidth || '0.5px',
    borderStyle: 'solid',
    borderRadius: config.components?.cards?.cornerRadius || '8px'
  });

  // Loading state
  if (cardsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div style={{
          ...getTypographyStyle('body'),
          ...getTextColorStyle('secondary')
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Empty state
  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div style={{
          ...getTypographyStyle('body'),
          ...getTextColorStyle('secondary')
        }}>
          No data available
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div ref={componentRef} className="space-y-4">
      {processedData.map((item, index) => (
        <div 
          key={item.id || index}
          className="p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02]"
          style={getItemStyle(item)}
          onClick={() => handleItemClick(item)}
        >
          <div className="flex items-center justify-between">
            <div style={{
              ...getTypographyStyle('body'),
              ...getTextColorStyle('primary')
            }}>
              {item.name}
            </div>
            <div style={{
              ...getTypographyStyle('financial'),
              ...getTextColorStyle('primary')
            }}>
              {formatCurrency(item.value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExampleComponent;
```

## 🚀 Testing and Validation

### Pre-Submission Checklist
- [ ] **Data Integration**: Uses real data sources, no dummy data
- [ ] **Styling**: All styles derived from configuration
- [ ] **Responsive**: Works on mobile and desktop
- [ ] **Themes**: Supports both light and dark modes
- [ ] **Loading States**: Proper loading and error handling
- [ ] **Accessibility**: Proper ARIA attributes and keyboard navigation
- [ ] **Performance**: Optimized rendering and state management
- [ ] **Type Safety**: Proper prop validation (if using TypeScript)

### Common Issues to Avoid
1. **Hard-coded colors or styles** - Always use configuration utilities
2. **Dummy data usage** - Always integrate with real data sources
3. **Missing loading states** - Handle async operations properly
4. **Inconsistent typography** - Use typography utilities consistently
5. **Poor responsive design** - Test on different screen sizes
6. **Theme inconsistency** - Test both light and dark modes

## 🔄 Integration Process

### 1. Component Registration
Add your component to the configurator's component registry:
```javascript
// In DesignSystemConfigurator.jsx
import YourComponent from './components/YourComponent';

const getComponentData = (type) => {
  switch (type) {
    case 'your-component':
      return {
        title: 'Your Component',
        description: 'Component description',
        data: { /* component-specific data */ },
        props: { /* additional props */ }
      };
    // ... other cases
  }
};
```

### 2. Props Passing
Ensure all required props are passed from the main configurator:
```javascript
// In renderComponent function
{component.type === 'your-component' && (
  <YourComponent
    data={componentData.data}
    config={config}
    isDarkMode={isDarkMode}
    realCards={cards}
    cardsLoading={cardsLoading}
    selectedCollection={selectedCollection}
    setSelectedCollection={setSelectedCollection}
    collections={collections}
    getTypographyStyle={boundGetTypographyStyle}
    getTextColorStyle={boundGetTextColorStyle}
    getBackgroundColorStyle={boundGetBackgroundColorStyle}
    getSurfaceStyle={boundGetSurfaceStyle}
    getInteractiveStyle={boundGetInteractiveStyle}
    getPrimaryButtonStyle={getPrimaryButtonStyle}
    primaryStyle={primaryStyle}
    colors={colors}
  />
)}
```

## 📚 Resources and Utilities

### Available Utility Functions
- **formatCurrency(amount)**: Format monetary values
- **getGradingCompanyColor(company, grade)**: Get colors for grading companies
- **getValueColor(value)**: Get color based on positive/negative values
- **getTypographyStyle(variant)**: Get typography styles
- **getSurfaceStyle(variant)**: Get surface/background styles
- **getInteractiveStyle(variant)**: Get interactive element styles
- **getTextColorStyle(variant)**: Get text color styles

### Configuration Sections
- **colors**: Color palette configuration
- **typography**: Typography settings
- **components**: Component-specific settings
- **spacing**: Spacing and layout settings
- **gradients**: Gradient definitions

### Data Sources
- **useCards**: Access to card data and operations
- **collections**: Available card collections
- **selectedCollection**: Currently selected collection
- **realCards**: Live card data array
- **cardsLoading**: Loading state for card data

## 🎯 Success Metrics

A well-implemented configurator component should:
1. **Load real data** without manual intervention
2. **Respond to theme changes** instantly
3. **Maintain consistency** with other components
4. **Handle edge cases** gracefully
5. **Perform efficiently** with large datasets
6. **Provide clear feedback** for user interactions

Following this guide ensures your component will integrate seamlessly with the configurator system and provide a consistent, professional user experience. 