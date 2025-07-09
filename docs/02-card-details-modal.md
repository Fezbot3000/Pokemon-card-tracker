# Card Details Modal

> **⚠️ REQUIRES UPDATES**: This document needs to be updated to reflect the current CardDetails implementation. Some features described here may have changed.

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

> **⚠️ Note**: This documentation needs to be updated to reflect the current implementation. The actual component structure, styling, and behavior may differ from what's described here. 