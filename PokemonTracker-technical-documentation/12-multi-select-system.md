# Multi-Select System - Technical Documentation

## Overview
The Multi-Select System enables users to select multiple cards in the card list for performing bulk operations like moving between collections, marking as sold, deleting, or creating purchase invoices. The system provides an intuitive interface with checkboxes, visual feedback, and comprehensive bulk action controls.

## File Locations
- **Primary Hook**: `src/hooks/useCardSelection.js`
- **Main Implementation**: `src/components/CardList.js` (lines 220-227, 1126-1409)
- **Related Modals**: 
  - `src/components/SaleModal.js`
  - `src/components/MoveCardsModal.js`
  - `src/components/PurchaseInvoices/CreateInvoiceModal.js`
  - `src/components/Marketplace/ListCardModal.js`

## Architecture

### Custom Hook: useCardSelection
The selection state is managed by a custom React hook that provides clean separation of concerns:

```javascript
// Hook initialization
const {
  selectedCards,      // Set of selected card IDs
  selectedCount,      // Number of selected cards
  handleSelectCard,   // Toggle individual card selection
  handleSelectAll,    // Toggle all cards selection
  clearSelection,     // Clear all selections
  getSelectedCards,   // Get full card objects for selected cards
  isCardSelected     // Check if specific card is selected
} = useCardSelection(filteredCards);
```

### Selection State Management
- **Data Structure**: Uses JavaScript `Set` for O(1) lookup performance
- **Card Identification**: Uses `card.slabSerial` as unique identifier
- **State Persistence**: No persistence - selections clear on page reload/navigation
- **Performance**: Memoized callbacks prevent unnecessary re-renders

## Implementation Details

### Core Selection Functions

#### Individual Card Selection
```javascript
const handleSelectCard = useCallback((e, cardId) => {
  // Handle boolean selection (direct from Card component)
  if (typeof e === 'boolean') {
    const isSelected = e;
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (!isSelected) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
    return;
  }
  
  // Handle event-based selection with propagation control
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  
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
```

#### Select All/Deselect All
```javascript
const handleSelectAll = useCallback(() => {
  // Toggle behavior: if all selected, deselect all; otherwise select all
  if (selectedCards.size === cards.length) {
    setSelectedCards(new Set());
  } else {
    const allCardIds = cards.map(card => card.slabSerial);
    setSelectedCards(new Set(allCardIds));
  }
}, [selectedCards.size, cards]);
```

### UI Integration

#### Card-Level Selection
Each card displays a checkbox that:
- Shows current selection state
- Handles click events without triggering card detail modal
- Provides visual feedback through ring styling

```javascript
// Grid view checkbox
<input
  type="checkbox"
  checked={selectedCards.has(card.slabSerial)}
  onChange={(e) => handleSelectCard(e, card.slabSerial)}
  className="absolute top-2 left-2 w-4 h-4 rounded border-gray-300"
  onClick={(e) => e.stopPropagation()}
/>

// List view checkbox
<input
  type="checkbox"
  checked={selectedCards.has(card.slabSerial)}
  onChange={(e) => handleSelectCard(e, card.slabSerial)}
  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
  aria-label={`Select ${card.card}`}
  onClick={(e) => e.stopPropagation()}
/>
```

#### Visual Selection Feedback
- **Selected Cards**: Pink ring border (`ring-2 ring-[#E6185C]`)
- **Unselected Cards**: Standard border styling
- **Checkbox States**: Standard browser checkbox styling with custom focus colors

#### Bulk Action Toolbar
Appears when cards are selected, providing:

```javascript
// Toolbar visibility
{selectedCards.size > 0 && (
  <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0B0F19] border-t border-gray-200 dark:border-gray-700 p-4 z-40">
    {/* Action buttons */}
  </div>
)}
```

**Available Actions**:
1. **Mark as Sold**: Opens SaleModal for pricing and buyer information
2. **Create Purchase Invoice**: Opens CreateInvoiceModal for invoice generation
3. **List on Marketplace**: Opens ListCardModal for marketplace listing
4. **Move to Collection**: Opens MoveCardsModal for collection transfer
5. **Delete**: Opens confirmation dialog for bulk deletion
6. **Select All/Deselect**: Toggles all card selection
7. **Clear Selection**: Clears all selections

## Bulk Operation Workflows

### Mark Cards as Sold
```javascript
const handleMarkAsSold = () => {
  if (selectedCards.size === 0) {
    toast.error('Please select at least one card to mark as sold');
    return;
  }
  // Get full card data for selected cards
  const selectedCardData = cards.filter(card => selectedCards.has(card.slabSerial));
  setSelectedCardsForSale(selectedCardData);
  setShowSaleModal(true);
};
```

### Move Cards Between Collections
```javascript
const handleMoveCards = () => {
  if (selectedCards.size === 0) return;
  
  // Get cards to move with full data
  const cardsToMove = filteredCards.filter(card => selectedCards.has(card.slabSerial));
  setSelectedCardsToMove(cardsToMove);
  
  // Filter valid target collections
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
```

### Bulk Delete
```javascript
const handleDeleteClick = () => {
  const selectedCardsArray = Array.from(selectedCards);
  setCardsToDelete(selectedCardsArray);
  setShowDeleteModal(true);
};

const handleDeleteConfirm = async () => {
  try {
    const cardsToDelete = Array.from(selectedCards);
    await handleBulkDelete(cardsToDelete);
  } catch (error) {
    toast.error('Failed to delete cards');
  }
};
```

## Performance Optimizations

### Efficient Data Structures
- **Set for Selection**: O(1) lookup and modification operations
- **Memoized Callbacks**: Prevents unnecessary re-renders of child components
- **Filtered Card Lists**: Only processes visible/filtered cards for selection

### Event Handling Optimization
```javascript
// Prevents card detail modal when clicking checkbox
onClick={(e) => e.stopPropagation()}

// Conditional event handling for different selection sources
if (typeof e === 'boolean') {
  // Direct boolean selection
} else if (e && typeof e.stopPropagation === 'function') {
  // Event-based selection with propagation control
}
```

### Memory Management
- **Set Management**: Proper cleanup of selections when component unmounts
- **State Updates**: Immutable updates using new Set instances
- **Selection Clearing**: Automatic clearing after bulk operations complete

## Error Handling

### Selection Validation
```javascript
// Check for empty selections before operations
if (selectedCards.size === 0) {
  toast.error('Please select at least one card');
  return;
}

// Validate card data availability
const selectedCardData = cards.filter(card => selectedCards.has(card.slabSerial));
if (selectedCardData.length !== selectedCards.size) {
  console.warn('Mismatch between selected count and available card data');
}
```

### Operation Error Recovery
```javascript
// Clear selections after successful operations
clearSelection();

// Maintain selections if operation fails
catch (error) {
  console.error('Operation failed:', error);
  toast.error('Operation failed. Please try again.');
  // Don't clear selections to allow retry
}
```

### Collection Validation
```javascript
// Ensure target collections exist for move operations
const filteredCollections = Object.keys(collections).filter(collection => {
  const lowerCase = collection.toLowerCase();
  return collection !== 'All Cards' && 
         collection !== selectedCollection &&
         lowerCase !== 'sold' &&
         !lowerCase.includes('sold');
});

if (filteredCollections.length === 0) {
  toast.error('No valid collections to move cards to. Create a new collection first.');
  return;
}
```

## Integration Points

### Parent Component Communication
```javascript
// Selection change callback to parent
useEffect(() => {
  if (onSelectionChange) {
    onSelectionChange(selectedCards);
  }
}, [selectedCards, onSelectionChange]);
```

### Modal Integration
- **SaleModal**: Receives selected card data for pricing workflow
- **MoveCardsModal**: Receives selected cards and available collections
- **CreateInvoiceModal**: Pre-populates with selected cards
- **ConfirmDialog**: Shows deletion confirmation with count

### Database Operations
- **Bulk Updates**: Efficiently processes multiple card updates
- **Transaction Safety**: Ensures all-or-nothing bulk operations
- **State Synchronization**: Updates local state after successful database operations

## Accessibility Features

### Keyboard Navigation
- **Checkbox Focus**: Standard tab navigation to checkboxes
- **Aria Labels**: Descriptive labels for screen readers
- **Keyboard Shortcuts**: Standard space/enter for checkbox interaction

### Screen Reader Support
```javascript
// Descriptive aria labels
aria-label={`Select ${card.card}`}

// Selection count announcements
title={selectedCards.size === cards.length ? "Deselect all" : "Select all"}
```

### Visual Accessibility
- **High Contrast**: Clear visual distinction between selected/unselected states
- **Focus Indicators**: Browser-standard focus rings on interactive elements
- **Color Independence**: Selection state not solely dependent on color

## Future Enhancements

### Persistent Selection
1. **Session Storage**: Maintain selections across page reloads
2. **Cross-Page Selection**: Preserve selections when navigating between views
3. **Selection History**: Remember recently selected card sets

### Advanced Selection Features
1. **Range Selection**: Shift+click for range selection
2. **Smart Selection**: Select by criteria (PSA grade, value range, etc.)
3. **Selection Presets**: Save and restore common selection patterns
4. **Keyboard Shortcuts**: Ctrl+A for select all, etc.

### Performance Improvements
1. **Virtual Selection**: Handle large datasets efficiently
2. **Batch Processing**: Optimize bulk operations for better performance
3. **Background Operations**: Non-blocking bulk operations with progress indicators

### Enhanced UX
1. **Selection Summary**: Detailed statistics of selected cards
2. **Preview Mode**: Quick preview of bulk operation results
3. **Undo/Redo**: Ability to undo bulk operations
4. **Selection Filters**: Filter cards within current selection

## Testing Considerations

### Unit Testing
- Test individual selection/deselection operations
- Verify Set operations and state updates
- Test edge cases (empty lists, single card, all cards)

### Integration Testing
- Test interaction between selection and bulk operations
- Verify modal integration and data passing
- Test selection persistence across component re-renders

### User Experience Testing
- Test with large numbers of cards (performance)
- Verify accessibility features work correctly
- Test on different screen sizes and input methods

This multi-select system provides a robust foundation for bulk operations while maintaining performance and usability across different device types and interaction patterns.
