# Marketplace Listing System - Technical Documentation

## Overview
The Marketplace Listing System enables users to list selected cards on the integrated marketplace for sale to other users. The system provides a comprehensive interface for setting prices, adding descriptions, and managing location information for each card listing.

## File Location
- **Component**: `src/components/Marketplace/ListCardModal.js`
- **Integration**: Used by `CardList.js` for bulk marketplace listing operations

## Component Architecture

### Props Interface
```javascript
const ListCardModal = ({ 
  isOpen,        // Boolean - Controls modal visibility
  onClose,       // Function - Callback when modal is closed
  selectedCards  // Array - Selected card objects for listing
})
```

### State Management
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);  // Submission loading state
const [listingData, setListingData] = useState({});       // Listing data per card
const [userLocation, setUserLocation] = useState('');     // User's default location
```

### Listing Data Structure
```javascript
// Structure for each card's listing data
listingData = {
  [cardId]: {
    price: '',      // Listing price as string
    note: '',       // Optional description/note
    location: ''    // Seller location
  }
}
```

## Initialization Process

### Component Setup
```javascript
useEffect(() => {
  if (!isOpen || !selectedCards || !Array.isArray(selectedCards) || selectedCards.length === 0) return;
  
  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const profileRef = doc(firestoreDb, 'marketplaceProfiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        setUserLocation(profileData.location || '');
      }
    } catch (error) {
      logger.error('Error loading user profile:', error);
    }
  };
  
  loadUserProfile();
  
  // Initialize listing data for each selected card
  const initialData = {};
  selectedCards.forEach(card => {
    if (!card) return;
    
    const cardId = card.slabSerial || card.id || card._id || JSON.stringify(card);
    initialData[cardId] = {
      price: '',
      note: '',
      location: userLocation || ''
    };
  });
  
  setListingData(initialData);
}, [selectedCards, isOpen, user]);
```

### User Location Integration
```javascript
// Update location when user profile is loaded
useEffect(() => {
  if (userLocation && listingData) {
    const updatedData = {};
    Object.keys(listingData).forEach(cardId => {
      updatedData[cardId] = {
        ...listingData[cardId],
        location: listingData[cardId].location || userLocation
      };
    });
    setListingData(updatedData);
  }
}, [userLocation]);
```

### UI Styling Setup
```javascript
// Custom scrollbar hiding and modal body scroll prevention
useEffect(() => {
  if (!isOpen) return;
  
  // Inject scrollbar hiding styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = scrollbarHideStyles;
  document.head.appendChild(styleEl);
  
  // Prevent body scrolling when modal is open
  const originalStyle = window.getComputedStyle(document.body).overflow;
  document.body.style.overflow = 'hidden';
  
  return () => {
    document.head.removeChild(styleEl);
    document.body.style.overflow = originalStyle;
  };
}, [isOpen]);
```

## Form Management

### Input Handling
```javascript
const handleInputChange = (cardId, field, value) => {
  setListingData(prev => ({
    ...prev,
    [cardId]: {
      ...prev[cardId],
      [field]: value
    }
  }));
};
```

### Form Validation
```javascript
const validateForm = () => {
  let isValid = true;
  const errors = {};

  // Check if listing data exists
  if (!listingData || Object.keys(listingData).length === 0) {
    return { 
      isValid: false, 
      errors: { 'general': 'No listing data available' } 
    };
  }

  Object.keys(listingData).forEach(cardId => {
    const cardData = listingData[cardId] || { price: '', note: '', location: '' };
    const numericPrice = parseFloat(cardData.price);
    
    // Price validation
    if (!cardData.price || cardData.price.trim() === '') {
      errors[`${cardId}_price`] = 'Price is required';
      isValid = false;
    } else if (isNaN(numericPrice) || numericPrice <= 0) {
      errors[`${cardId}_price`] = 'Price must be a valid number greater than 0';
      isValid = false;
    } else if (numericPrice < 0.01) {
      errors[`${cardId}_price`] = 'Price must be at least $0.01';
      isValid = false;
    }
    
    // Note validation (optional field - no validation needed)
    // Location validation (optional field - no validation needed)
  });

  return { isValid, errors };
};
```

## Card Display Interface

### Individual Card Listing Form
```javascript
{selectedCards.map((card, index) => {
  if (!card) return null;
  
  const cardId = card.slabSerial || card.id || card._id || JSON.stringify(card);
  const cardData = listingData[cardId] || { price: '', note: '', location: '' };
  
  return (
    <div key={cardId} className="bg-gray-50 dark:bg-[#252B3B] rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      {/* Card Header with Image and Details */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-28 bg-gray-200 dark:bg-[#1B2131] rounded-lg flex items-center justify-center flex-shrink-0">
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.card || card.name || 'Card'}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <span className="material-icons text-gray-400 text-2xl">image</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {card.card || card.name || 'Unnamed Card'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {card.player && `${card.player} • `}
            {card.set || 'Unknown Set'}
            {card.year && ` (${card.year})`}
          </p>
          
          {/* Investment Information */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <div>Investment: ${parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0).toFixed(2)}</div>
            {card.slabSerial && (
              <div>Slab Serial: {card.slabSerial}</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Listing Form Fields */}
      <div className="space-y-4">
        {/* Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Listing Price ({preferredCurrency.code}) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">
              {preferredCurrency.symbol}
            </span>
            <input
              type="number"
              value={cardData.price}
              onChange={(e) => handleInputChange(cardId, 'price', e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>
        </div>
        
        {/* Note and Location Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={cardData.note}
              onChange={(e) => handleInputChange(cardId, 'note', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="Add a note about this card..."
              rows="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              value={cardData.location}
              onChange={(e) => handleInputChange(cardId, 'location', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              placeholder="Enter your location (e.g., Sydney)"
            />
          </div>
        </div>
      </div>
    </div>
  );
})}
```

## Form Submission

### Submit Handler
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate form data
  const { isValid, errors } = validateForm();
  if (!isValid) {
    // Display validation errors
    Object.values(errors).forEach(error => {
      toast.error(error);
    });
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    // Process each selected card for listing
    const listingPromises = selectedCards.map(async (card) => {
      if (!card) return null;
      
      const cardId = card.slabSerial || card.id || card._id || JSON.stringify(card);
      const cardData = listingData[cardId];
      
      if (!cardData) {
        throw new Error(`No listing data found for card: ${cardId}`);
      }
      
      // Prepare listing document
      const listingDoc = {
        // Card Information
        cardName: card.card || card.name || 'Unnamed Card',
        playerName: card.player || '',
        setName: card.set || 'Unknown Set',
        year: card.year || '',
        cardNumber: card.cardNumber || '',
        slabSerial: card.slabSerial || '',
        grade: card.grade || '',
        gradingCompany: card.gradingCompany || '',
        
        // Listing Information
        price: parseFloat(cardData.price),
        currency: preferredCurrency.code,
        note: cardData.note || '',
        location: cardData.location || '',
        
        // Seller Information
        sellerId: user.uid,
        sellerDisplayName: user.displayName || user.email || 'Anonymous',
        
        // Metadata
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Additional card data for reference
        originalCardData: {
          investmentAmount: card.originalInvestmentAmount || card.investmentAUD || 0,
          investmentCurrency: card.originalInvestmentCurrency || preferredCurrency.code,
          collection: card.collection || card.collectionName || '',
          datePurchased: card.datePurchased || ''
        }
      };
      
      // Add to Firestore marketplace collection
      const docRef = await addDoc(collection(firestoreDb, 'marketplaceListings'), listingDoc);
      
      // Update the card to mark it as listed
      await updateDoc(doc(firestoreDb, 'cards', card.id), {
        isListed: true,
        listingId: docRef.id,
        listedAt: serverTimestamp()
      });
      
      return { cardId, listingId: docRef.id };
    });
    
    // Wait for all listings to complete
    const results = await Promise.all(listingPromises);
    const successCount = results.filter(result => result !== null).length;
    
    // Show success message
    toast.success(`Successfully listed ${successCount} card${successCount > 1 ? 's' : ''} on the marketplace!`);
    
    // Close modal
    onClose();
    
  } catch (error) {
    console.error('Error creating marketplace listings:', error);
    
    // Handle specific error types
    if (error.code === 'permission-denied') {
      toast.error('Permission denied. Please check your marketplace access.');
    } else if (error.code === 'network-error') {
      toast.error('Network error. Please check your connection and try again.');
    } else {
      toast.error('Failed to list cards on marketplace. Please try again.');
    }
    
    logger.error('Marketplace listing error:', { error, selectedCards, listingData });
  } finally {
    setIsSubmitting(false);
  }
};
```

## Data Structures

### Marketplace Listing Document
```javascript
{
  // Card Identification
  cardName: "Pikachu",
  playerName: "Pikachu",
  setName: "Base Set",
  year: "1998",
  cardNumber: "25",
  slabSerial: "PSA12345678",
  grade: "10",
  gradingCompany: "PSA",
  
  // Listing Details
  price: 150.00,
  currency: "AUD",
  note: "Mint condition, perfect centering",
  location: "Sydney, NSW",
  
  // Seller Information
  sellerId: "user123",
  sellerDisplayName: "CardCollector",
  
  // Status and Timestamps
  status: "active", // active, sold, withdrawn
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z",
  
  // Reference Data
  originalCardData: {
    investmentAmount: 100.00,
    investmentCurrency: "AUD",
    collection: "Vintage Pokemon",
    datePurchased: "2023-06-15"
  }
}
```

### Card Update Structure
```javascript
// Updates to original card document
{
  isListed: true,
  listingId: "listing_doc_id",
  listedAt: "2024-01-15T10:30:00.000Z"
}
```

## Integration Points

### CardList Integration
```javascript
// In CardList.js - bulk marketplace listing
const handleListCards = () => {
  if (selectedCards.size === 0) {
    toast.error('Please select at least one card to list');
    return;
  }
  
  const selectedCardData = cards.filter(card => selectedCards.has(card.slabSerial));
  setSelectedCardsForListing(selectedCardData);
  setShowListCardModal(true);
};

// Modal implementation
<ListCardModal
  isOpen={showListCardModal}
  onClose={() => {
    setShowListCardModal(false);
    setSelectedCardsForListing([]);
  }}
  selectedCards={selectedCardsForListing}
/>
```

### User Profile Integration
- Loads user's default location from marketplace profile
- Uses location as default for all listings
- Allows individual location override per card

### Firestore Integration
- Creates documents in `marketplaceListings` collection
- Updates original card documents with listing status
- Uses Firestore security rules for access control

## Error Handling

### Validation Errors
- **Missing price**: "Price is required"
- **Invalid price**: "Price must be a valid number greater than 0"
- **Minimum price**: "Price must be at least $0.01"
- **No listing data**: "No listing data available"

### Database Errors
```javascript
// Permission errors
if (error.code === 'permission-denied') {
  toast.error('Permission denied. Please check your marketplace access.');
}

// Network errors
if (error.code === 'network-error') {
  toast.error('Network error. Please check your connection and try again.');
}

// Generic errors
toast.error('Failed to list cards on marketplace. Please try again.');
```

### Data Integrity
- Validates card data exists before processing
- Handles missing card identifiers gracefully
- Ensures all required fields are present in listing document

## UI/UX Features

### Responsive Design
- Adapts to different screen sizes
- Stacked layout on mobile devices
- Optimized form fields for touch interaction

### Loading States
```javascript
{isSubmitting ? (
  <>
    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
    <span>Listing...</span>
  </>
) : (
  <>
    <span className="material-icons text-sm">storefront</span>
    <span>List on Marketplace</span>
  </>
)}
```

### Accessibility Features
- Proper form labels and ARIA attributes
- Keyboard navigation support
- High contrast error states
- Screen reader compatible structure

## Performance Considerations

### Efficient Form Management
- Single state object for all listing data
- Debounced input handling for large card lists
- Optimized re-renders through proper state management

### Batch Operations
- Parallel listing creation using Promise.all
- Atomic updates to card documents
- Rollback capability on partial failures

### Memory Management
- Cleanup of injected styles on unmount
- Proper restoration of body scroll behavior
- Event listener cleanup

## Future Enhancements

### Advanced Listing Features
1. **Bulk Pricing**: Apply percentage markup to investment cost
2. **Price Suggestions**: AI-powered pricing recommendations
3. **Listing Templates**: Save and reuse common listing configurations
4. **Auction Support**: Timed auctions with bidding functionality
5. **Condition Notes**: Standardized condition reporting

### Integration Enhancements
1. **Image Upload**: Multiple photos per listing
2. **Shipping Calculator**: Integrated shipping cost calculation
3. **Payment Integration**: Secure payment processing
4. **Inventory Sync**: Real-time availability updates
5. **Analytics**: Listing performance tracking

### User Experience
1. **Draft Listings**: Save incomplete listings as drafts
2. **Bulk Edit**: Edit multiple listings simultaneously
3. **Quick Actions**: One-click repricing and relisting
4. **Mobile App**: Native mobile listing experience
5. **Social Sharing**: Share listings on social media

This Marketplace Listing System provides a comprehensive solution for creating card marketplace listings with proper validation, error handling, and seamless integration with the card management workflow.
