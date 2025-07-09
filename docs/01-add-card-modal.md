# 1. Add New Card Modal

> **⚠️ REQUIRES UPDATES**: This document needs to be updated to reflect the current AddCardModal implementation. Some features described here may have changed.

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
const [selectedCollection, setSelectedCollection] = useState(defaultCollection);
```

> **⚠️ Note**: This documentation needs to be updated to reflect the current implementation. The actual component may use different props and state management patterns. 