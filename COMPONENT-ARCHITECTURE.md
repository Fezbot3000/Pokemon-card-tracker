# Component Architecture Documentation

## Overview
This document provides detailed information about the React component architecture, including component hierarchies, data flow patterns, and implementation details.

## Component Hierarchy

### Main Application Structure
```
App.js (Root Router)
├── RootProviders (Context Providers)
│   ├── ErrorBoundary
│   ├── HelmetProvider (SEO)
│   ├── DesignSystemProvider
│   ├── SubscriptionProvider
│   ├── UserPreferencesProvider
│   ├── TutorialProvider
│   ├── BackupProvider
│   ├── RestoreProvider
│   └── InvoiceProvider
├── Dashboard (Main App Shell)
│   ├── Header
│   ├── AppContent (Main Content Area)
│   └── BottomNavBar (Mobile)
└── Public Routes
    ├── Home (Landing Page)
    ├── Login/Signup
    ├── Pricing
    └── Content Pages
```

### Core Feature Components

#### 1. Collection Management
```
CardList.js (1,486 lines - Main collection view)
├── CardToolbar (Search, filters, view controls)
├── StatisticsSummary (Investment metrics)
├── CardGrid/CardListView (Display components)
├── BulkActionsBar (Multi-select operations)
└── Modals
    ├── AddCardModal (Add new cards)
    ├── CardDetails (View/edit card details)
    ├── SaleModal (Mark cards as sold)
    ├── DeleteConfirmModal (Bulk delete)
    ├── MoveCardsModal (Move between collections)
    ├── PurchaseInvoiceModal (Generate invoices)
    └── ListCardModal (List on marketplace)
```

#### 2. Marketplace System
```
Marketplace/
├── Marketplace.js (Main marketplace browser)
│   ├── MarketplaceFilters (Category, grade filters)
│   ├── MarketplacePagination (Page navigation)
│   ├── LazyImage (Optimized image loading)
│   └── ListingDetailModal (Listing details)
├── MarketplaceSelling.js (Seller dashboard)
├── MarketplaceMessages.js (Chat system)
│   ├── ConversationList (Chat list)
│   ├── ActiveChat (Chat interface)
│   └── MessageModal (New message)
├── SellerProfile.js (Seller information)
├── ReviewSystem.js (Rating/review system)
└── ReportListing.js (Report inappropriate content)
```

#### 3. Financial Tracking
```
SoldItems/
├── SoldItems.js (Sold items management)
├── SoldItemCard.js (Individual sold item)
└── SoldItemModal.js (Sold item details)

PurchaseInvoices/
├── PurchaseInvoices.js (Invoice management)
├── InvoiceCard.js (Individual invoice)
├── InvoiceModal.js (Invoice details)
└── CreateInvoiceModal.js (New invoice creation)
```

#### 4. Authentication Components
```
Login.js (Authentication interface)
├── Email/Password Form
├── Google Sign-In Button (iOS PWA optimized)
├── Apple Sign-In Button (iOS only)
├── Social Loading States
└── Error Handling

AuthContext.js (Authentication state management)
├── signInWithGoogle() (iOS-aware implementation)
├── signInWithApple() 
├── handleRedirectResult() (PWA redirect handling)
├── User state management
└── Authentication persistence
```

## Component Patterns

### 1. Modal Pattern
Most complex interactions use modals for focused user experiences:

```javascript
// Standard modal structure
const ExampleModal = ({ isOpen, onClose, onSave, data }) => {
  const [formData, setFormData] = useState(data || {});
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      toast.error('Error saving data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal content */}
      </div>
    </div>
  );
};
```

### 2. Hook-Based State Management
Complex components use custom hooks to manage state:

```javascript
// Example: useCardSelection hook
const useCardSelection = (filteredCards) => {
  const [selectedCards, setSelectedCards] = useState(new Set());
  
  const handleSelectCard = useCallback((cardId) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map(card => card.id)));
    }
  }, [filteredCards, selectedCards.size]);

  return {
    selectedCards,
    handleSelectCard,
    handleSelectAll,
    clearSelection: () => setSelectedCards(new Set()),
    selectedCount: selectedCards.size
  };
};
```

### 3. Context Provider Pattern
Context providers manage global application state:

```javascript
// Example: SubscriptionContext
const SubscriptionProvider = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <SubscriptionContext.Provider value={{
      subscriptionStatus,
      isLoading,
      // ... other subscription methods
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
```

### 4. iOS PWA Authentication Pattern
Special handling for iOS Progressive Web App authentication:

```javascript
// AuthContext.js - iOS-aware authentication
const signInWithGoogle = async () => {
  try {
    setError(null);
    
    // iOS detection for PWA compatibility
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    
    if (isIOS || (isIOS && isSafari)) {
      // Use redirect for iOS to avoid popup blocking
      await signInWithRedirect(auth, googleProvider);
      return null; // Redirect flow
    } else {
      // Use popup for desktop browsers
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (err) {
    // Fallback to redirect if popup is blocked
    if (err.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
};

// Login.js - Simplified button handling
const handleGoogleSignIn = async () => {
  try {
    await signInWithGoogle();
    navigate('/dashboard', { replace: true });
  } catch (error) {
    console.error('Google sign in error:', error);
  }
};
```

**Key iOS PWA Considerations:**
- **Popup Blocking**: iOS PWAs block authentication popups
- **Redirect Flow**: Always use `signInWithRedirect` for iOS devices
- **User Agent Detection**: Reliable iOS device detection
- **Fallback Mechanism**: Automatic fallback from popup to redirect
- **State Management**: Simplified loading states for redirect flows

## Data Flow Patterns

### 1. Top-Down Data Flow
```
App.js (Global State)
├── Collections State
├── Selected Collection
├── Exchange Rates
└── User Preferences
    ↓
CardList.js (Feature State)
├── Filtered Cards
├── Sort Settings
├── View Mode
└── Selection State
    ↓
CardComponents (Local State)
├── Form Data
├── Loading States
└── Validation
```

### 2. Event Bubbling Pattern
```javascript
// Child component emits events
const CardItem = ({ card, onUpdate, onDelete, onSelect }) => {
  return (
    <div onClick={() => onSelect(card.id)}>
      <button onClick={() => onUpdate(card.id, newData)}>Update</button>
      <button onClick={() => onDelete(card.id)}>Delete</button>
    </div>
  );
};

// Parent component handles events
const CardList = () => {
  const handleCardUpdate = (cardId, data) => {
    // Update logic
  };
  
  return (
    <div>
      {cards.map(card => (
        <CardItem 
          key={card.id}
          card={card}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
          onSelect={handleCardSelect}
        />
      ))}
    </div>
  );
};
```

## Component Responsibilities

### High-Level Components (App.js, Dashboard)
- **Route Management**: Handle navigation and route protection
- **Global State**: Manage application-wide state
- **Authentication**: Handle user authentication flow
- **Error Boundaries**: Catch and handle React errors
- **Provider Setup**: Initialize context providers

### Feature Components (CardList, Marketplace)
- **Data Fetching**: Load and manage feature-specific data
- **State Management**: Handle complex local state
- **Business Logic**: Implement feature-specific logic
- **User Interactions**: Handle user input and actions
- **Performance**: Optimize rendering and data loading

### UI Components (Design System)
- **Presentation**: Pure presentational components
- **Reusability**: Shared across multiple features
- **Accessibility**: ARIA compliance and keyboard navigation
- **Theming**: Support for light/dark themes
- **Responsive**: Mobile-first responsive design

## Performance Considerations

### 1. Component Optimization
```javascript
// Memoization for expensive calculations
const ExpensiveComponent = React.memo(({ data }) => {
  const expensiveValue = useMemo(() => {
    return data.reduce((acc, item) => acc + item.value, 0);
  }, [data]);

  return <div>{expensiveValue}</div>;
});

// Callback memoization
const ParentComponent = () => {
  const handleClick = useCallback((id) => {
    // Handle click logic
  }, []);

  return <ChildComponent onClick={handleClick} />;
};
```

### 2. Lazy Loading
```javascript
// Route-based code splitting
const LazyComponent = React.lazy(() => import('./LazyComponent'));

const App = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <LazyComponent />
  </Suspense>
);
```

### 3. Virtual Scrolling
Large lists use pagination and virtual scrolling for performance:

```javascript
const CardList = () => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;
  
  const paginatedCards = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCards.slice(start, start + itemsPerPage);
  }, [filteredCards, page, itemsPerPage]);

  return (
    <div>
      {paginatedCards.map(card => <CardItem key={card.id} card={card} />)}
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
};
```

## Error Handling

### 1. Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 2. Async Error Handling
```javascript
const useAsyncOperation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (operation) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await operation();
      return result;
    } catch (err) {
      setError(err);
      toast.error(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
};
```

## Testing Strategy

### 1. Component Testing
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { CardItem } from './CardItem';

test('renders card information', () => {
  const mockCard = {
    id: '1',
    name: 'Charizard',
    set: 'Base Set',
    grade: '10'
  };

  render(<CardItem card={mockCard} />);
  
  expect(screen.getByText('Charizard')).toBeInTheDocument();
  expect(screen.getByText('Base Set')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
});
```

### 2. Hook Testing
```javascript
import { renderHook, act } from '@testing-library/react';
import { useCardSelection } from './useCardSelection';

test('handles card selection', () => {
  const cards = [{ id: '1' }, { id: '2' }];
  const { result } = renderHook(() => useCardSelection(cards));

  act(() => {
    result.current.handleSelectCard('1');
  });

  expect(result.current.selectedCards.has('1')).toBe(true);
  expect(result.current.selectedCount).toBe(1);
});
```

This component architecture provides a scalable, maintainable foundation for the Pokemon Card Tracker application while following React best practices and performance optimization techniques.
