# My Listings System Technical Documentation

## Overview

The My Listings System allows users to manage their own marketplace listings, providing comprehensive tools for editing, status management, and tracking sales performance. This system enables sellers to monitor their active listings, mark items as pending or sold, and manage the complete lifecycle of their marketplace presence.

## Architecture

### Core Components

#### 1. MarketplaceSelling.js
- **Purpose**: Main dashboard for managing user's own listings
- **Features**: List management, status updates, editing capabilities
- **Location**: `src/components/Marketplace/MarketplaceSelling.js`

#### 2. EditListingModal.js
- **Purpose**: Modal interface for editing existing listings
- **Features**: Form validation, image updates, pricing changes
- **Location**: `src/components/Marketplace/EditListingModal.js`

#### 3. BuyerSelectionModal.js
- **Purpose**: Interface for selecting buyers when marking items as sold
- **Features**: Buyer search, transaction recording, sales tracking
- **Location**: `src/components/Marketplace/BuyerSelectionModal.js`

## Key Features

### Real-Time Listing Management
```javascript
useEffect(() => {
  if (!user) return;

  const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
  const marketplaceQuery = query(
    marketplaceRef,
    where('userId', '==', user.uid),
    orderBy('timestampListed', 'desc')
  );

  const unsubscribe = onSnapshot(marketplaceQuery, (snapshot) => {
    const listingsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('User listings loaded:', {
      count: listingsData.length,
      statuses: listingsData.map(l => l.status)
    });
    
    setAllListings(listingsData);
    setFilteredListings(listingsData);
    loadCardImages(listingsData);
  });

  return () => unsubscribe();
}, [user]);
```

### Status Management System
```javascript
const handleMarkAsPending = async (listing) => {
  try {
    console.log('Marking listing as pending:', {
      id: listing.id,
      currentStatus: listing.status,
      cardName: listing.card?.name
    });
    
    const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
    await updateDoc(listingRef, {
      status: 'pending',
      updatedAt: new Date()
    });
    
    console.log('Successfully marked as pending');
    toast.success('Listing marked as pending');
  } catch (error) {
    logger.error('Error marking listing as pending:', error);
    toast.error('Failed to mark listing as pending');
  }
};

const handleMarkAsSold = (listing) => {
  setSelectedListing(listing);
  setIsBuyerSelectionModalOpen(true);
};

const handleMarkAsAvailable = async (listing) => {
  try {
    const listingRef = doc(firestoreDb, 'marketplaceItems', listing.id);
    await updateDoc(listingRef, {
      status: 'available',
      updatedAt: new Date()
    });
    toast.success('Listing marked as available');
  } catch (error) {
    logger.error('Error marking listing as available:', error);
    toast.error('Failed to mark listing as available');
  }
};
```

## State Management

### Primary State Variables
```javascript
const [allListings, setAllListings] = useState([]);
const [filteredListings, setFilteredListings] = useState([]);
const [filters, setFilters] = useState({
  search: '',
  category: '',
  gradingCompany: '',
  grade: ''
});
const [loading, setLoading] = useState(true);
const [cardImages, setCardImages] = useState({});
```

### Modal Management
```javascript
const [selectedListing, setSelectedListing] = useState(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
const [isBuyerSelectionModalOpen, setIsBuyerSelectionModalOpen] = useState(false);
```

### Filter Integration
```javascript
const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  
  let filtered = allListings;

  // Apply search filter across multiple fields
  if (newFilters.search) {
    const searchTerm = newFilters.search.toLowerCase();
    filtered = filtered.filter(listing => 
      listing.card?.name?.toLowerCase().includes(searchTerm) ||
      listing.card?.set?.toLowerCase().includes(searchTerm) ||
      listing.card?.category?.toLowerCase().includes(searchTerm) ||
      listing.note?.toLowerCase().includes(searchTerm)
    );
  }

  // Apply category filter
  if (newFilters.category) {
    filtered = filtered.filter(listing => 
      listing.card?.category === newFilters.category
    );
  }

  // Apply grading company filter
  if (newFilters.gradingCompany) {
    filtered = filtered.filter(listing => {
      if (newFilters.gradingCompany === 'RAW') {
        return !listing.card?.grader || listing.card?.grader === 'RAW';
      }
      return listing.card?.grader === newFilters.gradingCompany;
    });
  }

  // Apply grade filter
  if (newFilters.grade) {
    filtered = filtered.filter(listing => 
      listing.card?.grade === newFilters.grade
    );
  }

  setFilteredListings(filtered);
};
```

## Database Schema

### User Listing Query
```javascript
// Query structure for user's listings
const marketplaceQuery = query(
  collection(firestoreDb, 'marketplaceItems'),
  where('userId', '==', user.uid),
  orderBy('timestampListed', 'desc')
);

// Fallback query without ordering for index building
const simpleQuery = query(
  collection(firestoreDb, 'marketplaceItems'),
  where('userId', '==', user.uid)
);
```

### Listing Status States
```javascript
const LISTING_STATUSES = {
  AVAILABLE: 'available',    // Active listing, visible to buyers
  PENDING: 'pending',        // Sale in progress, not visible
  SOLD: 'sold',             // Completed sale, archived
  DRAFT: 'draft',           // Incomplete listing, not visible
  EXPIRED: 'expired'        // Inactive listing, can be reactivated
};
```

### Status Update Operations
```javascript
const updateListingStatus = async (listingId, newStatus, additionalData = {}) => {
  try {
    const listingRef = doc(firestoreDb, 'marketplaceItems', listingId);
    const updateData = {
      status: newStatus,
      updatedAt: new Date(),
      ...additionalData
    };

    if (newStatus === 'sold') {
      updateData.soldAt = new Date();
      updateData.soldPrice = additionalData.soldPrice;
      updateData.buyerId = additionalData.buyerId;
    }

    await updateDoc(listingRef, updateData);
    return { success: true };
  } catch (error) {
    logger.error('Error updating listing status:', error);
    return { success: false, error };
  }
};
```

## UI Components & Layout

### Listing Card Display
```javascript
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
  <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
    {/* Card Image */}
    {cardImages[listing.card?.slabSerial || listing.cardId] ? (
      <img
        src={cardImages[listing.card?.slabSerial || listing.cardId]}
        alt={listing.card?.name || 'Card'}
        className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
        onClick={() => handleCardClick(listing)}
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-4xl">🎴</span>
      </div>
    )}
    
    {/* Grade Badge */}
    {listing.card?.grade && (
      <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded-lg text-xs font-bold">
        {listing.card.grader} {listing.card.grade}
      </div>
    )}
    
    {/* Status Badge */}
    {listing.status && listing.status !== 'available' && (
      <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold ${
        listing.status === 'sold' ? 'bg-red-500 text-white' :
        listing.status === 'pending' ? 'bg-yellow-500 text-black' :
        'bg-gray-500 text-white'
      }`}>
        {listing.status.toUpperCase()}
      </div>
    )}
  </div>
  
  <div className="p-4">
    {/* Card Information */}
    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
      {listing.card?.name || 'Unknown Card'}
    </h3>
    
    <div className="space-y-2 mb-4">
      <p className="text-xl font-bold text-green-600 dark:text-green-400">
        {formatUserCurrency(listing.listingPrice)} {listing.currency}
      </p>
      
      {listing.card?.set && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {listing.card.set} {listing.card.year && `(${listing.card.year})`}
        </p>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-500">
        Listed: {new Date(listing.timestampListed.toDate()).toLocaleDateString()}
      </p>
    </div>
    
    {/* Action Buttons */}
    <div className="space-y-2">
      <button
        onClick={() => handleEditClick(listing)}
        className="w-full px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
      >
        Edit
      </button>
      
      {renderStatusButtons(listing)}
    </div>
  </div>
</div>
```

### Dynamic Status Buttons
```javascript
const renderStatusButtons = (listing) => {
  switch (listing.status) {
    case 'available':
      return (
        <>
          <button
            onClick={() => handleMarkAsPending(listing)}
            className="w-full px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors"
          >
            Mark as Pending
          </button>
          <button
            onClick={() => handleMarkAsSold(listing)}
            className="w-full px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
          >
            Mark as Sold
          </button>
        </>
      );
      
    case 'pending':
    case 'sold':
      return (
        <button
          onClick={() => handleMarkAsAvailable(listing)}
          className="w-full px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
        >
          Mark as Available
        </button>
      );
      
    default:
      return null;
  }
};
```

## Image Management System

### Multi-Source Image Loading
```javascript
const loadCardImages = async (listingsData) => {
  if (!listingsData || listingsData.length === 0) return;

  const newCardImages = {};

  for (const listing of listingsData) {
    try {
      const card = listing.card;
      if (!card) continue;

      const cardId = card.slabSerial || card.id || listing.cardId;
      if (!cardId) continue;

      // Priority-based image source checking
      const imageSources = [
        () => card.imageUrl,
        () => card.image,
        () => card.frontImageUrl,
        () => card.backImageUrl,
        () => card.imageData,
        () => listing.cloudImageUrl,
        () => listing.imageURL,
        async () => {
          // Fallback to IndexedDB
          try {
            const imageData = await db.getCardImage(cardId);
            return imageData;
          } catch (error) {
            return null;
          }
        }
      ];

      for (const getImageSource of imageSources) {
        try {
          const imageData = await getImageSource();
          if (imageData) {
            const url = ensureStringUrl(imageData);
            if (url) {
              newCardImages[cardId] = url;
              break;
            }
          }
        } catch (error) {
          continue; // Try next source
        }
      }
    } catch (error) {
      logger.warn(`Failed to load image for listing ${listing.id}:`, error);
    }
  }

  setCardImages(newCardImages);
  setLoading(false);
};
```

### Image URL Processing
```javascript
const ensureStringUrl = (imageData) => {
  if (!imageData) return null;

  // Handle various image data formats
  if (typeof imageData === 'string') {
    return imageData;
  }

  if (imageData instanceof File && window.URL) {
    return window.URL.createObjectURL(imageData);
  }

  if (typeof imageData === 'object') {
    // Check common URL properties
    const urlProps = ['url', 'src', 'uri', 'href', 'downloadURL'];
    for (const prop of urlProps) {
      if (imageData[prop]) return imageData[prop];
    }

    // Handle path-based references
    if (imageData.path && typeof imageData.path === 'string') {
      return imageData.path;
    }
  }

  if (imageData instanceof Blob && imageData.type?.startsWith('image/')) {
    return window.URL.createObjectURL(imageData);
  }

  return null;
};
```

## Performance Optimizations

### Efficient Data Loading
```javascript
// Optimized query with error handling
useEffect(() => {
  if (!user) return;

  setLoading(true);
  let unsubscribe;
  
  try {
    // Attempt optimized query with ordering
    const marketplaceQuery = query(
      marketplaceRef,
      where('userId', '==', user.uid),
      orderBy('timestampListed', 'desc')
    );

    unsubscribe = onSnapshot(marketplaceQuery, handleListingsUpdate, handleQueryError);
  } catch (error) {
    // Fallback to simple query if index is building
    if (error.message?.includes('requires an index')) {
      const simpleQuery = query(marketplaceRef, where('userId', '==', user.uid));
      unsubscribe = onSnapshot(simpleQuery, handleListingsUpdate, handleQueryError);
      setIndexBuildingError(true);
    } else {
      handleQueryError(error);
    }
  }

  return () => unsubscribe?.();
}, [user]);
```

### Component Optimization
- **React.memo**: Prevent unnecessary re-renders of listing cards
- **useMemo**: Cache filtered results and expensive calculations
- **useCallback**: Stable function references for event handlers
- **Lazy Loading**: Images loaded only when needed

## Sales Analytics Integration

### Transaction Recording
```javascript
const recordSale = async (listing, buyerInfo, saleDetails) => {
  try {
    // Update listing status
    await updateDoc(doc(firestoreDb, 'marketplaceItems', listing.id), {
      status: 'sold',
      soldAt: new Date(),
      soldPrice: saleDetails.finalPrice,
      buyerId: buyerInfo.id,
      updatedAt: new Date()
    });

    // Create sale record for analytics
    await addDoc(collection(firestoreDb, 'salesTransactions'), {
      sellerId: user.uid,
      buyerId: buyerInfo.id,
      listingId: listing.id,
      cardId: listing.cardId,
      originalPrice: listing.listingPrice,
      finalPrice: saleDetails.finalPrice,
      currency: listing.currency,
      transactionDate: new Date(),
      platform: 'marketplace'
    });

    // Update user statistics
    await updateUserSalesStats(user.uid, saleDetails);
    
    toast.success('Sale recorded successfully!');
  } catch (error) {
    logger.error('Error recording sale:', error);
    toast.error('Failed to record sale');
  }
};
```

### Performance Metrics
```javascript
const calculateListingMetrics = (listings) => {
  const metrics = {
    total: listings.length,
    available: 0,
    pending: 0,
    sold: 0,
    totalValue: 0,
    averagePrice: 0,
    oldestListing: null,
    newestListing: null
  };

  listings.forEach(listing => {
    metrics[listing.status]++;
    metrics.totalValue += listing.listingPrice;

    const listingDate = listing.timestampListed.toDate();
    if (!metrics.oldestListing || listingDate < metrics.oldestListing) {
      metrics.oldestListing = listingDate;
    }
    if (!metrics.newestListing || listingDate > metrics.newestListing) {
      metrics.newestListing = listingDate;
    }
  });

  metrics.averagePrice = metrics.total > 0 ? metrics.totalValue / metrics.total : 0;
  
  return metrics;
};
```

## Error Handling & Validation

### Status Update Validation
```javascript
const validateStatusChange = (currentStatus, newStatus) => {
  const validTransitions = {
    'available': ['pending', 'sold', 'draft'],
    'pending': ['available', 'sold'],
    'sold': ['available'], // Allow relisting
    'draft': ['available'],
    'expired': ['available', 'draft']
  };

  const allowed = validTransitions[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }
};
```

### Network Error Handling
```javascript
const handleQueryError = (error) => {
  if (error.message?.includes('net::ERR_BLOCKED_BY_CLIENT')) {
    // AdBlock interference - handle silently
    return;
  }
  
  if (error.message?.includes('requires an index')) {
    logger.warn('Index building in progress, using fallback query');
    setIndexBuildingError(true);
    return;
  }
  
  logger.error('Listings query error:', error);
  toast.error('Failed to load your listings. Please refresh.');
  setLoading(false);
};
```

## Testing Strategy

### Unit Testing
- Status transition logic
- Filter application functions
- Image loading utilities
- Metrics calculation

### Integration Testing
- Real-time listing updates
- Modal interactions
- Status change workflows
- Database operations

### User Experience Testing
- Edit listing flow
- Status management workflow
- Performance with large listing sets
- Mobile responsiveness

## Future Enhancements

### Advanced Management Features
- **Bulk Operations**: Select and modify multiple listings
- **Listing Templates**: Save common listing configurations
- **Automated Repricing**: Market-based price suggestions
- **Performance Analytics**: Detailed sales and engagement metrics

### Enhanced User Experience
- **Drag & Drop Reordering**: Custom listing organization
- **Quick Actions**: Keyboard shortcuts for common tasks
- **Advanced Filtering**: Date ranges, performance metrics
- **Export Functionality**: CSV/PDF reports of listing history

## Dependencies

### Core Libraries
- **React**: Component framework and state management
- **Firebase/Firestore**: Real-time database operations
- **React Hot Toast**: User notifications

### Utility Libraries
- **Logger**: Error tracking and debugging
- **User Preferences**: Currency formatting and display

## Troubleshooting

### Common Issues
1. **Listings Not Loading**: Check user authentication and Firestore permissions
2. **Status Updates Failing**: Verify network connection and data validation
3. **Images Missing**: Review image source priorities and loading logic
4. **Filter Not Working**: Confirm data structure consistency

### Debug Information
```javascript
console.log('My Listings Debug Info:', {
  userId: user?.uid,
  listingsCount: allListings.length,
  filteredCount: filteredListings.length,
  currentFilters: filters,
  loadingState: loading,
  hasImages: Object.keys(cardImages).length
});
```

This My Listings system provides comprehensive tools for sellers to manage their marketplace presence effectively while maintaining data integrity and user experience quality.
