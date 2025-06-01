# Card Details Modal

## 1. Feature Overview

### 1.1. Purpose and Scope

The Card Details Modal is a critical component of the Pokemon Card Tracker application that allows users to view and edit comprehensive details of their cards. It serves as the primary interface for card data management after cards have been added to a collection.

### 1.2. Problem Solved

This feature solves several problems:
- Enables users to view complete card information in a dedicated interface
- Provides editing capabilities for all card attributes
- Allows users to update card images
- Facilitates PSA data lookup and integration for existing cards
- Supports marking cards as sold and moving them to the sold items section
- Calculates and displays profit/loss information

### 1.3. User Stories

**Primary User Stories:**
- As a collector, I want to view all details of my card in a clean, organized interface
- As a collector, I want to update card information when values change or when I discover errors
- As a collector, I want to update card images with better quality photos
- As a collector, I want to look up PSA data for cards I've already added
- As a collector, I want to mark cards as sold and track their sale details
- As an investor, I want to see profit/loss calculations based on my investment and current value

### 1.4. Acceptance Criteria

1. **Viewing Functionality:**
   - Modal displays all card details in an organized, visually appealing format
   - Card image is prominently displayed with enlargement capability
   - Financial data (investment, current value, profit/loss) is clearly presented

2. **Editing Functionality:**
   - All card fields can be edited directly in the modal
   - Form validates inputs and provides appropriate error messages
   - Changes can be saved or discarded
   - Unsaved changes prompt confirmation before closing

3. **Image Management:**
   - Current card image is displayed with proper loading states
   - Images can be replaced with new uploads
   - Failed image loads can be retried
   - Images can be enlarged for detailed viewing

4. **PSA Integration:**
   - Serial numbers can be searched against PSA database
   - PSA data can be applied to update card details
   - Loading states are displayed during PSA searches

5. **Sale Management:**
   - Cards can be marked as sold
   - Sale information can be captured
   - Sold cards are removed from active collection and moved to sold items

6. **Collection Management:**
   - Card collection can be changed

### 1.5. Feature Scope

**In Scope:**
- Complete card information display
- Full editing capabilities for all card attributes
- Image viewing, enlargement, and replacement
- PSA data lookup and integration
- Sale processing and tracking
- Unsaved changes management
- Profit/loss calculation and display

**Out of Scope:**
- Bulk editing of multiple cards
- Card comparison functionality
- External marketplace integration
- Historical value tracking and graphing
- Print/export functionality

## 2. User Interface and Experience

### 2.1. Entry Points

The Card Details Modal can be accessed from:
1. Clicking on any card in the collection view
2. Selecting "View Details" from a card's context menu
3. Clicking on a card in search results

### 2.2. User Flow

1. **Opening the Modal:**
   - User clicks on a card in any view
   - Modal opens with a loading state while fetching card data and image
   - Once loaded, complete card details and image are displayed

2. **Viewing Card Details:**
   - Card image is displayed prominently
   - Card information is organized in clear sections
   - Financial information shows investment, current value, and profit/loss

3. **Editing Card Details:**
   - User can edit any field directly in the form
   - Changes are tracked and "Save" button becomes active
   - Validation occurs as fields are edited

4. **Updating Card Image:**
   - User can click the "Change Image" button
   - File selector opens for choosing a new image
   - New image is previewed before saving

5. **PSA Lookup:**
   - User can click the PSA lookup icon next to the serial number
   - Loading state is shown during search
   - Results are automatically populated in the relevant fields

6. **Marking as Sold:**
   - User clicks "Mark as Sold" button
   - Sale Modal appears for capturing sale details
   - After confirmation, card is moved to Sold Items

7. **Saving Changes:**
   - User clicks "Save" button
   - Validation is performed on all fields
   - Success or error message is displayed
   - On success, modal can be closed or remain open

8. **Closing the Modal:**
   - User clicks "Close" button or outside the modal
   - If unsaved changes exist, confirmation dialog appears
   - User can choose to save, discard, or cancel

### 2.3. Interface Elements

**Main Modal Structure:**
- Header with card name and close button
- Card image section with enlarge capability
- Tab-based interface (for potential future expansion)
- Form with grouped fields
- Action buttons (Save, Close, Mark as Sold)
- Status messages for operations
- Enlarged image modal (when activated)

**Form Fields:**
- Card Name
- Player/Character
- Category (Pokemon, MLB, etc.)
- Year
- Set (dynamically populated based on category)
- Grading Company (PSA, BGS, CGC, SGC, Raw)
- Grade (dynamically populated based on company)
- Serial Number (with PSA lookup button)
- Population
- Date Purchased
- Quantity
- Collection selector
- Investment Amount and Currency
- Current Value Amount and Currency
- Notes

**Action Elements:**
- Save button (primary action)
- Close button (secondary action)
- Mark as Sold button (danger action)
- Image upload/change button
- Image enlarge button
- PSA lookup button

### 2.4. Visual Design

**Layout:**
- Responsive design adapts to desktop and mobile views
- Card image prominently displayed on left (desktop) or top (mobile)
- Form fields organized in logical groups
- Clean spacing and alignment for readability

**Color and Typography:**
- Consistent with application's design system
- Color-coded status messages (green for success, red for error)
- Profit shown in green, loss in red
- Clear visual hierarchy through typography
- Dark mode support via theme context

**Animations and Transitions:**
- Fade-in animation when modal opens
- Smooth transitions between loading states
- Slide animations for form sections
- Zoom animation for enlarged image view

### 2.5. Error States and User Feedback

**Input Validation:**
- Required fields are marked and validated
- Numeric fields validate for proper format
- Date fields validate for proper format
- Collection field validates for existence

**Loading States:**
- Initial modal loading state with spinner
- Image loading state with placeholder
- PSA search loading state
- Save operation loading state

**Feedback Mechanisms:**
- Form field validation errors shown inline
- Operation status messages at bottom of modal
- Toast notifications for major actions (save, PSA lookup)
- Confirmation dialogs for destructive actions

### 2.6. Accessibility Considerations

- Keyboard navigation for all interactive elements
- Proper labeling of form fields for screen readers
- Adequate color contrast for all text elements
- Focus management within the modal
- Semantic HTML structure
- Appropriate ARIA attributes for custom controls

### 2.7. Responsive Behavior

**Desktop View:**
- Two-column layout with image on left, form on right
- Full field widths for ample space
- Side-by-side field groups for related information

**Mobile View:**
- Single column layout with image at top
- Full-width form fields
- Stacked field groups
- Optimized touch targets for mobile interaction

### 2.8. Edge Cases

- Handling very large images
- Managing missing or corrupt image data
- Handling network interruptions during PSA lookup
- Managing concurrent edits from multiple devices
- Handling extremely long text in fields
- Supporting various currency symbols and formats
- Managing transitions between grading companies with different scales

## 3. Technical Implementation

### 3.1. Component Architecture

The Card Details Modal feature is implemented through a hierarchy of three main components:

1. **CardDetails (src/components/CardDetails.js)**
   - Wrapper component that manages state and database operations
   - Handles image loading and blob URL management
   - Manages unsaved changes detection
   - Interfaces with Firestore for data persistence

2. **CardDetailsModal (src/design-system/components/CardDetailsModal.js)**
   - Core modal component that handles UI structure and interactions
   - Manages tabs, animations, and responsive layout
   - Coordinates between form inputs and actions
   - Implements PSA lookup functionality
   - Handles sale integration

3. **CardDetailsForm (src/design-system/components/CardDetailsForm.js)**
   - Implements the actual form fields and validation
   - Manages dynamic field population based on selections
   - Handles currency formatting and calculations
   - Provides image upload interface

**Component Hierarchy:**
```
CardDetails
└── CardDetailsModal
    ├── CardDetailsForm
    │   ├── FormField (multiple)
    │   ├── SelectField (multiple)
    │   ├── ImageUpload
    │   └── PSALookupButton
    ├── Modal (design system)
    ├── Button (design system)
    ├── Icon (design system)
    └── SaleModal (conditionally rendered)
```

### 3.2. Props and State Management

**CardDetails Props:**
```javascript
{
  card: PropTypes.object,                     // Card data to display/edit
  onClose: PropTypes.func.isRequired,         // Function to call when modal is closed
  onUpdateCard: PropTypes.func.isRequired,    // Function to update card in parent component
  onDelete: PropTypes.func.isRequired,        // Function to delete card
  exchangeRate: PropTypes.number.isRequired,  // Current exchange rate for currency conversion
  collections: PropTypes.arrayOf(PropTypes.string), // Available collections
  initialCollectionName: PropTypes.string     // Initial collection for the card
}
```

**CardDetailsModal Props:**
```javascript
{
  isOpen: PropTypes.bool.isRequired,          // Whether modal is open
  onClose: PropTypes.func.isRequired,         // Function to call when modal is closed
  card: PropTypes.object,                     // Card data to display/edit
  onSave: PropTypes.func,                     // Function to save changes
  onDelete: PropTypes.func,                   // Function to delete card
  onMarkAsSold: PropTypes.func,               // Function to mark card as sold
  onChange: PropTypes.func,                   // Function for tracking changes
  image: PropTypes.string,                    // Card image URL
  imageLoadingState: PropTypes.string,        // Image loading state
  onImageChange: PropTypes.func,              // Function to handle image change
  onImageRetry: PropTypes.func,               // Function to retry image loading
  className: PropTypes.string,                // Additional CSS classes
  additionalHeaderContent: PropTypes.node,    // Optional header content
  additionalValueContent: PropTypes.node,     // Optional value content
  additionalSerialContent: PropTypes.node,    // Optional serial number content
  collections: PropTypes.arrayOf(PropTypes.string), // Available collections
  initialCollectionName: PropTypes.string,    // Initial collection for the card
  isPsaLoading: PropTypes.bool                // Whether PSA lookup is in progress
}
```

**Key State Variables in CardDetails:**
```javascript
const [isOpen, setIsOpen] = useState(true);
const [editedCard, setEditedCard] = useState({...});
const [cardImage, setCardImage] = useState(null);
const [imageLoadingState, setImageLoadingState] = useState('loading');
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [isPsaLoading, setIsPsaLoading] = useState(false);
```

**Key State Variables in CardDetailsModal:**
```javascript
const [activeTab, setActiveTab] = useState('details');
const [cardImage, setCardImage] = useState(null);
const [localImageLoadingState, setLocalImageLoadingState] = useState('idle');
const [showEnlargedImage, setShowEnlargedImage] = useState(false);
const [isConfirmingSold, setIsConfirmingSold] = useState(false);
const [saveMessage, setSaveMessage] = useState('');
const [errors, setErrors] = useState({});
const [animClass, setAnimClass] = useState('fade-in');
const [contentLoaded, setContentLoaded] = useState(false);
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
const [isPsaSearching, setIsPsaSearching] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

### 3.3. Key Methods and Functions

**CardDetails Methods:**
- `loadCardImage()`: Fetches and loads the card image
- `handleImageChange(file)`: Processes new image uploads
- `handleClose(saveSuccess, skipConfirmation)`: Handles modal closing with unsaved changes detection
- `handleSave()`: Validates and saves card changes
- `handleCardChange(updatedCard)`: Tracks card field changes
- `hasCardBeenEdited()`: Detects if card data has been modified

**CardDetailsModal Methods:**
- `handlePsaSearch(serialNumber)`: Performs PSA lookup by serial number
- `handleImageChange(file)`: Handles image file selection
- `handleMarkAsSold()`: Initiates the sold card workflow
- `handleSaleConfirm(saleData)`: Processes sale confirmation
- `handleSave(e)`: Validates and saves card changes
- `getProfit()`: Calculates profit/loss based on investment and current value

**CardDetailsForm Methods:**
- `updateAvailableSets()`: Updates set options based on category selection
- `handleInputChange(e)`: Processes standard input field changes
- `handleNumberChange(e)`: Processes numeric input fields
- `handleInvestmentInputChange(e)`: Handles investment amount and currency changes
- `handleCurrentValueInputChange(e)`: Handles current value amount and currency changes
- `handleCompanyChange(e)`: Updates grade options based on grading company
- `handleCollectionChange(e)`: Processes collection selection changes
- `handleAddCustomSet(newSet, year)`: Adds custom set to available options

### 3.4. Lifecycle and Effects

**CardDetails Effects:**
- Update editedCard when card or initialCollectionName changes
- Clean up blob URLs when component unmounts
- Listen for card-images-cleanup event
- Track imageUrl changes to clean up stale blob URLs

**CardDetailsModal Effects:**
- Handle window resize to detect mobile/desktop
- Load and set card image when available
- Update form content when card data changes
- Clean up on unmount

**CardDetailsForm Effects:**
- Update available sets when category or year changes
- Update grade options when grading company changes
- Apply PSA data when available

### 3.5. Helper Functions

- `formatDate(dateString)`: Formats date strings consistently
- `getProfit()`: Calculates profit/loss with currency conversion
- `updateCondition(company, grade)`: Updates condition based on grade and company
- `validateForm()`: Validates all form fields before saving

### 3.6. Supporting Components

- **Modal**: Design system component for modal dialogs
- **Button**: Design system component for buttons
- **Icon**: Design system component for icons
- **FormField**: Design system component for standard form fields
- **SelectField**: Design system component for dropdown selects
- **ImageUpload**: Design system component for image uploads
- **PSALookupButton**: Button component for PSA search integration
- **SaleModal**: Modal for capturing sale details

## 4. Backend Interactions and Data Flow

### 4.1. API Endpoints and Services

**PSA API Integration:**
- `searchByCertNumber(serialNumber)`: Fetches card data from PSA by certification number
- `parsePSACardData(data)`: Transforms PSA API response into application data model

**Firebase/Firestore Services:**
- `cardRepo.getCardImageURL(cardId)`: Fetches the image URL for a card
- `cardRepo.uploadCardImage(card, file)`: Uploads a new card image
- `db.updateCard(cardId, cardData)`: Updates card data in Firestore
- `db.getSoldCards()`: Retrieves the list of sold cards
- `db.saveSoldCards(soldCards)`: Updates the sold cards list

### 4.2. Database Operations

**Read Operations:**
- Fetch card data when modal is opened
- Retrieve card image from Firebase Storage
- Fetch collection list for collection selector
- Get sold cards list when marking as sold

**Write Operations:**
- Update card data when saved
- Upload new card image when changed
- Add card to sold cards list when marked as sold
- Remove card from collection when marked as sold

### 4.3. State Synchronization

**Local State to Database:**
- Card data is edited locally in component state
- Image is processed and uploaded to Firebase Storage
- On save, Firestore is updated with new card data
- Blob URLs are created and revoked for image preview

**Database to UI:**
- Card data flows from Firestore to component state
- Image URL is loaded from Firebase Storage
- Collection list is retrieved from Firestore

### 4.4. Error Handling for Data Operations

- Failed image loads can be retried
- Network errors during save are caught and displayed
- PSA lookup failures show appropriate error messages
- Invalid data is prevented from being saved

### 4.5. Caching and Performance Considerations

- Blob URLs are properly managed to prevent memory leaks
- Image loading is deferred until needed
- PSA data is cached in card data to reduce API calls
- Form validation runs efficiently without unnecessary re-renders

## 5. Data Models and State Management

### 5.1. Data Models

**Card Data Schema:**
```javascript
{
  id: String,                // Unique identifier
  card: String,              // Card name
  player: String,            // Player/character name
  set: String,               // Card set
  setName: String,           // Alternative set name field
  year: String,              // Year of release
  category: String,          // Category (Pokemon, MLB, etc.)
  grade: String,             // Grade value
  company: String,           // Grading company
  condition: String,         // Condition description
  slabSerial: String,        // Serial number on slab
  population: String|Number, // Population count
  datePurchased: String,     // Purchase date (ISO format)
  notes: String,             // Additional notes
  
  // Financial data
  originalInvestmentAmount: Number,       // Original investment amount
  originalInvestmentCurrency: String,     // Original investment currency
  originalCurrentValueAmount: Number,     // Original current value amount
  originalCurrentValueCurrency: String,   // Original current value currency
  
  // Legacy financial fields (maintained for backward compatibility)
  investmentUSD: String|Number,
  currentValueUSD: String|Number,
  investmentAUD: String|Number,
  currentValueAUD: String|Number,
  
  // Collection information
  collection: String,        // Collection name
  collectionId: String,      // Collection identifier
  
  // Image information
  imageUrl: String,          // Image URL
  hasImage: Boolean,         // Whether card has an image
  imageUpdatedAt: Number,    // Timestamp of last image update
  _blobUrl: String,          // Temporary blob URL for image preview
  _pendingImageFile: File,   // Pending image file for upload
  
  // PSA data
  psaData: Object,           // Raw PSA data
  psaSearched: Boolean,      // Whether PSA data has been searched
  psaUrl: String,            // URL to PSA certificate
  
  // Quantity
  quantity: Number|String    // Quantity of this card
}
```

**Validation Rules:**
- Card name is required
- Category is required
- Grade/condition is required based on company
- Currency values must be valid numbers
- Dates must be valid ISO format

### 5.2. UI State Variables

**Modal UI States:**
- `isOpen`: Whether the modal is open
- `showEnlargedImage`: Whether enlarged image view is active
- `isConfirmingSold`: Whether sale confirmation is active
- `activeTab`: Currently active tab
- `contentLoaded`: Whether content has loaded
- `isMobile`: Whether viewport is mobile size

**Operation States:**
- `imageLoadingState`: Loading state of card image ('idle', 'loading', 'error')
- `isPsaSearching`: Whether PSA search is in progress
- `isSaving`: Whether save operation is in progress
- `hasUnsavedChanges`: Whether card has unsaved changes

**Feedback States:**
- `saveMessage`: Message to display after operations
- `errors`: Validation error messages by field
- `animClass`: CSS animation class for transitions

### 5.3. State Transformations

**Input Processing:**
- String inputs are trimmed
- Numeric inputs are parsed and formatted
- Dates are validated and formatted
- Currencies are normalized to preferred currency

**Data Transformations:**
- PSA data is mapped to card fields
- Financial calculations convert between currencies
- Grading company selection changes available grades
- Category selection changes available sets

### 5.4. State Persistence

- Card data is persisted to Firestore
- Images are stored in Firebase Storage
- Blob URLs are managed for the session only
- Unsaved changes are tracked but not persisted

## 6. Dependencies and Environment Setup

### 6.1. External Libraries and Dependencies

**Core Libraries:**
- React: UI component framework
- Firebase/Firestore: Database and storage
- react-hot-toast: Toast notifications

**UI Components:**
- Design system components (Modal, Button, Icon, etc.)
- Form field components

**Utility Libraries:**
- PropTypes: Runtime type checking

### 6.2. Internal Dependencies

**Services:**
- `cardRepo`: Card data repository service
- `dbAdapter`: Firestore database adapter
- `psaSearch`: PSA API integration service

**Contexts:**
- `UserPreferencesContext`: User preferences including currency format
- `ThemeContext`: Application theme (dark/light mode)

**Utilities:**
- `dateUtils`: Date formatting utilities
- `pokemonSets`: Pokemon set data management

### 6.3. Configuration and Environment Variables

- Firebase configuration for database and storage
- PSA API endpoint configuration
- Currency exchange rate settings

### 6.4. Build and Deployment Considerations

- Proper bundling of all component files
- Image optimization for storage and loading
- Environment-specific configurations (dev/prod)

## 7. Error Handling and Monitoring

### 7.1. Error Scenarios

**User Input Errors:**
- Invalid data in form fields
- Missing required fields
- Invalid image formats or sizes

**API and Service Errors:**
- PSA API unavailable or returning errors
- Firestore connection issues
- Image upload failures
- Authentication/permission issues

**Runtime Errors:**
- JavaScript execution errors
- Component rendering errors
- Memory issues with large images

### 7.2. Error Handling Strategies

**Form Validation:**
- Client-side validation before submission
- Field-level error messages
- Form-level error summary

**Service Error Handling:**
- Try-catch blocks around all API calls
- Specific error handling for different failure types
- Retry mechanisms for transient errors

**UI Error Recovery:**
- Graceful degradation for missing data
- Retry options for failed operations
- Clear user feedback for all error states

### 7.3. Logging and Monitoring

- Console logging for development debugging
- Firebase Analytics integration for production monitoring
- Error tracking for critical operations

### 7.4. Fallback Mechanisms

- Default values for missing data
- Placeholder images for failed image loads
- Offline capability with local state

## 8. Testing and Quality Assurance

### 8.1. Unit Tests

**Component Tests:**
- Test CardDetailsModal rendering
- Test form validation logic
- Test financial calculations
- Test PSA data integration
- Test image handling

**Service Tests:**
- Test PSA API integration
- Test Firestore operations
- Test image upload/download

### 8.2. Integration Tests

- Test CardDetails with mock Firestore
- Test full edit and save flow
- Test mark as sold flow
- Test image replacement flow

### 8.3. UI/UX Tests

- Test responsive layouts
- Test keyboard navigation
- Test screen reader accessibility
- Test color contrast and theme switching

### 8.4. Manual Testing Scenarios

**Functional Testing:**
1. Open modal and verify all data displays correctly
2. Edit each field type and verify validation
3. Upload new image and verify preview
4. Perform PSA lookup and verify data application
5. Mark card as sold and verify move to sold items
6. Test unsaved changes warning
7. Verify currency conversions and profit calculation

**Edge Cases:**
1. Test with very large images
2. Test with extremely long text inputs
3. Test with network interruptions
4. Test with various currency combinations
5. Test with missing or partial card data

### 8.5. Performance Considerations

- Monitor image loading and processing times
- Optimize form re-renders
- Ensure smooth animations on lower-end devices
- Manage memory usage with blob URLs

## 9. Maintenance and Evolution

### 9.1. Known Issues and Limitations

**Technical Debt:**
- Some duplication between CardDetails and CardDetailsModal
- Legacy financial fields maintained for backward compatibility
- Blob URL management could be simplified
- Validation could be more consistent

**Performance Issues:**
- Large images can cause memory pressure
- Multiple re-renders during form editing
- PSA lookups can be slow with network latency

**Architectural Improvements:**
- Refactor to use React Query for API operations
- Implement form state management with React Hook Form
- Centralize validation logic
- Move blob URL management to a dedicated service

### 9.2. Extension Points

**New Feature Opportunities:**
- Support for other grading companies' APIs
- Barcode/QR code scanning for serial numbers
- Historical value tracking with charts
- Card comparison view
- Advanced filtering within modal

**Configuration Options:**
- Customizable field visibility
- User-defined default values
- Saved templates for quick editing

**Integration Possibilities:**
- Price guide API integration
- Authentication verification services
- Export to collection management platforms
- Social sharing features

### 9.3. Version History

**Current Version:**
- Full card editing capabilities
- PSA lookup integration
- Image management
- Sale tracking integration
- Profit/loss calculation

**Planned Improvements:**
- Enhanced validation
- Better mobile support
- Performance optimizations
- More grading company integrations
- Historical value tracking

**Future Roadmap:**
- Multi-language support
- Advanced financial analytics
- Card condition visualization tools
- Card authentication verification
- Print/export functionality
