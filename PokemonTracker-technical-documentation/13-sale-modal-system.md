# Sale Modal System - Technical Documentation

## Overview
The Sale Modal System enables users to mark selected cards as sold by capturing buyer information, individual sold prices, and calculating profit/loss for each transaction. The modal provides a comprehensive interface for bulk sale operations with validation, currency conversion, and profit calculation.

## File Location
- **Component**: `src/components/SaleModal.js`
- **Integration**: Used by `CardList.js` for bulk sale operations

## Component Architecture

### Props Interface
```javascript
const SaleModal = ({ 
  isOpen,        // Boolean - Controls modal visibility
  onClose,       // Function - Callback when modal is closed
  selectedCards, // Array - Selected card objects for sale
  onConfirm      // Function - Callback with sale data when confirmed
})
```

### State Management
```javascript
const [buyer, setBuyer] = useState('');                    // Buyer name
const [dateSold, setDateSold] = useState('');             // Sale date (YYYY-MM-DD)
const [soldPrices, setSoldPrices] = useState({});         // Price per card by slabSerial
const [errors, setErrors] = useState({});                 // Validation errors
const [isInitialized, setIsInitialized] = useState(false); // Modal initialization state
```

## Core Functionality

### Initialization Process
```javascript
useEffect(() => {
  if (isOpen && selectedCards.length > 0) {
    // Reset all form fields
    setBuyer('');
    setDateSold(new Date().toISOString().split('T')[0]);
    
    // Initialize price inputs for each selected card
    const initialPrices = {};
    selectedCards.forEach(card => {
      initialPrices[card.slabSerial] = '';
    });
    
    setSoldPrices(initialPrices);
    setErrors({});
    setIsInitialized(true);
  } else if (!isOpen) {
    setIsInitialized(false);
  }
}, [isOpen, selectedCards]);
```

### Price Management
Individual price handling for each card:
```javascript
const handlePriceChange = (slabSerial, value) => {
  setSoldPrices(prev => ({
    ...prev,
    [slabSerial]: value
  }));
  
  // Clear validation error when user starts typing
  if (errors[slabSerial]) {
    setErrors(prev => ({
      ...prev,
      [slabSerial]: null
    }));
  }
};
```

### Currency Conversion & Calculations
```javascript
// Total investment calculation with currency conversion
const { convertToUserCurrency } = useUserPreferences();
const totalInvestment = selectedCards.reduce((sum, card) => {
  const investment = parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0;
  const investmentInPreferredCurrency = convertToUserCurrency(
    investment, 
    card.originalInvestmentCurrency || preferredCurrency.code
  );
  return sum + investmentInPreferredCurrency;
}, 0);

// Sale totals
const totalSalePrice = Object.values(soldPrices).reduce((sum, price) => 
  sum + (parseFloat(price) || 0), 0
);
const totalProfit = totalSalePrice - totalInvestment;
```

## Validation System

### Comprehensive Validation
```javascript
const validate = () => {
  const newErrors = {};
  
  // Buyer name validation
  if (!buyer.trim()) {
    newErrors.buyer = "Please enter the buyer's name";
  }

  // Price validation for each card
  selectedCards.forEach(card => {
    const price = parseFloat(soldPrices[card.slabSerial]);
    if (!price || isNaN(price) || price <= 0) {
      newErrors[card.slabSerial] = "Please enter a valid price";
    }
  });

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Real-time Error Clearing
- Errors are cleared when user starts typing in the respective field
- Visual feedback provided immediately for user experience

## UI Components

### Header Section
```javascript
<div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
  <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
    Mark Cards as Sold
  </h1>
  <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
    <span className="material-icons">close</span>
  </button>
</div>
```

### Buyer Information Form
```javascript
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-2">
    Buyer Name <span className="text-red-600 dark:text-red-500">*</span>
  </label>
  <input
    type="text"
    value={buyer}
    onChange={(e) => setBuyer(e.target.value)}
    placeholder="Enter buyer's name"
    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700"
  />
</div>

<div className="mb-4">
  <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-2">
    Date Sold <span className="text-red-600 dark:text-red-500">*</span>
  </label>
  <input
    type="date"
    value={dateSold}
    onChange={(e) => setDateSold(e.target.value)}
    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700"
  />
</div>
```

### Individual Card Price Entry
```javascript
{selectedCards.map(card => {
  const investment = parseFloat(card.originalInvestmentAmount || card.investmentAUD) || 0;
  const investmentInPreferredCurrency = convertToUserCurrency(
    investment, 
    card.originalInvestmentCurrency || preferredCurrency.code
  );
  const soldPrice = parseFloat(soldPrices[card.slabSerial]) || 0;
  const profit = soldPrice - investmentInPreferredCurrency;

  return (
    <div key={card.slabSerial} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {card.card || card.name || card.player || 'Unnamed Card'}
          </h4>
          <p className="text-xs text-gray-700 dark:text-gray-400">
            Investment: {formatAmountForDisplay(investment, card.originalInvestmentCurrency)}
          </p>
        </div>
        
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-800 dark:text-gray-300 mb-1">
            Sold Price ({preferredCurrency.code}) <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            value={soldPrices[card.slabSerial]}
            onChange={(e) => handlePriceChange(card.slabSerial, e.target.value)}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 h-10 text-sm rounded-lg border"
          />
          
          {/* Error display */}
          {errors[card.slabSerial] && (
            <p className="text-red-600 text-xs mt-1">{errors[card.slabSerial]}</p>
          )}
          
          {/* Profit calculation */}
          <div className="text-xs mt-1">
            Profit: 
            <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatAmountForDisplay(profit, preferredCurrency.code)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
})}
```

### Summary Totals Section
```javascript
<div className="border-t border-gray-300 dark:border-gray-700 pt-3">
  <div className="grid grid-cols-2 gap-3 text-sm">
    <div>
      <span className="text-gray-700 dark:text-gray-400">Total Sale Price:</span>
      <span className="float-right font-medium text-gray-900 dark:text-white">
        {formatAmountForDisplay(totalSalePrice, preferredCurrency.code)}
      </span>
    </div>
    <div>
      <span className="text-gray-700 dark:text-gray-400">Total Profit:</span>
      <span className={`float-right font-medium ${
        totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {formatAmountForDisplay(totalProfit, preferredCurrency.code)}
      </span>
    </div>
  </div>
</div>
```

## Form Submission

### Submit Handler
```javascript
const handleSubmit = () => {
  if (validate()) {
    onConfirm({
      buyer,
      dateSold,
      soldPrices,           // Object with slabSerial -> price mapping
      totalSalePrice,       // Calculated total sale amount
      totalProfit           // Calculated total profit/loss
    });
  }
};
```

### Data Structure Returned
```javascript
{
  buyer: "John Doe",
  dateSold: "2024-01-15",
  soldPrices: {
    "12345678": "150.00",
    "87654321": "200.00"
  },
  totalSalePrice: 350.00,
  totalProfit: 125.50
}
```

## Modal Lifecycle

### Opening Process
1. Modal becomes visible (`isOpen = true`)
2. State is initialized with default values
3. Price inputs are created for each selected card
4. Current date is set as default sale date

### Closing Process
```javascript
const handleClose = () => {
  // Reset all state to initial values
  setBuyer('');
  setDateSold(new Date().toISOString().split('T')[0]);
  setSoldPrices({});
  setErrors({});
  setIsInitialized(false);
  
  // Notify parent component
  onClose();
};
```

### Cleanup
- All form data is cleared when modal closes
- No persistent state between modal sessions
- Fresh initialization on each opening

## Integration with Parent Component

### CardList Integration
```javascript
// In CardList.js
const handleMarkAsSold = () => {
  if (selectedCards.size === 0) {
    toast.error('Please select at least one card to mark as sold');
    return;
  }
  
  const selectedCardData = cards.filter(card => selectedCards.has(card.slabSerial));
  setSelectedCardsForSale(selectedCardData);
  setShowSaleModal(true);
};

// Modal implementation
<SaleModal
  isOpen={showSaleModal}
  onClose={() => {
    setShowSaleModal(false);
    setSelectedCardsForSale([]);
  }}
  selectedCards={selectedCardsForSale}
  onConfirm={handleSaleConfirm}
/>
```

## Currency Support

### Multi-Currency Handling
- Displays investment amounts in original currencies
- Accepts sale prices in user's preferred currency
- Converts all amounts for consistent profit calculations
- Uses `useUserPreferences` context for currency operations

### Currency Conversion Flow
1. Read original investment amount and currency from card data
2. Convert to user's preferred currency for calculation
3. Accept sale price input in preferred currency
4. Calculate profit in preferred currency
5. Display all amounts with appropriate currency symbols

## Error Handling

### Validation Errors
- **Empty buyer name**: "Please enter the buyer's name"
- **Invalid price**: "Please enter a valid price" (for each card)
- **Negative/zero prices**: Handled by min="0" attribute and validation

### User Experience
- Real-time error clearing as user types
- Visual error indicators below input fields
- Form submission blocked until all errors resolved
- Clear error messages for each validation rule

## Accessibility Features

### Keyboard Navigation
- Tab order follows logical form flow
- Enter key submits form when validation passes
- Escape key closes modal

### Screen Reader Support
```javascript
// Aria labels for form inputs
aria-label="Buyer name input"
aria-label={`Price input for ${card.card}`}

// Required field indicators
<span className="text-red-600 dark:text-red-500">*</span>

// Error announcements
role="alert"
aria-live="polite"
```

### Visual Accessibility
- High contrast error messages
- Clear field labels and requirements
- Color-independent profit indicators (+ text descriptions)

## Performance Considerations

### Efficient Rendering
- Conditional rendering based on `isInitialized` state
- Memoized calculations where appropriate
- Optimized re-renders through proper state management

### Memory Management
- Complete state cleanup on modal close
- No memory leaks from event listeners
- Proper cleanup in useEffect hooks

## Future Enhancements

### Advanced Features
1. **Bulk pricing**: Apply same price to multiple cards
2. **Price suggestions**: Based on recent sales or market data
3. **Sale history**: Track buyer patterns and repeat customers
4. **Tax calculations**: Include tax implications in profit calculations
5. **Commission handling**: Account for platform/marketplace fees

### UX Improvements
1. **Auto-save drafts**: Preserve data if modal accidentally closed
2. **Price validation**: Warning for significantly low/high prices
3. **Buyer autocomplete**: Suggest previous buyers
4. **Quick actions**: Preset prices based on card type/grade

### Integration Enhancements
1. **Receipt generation**: Automatic sale receipt creation
2. **Inventory sync**: Real-time inventory updates
3. **Analytics integration**: Track sale patterns and trends
4. **Export capabilities**: Export sale data for accounting

This Sale Modal System provides a comprehensive solution for processing bulk card sales with proper validation, currency support, and user-friendly interface design.
