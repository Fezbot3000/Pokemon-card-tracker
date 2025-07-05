# 1. Add New Card Modal

## 1. Feature Overview

### 1.1. Purpose & Problem Solved
The Add New Card Modal solves the problem of efficiently adding new Pokemon cards to a user's collection with comprehensive details and imagery. Without this feature, users would have no way to build their card collection in the app, making the core functionality of tracking Pokemon cards impossible. The modal provides a structured, guided approach to entering card information, supporting both manual data entry and automated data retrieval via PSA certification lookup, ensuring data accuracy and reducing user effort.

### 1.2. User Stories & Acceptance Criteria
**Primary User Journey:**
- As a Pokemon card collector, I want to add new cards to my collection with detailed information and images so that I can track my investments and card values.

**Edge Case Scenarios:**
- As a user who collects graded cards, I want to lookup PSA certification data automatically so I don't have to manually enter all card details.
- As a user with cards in multiple collections, I want to specify which collection a card belongs to during the addition process.
- As a user with unique cards, I want to be able to create new collections on-the-fly while adding a card.

**Success Criteria:**
- User can add cards with complete details including name, value, condition, and images
- User can lookup PSA certification data to auto-populate card details
- User can select existing collections or create new ones
- User receives validation feedback for required fields
- User can preview and enlarge card images before saving

### 1.3. Feature Scope & Boundaries
**Included in this Feature:**
- Card detail entry form with comprehensive fields
- PSA certification lookup integration
- Collection selection and creation
- Card image upload and preview
- Form validation and error handling
- Success/failure status messaging

**Explicitly NOT Included:**
- Card editing functionality (separate EditCardModal component)
- Bulk card import functionality
- Card grading service integration other than PSA
- Card marketplace pricing data retrieval

**Related Features:**
- Collection Management (for creating and organizing collections)
- Card List View (where cards appear after being added)
- Card Details Form (the form component used within the modal)
- PSA Detail Modal (for viewing and applying PSA data)

## 2. User Interface & Experience Flow

### 2.1. Feature Entry Points
- "Add Card" button in the main card list view
- "Add Card" button in empty collection state
- "Add Card" action in the application header menu

**Prerequisites:**
- User must be logged in to access this feature
- At least one collection must exist (or "All Cards" default collection)
- User must have permission to write to the database

### 2.2. Step-by-Step User Journey
1. **Initial Access:**
   - User clicks an "Add Card" button in the application
   - Modal slides in from the right side of the screen

2. **PSA Lookup (Optional):**
   - User enters a PSA certification number in the lookup field
   - User clicks "Search PSA" button
   - System searches PSA database and auto-populates card details if found
   - System shows success/error message for the lookup operation

3. **Collection Selection:**
   - User selects an existing collection from the dropdown
   - Alternatively, user selects "Create New Collection" option
   - If creating a new collection, a secondary modal appears for collection creation

4. **Card Details Entry:**
   - User fills out required and optional card details in the form
   - User uploads a card image by clicking the image upload area
   - User can click the image to view an enlarged version

5. **Form Submission:**
   - User clicks "Add Card" button to save the card
   - System validates all required fields
   - System shows error messages for any validation failures
   - On success, system saves the card and closes the modal
   - On failure, system shows error message and keeps modal open

### 2.3. Form Fields & Input Validation

**Card Details Section:**
| Field | Required | Validation Rules | Error Messages |
|-------|----------|-----------------|----------------|
| Card Name | Yes | Non-empty string | "Card name is required" |
| Player | No | Any text allowed | N/A |
| Set | No | Any text allowed | N/A |
| Year | No | Valid year number | N/A |
| Category | No | Any text allowed | N/A |
| Condition | No | Any text allowed | N/A |
| Certification Number | No | Valid PSA number format | "This serial number already exists" (if duplicate) |
| Date Purchased | Yes | Valid date | "Date purchased is required" |
| Investment (AUD) | Yes | Positive number | "Investment amount is required" |
| Current Value (AUD) | No | Number | N/A |
| Quantity | Yes | Integer >= 1 | "Quantity must be at least 1" |

**Collection Selection:**
| Field | Required | Validation Rules | Error Messages |
|-------|----------|-----------------|----------------|
| Collection | Yes | Must select a valid collection | "Please select a collection" |
| | | Cannot be "Sold" collection | "Cards cannot be added directly to the Sold collection" |

**Image Upload:**
| Field | Required | Validation Rules | Error Messages |
|-------|----------|-----------------|----------------|
| Card Image | Yes | Valid image file | "Card image is required" |

### 2.4. Interactive Elements

**Buttons:**
- "Search PSA" - Initiates PSA certification lookup
- "+" (Add Collection) - Opens new collection creation modal
- "View on PSA Website" - External link to PSA certificate page (only shown if PSA data exists)
- "Cancel" - Closes the modal without saving
- "Add Card" - Validates and saves the card data

**Dropdowns:**
- Collection selector with option to create new collection

**Modal Elements:**
- Slide-in animation from right side
- Enlarged image preview modal with backdrop blur
- PSA Detail Modal for detailed PSA data viewing
- New Collection Modal for creating collections

**Status Indicators:**
- Loading state for PSA lookup ("Searching PSA database...")
- Success/error message displays for operations
- Disabled buttons during processing operations
- Image loading state indicator

### 2.5. Edge Cases & Error Scenarios

**Network Failures:**
- PSA lookup fails due to network issues
  - Error message: "Failed to search PSA database. Please check the number and try again."
  - User can retry or proceed with manual entry

**Validation Errors:**
- Missing required fields
  - Each field shows specific error message
  - Form submit button remains enabled but shows validation error on submission
  - User must correct errors before proceeding

**Duplicate Data:**
- Attempting to add a card with existing certification number
  - Error message: "This serial number already exists in your active collections"
  - Field with error is scrolled into view
  - User must change the certification number or cancel

**Image Upload Issues:**
- Failed image upload
  - Error message: "Failed to load image"
  - Retry button appears to attempt upload again
  - User can try uploading a different image

**Collection Issues:**
- No collections available
  - "Create New Collection" option is pre-selected
  - New Collection modal opens automatically
  - User must create a collection to continue

## 3. Technical Implementation

### 3.1. Primary Component Analysis

**File Location:** `src/components/AddCardModal.js`

**Component Responsibilities:**
- Manage card creation form state and validation
- Handle PSA certification lookup and data application
- Manage collection selection and creation
- Process image uploads and previews
- Save card data to the database
- Provide user feedback for all operations

**Props Interface:**
```javascript
{
  isOpen: PropTypes.bool.isRequired,       // Controls modal visibility
  onClose: PropTypes.func.isRequired,      // Function to close the modal
  onSave: PropTypes.func.isRequired,       // Function to save the card
  collections: PropTypes.array,            // Available collections list
  className: PropTypes.string,             // Additional CSS classes
  onNewCollectionCreated: PropTypes.func,  // Handler for new collection creation
  defaultCollection: PropTypes.string      // Pre-selected collection
}
```

**State Management:**
```javascript
// Card data state
const [newCard, setNewCard] = useState({...emptyCard});
  
// Collection selection state
const [selectedCollection, setSelectedCollection] = useState(/* default logic */);

// Image handling state
const [cardImage, setCardImage] = useState(null);
const [imageFile, setImageFile] = useState(null);
const [imageLoadingState, setImageLoadingState] = useState('idle');
const [showEnlargedImage, setShowEnlargedImage] = useState(false);

// PSA lookup state
const [psaSerial, setPsaSerial] = useState('');
const [isSearching, setIsSearching] = useState(false);
const [psaDetailModalOpen, setPsaDetailModalOpen] = useState(false);
const [psaData, setPsaData] = useState(null);

// Validation and UI feedback state
const [errors, setErrors] = useState({});
const [saveMessage, setSaveMessage] = useState(null);
const [animClass, setAnimClass] = useState('');
const [isSaving, setIsSaving] = useState(false);

// New collection modal state
const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
```

**Key Methods:**
1. `handleImageChange(file)`: Processes uploaded image files and creates preview URLs
2. `handleCardChange(updatedCard)`: Updates card state with form changes
3. `validateForm()`: Validates all required fields and collection selection
4. `handleSave()`: Validates and saves the card data to the database
5. `handlePsaLookup()`: Searches PSA database for certificate information
6. `handleApplyPsaDetails(updatedCardData)`: Applies PSA data to the card form

**Lifecycle Methods/Hooks:**
```javascript
// Reset form when modal opens
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
  } else {
    setAnimClass('slide-out-right');
  }
}, [isOpen]);
```

### 3.2. Supporting Components

**CardDetailsForm Component:**
- **File Location:** `src/design-system/components/CardDetailsForm.js`
- **Purpose:** Reusable form for card details entry
- **Props Interface:** Card data, error state, image handlers, change handlers
- **Communication:** Receives card data and error state from parent, emits changes via callbacks

**PSADetailModal Component:**
- **File Location:** `src/components/PSADetailModal.js`
- **Purpose:** Display detailed PSA data and allow selective application
- **Props Interface:** PSA certification number, current card data, handlers
- **Communication:** Receives PSA data from parent, returns applied data via callback

**NewCollectionModal Component:**
- **File Location:** `src/components/NewCollectionModal.js`
- **Purpose:** Create new collections during card addition
- **Props Interface:** Visibility state, existing collections, creation handler
- **Communication:** Returns new collection name via callback

**Modal Component:**
- **File Location:** `src/design-system/molecules/Modal.js`
- **Purpose:** Base modal component with positioning and animation support
- **Props Interface:** Title, content, footer, positioning, animation class
- **Communication:** Controls modal visibility and appearance

**Button Component:**
- **File Location:** `src/design-system/atoms/Button.js`
- **Purpose:** Styled button component with variants
- **Props Interface:** Variant, disabled state, click handler
- **Communication:** Triggers actions in parent components

### 3.3. Business Logic Layer

**PSA Search Service:**
- **File Location:** `src/services/psaSearch.js`
- **Functions:**
  - `searchByCertNumber(serialNumber)`: Searches PSA database for certificate
  - `parsePSACardData(psaData)`: Transforms PSA API response to app data format

**Validation Logic:**
- Required field validation (card name, investment amount, date, quantity)
- Collection validation (must select valid collection, cannot be "Sold")
- Image validation (image upload required)
- Duplicate certificate number validation

**Data Transformation:**
- PSA data mapping to card data fields
- Image file to URL conversion
- Form data normalization for database storage

### 3.4. Integration Points

**Database Integration:**
- Card data saved to Firestore via `onSave` callback
- Collection creation integrated with database adapter

**Image Storage:**
- Card images uploaded to Firebase Storage via `onSave` callback

**PSA API Integration:**
- PSA data fetched via Firebase Functions through `searchByCertNumber` service

**Component Integration:**
- Integrated with main app via shared collection state
- Shares card data with CardList component for display after saving

## 4. Backend Interactions & Data Flow

### 4.1. API Endpoints & Services

**PSA Certificate Lookup:**
- **Endpoint:** Firebase Function (proxied PSA API call)
- **Method:** POST
- **Headers:** Content-Type: application/json
- **Request Payload:**
```json
{
  "certNumber": "12345678"
}
```
- **Response Payload:**
```json
{
  "cardData": {
    "certNumber": "12345678",
    "grade": "10",
    "name": "Charizard",
    "set": "Base Set",
    "year": "1999",
    "population": "120",
    ...
  }
}
```

### 4.2. Database Operations

**Card Creation:**
- **Collection:** `cards`
- **Operation:** Create new document
- **Validation:** Check for duplicate certification numbers
- **Transaction:** Atomic card creation with image upload

**Collection Management:**
- **Collection:** `collections`
- **Operation:** Create new collection document if needed
- **Validation:** Check for duplicate collection names

### 4.3. File/Asset Management

**Image Upload Process:**
1. User selects image file via file input
2. File is temporarily stored in component state
3. Preview URL created using URL.createObjectURL
4. On save, image uploaded to Firebase Storage
5. URL reference saved with card data

**Storage Location:**
- Firebase Storage bucket: `mycardtracker-c8479.firebasestorage.app`
- Path format: `/cards/{userId}/{cardId}`

**Image Validation:**
- File type checking for valid image formats
- Loading state tracking during upload
- Error handling for failed uploads

### 4.4. External Service Integration

**PSA Certificate Verification API:**
- **Service:** PSA Card Verification API
- **Authentication:** PSA API key is managed via Firebase Functions config: `firebase functions:config:set psa.api_token="YOUR_TOKEN"`
- **The PSA search uses Firebase Cloud Functions, not direct frontend API calls**
- **Rate Limiting:** Handled by Firebase Functions
- **Error Handling:** 
  - Network errors displayed to user
  - Invalid certification numbers reported with clear messages
  - Fallback to manual entry on API failures

## 5. Data Models & State Management

### 5.1. Component State Objects

**Card Data Model:**
```javascript
{
  id: null,               // Card ID (null for new cards)
  player: '',             // Player/character on card
  cardName: '',           // Name of the card
  set: '',                // Card set name
  year: '',               // Year of release
  category: '',           // Card category/type
  condition: '',          // Card condition/grade
  certificationNumber: '', // PSA/grading cert number
  datePurchased: new Date().toISOString().split('T')[0], // Purchase date
  investmentAUD: '',      // Purchase price in AUD
  currentValueAUD: '',    // Current value in AUD
  quantity: 1,            // Number of this card
  collection: '',         // Collection name
  slabSerial: '',         // PSA serial (same as certificationNumber)
  gradeCompany: '',       // Grading company (PSA, BGS, etc.)
  psaUrl: '',             // URL to PSA certificate page
  population: ''          // Population count from PSA
}
```

**UI State Management:**
```javascript
// Modal animation state
const [animClass, setAnimClass] = useState('');

// Loading states
const [isSearching, setIsSearching] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [imageLoadingState, setImageLoadingState] = useState('idle');

// Feedback states
const [errors, setErrors] = useState({});
const [saveMessage, setSaveMessage] = useState(null);

// Modal visibility states
const [showEnlargedImage, setShowEnlargedImage] = useState(false);
const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
const [psaDetailModalOpen, setPsaDetailModalOpen] = useState(false);
```

### 5.2. Database Schema

**Card Document Structure:**
```javascript
{
  id: String,            // Unique ID for the card
  userId: String,        // User ID who owns the card
  player: String,        // Player/character name
  cardName: String,      // Card name
  set: String,           // Set name
  year: String,          // Year of release
  category: String,      // Card category
  condition: String,     // Card condition
  certificationNumber: String, // Certificate number
  slabSerial: String,    // Same as certificationNumber
  gradeCompany: String,  // Grading company
  grade: String,         // Numeric grade
  datePurchased: Timestamp, // Purchase date
  originalInvestmentAmount: Number, // Purchase price
  currentValue: Number,  // Current value
  quantity: Number,      // Quantity
  collection: String,    // Collection name
  imageUrl: String,      // URL to stored image
  psaUrl: String,        // PSA certificate URL
  population: String,    // Population count
  _lastUpdateTime: Timestamp, // Last update timestamp
  createdAt: Timestamp,  // Creation timestamp
}
```

**Collection Document Structure:**
```javascript
{
  id: String,           // Collection ID
  userId: String,       // User ID who owns collection
  name: String,         // Collection name
  cards: Array,         // Array of card IDs
  createdAt: Timestamp, // Creation timestamp
}
```

### 5.3. Data Transformation

**PSA API Response to Card Data:**
```javascript
function parsePSACardData(psaData) {
  return {
    cardName: psaData.name,
    set: psaData.set,
    year: psaData.year,
    grade: psaData.grade,
    certificationNumber: psaData.certNumber,
    player: psaData.player,
    category: psaData.category,
    population: psaData.population
  };
}
```

**Form Data to Database Format:**
```javascript
// Transformed before saving
const cardToSave = {
  ...newCard,
  collection: selectedCollection,
  originalInvestmentAmount: parseFloat(newCard.originalInvestmentAmount),
  currentValue: parseFloat(newCard.currentValueAUD) || 0,
  datePurchased: new Date(newCard.datePurchased),
  createdAt: new Date(),
  _lastUpdateTime: new Date()
};
```

### 5.4. Caching & Performance

**Image Caching:**
- Card image preview cached in component state during session
- URL.createObjectURL used for efficient in-memory image preview
- URL.revokeObjectURL used for cleanup to prevent memory leaks

**State Performance:**
- Form reset on modal open/close to prevent stale data
- Local state used for all form data to minimize re-renders
- useCallback for handlers to prevent unnecessary re-creation

## 6. Dependencies & Environment

### 6.1. Internal Dependencies

**Components:**
- Modal (design-system/molecules/Modal)
- Button (design-system/atoms/Button)
- CardDetailsForm (design-system/components/CardDetailsForm)
- PSADetailModal (components/PSADetailModal)
- NewCollectionModal (components/NewCollectionModal)

**Services:**
- psaSearch (services/psaSearch)
- firestore (services/firestore)

**Utilities:**
- toast (design-system/utils/toast)
- firebase storage (services/firebase)

### 6.2. External Libraries

**React Hot Toast:**
- Version: ^2.4.0
- Purpose: Non-intrusive toast notifications
- Usage: User feedback for operations

**React:**
- Version: ^18.2.0
- Purpose: UI framework
- Usage: Component structure and state management

**Firebase:**
- Version: ^9.17.1
- Purpose: Backend services
- Usage: Database, storage, and authentication

**Material Icons:**
- CDN: fonts.googleapis.com/icon
- Purpose: UI icons
- Usage: Button and interface icons

### 6.3. Environment Variables

**Firebase Configuration:**
- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_AUTH_DOMAIN
- REACT_APP_FIREBASE_PROJECT_ID
- REACT_APP_FIREBASE_STORAGE_BUCKET
- REACT_APP_FIREBASE_MESSAGING_SENDER_ID
- REACT_APP_FIREBASE_APP_ID

### 6.4. Build & Deployment

**Build Requirements:**
- Node.js 14+ environment
- npm or yarn package manager
- React scripts for building

**Environment Configurations:**
- Development: Local Firebase emulators
- Production: Live Firebase services

**Deployment Considerations:**
- Firebase storage CORS configuration required
- Firebase Functions deployment for PSA API proxy
- Environment variables must be set in CI/CD pipeline

## 7. Error Handling & Monitoring

### 7.1. Error Categories

**Validation Errors:**
- Missing required fields
- Invalid data formats
- Duplicate certification numbers

**Network Errors:**
- PSA API connection failures
- Firestore operation failures
- Image upload failures

**Permission Errors:**
- Firebase storage permission denied
- Firebase database write permission denied

**User Input Errors:**
- Invalid PSA certification numbers
- Attempted addition to "Sold" collection

### 7.2. Error Handling Strategy

**Try-Catch Blocks:**
```javascript
try {
  await onSave(cardToSave, imageFile, selectedCollection);
  // Success handling
} catch (error) {
  console.error('Error adding card:', error);
  // Error handling
  if (error.message.includes('serial number already exists')) {
    // Specific error handling
  } else {
    // Generic error handling
  }
} finally {
  setIsSaving(false);
}
```

**Graceful Degradation:**
- PSA lookup failure falls back to manual entry
- Image upload failure allows retry
- Network errors shown with clear recovery options

**User Notification:**
- Toast notifications for quick feedback
- In-form error messages for validation issues
- Disabled buttons during processing to prevent multiple submissions

### 7.3. Logging & Monitoring

**Console Logging:**
```javascript
console.error('Error adding card:', error);
console.error('Error searching PSA:', error);
console.log('Applied PSA details. Merged data:', mergedData);
```

**Error Reporting:**
- Firebase Analytics for tracking errors
- Console errors for development debugging

**User Action Tracking:**
- PSA lookup attempts
- Card save success/failure
- Collection creation events

### 7.4. Debugging Information

**Common Issues:**
- PSA API token expiration or rate limiting
- Duplicate certification numbers
- Network connectivity issues
- Firebase permission configuration

**Debug Tools:**
- Browser console for error messages
- React Developer Tools for component inspection
- Firebase console for backend operation monitoring

**Testing Scenarios:**
- Test with invalid PSA numbers
- Test with network disconnected
- Test with various image types and sizes
- Test with duplicate certification numbers

## 8. Testing & Quality Assurance

### 8.1. Test Coverage

**Unit Tests:**
- Form validation logic
- PSA data parsing
- Data transformation functions

**Integration Tests:**
- PSA API communication
- Firebase database operations
- Form submission flow

**UI Tests:**
- Modal opening/closing
- Form field interactions
- Error state rendering
- Success path completion

### 8.2. Manual Testing Scenarios

**Happy Path Testing:**
1. Open Add Card modal
2. Enter valid PSA number and lookup data
3. Select existing collection
4. Upload valid image
5. Fill all required fields
6. Save card successfully
7. Verify card appears in selected collection

**Edge Case Testing:**
1. Test with missing required fields
2. Test with duplicate certification number
3. Test creating new collection during add process
4. Test with invalid PSA number
5. Test with network disconnected
6. Test with very large image files

**Cross-Browser Testing:**
- Chrome, Firefox, Safari compatibility
- Mobile responsive layout testing
- Touch interaction testing on mobile devices

### 8.3. Performance Considerations

**Load Testing:**
- Test with multiple simultaneous card additions
- Test with large image uploads

**Performance Benchmarks:**
- Modal opening animation smoothness
- Image preview loading time
- PSA lookup response time
- Form submission and save completion time

**Optimization Opportunities:**
- Image compression before upload
- Lazy loading of PSA lookup functionality
- Form field pre-validation to improve user experience

## 9. Maintenance & Evolution

### 9.1. Known Technical Debt

**Areas for Refactoring:**
- PSA lookup could be extracted to a custom hook
- Error handling could be more consistent across operations
- Form validation could use a form library for better maintainability

**Performance Bottlenecks:**
- Large image uploads may slow down save operation
- Multiple PSA lookups in succession may hit rate limits

**Architectural Improvements:**
- Move to React Query for API operations
- Implement form state management with React Hook Form
- Create more consistent error handling system

### 9.2. Extension Points

**New Feature Opportunities:**
- Support for other grading companies (BGS, CGC)
- Barcode/QR code scanning for cards
- AI-powered card recognition from images
- Bulk card import via CSV

**Configuration Options:**
- Configurable required fields
- User preference for default values
- Collection templates for faster data entry

**Integration Possibilities:**
- Card marketplace price API integration
- Collection value tracking extensions
- Card authentication verification services

### 9.3. Version History

**Current Version:**
- Initial implementation with PSA lookup
- Basic collection management
- Image upload and preview

**Planned Improvements:**
- Enhanced form validation
- Better mobile support
- Additional grading company integrations
- Performance optimizations for image handling
- Improved error recovery mechanisms

**Future Roadmap:**
- OCR for card details from images
- Multi-language support
- Advanced card value tracking features
- Integration with more card databases and APIs
