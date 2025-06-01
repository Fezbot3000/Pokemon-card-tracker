# Purchase Invoice System Documentation

## Overview

The Purchase Invoice System is a comprehensive document management solution that allows users to create, edit, manage, and export purchase invoices for Pokemon card acquisitions. The system supports both individual card selection and bulk operations integration, with advanced PDF generation and cloud-based batch processing capabilities.

## Architecture

### System Components

1. **PurchaseInvoices** - Main dashboard for viewing and managing invoices
2. **CreateInvoiceModal** - Two-step modal for invoice creation and editing
3. **InvoiceContext** - Global state management for invoice tracking
4. **PurchaseInvoicePDF** - PDF document generation component
5. **firestoreService** - Database operations for invoice persistence
6. **Cloud Functions** - Server-side batch PDF generation

### Data Flow Architecture

```
Card Selection → Invoice Creation → Database Storage → PDF Generation → Export/Download
     ↓              ↓                ↓                ↓               ↓
Multi-Select → CreateInvoiceModal → Firestore → PurchaseInvoicePDF → Cloud Functions
```

## Core Components

### PurchaseInvoices (Main Dashboard)

The primary component managing the invoice dashboard with comprehensive features:

#### State Management

```javascript
const [invoices, setInvoices] = useState([]);
const [loading, setLoading] = useState(true);
const [showCreateModal, setShowCreateModal] = useState(false);
const [editingInvoice, setEditingInvoice] = useState(null);
const [profile, setProfile] = useState(null);
const [sortField, setSortField] = useState('date');
const [sortDirection, setSortDirection] = useState('desc');
const [searchQuery, setSearchQuery] = useState('');
const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
```

#### Key Features

- **Sorting & Filtering**: Multi-field sorting with search functionality
- **Statistics Summary**: Automatic calculation of invoice metrics
- **Batch Operations**: Server-side PDF generation for multiple invoices
- **CRUD Operations**: Create, read, update, delete invoices
- **PDF Export**: Individual and batch download capabilities

#### Statistics Calculation

```javascript
const getInvoiceStatistics = () => {
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const totalCards = invoices.reduce((sum, invoice) => sum + (invoice.cards?.length || 0), 0);
  
  const averageInvoiceAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
  const averageCardValue = totalCards > 0 ? totalAmount / totalCards : 0;
  
  // Monthly breakdown for trends
  const monthlyData = invoices.reduce((acc, invoice) => {
    const month = new Date(invoice.date).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + invoice.totalAmount;
    return acc;
  }, {});
  
  return {
    totalInvoices,
    totalAmount,
    totalCards,
    averageInvoiceAmount,
    averageCardValue,
    monthlyData
  };
};
```

### CreateInvoiceModal (Two-Step Creation Process)

Advanced modal with dual-step workflow for comprehensive invoice creation:

#### Step 1: Card Selection

```javascript
// Card selection with search and filtering
const [selectedCards, setSelectedCards] = useState(preSelectedCards || []);
const [collections, setCollections] = useState({});
const [searchQuery, setSearchQuery] = useState('');
const [filteredCards, setFilteredCards] = useState([]);
const [selectedCollection, setSelectedCollection] = useState('All Collections');
```

**Features**:
- Cross-collection card search
- Real-time filtering
- Bulk selection from card list integration
- Visual selection indicators

#### Step 2: Invoice Details

```javascript
// Invoice metadata and configuration
const [seller, setSeller] = useState('');
const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
const [invoiceNumber, setInvoiceNumber] = useState('');
const [notes, setNotes] = useState('');
```

**Auto-population Features**:
- Automatic invoice number generation
- Date pre-population from selected cards
- Investment amount calculation
- Edit mode data pre-filling

#### Form Validation and Submission

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validation
  if (!seller.trim()) {
    toast.error('Seller is required');
    return;
  }
  if (selectedCards.length === 0) {
    toast.error('Please select at least one card');
    return;
  }
  
  try {
    const invoice = {
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
    
    // Save to database
    await db.savePurchaseInvoice(invoice);
    
    // Update parent component
    onSave(invoice);
    
    // Success feedback
    toast.success(editingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
  } catch (error) {
    console.error('Error saving invoice:', error);
    toast.error('Failed to save invoice');
  }
};
```

### InvoiceContext (Global State Management)

Provides application-wide invoice tracking for card association detection:

```javascript
const InvoiceProvider = ({ children }) => {
  const [invoiceCards, setInvoiceCards] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Load all purchase invoices and extract card IDs
  const loadInvoiceCards = async () => {
    try {
      const invoices = await db.getPurchaseInvoices();
      const cardIds = new Set();
      
      invoices.forEach(invoice => {
        if (invoice.cards && Array.isArray(invoice.cards)) {
          invoice.cards.forEach(card => {
            if (card.id) cardIds.add(card.id);
          });
        }
      });
      
      setInvoiceCards(cardIds);
    } catch (error) {
      console.error('Error loading invoice cards:', error);
    }
  };

  return (
    <InvoiceContext.Provider value={{ 
      isCardInInvoice: (cardId) => invoiceCards.has(cardId),
      refreshInvoiceCards: loadInvoiceCards,
      loading
    }}>
      {children}
    </InvoiceContext.Provider>
  );
};
```

**Purpose**: Enables real-time tracking of which cards are included in invoices across the application.

## PDF Generation System

### PurchaseInvoicePDF Component

Professional PDF document generation using React-PDF:

```javascript
const PurchaseInvoicePDF = ({ 
  seller, 
  date, 
  cards, 
  invoiceNumber, 
  notes, 
  totalAmount, 
  profile 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Pokemon Card Purchase</Text>
        
        {/* Invoice Details Section */}
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>PURCHASE INVOICE</Text>
          <Text>Invoice #: {invoiceNumber}</Text>
          <Text>Date: {date}</Text>
          {notes && <Text>Notes: {notes}</Text>}
        </View>
        
        {/* Seller Information */}
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Purchased From:</Text>
          <Text>{seller}</Text>
        </View>
        
        {/* Buyer Information */}
        {profile && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Purchased By:</Text>
            {profile.companyName && <Text>{profile.companyName}</Text>}
            <Text>{`${profile.firstName || ''} ${profile.lastName || ''}`}</Text>
            {profile.address && <Text>{profile.address}</Text>}
            {profile.mobileNumber && <Text>{profile.mobileNumber}</Text>}
            {profile.email && <Text>{profile.email}</Text>}
          </View>
        )}

        {/* Cards Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.headerCell}>Item Description</Text>
            <Text style={styles.headerCell}>Serial Number</Text>
            <Text style={styles.headerCell}>Price</Text>
          </View>

          {cards.map((card) => {
            const cardDisplayName = card.name || card.player || card.card || 
              (card.set ? `${card.set} Card` : 'Unnamed Card');
            
            return (
              <View key={card.id} style={styles.tableRow}>
                <View style={styles.col1}>
                  <Text style={styles.boldText}>{cardDisplayName}</Text>
                  {card.set && <Text>{card.year} {card.set} #{card.cardNumber}</Text>}
                  {card.grade && <Text>{card.gradeVendor || 'PSA'} {card.grade}</Text>}
                </View>
                <Text style={styles.col2}>{card.slabSerial || 'N/A'}</Text>
                <Text style={styles.col3}>
                  {card.investmentAUD ? card.investmentAUD.toFixed(2) : 'N/A'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Total Summary */}
        <View style={styles.summary}>
          <Text style={styles.totalAmount}>
            Total Amount: {totalAmount.toFixed(2)}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
```

### Advanced PDF Features

- **Professional Styling**: Corporate invoice design with consistent branding
- **Dynamic Content**: Card details populated from database
- **Comprehensive Information**: Seller, buyer, and transaction details
- **Responsive Layout**: Optimized for A4 paper format
- **Error Handling**: Graceful fallbacks for missing data

## Database Operations

### Firestore Integration

The system leverages Firestore for robust invoice persistence:

```javascript
// Get all purchase invoices
async getPurchaseInvoices() {
  try {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    const invoicesRef = this.getUserCollection('purchaseInvoices');
    const snapshot = await getDocs(query(invoicesRef, orderBy('date', 'desc')));
    
    const invoices = [];
    snapshot.forEach(doc => {
      invoices.push({ id: doc.id, ...doc.data() });
    });

    return invoices;
  } catch (error) {
    logger.error('Error getting purchase invoices:', error);
    throw error;
  }
}

// Save a purchase invoice
async savePurchaseInvoice(invoice) {
  try {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('No user ID');

    const invoiceRef = doc(this.getUserCollection('purchaseInvoices'), invoice.id);
    await setDoc(invoiceRef, {
      ...invoice,
      updatedAt: serverTimestamp()
    });

    logger.debug(`Purchase invoice ${invoice.id} saved successfully`);
  } catch (error) {
    logger.error('Error saving purchase invoice:', error);
    throw error;
  }
}

// Delete a purchase invoice
async deletePurchaseInvoice(invoiceId) {
  try {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('No user ID');

    const invoiceRef = doc(this.getUserCollection('purchaseInvoices'), invoiceId);
    await deleteDoc(invoiceRef);

    logger.debug(`Purchase invoice ${invoiceId} deleted successfully`);
  } catch (error) {
    logger.error('Error deleting purchase invoice:', error);
    throw error;
  }
}
```

### Database Adapter Layer

```javascript
// Simplified interface for components
class DatabaseAdapter {
  async getPurchaseInvoices() {
    try {
      return await firestoreService.getPurchaseInvoices();
    } catch (error) {
      logger.error('Error in getPurchaseInvoices adapter:', error);
      throw error;
    }
  }

  async savePurchaseInvoice(invoice) {
    try {
      return await firestoreService.savePurchaseInvoice(invoice);
    } catch (error) {
      logger.error('Error in savePurchaseInvoice adapter:', error);
      throw error;
    }
  }

  async deletePurchaseInvoice(invoiceId) {
    try {
      return await firestoreService.deletePurchaseInvoice(invoiceId);
    } catch (error) {
      logger.error('Error in deletePurchaseInvoice adapter:', error);
      throw error;
    }
  }
}
```

## Bulk Operations Integration

### Multi-Select System Integration

The invoice system seamlessly integrates with the card selection system:

```javascript
// From CardList component
const handleCreateInvoiceClick = () => {
  const selectedCardsArray = getSelectedCards();
  setPreSelectedCards(selectedCardsArray);
  setShowCreateInvoiceModal(true);
};

// Modal usage with pre-selected cards
<CreateInvoiceModal
  isOpen={showCreateInvoiceModal}
  onClose={() => {
    setShowCreateInvoiceModal(false);
    setPreSelectedCards([]);
  }}
  onSave={(newInvoice) => {
    // Handle invoice creation
    clearSelection(); // Clear multi-select after invoice creation
  }}
  preSelectedCards={preSelectedCards}
/>
```

### Workflow Integration

1. **Card Selection**: Users select cards in CardList using multi-select
2. **Bulk Action**: Click "Create Invoice" from bulk actions toolbar
3. **Modal Launch**: CreateInvoiceModal opens with pre-selected cards
4. **Skip Step 1**: Modal automatically advances to invoice details step
5. **Auto-populate**: Date and amounts calculated from selected cards
6. **Creation**: Invoice saved with selected cards and metadata
7. **Cleanup**: Selection cleared and UI updated

## Cloud Functions Integration

### Server-Side Batch PDF Generation

For large-scale operations, the system leverages Firebase Cloud Functions:

```javascript
const handleServerBatchGeneration = async () => {
  try {
    toast.loading('Generating PDF invoices on the server...', { id: 'server-batch' });
    setIsGeneratingBatch(true);
    
    // Get filtered invoice IDs
    const invoiceIds = filteredInvoices.map(invoice => invoice.id);
    
    // Call Cloud Function
    const generateBatchFn = httpsCallable(functions, 'generateInvoiceBatch');
    const result = await generateBatchFn({ invoiceIds });
    
    if (result.data && result.data.success) {
      // Create download link for ZIP file
      const downloadLink = document.createElement('a');
      downloadLink.href = result.data.url;
      downloadLink.download = result.data.filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success(`Successfully generated ${result.data.invoiceCount} invoice PDFs!`);
    }
  } catch (error) {
    console.error('Error in server batch PDF generation:', error);
    toast.error(`Error: ${error.message || 'Unknown error'}`);
  } finally {
    setIsGeneratingBatch(false);
  }
};
```

**Benefits**:
- **Scalability**: Handle large volumes without client limitations
- **Performance**: Server-side processing prevents browser blocking
- **Reliability**: Robust error handling and retry mechanisms
- **Convenience**: ZIP file delivery for bulk downloads

## User Interface Design

### Dashboard Layout

```jsx
<div className="invoice-dashboard">
  {/* Header with statistics */}
  <div className="dashboard-header">
    <StatisticsSummary statistics={invoiceStatistics} />
    <div className="action-buttons">
      <button onClick={() => setShowCreateModal(true)}>
        Create Invoice
      </button>
      <button onClick={handleServerBatchGeneration}>
        Export All PDFs
      </button>
    </div>
  </div>

  {/* Filtering and search */}
  <div className="filters-section">
    <input
      type="text"
      placeholder="Search invoices..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <select onChange={(e) => handleSort(e.target.value)}>
      <option value="date">Sort by Date</option>
      <option value="totalAmount">Sort by Amount</option>
      <option value="seller">Sort by Seller</option>
    </select>
  </div>

  {/* Invoice grid */}
  <div className="invoice-grid">
    {filteredInvoices.map(invoice => (
      <InvoiceCard
        key={invoice.id}
        invoice={invoice}
        onEdit={() => handleEditInvoice(invoice)}
        onDownload={() => handleDownloadInvoice(invoice)}
        onDelete={() => handleDeleteInvoice(invoice)}
      />
    ))}
  </div>
</div>
```

### Modal Design

Two-step modal with progressive disclosure:

```jsx
<div className="create-invoice-modal">
  {step === 1 ? (
    /* Step 1: Card Selection */
    <div className="card-selection-step">
      <h2>Select Cards for Invoice</h2>
      <SearchAndFilter />
      <CardSelectionGrid />
      <button onClick={() => setStep(2)} disabled={selectedCards.length === 0}>
        Continue to Invoice Details
      </button>
    </div>
  ) : (
    /* Step 2: Invoice Details */
    <div className="invoice-details-step">
      <h2>Invoice Details</h2>
      <FormFields />
      <SelectedCardsPreview />
      <TotalCalculation />
      <ActionButtons />
    </div>
  )}
</div>
```

## Error Handling

### Comprehensive Error Management

```javascript
// Database operation error handling
const handleDatabaseError = (error, operation) => {
  console.error(`Error in ${operation}:`, error);
  
  // User-friendly error messages
  const errorMessages = {
    'network-error': 'Network connection failed. Please check your internet connection.',
    'permission-denied': 'You do not have permission to perform this action.',
    'quota-exceeded': 'Storage quota exceeded. Please contact support.',
    'default': 'An unexpected error occurred. Please try again.'
  };
  
  const message = errorMessages[error.code] || errorMessages.default;
  toast.error(message);
  
  // Optional: Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // errorTracker.reportError(error, { operation, userId });
  }
};

// PDF generation error handling
const handlePDFError = (error, invoice) => {
  console.error('PDF generation failed:', error, invoice);
  
  // Fallback: Offer alternative download or manual generation
  toast.error('PDF generation failed. Please try downloading individual invoices.');
  
  // Cleanup any partial state
  setIsGeneratingBatch(false);
};

// Form validation error handling
const validateInvoiceForm = () => {
  const errors = [];
  
  if (!seller.trim()) errors.push('Seller name is required');
  if (!date) errors.push('Invoice date is required');
  if (!invoiceNumber.trim()) errors.push('Invoice number is required');
  if (selectedCards.length === 0) errors.push('At least one card must be selected');
  
  if (errors.length > 0) {
    errors.forEach(error => toast.error(error));
    return false;
  }
  
  return true;
};
```

## Performance Optimizations

### Data Management

- **Lazy Loading**: Invoice list virtualization for large datasets
- **Caching**: Invoice data cached in memory with invalidation
- **Pagination**: Server-side pagination for large invoice collections
- **Debounced Search**: Search input debouncing to reduce API calls

### PDF Generation

- **Client-Side Caching**: Generated PDFs cached for repeat downloads
- **Server-Side Processing**: Large batch operations moved to cloud functions
- **Progressive Loading**: Streaming PDF generation for large documents
- **Compression**: PDF optimization for faster downloads

### State Management

```javascript
// Memoized calculations
const invoiceStatistics = useMemo(() => {
  return getInvoiceStatistics();
}, [invoices]);

const filteredInvoices = useMemo(() => {
  return invoices
    .filter(invoice => 
      invoice.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortDirection === 'asc') {
        return a[sortField] > b[sortField] ? 1 : -1;
      } else {
        return a[sortField] < b[sortField] ? 1 : -1;
      }
    });
}, [invoices, searchQuery, sortField, sortDirection]);

// Optimized re-renders
const MemoizedInvoiceCard = React.memo(InvoiceCard);
```

## Security Considerations

### Data Protection

- **User Isolation**: Invoices scoped to authenticated user accounts
- **Input Sanitization**: All form inputs validated and sanitized
- **Access Control**: Firestore security rules enforce data access
- **Audit Trail**: All operations logged with timestamps

### Privacy Compliance

- **Data Minimization**: Only required fields stored in database
- **Export Controls**: User consent for data export operations
- **Deletion Rights**: Complete invoice deletion with cascade cleanup
- **Encryption**: All data encrypted in transit and at rest

## Testing Strategy

### Unit Tests

```javascript
describe('PurchaseInvoices Component', () => {
  test('should load invoices on mount', async () => {
    // Test invoice loading functionality
  });
  
  test('should filter invoices by search query', () => {
    // Test search functionality
  });
  
  test('should sort invoices by specified field', () => {
    // Test sorting functionality
  });
  
  test('should calculate statistics correctly', () => {
    // Test statistics calculation
  });
});

describe('CreateInvoiceModal', () => {
  test('should validate form inputs', () => {
    // Test form validation
  });
  
  test('should save invoice with correct data', async () => {
    // Test invoice creation
  });
  
  test('should handle edit mode correctly', () => {
    // Test invoice editing
  });
});

describe('PDF Generation', () => {
  test('should generate PDF with correct content', () => {
    // Test PDF content generation
  });
  
  test('should handle missing data gracefully', () => {
    // Test error handling in PDF
  });
});
```

### Integration Tests

- **End-to-end invoice creation workflow**
- **Multi-step modal navigation**
- **Database persistence verification**
- **PDF download functionality**
- **Bulk operations integration**

## Accessibility Features

### Keyboard Navigation

- **Tab Order**: Logical focus progression through interface
- **Keyboard Shortcuts**: Access key shortcuts for common actions
- **Modal Focus**: Proper focus management in modal dialogs
- **Form Navigation**: Arrow key navigation in form fields

### Screen Reader Support

```jsx
// ARIA labels and descriptions
<button
  aria-label="Create new purchase invoice"
  aria-describedby="create-invoice-help"
  onClick={() => setShowCreateModal(true)}
>
  Create Invoice
</button>

<div id="create-invoice-help" className="sr-only">
  Opens a modal dialog to create a new purchase invoice with selected cards
</div>

// Role definitions
<div role="table" aria-label="Purchase invoices list">
  <div role="rowgroup">
    {invoices.map(invoice => (
      <div key={invoice.id} role="row" aria-label={`Invoice ${invoice.invoiceNumber}`}>
        <div role="cell">{invoice.seller}</div>
        <div role="cell">{invoice.date}</div>
        <div role="cell">{invoice.totalAmount}</div>
      </div>
    ))}
  </div>
</div>
```

### Visual Accessibility

- **High Contrast**: Support for high contrast color schemes
- **Font Scaling**: Responsive typography with zoom support
- **Color Independence**: Information not conveyed through color alone
- **Focus Indicators**: Clear visual focus indicators

## Future Enhancements

### Advanced Features

1. **Template System**: Pre-defined invoice templates with custom branding
2. **Recurring Invoices**: Automated generation for regular purchases
3. **Multi-Currency**: Support for international transactions
4. **Tax Calculations**: Automatic tax computation based on location
5. **Payment Tracking**: Integration with payment processing systems
6. **Approval Workflows**: Multi-step approval for large purchases
7. **Vendor Management**: Comprehensive seller/vendor database
8. **Purchase Analytics**: Advanced reporting and analytics dashboard

### Integration Opportunities

1. **Accounting Software**: QuickBooks, Xero integration
2. **Payment Processors**: Stripe, PayPal integration
3. **Email Systems**: Automated invoice distribution
4. **Cloud Storage**: Automatic backup to Google Drive/Dropbox
5. **Mobile Apps**: Dedicated mobile invoice management
6. **API Endpoints**: RESTful API for third-party integrations

### Performance Improvements

1. **Real-time Sync**: WebSocket-based live updates
2. **Offline Support**: Progressive Web App with offline capabilities
3. **Background Processing**: Web Workers for PDF generation
4. **CDN Integration**: Global content delivery for faster access
5. **Caching Strategies**: Advanced caching with service workers

### User Experience Enhancements

1. **Drag & Drop**: Visual card selection interface
2. **Bulk Editing**: Mass update of invoice details
3. **Quick Actions**: Context menus and keyboard shortcuts
4. **Smart Suggestions**: AI-powered auto-completion
5. **Visual Themes**: Customizable interface themes
6. **Export Formats**: Multiple export formats (Excel, CSV, XML)

This comprehensive documentation provides developers with complete understanding of the Purchase Invoice System architecture, implementation details, and integration points for effective maintenance and future development.
