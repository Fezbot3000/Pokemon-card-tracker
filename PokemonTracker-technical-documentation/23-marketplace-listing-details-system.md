# Marketplace Listing Details System Technical Documentation

## Overview

The Listing Details System provides comprehensive viewing and interaction capabilities for individual marketplace listings. It presents detailed card information, seller details, pricing, and various user actions through an intuitive modal interface that adapts to user permissions and listing ownership.

## Architecture

### Core Components

#### 1. ListingDetailModal.js
- **Purpose**: Primary modal for viewing detailed listing information
- **Features**: Full listing display, seller info, action buttons, responsive design
- **Location**: `src/components/Marketplace/ListingDetailModal.js`

#### 2. MarketplaceCard.js
- **Purpose**: Individual listing card component with click-to-view functionality
- **Features**: Optimized display, lazy loading, hover effects
- **Location**: `src/components/Marketplace/MarketplaceCard.js`

#### 3. ReportListing.js
- **Purpose**: Modal for reporting inappropriate or fraudulent listings
- **Features**: Report categorization, detailed feedback, moderation integration
- **Location**: `src/components/Marketplace/ReportListing.js`

## Key Features

### Comprehensive Listing Display
```javascript
const ListingDetailModal = ({ 
  isOpen, 
  onClose, 
  listing, 
  cardImage, 
  onContactSeller,
  onViewSellerProfile,
  onReportListing,
  onEditListing,
  onMarkAsPending,
  onMarkAsSold,
  onViewChange 
}) => {
  const { user } = useAuth();
  const { formatAmountForDisplay } = useUserPreferences();
  const [imageError, setImageError] = useState(false);
  
  const isOwner = user && listing && user.uid === listing.userId;
  const canEdit = isOwner && listing.status !== 'sold';
  const canMarkAsPending = isOwner && listing.status === 'available';
  const canMarkAsSold = isOwner && ['available', 'pending'].includes(listing.status);
};
```

### Dynamic Action System
```javascript
const renderActionButtons = () => {
  if (isOwner) {
    return (
      <div className="space-y-2">
        {canEdit && (
          <button
            onClick={() => {
              onEditListing(listing);
              onClose();
            }}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Edit Listing
          </button>
        )}
        
        {canMarkAsPending && (
          <button
            onClick={() => {
              onMarkAsPending(listing);
              onClose();
            }}
            className="w-full px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            Mark as Pending
          </button>
        )}
        
        {canMarkAsSold && (
          <button
            onClick={() => {
              onMarkAsSold(listing);
              onClose();
            }}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Mark as Sold
          </button>
        )}
      </div>
    );
  } else {
    return (
      <div className="space-y-2">
        <button
          onClick={() => {
            onContactSeller(listing);
            onClose();
          }}
          className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Contact Seller
        </button>
        
        <button
          onClick={() => {
            onViewSellerProfile(listing.userId);
            onClose();
          }}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          View Seller Profile
        </button>
        
        <button
          onClick={() => {
            onReportListing(listing);
            onClose();
          }}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm"
        >
          Report Listing
        </button>
      </div>
    );
  }
};
```

## Detailed Information Display

### Card Information Section
```javascript
const CardDetailsSection = ({ listing, cardImage, imageError, setImageError }) => (
  <div className="space-y-4">
    {/* Card Image */}
    <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      {cardImage && !imageError ? (
        <img
          src={cardImage}
          alt={listing.card?.name || 'Card'}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-6xl">🎴</span>
        </div>
      )}
      
      {/* Grade Badge */}
      {listing.card?.grade && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-black px-3 py-2 rounded-lg text-sm font-bold">
          {listing.card.grader} {listing.card.grade}
        </div>
      )}
      
      {/* Status Badge */}
      {listing.status && listing.status !== 'available' && (
        <div className={`absolute top-2 left-2 px-3 py-2 rounded-lg text-sm font-bold ${
          listing.status === 'sold' ? 'bg-red-500 text-white' :
          listing.status === 'pending' ? 'bg-yellow-500 text-black' :
          'bg-gray-500 text-white'
        }`}>
          {listing.status.toUpperCase()}
        </div>
      )}
    </div>
    
    {/* Card Details */}
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {listing.card?.name || 'Unknown Card'}
      </h2>
      
      {listing.card?.set && (
        <p className="text-lg text-gray-700 dark:text-gray-300">
          {listing.card.set}
          {listing.card.year && ` (${listing.card.year})`}
        </p>
      )}
      
      {listing.card?.category && (
        <p className="text-md text-gray-600 dark:text-gray-400">
          Category: {listing.card.category}
        </p>
      )}
      
      {listing.card?.condition && (
        <p className="text-md text-gray-600 dark:text-gray-400">
          Condition: {listing.card.condition}
        </p>
      )}
    </div>
  </div>
);
```

### Pricing and Transaction Details
```javascript
const PricingSection = ({ listing, formatAmountForDisplay }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        Listing Price:
      </span>
      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
        {formatAmountForDisplay(listing.listingPrice)} {listing.currency}
      </span>
    </div>
    
    {listing.originalPrice && listing.originalPrice !== listing.listingPrice && (
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Original Price:
        </span>
        <span className="text-lg text-gray-500 dark:text-gray-500 line-through">
          {formatAmountForDisplay(listing.originalPrice)} {listing.currency}
        </span>
      </div>
    )}
    
    {listing.bestOffer && (
      <div className="text-sm text-blue-600 dark:text-blue-400">
        ✓ Best Offer Accepted
      </div>
    )}
    
    <div className="text-xs text-gray-500 dark:text-gray-500">
      Listed: {new Date(listing.timestampListed.toDate()).toLocaleDateString()}
    </div>
  </div>
);
```

### Seller Information Section
```javascript
const SellerInfoSection = ({ listing, onViewSellerProfile }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        Seller Information
      </span>
      <button
        onClick={() => onViewSellerProfile(listing.userId)}
        className="text-blue-500 hover:text-blue-600 text-sm underline"
      >
        View Profile
      </button>
    </div>
    
    {listing.sellerInfo && (
      <div className="space-y-2">
        {listing.sellerInfo.displayName && (
          <p className="text-md text-gray-600 dark:text-gray-400">
            {listing.sellerInfo.displayName}
          </p>
        )}
        
        {listing.sellerInfo.rating && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
            <div className="flex items-center">
              <span className="text-yellow-500">★</span>
              <span className="text-sm font-semibold ml-1">
                {listing.sellerInfo.rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                ({listing.sellerInfo.reviewCount} reviews)
              </span>
            </div>
          </div>
        )}
        
        {listing.sellerInfo.responseTime && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Typical response: {listing.sellerInfo.responseTime}
          </p>
        )}
      </div>
    )}
    
    {listing.location && (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        📍 {listing.location}
      </p>
    )}
  </div>
);
```

## State Management

### Modal State Handling
```javascript
const [imageError, setImageError] = useState(false);
const [showFullDescription, setShowFullDescription] = useState(false);
const [reportModalOpen, setReportModalOpen] = useState(false);

// Reset state when modal opens/closes
useEffect(() => {
  if (isOpen) {
    setImageError(false);
    setShowFullDescription(false);
  }
}, [isOpen]);

// Handle escape key and backdrop clicks
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isOpen, onClose]);
```

### Permission-Based Rendering
```javascript
const determineUserPermissions = (user, listing) => {
  const isOwner = user && listing && user.uid === listing.userId;
  const isAuthenticated = !!user;
  
  return {
    canEdit: isOwner && listing.status !== 'sold',
    canDelete: isOwner,
    canMarkPending: isOwner && listing.status === 'available',
    canMarkSold: isOwner && ['available', 'pending'].includes(listing.status),
    canContact: isAuthenticated && !isOwner,
    canReport: isAuthenticated && !isOwner,
    canViewSellerProfile: isAuthenticated
  };
};
```

## Integration with Parent Components

### Modal Trigger System
```javascript
// From Marketplace browse
const handleCardClick = (listing) => {
  setSelectedListing(listing);
  setIsDetailModalOpen(true);
};

// From search results
const handleSearchResultClick = (listingId) => {
  const listing = allListings.find(l => l.id === listingId);
  if (listing) {
    setSelectedListing(listing);
    setIsDetailModalOpen(true);
  }
};

// From seller profile
const handleListingClick = (listing) => {
  setSelectedListing(listing);
  setIsDetailModalOpen(true);
};
```

### Action Delegation
```javascript
<ListingDetailModal
  isOpen={isDetailModalOpen}
  onClose={() => setIsDetailModalOpen(false)}
  listing={selectedListing}
  cardImage={selectedListing ? cardImages[selectedListing.cardId] : null}
  onContactSeller={(listing) => {
    setIsDetailModalOpen(false);
    handleContactSeller(listing);
  }}
  onViewSellerProfile={(sellerId) => {
    setIsDetailModalOpen(false);
    handleViewSellerProfile(sellerId);
  }}
  onReportListing={(listing) => {
    setIsDetailModalOpen(false);
    handleReportListing(listing);
  }}
  onEditListing={(listing) => {
    setIsDetailModalOpen(false);
    handleEditListing(listing);
  }}
  onMarkAsPending={handleMarkAsPending}
  onMarkAsSold={handleMarkAsSold}
  onViewChange={onViewChange}
/>
```

## Responsive Design

### Mobile Optimization
```javascript
const ResponsiveModal = ({ isOpen, onClose, children }) => (
  <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
    <div className="fixed inset-0 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  </div>
);

// Desktop layout adjustments
const DesktopModalLayout = ({ children }) => (
  <div className="lg:max-w-2xl lg:grid lg:grid-cols-2 lg:gap-6">
    {children}
  </div>
);
```

### Touch-Friendly Interactions
```javascript
const TouchOptimizedButton = ({ onClick, children, className, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      min-h-[44px] px-4 py-2 rounded-md transition-colors
      touch-manipulation select-none
      active:scale-95 transition-transform
      ${className}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
);
```

## Data Validation & Error Handling

### Listing Data Validation
```javascript
const validateListingData = (listing) => {
  const errors = [];
  
  if (!listing) {
    errors.push('Listing data is missing');
    return errors;
  }
  
  if (!listing.card?.name) {
    errors.push('Card name is required');
  }
  
  if (!listing.listingPrice || listing.listingPrice <= 0) {
    errors.push('Valid listing price is required');
  }
  
  if (!listing.userId) {
    errors.push('Seller information is missing');
  }
  
  if (!['available', 'pending', 'sold'].includes(listing.status)) {
    errors.push('Invalid listing status');
  }
  
  return errors;
};
```

### Image Loading Error Handling
```javascript
const ImageWithFallback = ({ src, alt, className, onError }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };
  
  const handleLoad = () => {
    setIsLoading(false);
  };
  
  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
        <span className="text-4xl">🎴</span>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
};
```

## Performance Optimizations

### Lazy Loading and Memoization
```javascript
import React, { memo, useMemo } from 'react';

const ListingDetailModal = memo(({ listing, ...props }) => {
  const userPermissions = useMemo(() => 
    determineUserPermissions(user, listing), 
    [user, listing]
  );
  
  const formattedPrice = useMemo(() => 
    formatAmountForDisplay(listing?.listingPrice || 0),
    [listing?.listingPrice, formatAmountForDisplay]
  );
  
  const listingAge = useMemo(() => {
    if (!listing?.timestampListed) return '';
    const days = Math.floor((new Date() - listing.timestampListed.toDate()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : `${days} days ago`;
  }, [listing?.timestampListed]);
  
  // Component render logic...
});
```

### Efficient Re-rendering
```javascript
const shouldComponentUpdate = (prevProps, nextProps) => {
  return (
    prevProps.isOpen !== nextProps.isOpen ||
    prevProps.listing?.id !== nextProps.listing?.id ||
    prevProps.cardImage !== nextProps.cardImage
  );
};
```

## Accessibility Features

### Keyboard Navigation
```javascript
const useKeyboardNavigation = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'Tab':
          // Handle tab navigation within modal
          handleTabNavigation(e);
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
};
```

### Screen Reader Support
```javascript
const AccessibleModal = ({ isOpen, onClose, title, children }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    className={isOpen ? 'block' : 'hidden'}
  >
    <div className="modal-content">
      <h2 id="modal-title" className="sr-only">{title}</h2>
      <div id="modal-description">
        {children}
      </div>
    </div>
  </div>
);
```

## Security Considerations

### User Action Validation
```javascript
const validateUserAction = (action, user, listing) => {
  if (!user) {
    throw new Error('Authentication required');
  }
  
  switch (action) {
    case 'edit':
    case 'delete':
    case 'markPending':
    case 'markSold':
      if (user.uid !== listing.userId) {
        throw new Error('Unauthorized: Only listing owner can perform this action');
      }
      break;
    case 'contact':
    case 'report':
      if (user.uid === listing.userId) {
        throw new Error('Cannot perform action on own listing');
      }
      break;
    default:
      break;
  }
};
```

### Data Sanitization
```javascript
const sanitizeListingData = (listing) => ({
  ...listing,
  card: {
    ...listing.card,
    name: sanitizeHtml(listing.card?.name || ''),
    set: sanitizeHtml(listing.card?.set || ''),
    category: sanitizeHtml(listing.card?.category || '')
  },
  note: sanitizeHtml(listing.note || ''),
  location: sanitizeHtml(listing.location || '')
});
```

## Testing Strategy

### Component Testing
```javascript
describe('ListingDetailModal', () => {
  test('renders listing information correctly', () => {
    const mockListing = createMockListing();
    render(<ListingDetailModal isOpen={true} listing={mockListing} />);
    
    expect(screen.getByText(mockListing.card.name)).toBeInTheDocument();
    expect(screen.getByText(mockListing.listingPrice)).toBeInTheDocument();
  });
  
  test('shows owner actions for listing owner', () => {
    const mockUser = { uid: 'owner-id' };
    const mockListing = { ...createMockListing(), userId: 'owner-id' };
    
    render(<ListingDetailModal isOpen={true} listing={mockListing} />, {
      wrapper: ({ children }) => <AuthContext.Provider value={{user: mockUser}}>{children}</AuthContext.Provider>
    });
    
    expect(screen.getByText('Edit Listing')).toBeInTheDocument();
  });
  
  test('shows buyer actions for non-owners', () => {
    const mockUser = { uid: 'buyer-id' };
    const mockListing = { ...createMockListing(), userId: 'owner-id' };
    
    render(<ListingDetailModal isOpen={true} listing={mockListing} />);
    
    expect(screen.getByText('Contact Seller')).toBeInTheDocument();
    expect(screen.getByText('View Seller Profile')).toBeInTheDocument();
  });
});
```

## Future Enhancements

### Advanced Features
- **Image Zoom**: High-resolution image viewing with zoom functionality
- **Comparison Mode**: Side-by-side listing comparisons
- **Price History**: Historical pricing data and market trends
- **Similar Listings**: Recommendations based on card characteristics

### Enhanced Interactions
- **Virtual Card Flip**: 3D card rotation for front/back views
- **Augmented Reality**: AR preview of card size and condition
- **Video Support**: Seller-uploaded video demonstrations
- **Live Chat**: Real-time communication within listing modal

This listing details system provides comprehensive information display while maintaining security, performance, and accessibility standards across all user interactions.
