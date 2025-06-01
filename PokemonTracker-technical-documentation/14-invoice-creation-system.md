# Invoice Creation System - Technical Documentation

## Overview
The Invoice Creation System enables users to generate purchase invoices for selected cards, providing a professional documentation workflow for card acquisitions. The system supports both creating new invoices and editing existing ones, with comprehensive card selection and invoice management capabilities.

## File Location
- **Component**: `src/components/PurchaseInvoices/CreateInvoiceModal.js`
- **Integration**: Used by `CardList.js` for bulk invoice operations

## Component Architecture

### Props Interface
```javascript
const CreateInvoiceModal = ({ 
  isOpen,              // Boolean - Controls modal visibility
  onClose,             // Function - Callback when modal is closed
  onSave,              // Function - Callback with invoice data when saved
  editingInvoice,      // Object|null - Existing invoice for editing
  preSelectedCards     // Array - Pre-selected cards for new invoice
})
```

### State Management
```javascript
const [selectedCards, setSelectedCards] = useState([]);        // Selected cards for invoice
const [collections, setCollections] = useState({});           // Available collections
const [loading, setLoading] = useState(true);                 // Loading state
const [seller, setSeller] = useState('');                     // Seller/vendor name
const [date, setDate] = useState('');                         // Purchase date
const [invoiceNumber, setInvoiceNumber] = useState('');       // Invoice identifier
const [notes, setNotes] = useState('');                       // Additional notes
const [step, setStep] = useState(1);                          // Current wizard step (1|2)
const [searchQuery, setSearchQuery] = useState('');           // Card search filter
const [filteredCards, setFilteredCards] = useState([]);       // Filtered card list
const [selectedCollection, setSelectedCollection] = useState('All Collections'); // Collection filter
```

## Workflow Architecture

### Two-Step Process
1. **Step 1: Card Selection** - Choose cards for the invoice
2. **Step 2: Invoice Details** - Enter invoice metadata and generate

### Step Flow Logic
```javascript
// Determine initial step based on context
const [step, setStep] = useState(
  preSelectedCards && preSelectedCards.length > 0 ? 2 : 1
);

// Skip to step 2 when:
// - Pre-selected cards are provided (bulk operation from CardList)
// - Editing an existing invoice
// - Cards have already been selected in current session
```

## Initialization Process

### Form Initialization
```javascript
useEffect(() => {
  if (!isOpen) return;
  
  const isInitialLoad = !seller && !invoiceNumber;
  
  if (editingInvoice && isInitialLoad) {
    // Edit mode - populate with existing invoice data
    setSelectedCards(editingInvoice.cards || []);
    setSeller(editingInvoice.seller || '');
    setDate(editingInvoice.date || new Date().toISOString().split('T')[0]);
    setInvoiceNumber(editingInvoice.invoiceNumber || '');
    setNotes(editingInvoice.notes || '');
    setStep(2);
  } else if (preSelectedCards && preSelectedCards.length > 0 && isInitialLoad) {
    // New invoice with pre-selected cards
    setSelectedCards(preSelectedCards);
    
    // Auto-populate date from first card's purchase date
    if (preSelectedCards[0].datePurchased) {
      setDate(preSelectedCards[0].datePurchased);
    }
    
    setStep(2);
  }
}, [isOpen, editingInvoice, preSelectedCards]);
```

### Data Loading
```javascript
useEffect(() => {
  const loadCollections = async () => {
    try {
      setLoading(true);
      const collectionsData = await db.getCollections();
      setCollections(collectionsData);
      
      // Flatten collections into single card array
      const allCards = [];
      Object.entries(collectionsData).forEach(([collectionName, cards]) => {
        if (Array.isArray(cards)) {
          cards.forEach(card => {
            allCards.push({
              ...card,
              collectionName // Add reference to parent collection
            });
          });
        }
      });
      
      setFilteredCards(allCards);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Failed to load card collections');
    } finally {
      setLoading(false);
    }
  };
  
  if (isOpen && currentUser) {
    loadCollections();
    
    // Generate default invoice number
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setInvoiceNumber(`INV-${dateStr}-${randomSuffix}`);
  }
}, [isOpen, currentUser]);
```

## Step 1: Card Selection

### Card Search and Filtering
```javascript
// Search functionality
const searchLower = searchQuery.toLowerCase();
const filteredBySearch = allCards.filter(card => {
  const cardName = (card.name || card.card || card.player || '').toLowerCase();
  const setName = (card.set || card.setName || '').toLowerCase();
  const cardNumber = (card.cardNumber || '').toString().toLowerCase();
  
  return cardName.includes(searchLower) || 
         setName.includes(searchLower) || 
         cardNumber.includes(searchLower);
});

// Collection filtering
const filteredByCollection = selectedCollection === 'All Collections' 
  ? filteredBySearch 
  : filteredBySearch.filter(card => card.collectionName === selectedCollection);
```

### Card Selection Management
```javascript
// Toggle individual card selection
const toggleCardSelection = (card) => {
  setSelectedCards(prev => {
    const isSelected = prev.some(c => c.id === card.id);
    if (isSelected) {
      return prev.filter(c => c.id !== card.id);
    } else {
      return [...prev, card];
    }
  });
};

// Check if card is selected
const isCardSelected = (cardId) => {
  return selectedCards.some(card => card.id === cardId);
};
```

### Card Selection UI
```javascript
{filteredByCollection.map(card => (
  <div key={card.id} className="card-item">
    <label className="flex items-center space-x-3 cursor-pointer">
      <input
        type="checkbox"
        checked={isCardSelected(card.id)}
        onChange={() => toggleCardSelection(card)}
        className="w-4 h-4 rounded border-gray-300"
      />
      
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">
          {card.name || card.card || card.player || 'Unnamed Card'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {card.set || card.setName} • #{card.cardNumber}
        </div>
        <div className="text-sm font-medium text-green-600">
          ${parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0).toFixed(2)}
        </div>
      </div>
    </label>
  </div>
))}
```

## Step 2: Invoice Details

### Form Fields
```javascript
<FormField
  label="Seller/Vendor"
  required
  error={errors.seller}
>
  <input
    type="text"
    value={seller}
    onChange={(e) => setSeller(e.target.value)}
    placeholder="Enter seller or vendor name"
    className="form-input"
  />
</FormField>

<FormField
  label="Purchase Date"
  required
  error={errors.date}
>
  <input
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="form-input"
  />
</FormField>

<FormField
  label="Invoice Number"
  required
  error={errors.invoiceNumber}
>
  <input
    type="text"
    value={invoiceNumber}
    onChange={(e) => setInvoiceNumber(e.target.value)}
    placeholder="Invoice reference number"
    className="form-input"
  />
</FormField>

<FormField
  label="Notes"
  error={errors.notes}
>
  <textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Additional notes or comments"
    rows={3}
    className="form-textarea"
  />
</FormField>
```

### Selected Cards Summary
```javascript
<div className="selected-cards-summary">
  <table className="w-full">
    <thead>
      <tr>
        <th className="text-left">Card</th>
        <th className="text-left">Set / Year</th>
        <th className="text-left">Price</th>
      </tr>
    </thead>
    <tbody>
      {selectedCards.map(card => (
        <tr key={card.id}>
          <td>
            <div className="font-medium">
              {card.name || card.player || 'Unnamed Card'}
            </div>
            <div className="text-sm text-gray-500">
              #{card.cardNumber}
            </div>
          </td>
          <td>
            <div>{card.set || card.setName}</div>
            <div className="text-sm text-gray-500">{card.year}</div>
          </td>
          <td>
            ${parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0).toFixed(2)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  
  <div className="total-section">
    <div className="flex justify-between font-medium">
      <span>Total Amount:</span>
      <span>${totalInvestment.toFixed(2)}</span>
    </div>
  </div>
</div>
```

## Form Submission

### Validation
```javascript
const validateForm = () => {
  const errors = {};
  
  if (!seller.trim()) {
    errors.seller = 'Seller/vendor name is required';
  }
  
  if (!date) {
    errors.date = 'Purchase date is required';
  }
  
  if (!invoiceNumber.trim()) {
    errors.invoiceNumber = 'Invoice number is required';
  }
  
  if (selectedCards.length === 0) {
    errors.cards = 'At least one card must be selected';
  }
  
  return errors;
};
```

### Submit Handler
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const validationErrors = validateForm();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  const totalInvestment = selectedCards.reduce((sum, card) => {
    return sum + parseFloat(card.originalInvestmentAmount || card.investmentAUD || 0);
  }, 0);
  
  const invoiceData = {
    id: editingInvoice?.id || `invoice_${Date.now()}`,
    seller: seller.trim(),
    date,
    invoiceNumber: invoiceNumber.trim(),
    notes: notes.trim(),
    cards: selectedCards,
    totalAmount: totalInvestment,
    createdAt: editingInvoice?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    await onSave(invoiceData);
    toast.success(editingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
    handleClose();
  } catch (error) {
    console.error('Error saving invoice:', error);
    toast.error('Failed to save invoice');
  }
};
```

## Data Structures

### Invoice Data Model
```javascript
{
  id: "invoice_1234567890",
  seller: "Trading Card Company",
  date: "2024-01-15",
  invoiceNumber: "INV-20240115-001",
  notes: "Purchased at card show",
  cards: [
    {
      id: "card_123",
      name: "Pikachu",
      set: "Base Set",
      cardNumber: "25",
      year: "1998",
      originalInvestmentAmount: 150.00,
      collectionName: "Vintage Pokemon"
    }
  ],
  totalAmount: 350.00,
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

### Selected Card Structure
```javascript
{
  id: "unique_card_id",
  name: "Card Name",
  card: "Alternative name field",
  player: "Player name",
  set: "Set Name",
  setName: "Alternative set field",
  cardNumber: "123",
  year: "2023",
  originalInvestmentAmount: 100.00,
  investmentAUD: 100.00, // Fallback amount
  collectionName: "Collection Name"
}
```

## Navigation and State Management

### Step Navigation
```javascript
// Move to next step
const handleNext = () => {
  if (selectedCards.length === 0) {
    toast.error('Please select at least one card');
    return;
  }
  setStep(2);
};

// Go back to previous step
const handleBack = () => {
  setStep(1);
};
```

### Modal Lifecycle
```javascript
const handleClose = () => {
  // Reset all form state
  setSelectedCards([]);
  setSeller('');
  setDate(new Date().toISOString().split('T')[0]);
  setInvoiceNumber('');
  setNotes('');
  setStep(1);
  setSearchQuery('');
  setSelectedCollection('All Collections');
  setErrors({});
  
  onClose();
};
```

## Integration Points

### CardList Integration
```javascript
// In CardList.js - bulk invoice creation
const handleCreateInvoice = () => {
  if (selectedCards.size === 0) {
    toast.error('Please select at least one card');
    return;
  }
  
  const selectedCardData = cards.filter(card => selectedCards.has(card.slabSerial));
  setSelectedCardsForPurchase(selectedCardData);
  setShowPurchaseInvoiceModal(true);
};

// Modal implementation
<CreateInvoiceModal
  isOpen={showPurchaseInvoiceModal}
  onClose={() => {
    setShowPurchaseInvoiceModal(false);
    setSelectedCardsForPurchase([]);
  }}
  onSave={handleInvoiceSave}
  preSelectedCards={selectedCardsForPurchase}
/>
```

### Database Integration
```javascript
// Save invoice to database
const handleInvoiceSave = async (invoiceData) => {
  try {
    await db.saveInvoice(invoiceData);
    
    // Update local state
    if (editingInvoice) {
      // Update existing invoice in list
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceData.id ? invoiceData : inv
      ));
    } else {
      // Add new invoice to list
      setInvoices(prev => [...prev, invoiceData]);
    }
    
    // Clear selection after successful save
    clearSelection();
  } catch (error) {
    throw error; // Re-throw for modal error handling
  }
};
```

## Error Handling

### Validation Errors
- **Missing seller**: "Seller/vendor name is required"
- **Missing date**: "Purchase date is required"
- **Missing invoice number**: "Invoice number is required"
- **No cards selected**: "At least one card must be selected"

### Database Errors
```javascript
try {
  await onSave(invoiceData);
} catch (error) {
  if (error.code === 'permission-denied') {
    toast.error('Permission denied. Please check your access rights.');
  } else if (error.code === 'network-error') {
    toast.error('Network error. Please check your connection.');
  } else {
    toast.error('Failed to save invoice. Please try again.');
  }
  console.error('Invoice save error:', error);
}
```

## Accessibility Features

### Keyboard Navigation
- Tab order follows logical form flow
- Enter key advances through steps or submits form
- Escape key closes modal

### Screen Reader Support
```javascript
// Step indicator
<div role="progressbar" aria-valuenow={step} aria-valuemax={2}>
  Step {step} of 2
</div>

// Form field labels
<label htmlFor="seller-input">
  Seller/Vendor <span aria-label="required">*</span>
</label>

// Error announcements
<div role="alert" aria-live="polite">
  {errors.seller && <span>{errors.seller}</span>}
</div>
```

## Performance Considerations

### Efficient Data Loading
- Collections loaded once on modal open
- Cards flattened for efficient searching
- Debounced search to prevent excessive filtering

### Memory Management
- Complete state cleanup on modal close
- Proper cleanup of event listeners
- Optimized re-renders through state management

## Future Enhancements

### Advanced Features
1. **Invoice Templates**: Predefined invoice formats
2. **PDF Generation**: Export invoices as PDF documents
3. **Duplicate Detection**: Prevent duplicate invoice numbers
4. **Batch Import**: Import multiple invoices from CSV/Excel
5. **Invoice Series**: Automatic sequential numbering

### Integration Enhancements
1. **Accounting Software**: Export to QuickBooks, Xero, etc.
2. **Tax Calculation**: Automatic tax computation
3. **Currency Conversion**: Multi-currency invoice support
4. **Email Integration**: Send invoices via email
5. **Cloud Storage**: Backup invoices to cloud services

This Invoice Creation System provides a comprehensive solution for documenting card purchases with professional invoice generation capabilities and seamless integration with the card management workflow.
