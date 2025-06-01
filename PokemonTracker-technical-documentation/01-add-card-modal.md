# Add Card Modal - Technical Documentation

## Overview
The Add Card Modal is a comprehensive form component that allows users to add new Pokemon cards to their collection. It features PSA certificate lookup, image handling, form validation, and integration with multiple supporting modals.

## File Location
- **Primary Component**: `src/components/AddCardModal.js`
- **Supporting Components**: 
  - `src/design-system/components/CardDetailsForm.js`
  - `src/components/PSADetailModal.js`
  - `src/components/NewCollectionModal.js`

## Component Architecture

### State Management
The AddCardModal manages multiple pieces of state:

```javascript
// Core card data
const [newCard, setNewCard] = useState({...emptyCard});

// Collection selection
const [selectedCollection, setSelectedCollection] = useState(() => {
  // Logic to select initial collection, filtering out "Sold"
});

// Image handling
const [cardImage, setCardImage] = useState(null);
const [imageFile, setImageFile] = useState(null);
const [imageLoadingState, setImageLoadingState] = useState('idle');

// PSA lookup functionality
const [psaSerial, setPsaSerial] = useState('');
const [isSearching, setIsSearching] = useState(false);
const [psaDetailModalOpen, setPsaDetailModalOpen] = useState(false);
const [psaData, setPsaData] = useState(null);

// Form validation and UI feedback
const [errors, setErrors] = useState({});
const [saveMessage, setSaveMessage] = useState(null);
const [isSaving, setIsSaving] = useState(false);

// Supporting modals
const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
```

### Initial Card Data Structure
```javascript
const emptyCard = {
  id: null,
  player: '',
  cardName: '', 
  set: '',
  year: '',
  category: '', 
  condition: '',
  certificationNumber: '', 
  datePurchased: new Date().toISOString().split('T')[0],
  investmentAUD: '',
  currentValueAUD: '',
  quantity: 1, 
};
```

## Key Functions

### 1. Form Reset and Initialization
When the modal opens, it resets all form state:

```javascript
useEffect(() => {
  if (isOpen) {
    setAnimClass('slide-in-right');
    // Reset form when opening
    setNewCard({...emptyCard});
    setCardImage(null);
    setImageFile(null);
    setErrors({});
    setSaveMessage(null);
    setPsaSerial('');
  }
}, [isOpen]);
```

### 2. Image Handling (`handleImageChange`)
```javascript
const handleImageChange = async (file) => {
  if (!file) return;
  
  setImageLoadingState('loading');
  
  try {
    // Create a preview URL
    const imageUrl = URL.createObjectURL(file);
    
    // Cleanup previous URL if it exists
    if (cardImage && cardImage.startsWith('blob:')) {
      URL.revokeObjectURL(cardImage);
    }
    
    setCardImage(imageUrl);
    setImageFile(file);
    setErrors(prev => ({ ...prev, image: undefined }));
    setImageLoadingState('idle');
    
    return file; 
  } catch (error) {
    console.error('Error changing card image:', error);
    setImageLoadingState('error');
    setErrors(prev => ({ ...prev, image: 'Failed to load image' }));
    return null;
  }
};
```

**Key Points:**
- Creates blob URL for immediate preview
- Cleans up previous blob URLs to prevent memory leaks
- Updates image loading state for UI feedback
- Handles errors gracefully

### 3. Form Validation (`validateForm`)
```javascript
const validateForm = () => {
  const newErrors = {};
  const requiredFields = ['cardName', 'investmentAUD', 'datePurchased', 'quantity'];
  
  requiredFields.forEach(field => {
    if (!newCard[field] || String(newCard[field]).trim() === '') {
      newErrors[field] = `${field} is required`;
    }
  });

  // Validate numeric fields
  if (newCard.investmentAUD && isNaN(Number(newCard.investmentAUD))) {
    newErrors.investmentAUD = 'Investment amount must be a valid number';
  }

  if (newCard.currentValueAUD && isNaN(Number(newCard.currentValueAUD))) {
    newErrors.currentValueAUD = 'Current value must be a valid number';
  }

  if (newCard.quantity && (isNaN(Number(newCard.quantity)) || Number(newCard.quantity) < 1)) {
    newErrors.quantity = 'Quantity must be a valid number greater than 0';
  }

  // Validate date format
  if (newCard.datePurchased && !/^\d{4}-\d{2}-\d{2}$/.test(newCard.datePurchased)) {
    newErrors.datePurchased = 'Date must be in YYYY-MM-DD format';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### 4. Card Save Process (`handleSave`)
The save process involves multiple steps:

1. **Validation**: Validates form data
2. **Image Processing**: Handles image file if present
3. **Data Preparation**: Prepares card data with proper typing
4. **Database Save**: Calls the onSave callback with processed data
5. **UI Feedback**: Shows success/error messages

```javascript
const handleSave = async () => {
  if (!validateForm()) {
    setSaveMessage('Please fix the errors above');
    return;
  }

  if (!selectedCollection) {
    setSaveMessage('Please select a collection');
    return;
  }

  setIsSaving(true);
  setSaveMessage('Saving card...');

  try {
    // Prepare card data with proper numeric conversions
    const cardToSave = {
      ...newCard,
      collection: selectedCollection,
      collectionId: selectedCollection,
      investmentAUD: newCard.investmentAUD ? Number(newCard.investmentAUD) : 0,
      currentValueAUD: newCard.currentValueAUD ? Number(newCard.currentValueAUD) : 0,
      quantity: newCard.quantity ? Number(newCard.quantity) : 1,
      addedAt: new Date().toISOString(),
    };

    // Call the save function provided by parent
    await onSave(cardToSave, imageFile, selectedCollection);

    // Success feedback
    setSaveMessage('Card added successfully!');
    
    // Reset form after successful save
    setNewCard({...emptyCard});
    setSelectedCollection(collections.filter(c => c.toLowerCase() !== 'sold')[0] || '');
    setCardImage(null);
    setImageFile(null);
    setPsaSerial('');
    setErrors({});
    
    // Close modal after brief delay
    setTimeout(() => {
      onClose();
    }, 1000);

  } catch (error) {
    console.error('Error saving card:', error);
    setSaveMessage(`Error saving card: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};
```

### 5. PSA Lookup Integration (`handlePsaLookup`)
```javascript
const handlePsaLookup = async () => {
  if (!psaSerial.trim()) {
    setSaveMessage('Please enter a PSA serial number');
    return;
  }

  setIsSearching(true);
  setSaveMessage('Searching PSA database...');

  try {
    const result = await searchByCertNumber(psaSerial.trim());
    
    if (result && result.success && result.data) {
      // Store PSA data and open detail modal
      setPsaData(result.data);
      setPsaDetailModalOpen(true);
      setSaveMessage('PSA data found! Review details in the popup.');
    } else {
      setSaveMessage('No PSA data found for this certificate number');
    }
  } catch (error) {
    console.error('PSA lookup error:', error);
    setSaveMessage(`PSA lookup failed: ${error.message}`);
  } finally {
    setIsSearching(false);
  }
};
```

### 6. PSA Data Application (`handleApplyPsaDetails`)
```javascript
const handleApplyPsaDetails = (updatedCardData) => {
  setNewCard(prev => ({
    ...prev,
    ...updatedCardData
  }));
  
  setPsaDetailModalOpen(false);
  setSaveMessage('PSA data applied successfully');
  
  // Clear the message after a delay
  setTimeout(() => {
    setSaveMessage(null);
  }, 3000);
};
```

## Integration Points

### 1. Parent Component Interface
```javascript
AddCardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  collections: PropTypes.array,
  className: PropTypes.string,
  onNewCollectionCreated: PropTypes.func,
  defaultCollection: PropTypes.string
};
```

### 2. Child Component Integration

#### CardDetailsForm
- Receives card data, image, and validation errors
- Handles form field changes via `onChange` callback
- Manages image upload via `onImageChange` callback
- Hides collection field and PSA search button (handled by parent)

#### PSADetailModal
- Opens when PSA data is found
- Allows user to review and apply PSA data to current card
- Applies changes via `onApplyDetails` callback

#### NewCollectionModal
- Opens when user selects "Create New Collection"
- Creates new collection and updates parent state
- Updates collection selector automatically

## Data Flow

### Card Creation Flow
1. User opens modal → Form resets to empty state
2. User fills form fields → `handleCardChange` updates state
3. User uploads image → `handleImageChange` processes file
4. User optionally does PSA lookup → `handlePsaLookup` → `PSADetailModal` → `handleApplyPsaDetails`
5. User clicks save → `validateForm` → `handleSave` → Parent's `onSave` callback
6. Parent processes save → Modal shows success → Auto-closes after delay

### Collection Management Flow
1. Modal opens with default collection selected (filters out "Sold")
2. User can select existing collection or "Create New Collection"
3. If creating new → `NewCollectionModal` opens → Collection created → Selector updated
4. Selected collection is included in card data when saving

## Error Handling

### Validation Errors
- Required field validation for cardName, investmentAUD, datePurchased, quantity
- Numeric validation for investment and value fields
- Date format validation
- Errors displayed inline with form fields

### Runtime Errors
- Image upload errors handled gracefully with fallback UI
- PSA lookup errors displayed as status messages
- Save operation errors caught and displayed to user
- Network errors handled with user-friendly messages

## Performance Considerations

### Memory Management
- Blob URLs cleaned up when images change or component unmounts
- Timeout refs cleared on unmount to prevent memory leaks
- Form state reset on modal close

### Lazy Loading
- Supporting modals only rendered when needed
- PSA lookup only triggered by user action
- Image preview only created when file selected

## Accessibility Features

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatible error messages
- Focus management when modals open/close
- High contrast support via design system

## Future Enhancement Opportunities

1. **Auto-save Draft**: Save form data to localStorage for recovery
2. **Bulk Import**: Support for importing multiple cards
3. **Advanced Validation**: Real-time validation with debouncing
4. **Image Processing**: Automatic image optimization and cropping
5. **Smart Defaults**: Learn from user patterns for better defaults
