# Configurator Component Checklist

## 🚀 Quick Pre-Flight Check

### ✅ Before Starting
- [ ] Component purpose and data requirements defined
- [ ] Real data sources identified (useCards, collections, etc.)
- [ ] Props interface planned

### ✅ Required Imports
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../utils/formatters';
import { getGradingCompanyColor, getValueColor } from '../utils/colorUtils';
import { getTypographyStyle } from '../config/configManager';
import { getSurfaceStyle, getInteractiveStyle, getTextColorStyle, getBackgroundColorStyle } from '../utils/styleUtils';
```

### ✅ Props Interface
- [ ] `data` (component-specific data)
- [ ] `config` (design system configuration) 
- [ ] `isDarkMode` (theme state)
- [ ] `realCards` (live card data)
- [ ] `cardsLoading` (loading state)
- [ ] `selectedCollection` & `setSelectedCollection`
- [ ] `collections` (available collections)
- [ ] All styling utility functions
- [ ] `primaryStyle` & `colors`

### ✅ Data Integration
- [ ] **NO DUMMY DATA** - Always use real data sources
- [ ] Prioritize real data over fallback data
- [ ] Handle loading states properly
- [ ] Provide meaningful empty states
- [ ] Transform real data to component format

### ✅ Styling Implementation
- [ ] All colors from `colors` object
- [ ] Typography via `getTypographyStyle()`
- [ ] Surface styles via `getSurfaceStyle()`
- [ ] Interactive styles via `getInteractiveStyle()`
- [ ] Button styles via `getPrimaryButtonStyle()`
- [ ] No hard-coded styles

### ✅ Component Structure
- [ ] State management pattern implemented
- [ ] Responsive design handling
- [ ] Event handlers properly implemented
- [ ] Accessibility attributes added
- [ ] Performance optimizations applied

### ✅ Testing Requirements
- [ ] Works with real data
- [ ] Handles loading states
- [ ] Handles empty states
- [ ] Responsive on mobile/desktop
- [ ] Light mode works
- [ ] Dark mode works
- [ ] Configuration changes apply
- [ ] No console errors

### ✅ Integration
- [ ] Component registered in configurator
- [ ] All props passed correctly
- [ ] Renders in component list
- [ ] Styling updates work

## 🔥 Common Gotchas

### ❌ NEVER Do This
```javascript
// Hard-coded colors
backgroundColor: '#ffffff'

// Dummy data
const dummyCards = [{ name: 'Test Card' }]

// Hard-coded typography
fontSize: '16px', fontWeight: 'bold'
```

### ✅ ALWAYS Do This
```javascript
// Configuration-driven colors
backgroundColor: colors.surface

// Real data integration
const useRealData = realCards && realCards.length > 0 && !cardsLoading;

// Typography utilities
...getTypographyStyle('body')
```

## 🎯 Final Validation

Before considering the component complete:

1. **Data Test**: Remove/comment out fallback data - component should still work with real data
2. **Theme Test**: Toggle dark mode - everything should update
3. **Responsive Test**: Resize window - layout should adapt
4. **Loading Test**: Simulate loading state - should show loading UI
5. **Empty Test**: Use empty data - should show empty state
6. **Performance Test**: Check for unnecessary re-renders

## 📝 Quick Template

```javascript
const YourComponent = ({ 
  data, config, isDarkMode, realCards, cardsLoading,
  selectedCollection, setSelectedCollection, collections,
  getTypographyStyle, getTextColorStyle, getBackgroundColorStyle,
  getSurfaceStyle, getInteractiveStyle, getPrimaryButtonStyle,
  primaryStyle, colors
}) => {
  // State
  const [localState, setLocalState] = useState(null);
  
  // Data processing
  const useRealData = realCards && realCards.length > 0 && !cardsLoading;
  const processedData = useRealData ? 
    realCards.map(item => ({ /* transform */ })) : 
    data.fallbackData || [];
  
  // Loading state
  if (cardsLoading) return <LoadingState />;
  
  // Empty state
  if (processedData.length === 0) return <EmptyState />;
  
  // Main render
  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} style={{
          ...getSurfaceStyle('primary'),
          ...getInteractiveStyle('default')
        }}>
          {/* Content */}
        </div>
      ))}
    </div>
  );
};
```

Remember: When in doubt, look at existing components like `CardListComponent.jsx` for reference patterns! 