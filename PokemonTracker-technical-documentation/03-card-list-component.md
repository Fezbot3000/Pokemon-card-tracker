# Card List Component - Technical Documentation

## Overview
The Card List is the main interface for displaying, filtering, sorting, and managing Pokemon card collections. It provides comprehensive card management features including bulk operations, statistics display, collection switching, and real-time updates.

## File Location
- **Primary Component**: `src/components/CardList.js`
- **Supporting Components**: 
  - `src/design-system/StatisticsSummary.js`
  - `src/design-system/SearchToolbar.js` 
  - `src/design-system/Card.js`
  - `src/components/SaleModal.js`
  - `src/components/MoveCardsModal.js`
  - `src/components/CardDetails.js`

## Component Architecture

### Props Interface
```javascript
const CardList = ({ 
  cards,                    // Array of card objects
  exchangeRate,            // Current USD to AUD exchange rate
  onCardClick,             // Handler for card selection
  onDeleteCard,            // Handler for single card deletion
  onDeleteCards,           // Handler for bulk card deletion
  onUpdateCard,            // Handler for card updates
  onAddCard,               // Handler for adding new cards
  selectedCollection,      // Currently active collection name
  collections,             // Object containing all collections
  setCollections,          // Function to update collections
  onCollectionChange,      // Handler for collection switching
  onSelectionChange        // Handler for card selection changes
})
```

### State Management
The CardList manages extensive state for filtering, sorting, selection, and UI interactions:

```javascript
// UI State
const [filter, setFilter] = useState('');
const [sortField, setSortField] = useState(
  localStorage.getItem('cardListSortField') || 'currentValueAUD'
);
const [sortDirection, setSortDirection] = useState(
  localStorage.getItem('cardListSortDirection') || 'desc'
);
const [viewMode, setViewMode] = useState(
  localStorage.getItem('cardListViewMode') || 'grid'
);

// Display and Interaction State
const [displayMetric, setDisplayMetric] = useState(() => {
  const saved = localStorage.getItem('cardListDisplayMetric');
  return saved || 'currentValueAUD';
});
const [showSortDropdown, setShowSortDropdown] = useState(false);
const [showMetricDropdown, setShowMetricDropdown] = useState(false);
const [showValueDropdown, setShowValueDropdown] = useState(false);

// Selection and Modal State
const [selectedCards, setSelectedCards] = useState(new Set());
const [selectedCard, setSelectedCard] = useState(null);
const [showCardDetails, setShowCardDetails] = useState(false);
const [showSaleModal, setShowSaleModal] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showMoveModal, setShowMoveModal] = useState(false);

// Card Processing State
const [cardsToDelete, setCardsToDelete] = useState([]);
const [selectedCardsForSale, setSelectedCardsForSale] = useState([]);
const [selectedCardsToMove, setSelectedCardsToMove] = useState([]);
const [cardImages, setCardImages] = useState({});
const [imageLoadingStates, setImageLoadingStates] = useState({});
```

## Key Functions

### 1. Card Filtering and Sorting (`useMemo` optimizations)

#### Filtered Cards Processing
```javascript
const filteredCards = useMemo(() => {
  if (!cards || cards.length === 0) return [];
  
  // First filter by collection
  let filtered = cards;
  
  if (selectedCollection && selectedCollection !== 'All Cards') {
    if (selectedCollection.toLowerCase() === 'sold') {
      // For sold collection, get sold cards instead
      filtered = soldCards || [];
    } else {
      // Filter by collection name
      filtered = cards.filter(card => {
        const cardCollection = card.collection || card.collectionId || '';
        return cardCollection === selectedCollection;
      });
    }
  }

  // Then filter by search term
  if (filter.trim()) {
    const searchTerm = filter.toLowerCase().trim();
    filtered = filtered.filter(card => {
      // Search across multiple fields
      const searchableFields = [
        card.cardName || '',
        card.player || '',
        card.set || '',
        card.setName || '',
        card.year ? String(card.year) : '',
        card.category || '',
        card.condition || '',
        card.certificationNumber || '',
        card.slabSerial || '',
        card.id || ''
      ];
      
      return searchableFields.some(field => 
        String(field).toLowerCase().includes(searchTerm)
      );
    });
  }

  return filtered;
}, [cards, selectedCollection, filter, soldCards]);
```

#### Sorted Cards Processing
```javascript
const sortedCards = useMemo(() => {
  if (!filteredCards || filteredCards.length === 0) return [];
  
  const sorted = [...filteredCards].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle different data types
    if (sortField.includes('Value') || sortField.includes('investment') || sortField === 'quantity') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (sortField === 'datePurchased' || sortField === 'addedAt') {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    } else {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}, [filteredCards, sortField, sortDirection]);
```

### 2. Image Loading Management

#### Bulk Image Loading
```javascript
const loadCardImages = useCallback(async () => {
  if (!sortedCards || sortedCards.length === 0) return;

  const newImageStates = {};
  const newImages = {};

  // Initialize loading states
  sortedCards.forEach(card => {
    const cardId = card.id || card.slabSerial;
    if (cardId && !cardImages[cardId]) {
      newImageStates[cardId] = 'loading';
    }
  });

  setImageLoadingStates(prev => ({ ...prev, ...newImageStates }));

  // Load images in batches to avoid overwhelming the browser
  const BATCH_SIZE = 10;
  for (let i = 0; i < sortedCards.length; i += BATCH_SIZE) {
    const batch = sortedCards.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (card) => {
        const cardId = card.id || card.slabSerial;
        if (!cardId || cardImages[cardId]) return;

        try {
          const imageUrl = await db.getCardImage(cardId);
          if (imageUrl) {
            newImages[cardId] = imageUrl;
            setImageLoadingStates(prev => ({ ...prev, [cardId]: 'loaded' }));
          } else {
            setImageLoadingStates(prev => ({ ...prev, [cardId]: 'no-image' }));
          }
        } catch (error) {
          console.error(`Error loading image for card ${cardId}:`, error);
          setImageLoadingStates(prev => ({ ...prev, [cardId]: 'error' }));
        }
      })
    );

    setCardImages(prev => ({ ...prev, ...newImages }));
  }
}, [sortedCards, cardImages]);
```

#### Individual Image Refresh
```javascript
const refreshCardImage = useCallback(async (cardId) => {
  if (!cardId) return;

  setImageLoadingStates(prev => ({ ...prev, [cardId]: 'loading' }));

  try {
    const imageUrl = await db.getCardImage(cardId);
    if (imageUrl) {
      setCardImages(prev => ({ ...prev, [cardId]: imageUrl }));
      setImageLoadingStates(prev => ({ ...prev, [cardId]: 'loaded' }));
    } else {
      setImageLoadingStates(prev => ({ ...prev, [cardId]: 'no-image' }));
    }
  } catch (error) {
    console.error(`Error refreshing image for card ${cardId}:`, error);
    setImageLoadingStates(prev => ({ ...prev, [cardId]: 'error' }));
  }
}, []);
```

### 3. Card Selection Management

#### Multi-Select Functionality
```javascript
const { 
  selectedCards, 
  toggleCardSelection, 
  selectAllCards, 
  clearSelection,
  isCardSelected 
} = useCardSelection(sortedCards, onSelectionChange);

// Toggle individual card selection
const handleCardSelect = (e, card) => {
  e.stopPropagation();
  toggleCardSelection(card.id || card.slabSerial);
};

// Select/deselect all cards
const handleSelectAll = () => {
  if (selectedCards.size === sortedCards.length) {
    clearSelection();
  } else {
    selectAllCards();
  }
};
```

### 4. Bulk Operations

#### Bulk Delete Operation
```javascript
const handleBulkDelete = async (cardsToDelete) => {
  if (!cardsToDelete || cardsToDelete.length === 0) {
    return;
  }

  try {
    // Extract card IDs for image cleanup
    const cardIds = cardsToDelete.map(card => card.id || card.slabSerial).filter(Boolean);
    
    // Clean up blob URLs before deletion
    const cardsWithBlobUrls = cardsToDelete.filter(card => 
      cardImages[card.id || card.slabSerial] && 
      cardImages[card.id || card.slabSerial].startsWith('blob:')
    );
    
    cardsWithBlobUrls.forEach(card => {
      const cardId = card.id || card.slabSerial;
      const imageUrl = cardImages[cardId];
      try {
        URL.revokeObjectURL(imageUrl);
      } catch (e) {
        console.warn(`Failed to revoke blob URL for card ${cardId}:`, e);
      }
    });

    // Dispatch cleanup event for other components
    if (cardIds.length > 0) {
      window.dispatchEvent(new CustomEvent('card-images-cleanup', {
        detail: { cardIds }
      }));
    }

    // Remove images from state
    setCardImages(prev => {
      const newImages = { ...prev };
      cardIds.forEach(cardId => {
        delete newImages[cardId];
      });
      return newImages;
    });

    setImageLoadingStates(prev => {
      const newStates = { ...prev };
      cardIds.forEach(cardId => {
        delete newStates[cardId];
      });
      return newStates;
    });

    // Perform bulk deletion via parent callback
    if (onDeleteCards) {
      await onDeleteCards(cardsToDelete);
    } else {
      // Fallback to individual deletions
      for (const card of cardsToDelete) {
        await onDeleteCard(card);
      }
    }

    // Clear selection after successful deletion
    clearSelection();
    
    toast.success(`Successfully deleted ${cardsToDelete.length} card${cardsToDelete.length > 1 ? 's' : ''}`);
    
  } catch (error) {
    console.error('Error in bulk delete operation:', error);
    toast.error(`Failed to delete cards: ${error.message}`);
  }
};
```

#### Move Cards Between Collections
```javascript
const handleMoveConfirm = async (targetCollection) => {
  if (!selectedCardsToMove || selectedCardsToMove.length === 0 || !targetCollection) {
    return;
  }

  try {
    // Update each card's collection
    for (const card of selectedCardsToMove) {
      const updatedCard = {
        ...card,
        collection: targetCollection,
        collectionId: targetCollection,
        lastModified: new Date().toISOString()
      };
      
      await onUpdateCard(updatedCard);
    }

    // Get updated collections data
    const updatedCollections = await db.getCollections();
    setCollections(updatedCollections);

    toast.success(`Successfully moved ${selectedCardsToMove.length} card${selectedCardsToMove.length > 1 ? 's' : ''} to ${targetCollection}`);
    
    setShowMoveModal(false);
    setSelectedCardsToMove([]);
    clearSelection();
    
  } catch (error) {
    console.error('Error moving cards:', error);
    toast.error(`Failed to move cards: ${error.message}`);
  }
};
```

### 5. Sale Processing

#### Sale Modal Integration
```javascript
const handleSaleConfirm = async ({ buyer, dateSold, soldPrices, totalSalePrice, totalProfit }) => {
  try {
    // Get existing sold cards
    const existingSoldCards = await db.getSoldCards() || [];
    
    // Process each card for sale
    const newSoldCards = selectedCardsForSale.map((card, index) => ({
      ...card,
      saleDetails: {
        buyer,
        dateSold,
        soldPrice: soldPrices[index],
        originalInvestment: card.investmentAUD || 0,
        profit: soldPrices[index] - (card.investmentAUD || 0)
      },
      soldAt: new Date().toISOString(),
      invoiceId: generateInvoiceId()
    }));

    // Add to sold cards collection
    const allSoldCards = [...existingSoldCards, ...newSoldCards];
    await db.saveSoldCards(allSoldCards);

    // Remove from current collection
    for (const card of selectedCardsForSale) {
      await onDeleteCard(card);
    }

    toast.success(`Successfully sold ${selectedCardsForSale.length} card${selectedCardsForSale.length > 1 ? 's' : ''}`);
    
    setShowSaleModal(false);
    setSelectedCardsForSale([]);
    clearSelection();
    
  } catch (error) {
    console.error('Error processing sale:', error);
    toast.error(`Failed to process sale: ${error.message}`);
  }
};
```

### 6. Statistics Calculation

#### Real-time Statistics
```javascript
const statistics = useMemo(() => {
  if (!sortedCards || sortedCards.length === 0) {
    return {
      totalCards: 0,
      totalInvestment: 0,
      totalCurrentValue: 0,
      totalProfit: 0,
      averageCard: 0,
      profitMargin: 0
    };
  }

  const totals = calculateCardTotals(sortedCards, preferredCurrency);
  return formatStatisticsForDisplay(totals, formatUserCurrency);
}, [sortedCards, preferredCurrency, formatUserCurrency]);
```

## UI Components Integration

### Statistics Summary
```javascript
<StatisticsSummary
  statistics={statistics}
  viewMode={viewMode}
  displayMetric={displayMetric}
  onDisplayMetricChange={setDisplayMetric}
  onViewModeChange={setViewMode}
  className="mb-6"
/>
```

### Search and Filter Toolbar
```javascript
<SearchToolbar
  filter={filter}
  onFilterChange={setFilter}
  sortField={sortField}
  sortDirection={sortDirection}
  onSortChange={handleSortChange}
  showSortDropdown={showSortDropdown}
  onSortDropdownToggle={toggleSortDropdown}
  getSortFieldLabel={getSortFieldLabel}
  placeholder="Search cards by name, set, player, or certification number..."
  className="mb-4"
/>
```

### Card Grid/List Rendering
```javascript
<div className={`cards-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
  {sortedCards.map((card) => (
    <Card
      key={card.id || card.slabSerial}
      card={card}
      image={cardImages[card.id || card.slabSerial]}
      imageLoadingState={imageLoadingStates[card.id || card.slabSerial] || 'loading'}
      onImageRetry={() => refreshCardImage(card.id || card.slabSerial)}
      onClick={() => handleCardClick(card)}
      onSelect={(e) => handleCardSelect(e, card)}
      isSelected={isCardSelected(card.id || card.slabSerial)}
      displayMetric={displayMetric}
      viewMode={viewMode}
      selectionMode={selectedCards.size > 0}
      showCheckbox={selectedCards.size > 0}
    />
  ))}
</div>
```

## Performance Optimizations

### Memoization Strategy
- `filteredCards`: Memoized based on cards, selectedCollection, filter, soldCards
- `sortedCards`: Memoized based on filteredCards, sortField, sortDirection  
- `statistics`: Memoized based on sortedCards, preferredCurrency, formatUserCurrency
- Image loading: Batched and debounced to prevent UI blocking

### Virtual Scrolling (Future Enhancement)
Currently renders all cards but designed for easy virtual scrolling integration:

```javascript
// Placeholder for future virtual scrolling implementation
const { ref, inView } = useInView({
  threshold: 0,
  triggerOnce: false,
});
```

### State Persistence
Critical UI state persisted to localStorage:
- Sort field and direction
- View mode (grid/list)  
- Display metric preference
- Filter text (session-based)

## Data Flow

### Collection Switching Flow
1. User selects collection → `onCollectionChange` called
2. `selectedCollection` prop updated → `filteredCards` recalculated
3. Card images loaded for visible cards → UI updates
4. Statistics recalculated → Display updated

### Card Update Flow  
1. User edits card → Card Details Modal opened
2. User saves changes → `onUpdateCard` called with updated data
3. Parent updates cards array → Component re-renders with new data
4. Statistics automatically recalculated → UI reflects changes

### Bulk Operation Flow
1. User selects cards → Selection state updated
2. User chooses bulk action → Appropriate modal opened
3. User confirms action → Bulk operation executed
4. Database updated → Parent refreshes data
5. Selection cleared → UI returns to normal state

## Error Handling

### Image Loading Errors
- Individual card image failures handled gracefully
- Retry functionality available for failed loads
- Loading states provide user feedback
- Memory leaks prevented through proper cleanup

### Database Operation Errors  
- Save/delete operations wrapped in try-catch
- User-friendly error messages via toast notifications
- Partial failures handled without breaking UI
- Optimistic updates with rollback capability

### Network Errors
- Timeout handling for slow operations
- Offline capability notifications
- Retry mechanisms for failed operations
- Progressive loading for large collections

## Future Enhancement Opportunities

1. **Virtual Scrolling**: Implement for large collections (>1000 cards)
2. **Advanced Filtering**: Multi-field filters with operators
3. **Bulk Edit**: Edit multiple cards simultaneously  
4. **Drag & Drop**: Move cards between collections via drag & drop
5. **Export/Import**: CSV and JSON data exchange
6. **Print View**: Optimized layouts for printing
7. **Keyboard Shortcuts**: Power user keyboard navigation
8. **Undo/Redo**: Action history with undo capability
