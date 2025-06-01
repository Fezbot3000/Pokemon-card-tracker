# Card Details Modal - Technical Documentation

## Overview
The Card Details Modal is a comprehensive editing interface for existing Pokemon cards. It provides full CRUD functionality, PSA data integration, image management, and "Mark as Sold" functionality while maintaining data integrity and providing real-time feedback.

## File Location
- **Primary Component**: `src/components/CardDetails.js`
- **Supporting Components**: 
  - `src/design-system/components/CardDetailsModal.js`
  - `src/components/PSALookupButton.js`

## Component Architecture

### Props Interface
```javascript
CardDetails.propTypes = {
  card: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onUpdateCard: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  exchangeRate: PropTypes.number.isRequired,
  collections: PropTypes.arrayOf(PropTypes.string),
  initialCollectionName: PropTypes.string
};
```

### State Management
The CardDetails component manages complex state for editing, image handling, and real-time updates:

```javascript
const [isOpen, setIsOpen] = useState(true);
const [editedCard, setEditedCard] = useState({
  // Comprehensive card data with type conversions
  ...card,
  id: card.id || card.slabSerial,
  year: card.year ? String(card.year) : '',
  // Financial values converted to strings for form handling
  investmentUSD: typeof card.investmentUSD === 'number' ? String(Number(card.investmentUSD.toFixed(2))) : '0',
  currentValueUSD: typeof card.currentValueUSD === 'number' ? String(Number(card.currentValueUSD.toFixed(2))) : '0',
  investmentAUD: typeof card.investmentAUD === 'number' ? String(Number(card.investmentAUD.toFixed(2))) : '0',
  currentValueAUD: typeof card.currentValueAUD === 'number' ? String(Number(card.currentValueAUD.toFixed(2))) : '0',
  datePurchased: formatDate(card.datePurchased) || '',
  psaData: card.psaData || null,
  psaSearched: card.psaSearched || false
});

const [cardImage, setCardImage] = useState(null);
const [imageLoadingState, setImageLoadingState] = useState('loading');
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [isPsaLoading, setIsPsaLoading] = useState(false);
```

## Key Functions

### 1. Data Initialization and Synchronization
The component ensures data integrity when the card prop changes:

```javascript
useEffect(() => {
  if (card) {
    // Create a complete copy of the card with all necessary fields
    const completeCard = {
      ...card,
      id: card.id || card.slabSerial,
      year: card.year ? String(card.year) : '',
      // Ensure financial values are properly formatted
      investmentUSD: typeof card.investmentUSD === 'number' ? String(Number(card.investmentUSD.toFixed(2))) : '0',
      currentValueUSD: typeof card.currentValueUSD === 'number' ? String(Number(card.currentValueUSD.toFixed(2))) : '0',
      investmentAUD: typeof card.investmentAUD === 'number' ? String(Number(card.investmentAUD.toFixed(2))) : '0',
      currentValueAUD: typeof card.currentValueAUD === 'number' ? String(Number(card.currentValueAUD.toFixed(2))) : '0',
      datePurchased: formatDate(card.datePurchased) || '',
      // Ensure collection fields are properly set
      collection: initialCollectionName || card.collection || card.collectionId || '',
      collectionId: initialCollectionName || card.collectionId || card.collection || '',
      // Ensure set fields are properly set
      set: card.set || card.setName || '',
      setName: card.setName || card.set || '',
      // Preserve PSA data
      psaData: card.psaData || null,
      psaSearched: card.psaSearched || false
    };
    
    setEditedCard(completeCard);
    setHasUnsavedChanges(false);
  }
}, [card, initialCollectionName]);
```

### 2. Image Loading and Management (`loadCardImage`)
```javascript
const loadCardImage = async () => {
  if (!editedCard?.id && !editedCard?.slabSerial) {
    setImageLoadingState('idle');
    return;
  }

  setImageLoadingState('loading');
  
  try {
    const cardId = editedCard.id || editedCard.slabSerial;
    const imageUrl = await db.getCardImage(cardId);
    
    if (imageUrl) {
      setCardImage(imageUrl);
      setImageLoadingState('idle');
    } else {
      setCardImage(null);
      setImageLoadingState('idle');
    }
  } catch (error) {
    console.error('Error loading card image:', error);
    setCardImage(null);
    setImageLoadingState('error');
  }
};
```

**Key Points:**
- Uses card ID or slabSerial as fallback
- Handles both successful loads and missing images gracefully
- Updates loading state for UI feedback
- Integrates with Firebase Storage via dbAdapter

### 3. Image Update Handling (`handleImageChange`)
```javascript
const handleImageChange = async (file) => {
  if (!file) return null;
  
  setImageLoadingState('loading');
  
  try {
    // Clean up any existing blob URL
    if (editedCard._blobUrl && editedCard._blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(editedCard._blobUrl);
    }
    
    // Create new blob URL for immediate preview
    const blobUrl = URL.createObjectURL(file);
    
    // Update card state with pending image file and blob URL
    setEditedCard(prev => ({
      ...prev,
      _pendingImageFile: file,
      _blobUrl: blobUrl
    }));
    
    // Set the image for immediate display
    setCardImage(blobUrl);
    setImageLoadingState('idle');
    setHasUnsavedChanges(true);
    
    return file;
  } catch (error) {
    console.error('Error handling image change:', error);
    setImageLoadingState('error');
    return null;
  }
};
```

### 4. Comprehensive Save Operation (`handleSave`)
The save operation handles data validation, image uploads, and database updates:

```javascript
const handleSave = async () => {
  if (!hasCardBeenEdited() && !editedCard._pendingImageFile) {
    return;
  }

  const cardId = editedCard.id || editedCard.slabSerial;
  
  try {
    // Handle image upload if there's a pending image file
    if (editedCard._pendingImageFile) {
      const file = editedCard._pendingImageFile;
      
      // Create FileReader for immediate feedback
      const reader = new FileReader();
      
      reader.onload = () => {
        setCardImage(reader.result);
      };
      
      reader.readAsDataURL(file);
      
      try {
        // Upload image to Firebase Storage
        const imageUrl = await db.saveImage(cardId, file);
        
        // Update card with new image URL
        editedCard.imageUrl = imageUrl;
        editedCard.hasImage = true;
        editedCard.imageUpdatedAt = new Date().toISOString();
        
        // Clean up blob URL and pending file
        if (editedCard._blobUrl) {
          URL.revokeObjectURL(editedCard._blobUrl);
        }
        delete editedCard._blobUrl;
        delete editedCard._pendingImageFile;
        
      } catch (imageError) {
        console.error('Image upload failed:', imageError);
        toast.error('Image upload failed: ' + imageError.message);
        return;
      }
    }

    // Prepare card data for saving
    const cardToSave = {
      ...editedCard,
      // Convert string values back to numbers
      investmentAUD: parseFloat(editedCard.investmentAUD) || 0,
      currentValueAUD: parseFloat(editedCard.currentValueAUD) || 0,
      investmentUSD: parseFloat(editedCard.investmentUSD) || 0,
      currentValueUSD: parseFloat(editedCard.currentValueUSD) || 0,
      quantity: parseInt(editedCard.quantity) || 1,
      year: editedCard.year ? parseInt(editedCard.year) : null,
      lastModified: new Date().toISOString()
    };

    // Remove internal properties
    delete cardToSave._blobUrl;
    delete cardToSave._pendingImageFile;

    // Call parent update function
    await updateCard(cardToSave);
    
    setHasUnsavedChanges(false);
    toast.success('Card updated successfully');
    
  } catch (error) {
    console.error('Error saving card:', error);
    toast.error('Failed to save card: ' + error.message);
  }
};
```

### 5. Unsaved Changes Detection (`hasCardBeenEdited`)
```javascript
const hasCardBeenEdited = () => {
  return Object.keys(editedCard).some(key => {
    // Skip comparing functions, undefined values, and image-related fields
    if (
      typeof editedCard[key] === 'function' || 
      editedCard[key] === undefined ||
      key === 'imageUrl' ||
      key === 'hasImage' ||
      key === 'imageUpdatedAt'
    ) {
      return false;
    }
    // For numbers, compare with epsilon to handle floating point precision
    if (typeof editedCard[key] === 'number') {
      return Math.abs(editedCard[key] - (card[key] || 0)) > 0.001;
    }
    return editedCard[key] !== (card[key] || '');
  });
};
```

### 6. Close with Unsaved Changes Protection (`handleClose`)
```javascript
const handleClose = (saveSuccess = false, skipConfirmation = false) => {
  // Check if there are unsaved changes
  if (!skipConfirmation && !saveSuccess && (hasUnsavedChanges || hasCardBeenEdited())) {
    const confirmClose = window.confirm(
      'You have unsaved changes. Are you sure you want to close without saving?'
    );
    
    if (!confirmClose) {
      return;
    }
  }

  // Clean up any blob URLs
  if (editedCard._blobUrl && editedCard._blobUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(editedCard._blobUrl);
    } catch (e) {
      console.warn('Failed to revoke blob URL on close:', e);
    }
  }

  setIsOpen(false);
  
  // Call parent onClose after a brief delay for animation
  setTimeout(() => {
    onClose();
  }, 200);
};
```

## PSA Integration

### PSA Lookup Button Integration
The modal includes a PSA lookup button that updates card data:

```javascript
<PSALookupButton 
  currentCardData={editedCard}
  onCardUpdate={(updatedData) => {
    // Store reference to any existing blob URL before updating
    const existingBlobUrl = editedCard._blobUrl;
    
    setEditedCard(prev => {
      const newData = {
        ...prev,
        ...updatedData,
        // Preserve image-related properties from the previous state
        imageUrl: prev.imageUrl,
        _pendingImageFile: prev._pendingImageFile,
        _blobUrl: prev._blobUrl,
        hasImage: prev.hasImage
      };
      return newData;
    });
    
    setHasUnsavedChanges(true);
    toast.success("Card details updated from PSA data");
  }}
  onLoadingChange={setIsPsaLoading}
  iconOnly={true}
/>
```

## Mark as Sold Functionality

### Sold Card Processing
```javascript
onMarkAsSold={async (soldCardData) => {
  try {
    // Get existing sold cards
    let soldCards = await db.getSoldCards() || [];
    
    // Add current card to sold cards list
    soldCards.push({
      ...soldCardData,
      id: soldCardData.id || soldCardData.slabSerial,
      imageUrl: cardImage // Include the card image URL
    });
    
    // Save updated sold cards list
    await db.saveSoldCards(soldCards);
    
    // Remove card from main collection
    if (onDelete) {
      await onDelete(card);
    }
    
    toast.success('Card marked as sold and moved to Sold Items');
    handleClose(true);
  } catch (error) {
    console.error('Error marking card as sold:', error);
    toast.error('Error marking card as sold: ' + error.message);
  }
}}
```

## Memory Management

### Blob URL Cleanup
The component implements comprehensive blob URL cleanup:

```javascript
// Cleanup on unmount
useEffect(() => {
  return () => {
    if (cardImage && cardImage.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(cardImage);
        setCardImage(null);
      } catch (e) {
        console.warn('Failed to revoke cardImage blob URL on unmount:', e);
      }
    }
  };
}, []);

// Cleanup on image URL changes
useEffect(() => {
  const currentBlobUrl = cardImage;
  
  return () => {
    if (currentBlobUrl && currentBlobUrl !== editedCard.imageUrl) {
      try {
        if (currentBlobUrl && currentBlobUrl !== editedCard.imageUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
      } catch (e) {
        console.warn('Failed to revoke stale blob URL:', e);
      }
    }
  };
}, [editedCard.imageUrl]);
```

### Event Listener Management
Listens for card image cleanup events from parent components:

```javascript
useEffect(() => {
  const handleCardImagesCleanup = (event) => {
    const cardIds = event.detail?.cardIds;
    const currentCardId = card.id || card.slabSerial;
    
    if (cardIds && cardIds.includes(currentCardId)) {
      if (cardImage && cardImage.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(cardImage);
          setCardImage(null);
          setImageLoadingState('idle');
        } catch (e) {
          console.warn('Failed to revoke blob URL during cleanup:', e);
        }
      }
    }
  };
  
  window.addEventListener('card-images-cleanup', handleCardImagesCleanup);
  
  return () => {
    window.removeEventListener('card-images-cleanup', handleCardImagesCleanup);
  };
}, [card.id, card.slabSerial, cardImage]);
```

## Integration with Design System

### CardDetailsModal Component
The CardDetails component delegates rendering to the design system's CardDetailsModal:

```javascript
return (
  <CardDetailsModal
    isOpen={isOpen}
    onClose={handleClose}
    card={editedCard}
    onSave={handleSave}
    onMarkAsSold={onMarkAsSold}
    onChange={handleCardChange}
    image={cardImage}
    imageLoadingState={imageLoadingState}
    onImageChange={handleImageChange}
    onImageRetry={loadCardImage}
    className="fade-in"
    isPsaLoading={isPsaLoading}
    additionalSerialContent={psaLookupButton}
    collections={collections}
    initialCollectionName={initialCollectionName}
  />
);
```

## Data Flow

### Edit Flow
1. Modal opens with card data → State initialized with type conversions
2. Image loading starts → `loadCardImage` fetches from Firebase Storage
3. User edits fields → `handleCardChange` updates state and tracks changes
4. User uploads new image → `handleImageChange` creates blob URL for preview
5. User clicks save → `handleSave` uploads image and saves card data
6. Success feedback → Modal remains open for continued editing

### PSA Update Flow
1. User clicks PSA lookup → `PSALookupButton` performs search
2. PSA data returned → `onCardUpdate` callback updates card state
3. Changes marked as unsaved → User can review and save changes
4. Image properties preserved → No interference with existing image handling

## Error Handling

### Image Upload Errors
- Failed uploads show error toast and don't save card data
- Blob URL cleanup prevents memory leaks on errors
- Retry functionality available via image component

### Save Operation Errors
- Validation errors displayed via toast notifications
- Partial save failures handled gracefully
- Unsaved changes protection prevents data loss

### Network Errors
- PSA lookup failures handled by PSALookupButton component
- Database save failures show user-friendly error messages
- Connection issues handled with appropriate feedback

## Performance Optimizations

### Memo Usage
Component wrapped in `React.memo` to prevent unnecessary re-renders:

```javascript
const CardDetails = memo(({ card, onClose, onUpdateCard, ... }) => {
  // Component implementation
});
```

### Lazy State Updates
- Image loading state prevents UI blocking
- Debounced change tracking for large forms
- Efficient blob URL management

### Memory Efficiency
- Automatic cleanup of blob URLs
- Event listener cleanup on unmount
- Minimal state footprint for large collections

## Future Enhancement Opportunities

1. **Auto-save**: Implement periodic auto-save for long editing sessions
2. **Undo/Redo**: Add history tracking for card edits
3. **Batch Operations**: Support editing multiple cards simultaneously
4. **Advanced Validation**: Real-time validation with field-specific rules
5. **Image Optimization**: Automatic image compression and resizing
6. **Offline Support**: Cache edits for offline editing capability
