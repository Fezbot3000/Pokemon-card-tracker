# Header & Navigation System Technical Documentation

## Overview

The Header & Navigation System provides the primary navigation interface for the Pokemon Card Tracker app. It manages view switching, collection selection, currency preferences, and integrates with the NavigationStateManager for persistent URL-based navigation state.

## Core Architecture

### 1. Component Structure

```
Header (Main Component)
├── Navigation State
│   ├── currentView prop
│   ├── previousView state
│   └── isAnimating state
├── View Navigation
│   ├── Cards (Dashboard)
│   ├── Sold Section
│   │   ├── Sold Items
│   │   └── Purchase Invoices
│   └── Marketplace Section
│       ├── Marketplace
│       ├── Selling
│       └── Messages
├── Currency Dropdown
│   ├── Currency selection
│   └── Click outside handling
└── Action Buttons
    ├── Theme toggle
    └── Settings button
```

### 2. Technical Implementation

#### Component Definition
```javascript
const Header = ({ 
  onImportClick,
  onSettingsClick,
  currentView,
  onViewChange,
  isComponentLibrary = false
}) => {
  // State management
  const [previousView, setPreviousView] = useState(currentView);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  
  // Context hooks
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth() || { user: null, logout: () => {} };
  const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();
  
  // Refs
  const currencyDropdownRef = useRef(null);
  const location = useLocation();
```

### 3. View Management Functions

#### Section Detection
```javascript
// Helper function to check if current view is in the sold section
const isSoldSection = () => {
  return ['sold', 'sold-items', 'purchase-invoices'].includes(currentView);
};

// Helper function to check if current view is in the marketplace section
const isMarketplaceSection = () => {
  return ['marketplace', 'marketplace-selling', 'marketplace-messages'].includes(currentView);
};
```

#### View Change Handler
```javascript
const handleViewChange = (newView) => {
  if (newView !== currentView) {
    // Store previous view for animation direction
    setPreviousView(currentView);
    setIsAnimating(true);
    
    // Trigger view change
    onViewChange?.(newView);
    
    // Reset after animation
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }
};
```

### 4. Currency Dropdown Management

#### Click Outside Handler
```javascript
useEffect(() => {
  function handleClickOutside(event) {
    if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
      setCurrencyDropdownOpen(false);
    }
  }

  // Add listener when dropdown is open
  if (currencyDropdownOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  
  // Cleanup
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [currencyDropdownOpen]);
```

#### Currency Selection
```javascript
<button
  onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
  className="px-2 py-1 flex items-center justify-center rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
>
  <span className="mr-1">{preferredCurrency.symbol}</span>
  <span className="hidden xs:inline">{preferredCurrency.code}</span>
  <Icon name="expand_more" size="sm" className="ml-0.5 hidden xs:inline" />
</button>

{currencyDropdownOpen && (
  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
    {availableCurrencies.map((currency) => (
      <button
        key={currency.code}
        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
          currency.code === preferredCurrency.code ? 'bg-gray-100 dark:bg-gray-800 font-medium' : ''
        }`}
        onClick={() => {
          updatePreferredCurrency(currency);
          setCurrencyDropdownOpen(false);
        }}
      >
        <span className="mr-2">{currency.symbol}</span>
        <span>{currency.name}</span>
      </button>
    ))}
  </div>
)}
```

## Navigation State Integration

### 1. NavigationStateManager Integration

The Header component works in conjunction with NavigationStateManager to maintain persistent navigation state across page refreshes.

#### In App.js
```javascript
// Initialize navigation state
const initialState = NavigationStateManager.initializeNavigationState(location.pathname);

// Handle view changes
const handleViewChange = (view) => {
  const path = NavigationStateManager.getPathFromView(view);
  navigate(path);
  NavigationStateManager.setCurrentView(view);
};

// Pass to Header
<Header
  currentView={currentView}
  onViewChange={handleViewChange}
  onSettingsClick={handleSettingsClick}
/>
```

### 2. URL-Based Navigation

#### View to Path Mapping
```javascript
// NavigationStateManager handles URL mapping
const pathMapping = {
  'cards': '/dashboard',
  'sold-items': '/dashboard/sold-items',
  'purchase-invoices': '/dashboard/purchase-invoices',
  'marketplace': '/dashboard/marketplace',
  'marketplace-selling': '/dashboard/marketplace/selling',
  'marketplace-messages': '/dashboard/marketplace/messages'
};
```

#### Path Synchronization
- View changes update the URL
- URL changes update the view
- Browser back/forward navigation supported
- Deep linking to specific views

## Responsive Design

### 1. Mobile Behavior

#### Visibility
```javascript
// Header is hidden on mobile, replaced by BottomNavBar
<header className="bg-white dark:bg-black fixed top-0 left-0 right-0 z-50 header-responsive">
```

#### CSS Classes
```css
/* From main.css */
.header-responsive {
  display: none; /* Hidden by default on mobile */
}

@media (min-width: 640px) {
  .header-responsive {
    display: block; /* Visible on desktop */
  }
}
```

### 2. Breakpoint Handling

#### Currency Dropdown
```javascript
// Hidden on mobile, visible on larger screens
<div className="relative hidden sm:block" ref={currencyDropdownRef}>
```

#### Action Buttons
```javascript
// Hidden on mobile
<div className="hidden sm:flex items-center space-x-2">
  <button onClick={toggleTheme}>...</button>
  <button onClick={onSettingsClick}>...</button>
</div>
```

## Tab Navigation System

### 1. Tab Structure

#### Main Navigation Tabs
```javascript
{/* Dashboard/Cards Tab */}
<button
  onClick={() => handleViewChange('cards')}
  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
    currentView === 'cards' 
      ? 'bg-blue-500 text-white' 
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`}
>
  <Icon name="dashboard" className="mr-1" />
  <span>Dashboard</span>
</button>
```

### 2. Section-Based Navigation

#### Sold Section
```javascript
{isSoldSection() && (
  <>
    <button onClick={() => handleViewChange('sold-items')}>
      <Icon name="sell" />
      <span>Sold Items</span>
    </button>
    <button onClick={() => handleViewChange('purchase-invoices')}>
      <Icon name="receipt" />
      <span>Purchase Invoices</span>
    </button>
  </>
)}
```

#### Marketplace Section
```javascript
{isMarketplaceSection() && (
  <>
    <button onClick={() => handleViewChange('marketplace')}>
      <Icon name="store" />
      <span>Browse</span>
    </button>
    <button onClick={() => handleViewChange('marketplace-selling')}>
      <Icon name="sell" />
      <span>Selling</span>
    </button>
    <button onClick={() => handleViewChange('marketplace-messages')}>
      <Icon name="chat" />
      <span>Messages</span>
    </button>
  </>
)}
```

## Animation System

### 1. View Transition Animation

#### State Management
```javascript
const [previousView, setPreviousView] = useState(currentView);
const [isAnimating, setIsAnimating] = useState(false);
```

#### Animation Trigger
```javascript
const handleViewChange = (newView) => {
  if (newView !== currentView) {
    setPreviousView(currentView);
    setIsAnimating(true);
    
    // Trigger view change
    onViewChange?.(newView);
    
    // Reset after animation
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }
};
```

#### CSS Transitions
```css
/* Smooth transitions for tab changes */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
```

## Context Dependencies

### 1. Theme Context
```javascript
const { theme, toggleTheme } = useTheme();

// Usage
<button onClick={toggleTheme}>
  <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
</button>
```

### 2. Auth Context
```javascript
const { user, logout } = useAuth() || { user: null, logout: () => {} };

// Conditional rendering based on auth state
{user && <UserMenu />}
```

### 3. User Preferences Context
```javascript
const { preferredCurrency, updatePreferredCurrency } = useUserPreferences();

// Currency management
updatePreferredCurrency(selectedCurrency);
```

## Integration Points

### 1. Settings Modal
```javascript
// Settings button handler
{onSettingsClick && (
  <button
    onClick={onSettingsClick}
    className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
    aria-label="Settings"
  >
    <Icon name="settings" />
  </button>
)}
```

### 2. Navigation State Manager
```javascript
// View persistence
NavigationStateManager.setCurrentView(view);
NavigationStateManager.getCurrentView();

// Collection persistence
NavigationStateManager.setSelectedCollection(collection);
NavigationStateManager.getSelectedCollection();
```

### 3. Router Integration
```javascript
// React Router hooks
const location = useLocation();
const navigate = useNavigate();

// Path-based navigation
navigate(NavigationStateManager.getPathFromView(view));
```

## Component Library Mode

### 1. Simplified Rendering
```javascript
if (isComponentLibrary) {
  return (
    <header className="bg-white dark:bg-black fixed top-0 left-0 right-0 z-50">
      {/* Simplified header for component library */}
      <div className="flex items-center">
        <img src="/favicon-192x192.png" alt="MyCardTracker" />
        <span>MyCardTracker</span>
      </div>
    </header>
  );
}
```

## Performance Optimizations

### 1. Event Listener Management
- Click outside listeners added/removed based on dropdown state
- Proper cleanup in useEffect

### 2. Animation Performance
- CSS transitions for smooth animations
- Hardware-accelerated transforms
- Debounced state updates

### 3. Render Optimization
- Conditional rendering for mobile/desktop
- Memoized currency list rendering
- Minimal re-renders on state changes

## Accessibility

### 1. ARIA Labels
```javascript
<button aria-label="Change currency">
<button aria-label="Toggle theme">
<button aria-label="Settings">
```

### 2. Keyboard Navigation
- Tab navigation support
- Escape key closes dropdowns
- Enter key activates buttons

### 3. Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Descriptive button labels

## Error Handling

### 1. Safe Optional Chaining
```javascript
const { user, logout } = useAuth() || { user: null, logout: () => {} };
onViewChange?.(newView);
```

### 2. Fallback Values
```javascript
collections = []
className = ''
isComponentLibrary = false
```

## Testing Considerations

### 1. Unit Tests
- View change handler logic
- Section detection functions
- Currency dropdown behavior

### 2. Integration Tests
- Navigation state persistence
- Context integration
- Router navigation

### 3. E2E Tests
- Tab switching flows
- Currency selection
- Settings modal opening

## Future Enhancements

1. **Advanced Navigation**
   - Breadcrumb support
   - Navigation history
   - Quick navigation shortcuts

2. **Enhanced Currency Features**
   - Real-time exchange rates
   - Currency conversion preview
   - Historical rate tracking

3. **Improved Animations**
   - Page transition effects
   - Skeleton loading states
   - Progressive enhancement

4. **Accessibility Improvements**
   - Focus management
   - Announcement regions
   - High contrast mode

## Troubleshooting

### Common Issues

1. **Header Not Visible**
   - Check responsive classes
   - Verify media queries
   - Inspect z-index conflicts

2. **Navigation Not Persisting**
   - Verify NavigationStateManager integration
   - Check localStorage availability
   - Review router configuration

3. **Currency Dropdown Issues**
   - Check click outside handler
   - Verify ref attachment
   - Review z-index stacking

### Debug Tools
```javascript
// Log navigation state
console.log('Current view:', currentView);
console.log('Navigation state:', NavigationStateManager.getState());

// Check responsive behavior
console.log('Window width:', window.innerWidth);
console.log('Is mobile:', window.innerWidth < 640);
