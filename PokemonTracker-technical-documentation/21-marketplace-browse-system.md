# Marketplace Browse System Technical Documentation

## Overview

The Marketplace Browse System is the main interface for discovering and browsing Pokemon card listings in the marketplace. It provides comprehensive filtering, searching, and pagination capabilities while supporting both authenticated user features and public browsing for non-registered users.

## Architecture

### Core Components

#### 1. Marketplace.js (Authenticated Browse)
- **Purpose**: Main marketplace interface for authenticated users
- **Features**: Full functionality including messaging, seller profiles, reporting
- **Location**: `src/components/Marketplace/Marketplace.js`

#### 2. PublicMarketplace.js (Public Browse)
- **Purpose**: Limited marketplace view for non-authenticated users  
- **Features**: Browse listings with prompts to register for full functionality
- **Location**: `src/components/PublicMarketplace.js`

#### 3. MarketplaceCard.js
- **Purpose**: Individual listing card display component
- **Features**: Lazy loading, image optimization, responsive design
- **Location**: `src/components/Marketplace/MarketplaceCard.js`

## Key Features

### Real-Time Listing Updates
```javascript
useEffect(() => {
  if (!user) return;

  const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
  const marketplaceQuery = query(
    marketplaceRef,
    where('status', '==', 'available'),
    orderBy('timestampListed', 'desc')
  );

  const unsubscribe = onSnapshot(marketplaceQuery, (snapshot) => {
    const listingsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setAllListings(listingsData);
    setFilteredListings(listingsData);
    loadCardImages(listingsData);
  });

  return () => unsubscribe();
}, [user]);
```

### Advanced Filtering System
- **Text Search**: Card names, brands, categories
- **Category Filter**: Pokemon, Yu-Gi-Oh!, Magic, etc.
- **Grading Company**: PSA, BGS, CGC, SGC, Raw/Ungraded
- **Grade Filter**: Dynamic options based on selected grading company
- **Real-Time**: Instant results as filters change

### Image Loading & Optimization
```javascript
const loadCardImages = async (listingsData) => {
  const newCardImages = {};

  for (const listing of listingsData) {
    try {
      const card = listing.card;
      const cardId = card.slabSerial || card.id || listing.cardId;
      
      // Check multiple image sources in priority order
      if (card.imageUrl) {
        newCardImages[cardId] = ensureStringUrl(card.imageUrl);
      } else if (card.image) {
        newCardImages[cardId] = ensureStringUrl(card.image);
      } else {
        // Fallback to IndexedDB or Firebase Storage
        const imageData = await db.getCardImage(cardId);
        if (imageData) {
          newCardImages[cardId] = ensureStringUrl(imageData);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load image for card ${cardId}:`, error);
    }
  }

  setCardImages(newCardImages);
  setLoading(false);
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

### Modal States
```javascript
const [selectedListing, setSelectedListing] = useState(null);
const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
const [showSellerProfile, setShowSellerProfile] = useState(false);
const [showReportModal, setShowReportModal] = useState(false);
```

### Pagination State
```javascript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 24;

const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;
const paginatedListings = filteredListings.slice(startIndex, endIndex);
```

## Database Integration

### Listing Query Structure
```javascript
// Primary query with composite index
const marketplaceQuery = query(
  marketplaceRef,
  where('status', '==', 'available'),
  orderBy('timestampListed', 'desc')
);

// Fallback query for index building
const simpleQuery = query(
  marketplaceRef,
  where('status', '==', 'available')
);
```

### Listing Data Schema
```javascript
{
  id: "listingId",
  userId: "sellerId",
  cardId: "cardIdentifier",
  card: {
    name: "Charizard",
    set: "Base Set",
    year: "1998",
    grade: "10",
    grader: "PSA",
    slabSerial: "12345678",
    imageUrl: "image_url",
    category: "Pokemon"
  },
  listingPrice: 1500.00,
  currency: "USD",
  status: "available", // available, pending, sold
  timestampListed: Timestamp,
  location: "New York, NY",
  note: "Mint condition card"
}
```

## User Interactions

### Listing Actions
```javascript
const handleContactSeller = (listing, message = '') => {
  setSelectedListing(listing);
  setPrefilledMessage(message);
  setIsMessageModalOpen(true);
};

const handleCardClick = (listing) => {
  setSelectedListing(listing);
  setIsDetailModalOpen(true);
};

const handleViewSellerProfile = (sellerId) => {
  setSelectedSellerId(sellerId);
  setShowSellerProfile(true);
};

const handleReportListing = (listing) => {
  setReportingListing(listing);
  setShowReportModal(true);
};
```

### Filter Handling
```javascript
const handleFilterChange = (newFilters) => {
  setFilters(newFilters);
  setCurrentPage(1); // Reset to first page

  let filtered = allListings;

  // Apply search filter
  if (newFilters.search) {
    const searchTerm = newFilters.search.toLowerCase();
    filtered = filtered.filter(listing => 
      listing.card?.name?.toLowerCase().includes(searchTerm) ||
      listing.card?.set?.toLowerCase().includes(searchTerm) ||
      listing.card?.category?.toLowerCase().includes(searchTerm)
    );
  }

  // Apply category filter
  if (newFilters.category) {
    filtered = filtered.filter(listing => 
      listing.card?.category === newFilters.category
    );
  }

  // Apply grading filters
  if (newFilters.gradingCompany) {
    filtered = filtered.filter(listing => 
      listing.card?.grader === newFilters.gradingCompany
    );
  }

  if (newFilters.grade) {
    filtered = filtered.filter(listing => 
      listing.card?.grade === newFilters.grade
    );
  }

  setFilteredListings(filtered);
};
```

## UI Components & Layout

### Grid Layout
```javascript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
  {paginatedListings.map((listing) => (
    <div key={listing.id} className="listing-card">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Responsive Card Design
```javascript
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
  <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
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
    
    {listing.card?.grade && (
      <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded-lg text-xs font-bold">
        {listing.card.grader} {listing.card.grade}
      </div>
    )}
  </div>
  
  <div className="p-4">
    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
      {listing.card?.name || 'Unknown Card'}
    </h3>
    <p className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
      {formatUserCurrency(listing.listingPrice)} {listing.currency}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
      {listing.location || 'No location'}
    </p>
    
    <button
      onClick={() => handleContactSeller(listing)}
      className={`w-full px-3 py-2 text-white text-sm rounded-md transition-colors ${
        existingChats[listing.id] 
          ? 'bg-green-500 hover:bg-green-600' 
          : 'bg-red-500 hover:bg-red-600'
      }`}
    >
      {existingChats[listing.id] ? 'See Chat' : 'Contact Seller'}
    </button>
  </div>
</div>
```

## Public vs Authenticated Features

### Public Marketplace Limitations
```javascript
// Public users see limited listings and get signup prompts
const PublicMarketplace = () => {
  const [listings, setListings] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchListings = async () => {
    try {
      const marketplaceRef = collection(firestoreDb, 'marketplaceItems');
      const publicQuery = query(
        marketplaceRef,
        where('status', '==', 'available'),
        orderBy('timestampListed', 'desc'),
        limit(20) // Limited results for public view
      );
      
      const snapshot = await getDocs(publicQuery);
      const listingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setListings(listingsData);
    } catch (error) {
      logger.error('Error fetching public listings:', error);
    }
  };

  // All interactions prompt for signup
  const handleSignUpPrompt = () => {
    setShowLoginModal(true);
  };
};
```

### Feature Comparison
| Feature | Authenticated Users | Public Users |
|---------|-------------------|--------------|
| View Listings | Full access | Limited (20 items) |
| Contact Sellers | ✅ | ❌ (Signup prompt) |
| Advanced Filters | ✅ | ❌ |
| Save Favorites | ✅ | ❌ |
| Seller Profiles | ✅ | ❌ |
| Report Listings | ✅ | ❌ |
| Message History | ✅ | ❌ |

## Performance Optimizations

### Image Loading
- **Lazy Loading**: Images loaded as cards enter viewport
- **Multiple Sources**: Fallback hierarchy for image retrieval
- **Caching**: Browser and application-level caching
- **Error Handling**: Graceful fallbacks for missing images

### Query Optimization
```javascript
// Index building detection and fallback
try {
  // Attempt optimized query
  unsubscribe = onSnapshot(marketplaceQuery, handleSnapshot);
} catch (error) {
  if (error.message.includes('requires an index')) {
    // Fall back to simple query
    unsubscribe = onSnapshot(simpleQuery, handleSnapshot);
    setIndexBuildingError(true);
  }
}
```

### Component Optimization
- **React.memo**: Prevent unnecessary re-renders
- **useMemo**: Cache expensive calculations
- **useCallback**: Stable function references
- **Virtualization**: Consider for very large result sets

## Error Handling

### Network & Database Errors
```javascript
const handleQueryError = (error) => {
  if (error.message?.includes('net::ERR_BLOCKED_BY_CLIENT')) {
    // AdBlock related - ignore silently
    return;
  }
  
  if (error.message?.includes('requires an index')) {
    setIndexBuildingError(true);
    fallbackToSimpleQuery();
    return;
  }
  
  logger.error('Marketplace query error:', error);
  toast.error('Failed to load listings. Please try again.');
};
```

### Image Loading Errors
```javascript
const ensureStringUrl = (imageData) => {
  if (!imageData) return null;
  
  try {
    // Multiple format handling
    if (typeof imageData === 'string') return imageData;
    if (imageData.url) return imageData.url;
    if (imageData instanceof File) return URL.createObjectURL(imageData);
    // ... additional formats
  } catch (error) {
    logger.warn('Image URL processing failed:', error);
    return null;
  }
};
```

## Integration Points

### With Search & Filter System
- **Component**: `MarketplaceSearchFilters`
- **Data Flow**: Filter changes → state update → re-render
- **Persistence**: Filter state maintained during session

### With Pagination System
- **Component**: `MarketplacePagination`
- **Logic**: Client-side pagination for responsive performance
- **Navigation**: URL state management for shareable links

### With Navigation System
- **Tab Integration**: Seamless switching between marketplace views
- **Deep Linking**: Direct links to specific listings or searches
- **History Management**: Back/forward navigation support

## Security Considerations

### Data Access
- **Firestore Rules**: Listings filtered by status and visibility
- **User Authentication**: Required for sensitive operations
- **Rate Limiting**: Protection against abuse via Cloud Functions

### Content Moderation
- **Reporting System**: User-generated reports for inappropriate content
- **Admin Review**: Flagged listings require manual approval
- **Automated Filtering**: Basic content validation on submission

## Testing Strategy

### Unit Testing
- Filter logic functions
- Image loading utilities
- Pagination calculations
- Error handling scenarios

### Integration Testing
- Real-time data updates
- Filter and search combinations
- Modal interactions
- Navigation flows

### Performance Testing
- Large dataset handling
- Image loading performance
- Query optimization validation
- Mobile responsiveness

## Future Enhancements

### Advanced Features
- **Saved Searches**: Alert users to new matching listings
- **Watchlists**: Track interesting items without commitment
- **Price History**: Show market trends for specific cards
- **Advanced Sorting**: By price, date, popularity, distance

### UI/UX Improvements
- **Infinite Scroll**: Alternative to pagination
- **Grid/List Toggle**: User preference for display mode
- **Enhanced Filters**: Price ranges, condition, seller ratings
- **Map View**: Geographic listing visualization

### Performance Enhancements
- **Server-Side Rendering**: Improved SEO and initial load
- **CDN Integration**: Faster image delivery
- **Progressive Loading**: Skeleton screens and loading states
- **Caching Strategy**: Redis or similar for frequent queries

## Dependencies

### Core Libraries
- **React**: Component framework and hooks
- **Firebase/Firestore**: Real-time database
- **React Router**: Navigation and routing

### UI Components
- **Design System**: Consistent component library
- **Icons**: Unified icon system
- **Toast Notifications**: User feedback system

## Troubleshooting

### Common Issues
1. **Listings Not Loading**: Check Firestore connection and rules
2. **Images Missing**: Verify image URL formats and sources
3. **Filters Not Working**: Confirm data structure consistency
4. **Performance Issues**: Review query optimization and caching

### Debug Tools
- **Console Logging**: Detailed operation tracking
- **Firebase Console**: Database query monitoring
- **Network Tab**: Image loading inspection
- **React DevTools**: Component state analysis

This browse system provides a comprehensive, scalable foundation for marketplace discovery while maintaining excellent performance and user experience across all platforms.
