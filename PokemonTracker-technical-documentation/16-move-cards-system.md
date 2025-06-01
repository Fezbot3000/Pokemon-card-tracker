# Move Cards System - Technical Documentation

## Overview
The Move Cards System enables users to transfer selected cards between different collections within their portfolio. The system provides a simple, intuitive interface for bulk collection management with smart filtering to prevent invalid moves.

## File Location
- **Component**: `src/components/MoveCardsModal.js`
- **Integration**: Used by `CardList.js` for bulk move operations between collections

## Component Architecture

### Props Interface
```javascript
const MoveCardsModal = ({ 
  isOpen,               // Boolean - Controls modal visibility
  onClose,              // Function - Callback when modal is closed
  onConfirm,            // Function - Callback with target collection when confirmed
  selectedCards = [],   // Array - Selected card objects to move
  collections = [],     // Array - Available collection names
  currentCollection     // String - Current collection name (to exclude from options)
})
```

### State Management
```javascript
const [targetCollection, setTargetCollection] = useState(''); // Selected target collection
```

### PropTypes Validation
```javascript
MoveCardsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  selectedCards: PropTypes.array,
  collections: PropTypes.array,
  currentCollection: PropTypes.string
};
```

## Collection Filtering Logic

### Available Collections Filter
```javascript
const availableCollections = useMemo(() => {
  return collections.filter(collection => {
    // Normalize to lowercase for case-insensitive comparison
    const lowerCollection = collection.toLowerCase();
    
    // Check for any variation of "sold"
    const isSoldCollection = lowerCollection === 'sold' || 
                             lowerCollection.includes('sold') ||
                             lowerCollection.endsWith('sold');
    
    return (
      collection !== currentCollection &&    // Exclude current collection
      collection !== 'All Cards' &&         // Exclude virtual "All Cards" collection
      !isSoldCollection                      // Exclude any sold-related collections
    );
  });
}, [collections, currentCollection]);
```

### Filtering Rules
1. **Current Collection**: Cannot move cards to the same collection they're already in
2. **"All Cards" Collection**: Virtual collection that represents all cards across collections
3. **Sold Collections**: Any collection with "sold" in the name (case-insensitive)
   - Exact match: "sold", "Sold", "SOLD"
   - Contains: "sold cards", "Recently Sold", "Items Sold"
   - Ends with: "Cards Sold", "Pokemon Sold"

## Modal Lifecycle Management

### Initialization
```javascript
// Reset target collection when modal opens
useEffect(() => {
  if (isOpen) {
    setTargetCollection('');
  }
}, [isOpen]);
```

### Body Scroll Management
```javascript
// Prevent page scrolling and jumping when modal is open
useEffect(() => {
  if (isOpen) {
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Prevent background scrolling but compensate for scrollbar width
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  
  return () => {
    // Restore scrolling on unmount
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  };
}, [isOpen]);
```

## UI Components

### Modal Structure
```javascript
return (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      {/* Background overlay with blur effect */}
      <div 
        className="fixed inset-0 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black opacity-75"></div>
      </div>

      {/* Modal panel */}
      <div className="inline-block align-bottom bg-black rounded-md text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-700"
           style={{maxWidth: '450px'}}>
        {/* Modal content */}
      </div>
    </div>
  </div>
);
```

### Header Section
```javascript
<div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
  <div className="sm:flex sm:items-start">
    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
      <h3 className="text-lg leading-6 font-medium text-white">
        Move Cards to Another Collection
      </h3>
      <div className="mt-2">
        <p className="text-sm text-gray-400 mb-4">
          Select a collection to move {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} to:
        </p>
      </div>
    </div>
  </div>
</div>
```

### Collection Selection Interface
```javascript
{availableCollections.length === 0 ? (
  // No collections available state
  <div className="bg-[#1B2131] rounded p-4 text-gray-400">
    No other collections available. Please create another collection first.
  </div>
) : (
  // Collection dropdown
  <select
    value={targetCollection}
    onChange={(e) => setTargetCollection(e.target.value)}
    className="w-full px-3 py-2 rounded-md bg-[#0F0F0F] text-white border border-[#ffffff1a] focus:outline-none focus:ring-2 focus:ring-[var(--primary-default)]"
  >
    <option value="">Select a collection...</option>
    {availableCollections.map(collection => (
      <option key={collection} value={collection}>
        {collection}
      </option>
    ))}
  </select>
)}
```

### Action Buttons
```javascript
<div className="bg-black px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
  {/* Confirm Button */}
  <button
    type="button"
    className="w-full inline-flex justify-center rounded-md px-4 py-2 bg-[#60a5fa] text-base font-medium text-white hover:bg-blue-500 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={handleConfirm}
    disabled={!targetCollection || availableCollections.length === 0}
  >
    Move
  </button>
  
  {/* Cancel Button */}
  <button
    type="button"
    className="mt-3 w-full inline-flex justify-center rounded-md px-4 py-2 bg-[#1B2131] text-base font-medium text-white hover:bg-[#252B3B] focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
    onClick={onClose}
  >
    Cancel
  </button>
</div>
```

## Form Handling

### Confirmation Handler
```javascript
const handleConfirm = () => {
  if (!targetCollection) return; // Prevent submission without selection
  onConfirm(targetCollection);   // Pass target collection to parent
};
```

### Button State Management
- **Move Button**: Disabled when no collection is selected or no collections available
- **Cancel Button**: Always enabled for escape route
- **Backdrop Click**: Closes modal (equivalent to cancel)

## Integration with CardList

### CardList Implementation
```javascript
// In CardList.js
const handleMoveCards = () => {
  if (selectedCards.size === 0) return;
  
  // Get full card data for selected cards
  const cardsToMove = filteredCards.filter(card => selectedCards.has(card.slabSerial));
  setSelectedCardsToMove(cardsToMove);
  
  // Filter available collections
  const filteredCollections = Object.keys(collections).filter(collection => {
    const lowerCase = collection.toLowerCase();
    return collection !== 'All Cards' && 
           collection !== selectedCollection &&
           lowerCase !== 'sold' &&
           !lowerCase.includes('sold');
  });
  
  if (filteredCollections.length > 0) {
    setShowMoveModal(true);
  } else {
    toast.error('No valid collections to move cards to. Create a new collection first.');
  }
};

// Modal usage
<MoveCardsModal
  isOpen={showMoveModal}
  onClose={() => {
    setShowMoveModal(false);
    setSelectedCardsToMove([]);
  }}
  onConfirm={handleMoveConfirm}
  selectedCards={selectedCardsToMove}
  collections={Object.keys(collections)}
  currentCollection={selectedCollection}
/>
```

### Move Confirmation Handler
```javascript
const handleMoveConfirm = async (targetCollection) => {
  try {
    // Perform bulk move operation
    await moveBulkCards(selectedCardsToMove, targetCollection);
    
    // Update local state
    setCards(prevCards => 
      prevCards.map(card => 
        selectedCards.has(card.slabSerial)
          ? { ...card, collection: targetCollection }
          : card
      )
    );
    
    // Clear selection and close modal
    clearSelection();
    setShowMoveModal(false);
    setSelectedCardsToMove([]);
    
    toast.success(`Successfully moved ${selectedCards.size} cards to ${targetCollection}`);
  } catch (error) {
    console.error('Error moving cards:', error);
    toast.error('Failed to move cards. Please try again.');
  }
};
```

## Error Handling

### Validation Checks
```javascript
// Prevent invalid operations
if (!targetCollection) {
  // Button remains disabled
  return;
}

if (availableCollections.length === 0) {
  // Show message and disable actions
  return "No other collections available. Please create another collection first.";
}
```

### User Feedback
- **No Collections**: Clear message explaining the need to create collections
- **Disabled State**: Visual feedback when move action is not available
- **Success Toast**: Confirmation of successful move operation
- **Error Toast**: Clear error message if move operation fails

## Accessibility Features

### Keyboard Navigation
- Tab order: Collection dropdown → Move button → Cancel button
- Enter key: Submits form when valid selection is made
- Escape key: Closes modal (via backdrop click)

### Screen Reader Support
```javascript
// Accessible form elements
<select
  value={targetCollection}
  onChange={(e) => setTargetCollection(e.target.value)}
  aria-label="Select target collection for moving cards"
  className="form-select"
>
  <option value="">Select a collection...</option>
  {availableCollections.map(collection => (
    <option key={collection} value={collection}>
      {collection}
    </option>
  ))}
</select>

// Button state indicators
<button
  disabled={!targetCollection}
  aria-label={`Move ${selectedCards.length} cards to selected collection`}
>
  Move
</button>
```

### Visual Indicators
- Disabled button styling for invalid states
- Hover effects for interactive elements
- Focus rings for keyboard navigation
- Clear visual hierarchy with appropriate contrast

## Performance Considerations

### Optimized Filtering
```javascript
// Memoized collection filtering to prevent unnecessary recalculations
const availableCollections = useMemo(() => {
  return collections.filter(collection => {
    // Filtering logic
  });
}, [collections, currentCollection]);
```

### Efficient State Management
- Minimal state (only target collection)
- No unnecessary re-renders
- Proper cleanup on unmount

### Memory Management
- Cleanup of body style modifications
- Proper event listener cleanup
- No memory leaks from unclosed event handlers

## User Experience Design

### Progressive Disclosure
1. Simple interface showing only necessary options
2. Clear messaging about number of cards being moved
3. Immediate feedback on selection state

### Error Prevention
1. Filter out invalid target collections
2. Disable actions when no valid selections
3. Clear messaging when no collections are available

### Responsive Design
- Adaptive layout for mobile devices
- Touch-friendly button sizes
- Appropriate modal sizing

## Future Enhancements

### Advanced Features
1. **Collection Creation**: Option to create new collection during move
2. **Move History**: Track and display recent move operations
3. **Bulk Collection Operations**: Move between multiple collections
4. **Move Validation**: Prevent moves that would create duplicates
5. **Undo/Redo**: Ability to reverse move operations

### User Experience Improvements
1. **Quick Move**: Keyboard shortcuts for common collections
2. **Collection Search**: Filter collections by name for large lists
3. **Move Preview**: Show destination collection details
4. **Batch Operations**: Queue multiple move operations
5. **Drag and Drop**: Alternative move interface using drag/drop

### Integration Enhancements
1. **Collection Analytics**: Track most used collections
2. **Smart Suggestions**: Recommend target collections based on card types
3. **Conflict Resolution**: Handle duplicate cards in target collections
4. **Sync Status**: Real-time status of move operations
5. **Audit Trail**: Complete history of card movements

This Move Cards System provides a streamlined solution for bulk card organization with intelligent filtering and user-friendly interface design, ensuring efficient collection management within the Pokemon Card Tracker application.
