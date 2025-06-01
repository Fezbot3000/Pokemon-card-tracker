# Sold Items System - Technical Documentation

## Overview

The Sold Items System manages and displays Pokemon cards that have been sold, organizing them by financial years and invoices. It provides comprehensive financial tracking, professional PDF invoice generation, and detailed statistics for sold card transactions.

## Architecture

### Core Components

#### 1. **SoldItems** (`/src/components/SoldItems/SoldItems.js`)
The main dashboard component for managing sold items with comprehensive functionality.

**Key Features:**
- Financial year grouping (Australian financial year: July 1 - June 30)
- Invoice-based organization and grouping
- Real-time statistics calculation
- PDF invoice generation and download
- Multi-currency support with conversion
- Database operations and synchronization
- Advanced filtering and searching
- Import/export functionality
- Database debugging and repair tools

**State Management:**
```javascript
const [soldCards, setSoldCards] = useState([]);
const [sortField, setSortField] = useState('dateSold');
const [sortDirection, setSortDirection] = useState('desc');
const [filter, setFilter] = useState('');
const [searchTerm, setSearchTerm] = useState('');
const [invoicesMap, setInvoicesMap] = useState({});
const [profile, setProfile] = useState(null);
const [expandedYears, setExpandedYears] = useState(new Set());
const [expandedInvoices, setExpandedInvoices] = useState(new Set());
const [expandedBuyers, setExpandedBuyers] = useState(new Set());
const [isLoading, setIsLoading] = useState(true);
```

#### 2. **SoldItemsView** (`/src/design-system/components/SoldItemsView.js`)
Reusable display component for sold items with collapsible interface.

**Key Features:**
- Hierarchical display (Financial Year → Invoice → Cards)
- Collapsible sections with state management
- Responsive design for mobile and desktop
- Lazy loading for performance optimization
- Currency formatting and conversion
- Date handling for various formats including Firestore Timestamps

#### 3. **InvoiceHeader** (`/src/design-system/molecules/invoice/InvoiceHeader.js`)
Collapsible header component for individual invoices.

**Props Interface:**
```javascript
{
  title: string,              // Buyer name
  subtitle: string,           // Sale date
  totalSale: number,          // Total sale amount
  totalInvestment: number,    // Total investment amount
  totalProfit: number,        // Calculated profit
  isExpanded: boolean,        // Expansion state
  onToggle: function,         // Toggle handler
  onPrint: function,          // PDF generation handler
  onDelete: function,         // Delete handler
  cardCount: number,          // Number of cards
  formatUserCurrency: function, // Currency formatter
  originalCurrencyCode: string  // Original currency
}
```

#### 4. **InvoicePDF** (`/src/components/InvoicePDF.js`)
Professional PDF invoice generation using React-PDF.

**Features:**
- A4 format professional layout
- Company and buyer information
- Detailed card listing with pricing
- Investment, sale, and profit calculations
- Styled headers and footer
- Consistent branding

### Supporting Components

#### **InvoiceCard** (`/src/design-system/molecules/invoice/InvoiceCard.js`)
Individual card display component with lazy loading and financial calculations.

#### **StatisticsSummary** (Design System)
Summary component displaying aggregated financial statistics.

## Data Flow

### 1. **Loading Process**
```javascript
// Load sold cards from database
const loadSoldCards = async () => {
  try {
    setIsLoading(true);
    const response = await db.getSoldCards();
    if (response && response.data) {
      setSoldCards(response.data);
    }
  } catch (error) {
    logger.error('Error loading sold cards:', error);
    toast.error('Failed to load sold cards');
  } finally {
    setIsLoading(false);
  }
};
```

### 2. **Financial Year Grouping**
```javascript
const getFinancialYear = (dateStr) => {
  let date;
  // Handle Firestore Timestamp objects
  if (dateStr && typeof dateStr === 'object' && 'seconds' in dateStr) {
    date = new Date(dateStr.seconds * 1000);
  } else {
    date = new Date(dateStr);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  
  if (month < 6) { // Jan-Jun
    return `${year-1}/${year}`;
  } else { // Jul-Dec
    return `${year}/${year+1}`;
  }
};
```

### 3. **Invoice Grouping**
```javascript
const groupCardsByInvoice = (cards) => {
  const invoices = {};
  
  cards.forEach(card => {
    const key = card.buyer || 'Unknown';
    if (!invoices[key]) {
      invoices[key] = {
        id: key,
        buyer: key,
        dateSold: card.dateSold,
        cards: [],
        totalInvestment: 0,
        totalSale: 0,
        totalProfit: 0
      };
    }
    
    invoices[key].cards.push(card);
    // Calculate totals with currency conversion
    const investment = convertToUserCurrency(
      parseFloat(card.originalInvestmentAmount || 0), 
      card.originalInvestmentCurrency || 'AUD'
    );
    const sale = convertToUserCurrency(
      parseFloat(card.soldPrice || 0), 
      card.originalCurrentValueCurrency || 'AUD'
    );
    
    invoices[key].totalInvestment += investment;
    invoices[key].totalSale += sale;
    invoices[key].totalProfit = invoices[key].totalSale - invoices[key].totalInvestment;
  });
  
  return Object.values(invoices);
};
```

## Database Operations

### Firestore Service Integration
Located in `/src/services/firestore/firestoreService.js`:

#### **Get Sold Items**
```javascript
async getSoldItems() {
  try {
    const soldItemsRef = this.getUserCollection('sold-items');
    const snapshot = await getDocs(soldItemsRef);
    
    const soldItems = [];
    snapshot.forEach(doc => {
      soldItems.push({ id: doc.id, ...doc.data() });
    });
    
    return soldItems;
  } catch (error) {
    logger.error('Error getting sold items:', error);
    throw error;
  }
}
```

#### **Save Sold Item**
```javascript
async saveSoldItem(soldItem) {
  try {
    const soldItemRef = doc(this.getUserCollection('sold-items'), soldItem.id);
    await setDoc(soldItemRef, {
      ...soldItem,
      updatedAt: new Date()
    });
    logger.debug(`Sold item ${soldItem.id} saved successfully`);
  } catch (error) {
    logger.error('Error saving sold item:', error);
    throw error;
  }
}
```

#### **Delete Sold Items**
```javascript
async deleteSoldItems(itemIds) {
  try {
    const batch = writeBatch(this.db);
    
    itemIds.forEach(itemId => {
      const itemRef = doc(this.getUserCollection('sold-items'), itemId);
      batch.delete(itemRef);
    });
    
    await batch.commit();
    logger.debug(`${itemIds.length} sold items deleted successfully`);
  } catch (error) {
    logger.error('Error deleting sold items:', error);
    throw error;
  }
}
```

## PDF Generation

### Invoice PDF Structure
```javascript
const InvoicePDF = ({ buyer, date, cards, invoiceId, profile }) => {
  const totalInvestment = cards.reduce((sum, card) => 
    sum + (parseFloat(card.investmentAUD) || 0), 0);
  
  const totalSale = cards.reduce((sum, card) => {
    const cardId = card.id || card.slabSerial;
    const individualSalePrice = card.soldPrices?.[cardId] 
      ? parseFloat(card.soldPrices[cardId])
      : parseFloat(card.soldPrice) || 0;
    return sum + individualSalePrice;
  }, 0);
  
  const totalProfit = totalSale - totalInvestment;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header, Invoice Info, Table, Summary */}
      </Page>
    </Document>
  );
};
```

### PDF Download Handler
```javascript
const handleDownloadInvoice = async (buyer, invoice) => {
  try {
    const profile = await loadProfile();
    const invoiceId = `INV-${Date.now()}`;
    
    const pdfBlob = await pdf(
      <InvoicePDF 
        buyer={buyer}
        date={formatDate(invoice.dateSold)}
        cards={invoice.cards}
        invoiceId={invoiceId}
        profile={profile}
      />
    ).toBlob();
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${buyer}-${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Invoice downloaded successfully');
  } catch (error) {
    logger.error('Error generating invoice:', error);
    toast.error('Failed to generate invoice');
  }
};
```

## Statistics Calculation

### Card Statistics Utility
Located in `/src/utils/cardStatistics.js`:

```javascript
export const calculateSoldCardStatistics = (soldCards, invoiceTotals, convertToUserCurrency) => {
  if (!soldCards || soldCards.length === 0) {
    return {
      totalInvestment: 0,
      totalSoldFor: 0,
      totalProfit: 0,
      invoiceCount: 0
    };
  }

  let totalInvestment = 0;
  let totalSoldFor = 0;
  
  soldCards.forEach(card => {
    const investmentAmount = parseFloat(
      card.originalInvestmentAmount || 
      card.investmentAUD || 
      card.investment || 
      0
    );
    const investmentCurrency = card.originalInvestmentCurrency || 'AUD';
    
    const soldAmount = parseFloat(
      card.soldPrice || 
      card.soldAmount || 
      card.finalValueAUD || 
      card.currentValueAUD || 
      0
    );
    const soldCurrency = card.originalCurrentValueCurrency || 'AUD';
    
    totalInvestment += convertToUserCurrency(investmentAmount, investmentCurrency);
    totalSoldFor += convertToUserCurrency(soldAmount, soldCurrency);
  });
  
  const totalProfit = totalSoldFor - totalInvestment;
  const uniqueInvoices = new Set(soldCards.map(card => card.invoiceId).filter(Boolean));
  const invoiceCount = uniqueInvoices.size || Object.keys(invoiceTotals).length;
  
  return {
    totalInvestment,
    totalSoldFor,
    totalProfit,
    invoiceCount
  };
};
```

## Currency Support

### Multi-Currency Handling
```javascript
const formatUserCurrency = (amount, currencyCode) => {
  if (amount === undefined || amount === null) return '0.00';
  
  const currency = availableCurrencies.find(c => c.code === currencyCode) || { symbol: '$' };
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  
  const formattedAmount = absoluteAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return isNegative ? `-${currency.symbol}${formattedAmount}` : `${currency.symbol}${formattedAmount}`;
};
```

### Currency Conversion Integration
- Uses `UserPreferencesContext` for preferred currency
- Automatic conversion of historical transactions
- Preserves original currency information
- Real-time exchange rate support

## User Interface

### Responsive Design
- **Mobile**: Collapsed financial summary, touch-friendly interactions
- **Desktop**: Full financial breakdown, hover states
- **Tablet**: Adaptive layout with optimized spacing

### Interaction Patterns
- **Hierarchical Expansion**: Financial Year → Invoice → Card Details
- **Action Buttons**: PDF download, invoice deletion
- **Search & Filter**: Real-time filtering across all invoices
- **Statistics Panel**: Live calculation display

### State Management
```javascript
// Expansion state management
const [expandedYears, setExpandedYears] = useState(new Set());
const [expandedInvoices, setExpandedInvoices] = useState(new Set());
const [expandedBuyers, setExpandedBuyers] = useState(new Set());

// Toggle functions
const toggleYear = (year) => {
  setExpandedYears(prev => {
    const newSet = new Set(prev);
    if (newSet.has(year)) {
      newSet.delete(year);
    } else {
      newSet.add(year);
    }
    return newSet;
  });
};
```

## Error Handling

### Database Error Recovery
```javascript
// Automatic retry mechanism
const loadSoldCards = async (retryCount = 0) => {
  try {
    const response = await db.getSoldCards();
    if (response && response.data) {
      setSoldCards(response.data);
    }
  } catch (error) {
    if (retryCount < 3) {
      logger.warn(`Retrying sold cards load, attempt ${retryCount + 1}`);
      setTimeout(() => loadSoldCards(retryCount + 1), 1000);
    } else {
      logger.error('Error loading sold cards after retries:', error);
      toast.error('Failed to load sold cards');
    }
  }
};
```

### Data Validation
```javascript
// Filter out invalid entries
const validItems = useMemo(() => {
  return items.filter(invoice => 
    invoice && 
    invoice.dateSold && 
    invoice.cards && 
    invoice.cards.length > 0 && 
    invoice.buyer
  );
}, [items]);
```

## Performance Optimization

### Lazy Loading
- **Image Loading**: Cards images loaded only when invoice expanded
- **Data Loading**: Progressive loading of invoice details
- **Virtual Scrolling**: Large datasets handled efficiently

### Memoization
```javascript
// Grouped data memoization
const groupedByYear = useMemo(() => {
  return groupInvoicesByFinancialYear(validItems);
}, [validItems]);

// Statistics memoization
const statistics = useMemo(() => {
  return calculateSoldCardStatistics(soldCards, invoiceTotals, convertToUserCurrency);
}, [soldCards, invoiceTotals, convertToUserCurrency]);
```

### Batch Operations
- **PDF Generation**: Efficient bulk PDF creation
- **Database Writes**: Batched Firestore operations
- **State Updates**: Debounced search and filter operations

## Debugging and Development Tools

### Database Debugging
```javascript
const debugIndexedDB = () => {
  const request = indexedDB.open('pokemon-card-db');
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction(['sold'], 'readonly');
    const store = transaction.objectStore('sold');
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      console.log('Sold items in IndexedDB:', getAllRequest.result);
    };
  };
};
```

### Import/Export Functionality
```javascript
const importSoldItemsFromBackup = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.sold && Array.isArray(data.sold)) {
          db.saveSoldCards({ data: data.sold });
          toast.success('Sold items imported successfully');
          loadSoldCards();
        }
      } catch (error) {
        toast.error('Failed to import sold items');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
};
```

## Testing Strategy

### Unit Tests
- **Component Rendering**: Test all major components render correctly
- **State Management**: Verify expansion/collapse functionality
- **Currency Conversion**: Test multi-currency calculations
- **Date Handling**: Validate financial year calculations

### Integration Tests
- **Database Operations**: Test Firestore integration
- **PDF Generation**: Verify PDF creation and download
- **Search & Filter**: Test filtering across all data
- **Statistics Calculation**: Validate financial calculations

### E2E Tests
- **Complete Workflow**: Full sold items management flow
- **PDF Download**: End-to-end PDF generation and download
- **Responsive Behavior**: Test across different screen sizes
- **Error Scenarios**: Test error handling and recovery

## Security Considerations

### Data Access Control
- **User Isolation**: Firestore security rules enforce user-specific data access
- **Authentication**: Required authentication for all operations
- **Input Sanitization**: Validation of all user inputs

### PDF Security
- **No Sensitive Data**: PDFs contain only necessary transaction information
- **Local Generation**: PDFs generated client-side for security
- **Temporary URLs**: Download URLs automatically cleaned up

## Accessibility Features

### Keyboard Navigation
- **Tab Order**: Logical keyboard navigation through interface
- **Enter/Space**: Activation of collapsible sections
- **Arrow Keys**: Navigation between financial years and invoices

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA Labels**: Descriptive labels for interactive elements
- **Status Updates**: Live regions for dynamic content changes

### Visual Accessibility
- **High Contrast**: Support for high contrast mode
- **Focus Indicators**: Clear focus indicators for keyboard users
- **Color Independence**: Information not conveyed through color alone

## Future Enhancements

### Advanced Features
- **Invoice Templates**: Customizable PDF templates
- **Bulk Operations**: Multi-invoice selection and operations
- **Advanced Analytics**: Trend analysis and forecasting
- **Export Formats**: Additional export formats (CSV, Excel)

### Performance Improvements
- **Virtual Scrolling**: For large datasets
- **Progressive Loading**: Incremental data loading
- **Caching Strategy**: Intelligent caching of frequent queries
- **Background Sync**: Offline capability with sync

### Integration Opportunities
- **Accounting Software**: Integration with accounting platforms
- **Tax Reporting**: Automated tax document generation
- **Market Analysis**: Integration with card market data
- **Notification System**: Email/SMS notifications for transactions

## Conclusion

The Sold Items System provides comprehensive management of sold Pokemon card transactions with professional invoice generation, multi-currency support, and detailed financial tracking. Its hierarchical organization by financial year and buyer makes it easy for users to track their sales performance over time, while the professional PDF generation ensures proper documentation for accounting and tax purposes.

The system's robust error handling, performance optimizations, and accessibility features make it suitable for both casual collectors and serious dealers managing large inventories and frequent transactions.
