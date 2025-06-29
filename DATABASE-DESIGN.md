# Database Design Documentation

## Overview
The Pokemon Card Tracker uses Firebase Firestore as its primary database, providing real-time synchronization, offline capabilities, and scalable NoSQL document storage. This document details the complete database schema, relationships, and data flow patterns.

## Database Architecture

### Firestore Structure
```
/users/{userId}
├── /cards/{cardId}                    # User's card collection
├── /sold-items/{soldItemId}           # Sold card records
├── /purchase-invoices/{invoiceId}     # Purchase invoices
├── /marketplace-listings/{listingId}  # Active marketplace listings
├── /marketplace-messages/{messageId}  # Chat messages
├── /marketplace-profiles/{profileId}  # Marketplace seller profiles
├── /collections/{collectionId}        # Collection metadata
└── /profile                           # User profile data

/global-data/
├── /exchange-rates                    # Currency exchange rates
├── /psa-results/{lookupId}           # Cached PSA lookup results
└── /app-settings                     # Global application settings
```

## Document Schemas

### 1. Card Document (`/users/{userId}/cards/{cardId}`)
```javascript
{
  // Core Identity
  id: "string",                         // Unique card identifier
  name: "string",                       // Card name (e.g., "Charizard")
  set: "string",                        // Pokemon set (e.g., "Base Set")
  setName: "string",                    // Alternative set name field
  year: "number",                       // Release year (e.g., 1999)
  category: "string",                   // Card category ("pokemon")
  
  // Grading Information
  grade: "string",                      // Card grade ("10", "9", "8", etc.)
  gradingCompany: "string",             // "PSA", "BGS", "CGC", etc.
  certificationNumber: "string",        // Grading certification number
  slabSerial: "string",                 // Unique slab identifier (key for images)
  
  // Collection Organization
  collection: "string",                 // Collection name
  collectionId: "string",               // Collection identifier
  
  // Financial Data (New Schema)
  originalInvestmentAmount: "number",    // Original purchase amount
  originalInvestmentCurrency: "string", // Original purchase currency
  originalCurrentValueAmount: "number", // Current market value amount
  originalCurrentValueCurrency: "string", // Current value currency
  
  // Legacy Financial Fields (Maintained for compatibility)
  investmentAUD: "number",              // Investment in AUD
  currentValueAUD: "number",            // Current value in AUD
  investmentUSD: "number",              // Investment in USD
  currentValueUSD: "number",            // Current value in USD
  
  // Media
  imageUrl: "string",                   // Firebase Storage image URL
  hasImage: "boolean",                  // Whether card has an image
  
  // Metadata
  dateAdded: "timestamp",               // When card was added
  lastModified: "timestamp",            // Last modification time
  userId: "string",                     // Owner user ID
  
  // Optional Fields
  rarity: "string",                     // Card rarity
  cardNumber: "string",                 // Card number in set
  artist: "string",                     // Card artist
  notes: "string",                      // User notes
  condition: "string",                  // Card condition if ungraded
  
  // PSA Integration
  psaData: {                           // PSA lookup results
    cardName: "string",
    setName: "string",
    year: "number",
    grade: "string",
    certNumber: "string",
    lookupDate: "timestamp"
  }
}
```

### 2. Sold Item Document (`/users/{userId}/sold-items/{soldItemId}`)
```javascript
{
  // Original Card Data (Snapshot)
  originalCard: {
    id: "string",
    name: "string",
    set: "string",
    year: "number",
    grade: "string",
    gradingCompany: "string",
    certificationNumber: "string",
    imageUrl: "string"
  },
  
  // Sale Information
  salePrice: "number",                  // Final sale price
  saleCurrency: "string",               // Sale currency
  originalSaleAmount: "number",         // Sale amount in original currency
  originalSaleCurrency: "string",       // Original sale currency
  
  // Purchase Information (for profit calculation)
  purchasePrice: "number",              // Original purchase price
  purchaseCurrency: "string",           // Purchase currency
  originalPurchaseAmount: "number",     // Purchase amount in original currency
  originalPurchaseCurrency: "string",   // Original purchase currency
  
  // Profit Calculation
  profitAUD: "number",                  // Profit in AUD
  profitUSD: "number",                  // Profit in USD
  profitPercentage: "number",           // Profit percentage
  
  // Sale Details
  soldTo: "string",                     // Buyer information
  saleMethod: "string",                 // "marketplace", "external", etc.
  saleDate: "timestamp",                // When sold
  notes: "string",                      // Sale notes
  
  // Metadata
  userId: "string",
  dateCreated: "timestamp",
  lastModified: "timestamp"
}
```

### 3. Marketplace Listing (`/users/{userId}/marketplace-listings/{listingId}`)
```javascript
{
  // Listing Identity
  id: "string",
  cardId: "string",                     // Reference to original card
  sellerId: "string",                   // User ID of seller
  
  // Listing Details
  title: "string",                      // Listing title
  description: "string",                // Detailed description
  price: "number",                      // Asking price
  currency: "string",                   // Price currency
  location: "string",                   // Seller location
  
  // Card Information (Denormalized for performance)
  card: {
    name: "string",
    set: "string",
    year: "number",
    grade: "string",
    gradingCompany: "string",
    certificationNumber: "string",
    imageUrl: "string",
    category: "string"
  },
  
  // Listing Status
  status: "string",                     // "active", "sold", "removed", "pending"
  views: "number",                      // View count
  watchers: ["string"],                 // Array of user IDs watching
  
  // Interaction Data
  messageCount: "number",               // Number of inquiries
  lastMessageDate: "timestamp",         // Last message received
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp",
  soldAt: "timestamp",                  // When marked as sold
  
  // Moderation
  reported: "boolean",                  // If listing has been reported
  reportCount: "number",                // Number of reports
  moderationStatus: "string"           // "approved", "pending", "removed"
}
```

### 4. Marketplace Message (`/users/{userId}/marketplace-messages/{messageId}`)
```javascript
{
  // Message Identity
  id: "string",
  conversationId: "string",             // Unique conversation identifier
  
  // Participants
  senderId: "string",                   // Message sender
  receiverId: "string",                 // Message receiver
  
  // Message Content
  content: "string",                    // Message text
  messageType: "string",                // "text", "offer", "system"
  
  // Related Data
  listingId: "string",                  // Related listing
  cardId: "string",                     // Related card
  
  // Offer Information (if messageType === "offer")
  offerAmount: "number",
  offerCurrency: "string",
  offerStatus: "string",                // "pending", "accepted", "declined"
  
  // Message Status
  read: "boolean",                      // Read status
  readAt: "timestamp",                  // When read
  
  // Conversation Management
  hiddenBy: ["string"],                 // Users who hid conversation
  leftBy: ["string"],                   // Users who left conversation
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

### 5. Marketplace Profile (`/users/{userId}/marketplace-profiles/{profileId}`)
```javascript
{
  // Profile Identity
  userId: "string",
  displayName: "string",                // Public display name
  
  // Profile Information
  bio: "string",                        // Profile description
  location: "string",                   // General location
  joinDate: "timestamp",                // When joined marketplace
  
  // Seller Preferences
  preferredPaymentMethods: ["string"],  // ["paypal", "bank_transfer", etc.]
  responseTime: "string",               // "within_hour", "within_day", etc.
  shippingOptions: ["string"],          // Available shipping methods
  
  // Seller Statistics
  totalListings: "number",              // Total items listed
  activeListings: "number",             // Currently active listings
  totalSales: "number",                 // Total completed sales
  totalRevenue: "number",               // Total revenue generated
  
  // Reputation System
  averageRating: "number",              // Average star rating (1-5)
  totalReviews: "number",               // Total number of reviews
  recommendationPercentage: "number",   // % of buyers who recommend
  
  // Activity Tracking
  lastActive: "timestamp",              // Last marketplace activity
  responseRate: "number",               // % of messages responded to
  averageResponseTime: "number",        // Average response time in hours
  
  // Profile Settings
  isPublic: "boolean",                  // Profile visibility
  allowMessages: "boolean",             // Accept direct messages
  autoResponder: "string",              // Auto-response message
  
  // Verification
  verified: "boolean",                  // Verified seller status
  verificationDate: "timestamp",        // When verified
  
  // Metadata
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

### 6. Purchase Invoice (`/users/{userId}/purchase-invoices/{invoiceId}`)
```javascript
{
  // Invoice Identity
  id: "string",
  invoiceNumber: "string",              // Human-readable invoice number
  
  // Invoice Details
  title: "string",                      // Invoice title
  description: "string",                // Invoice description
  
  // Financial Information
  subtotal: "number",                   // Subtotal amount
  tax: "number",                        // Tax amount
  shipping: "number",                   // Shipping cost
  total: "number",                      // Total amount
  currency: "string",                   // Invoice currency
  
  // Line Items
  items: [{
    cardId: "string",                   // Reference to card
    name: "string",                     // Item name
    description: "string",              // Item description
    quantity: "number",                 // Quantity
    unitPrice: "number",                // Price per unit
    totalPrice: "number"                // Line total
  }],
  
  // Vendor Information
  vendor: {
    name: "string",                     // Vendor name
    address: "string",                  // Vendor address
    email: "string",                    // Vendor email
    phone: "string"                     // Vendor phone
  },
  
  // Invoice Status
  status: "string",                     // "draft", "sent", "paid", "overdue"
  dueDate: "timestamp",                 // Payment due date
  paidDate: "timestamp",                // When paid
  
  // File Storage
  pdfUrl: "string",                     // Generated PDF URL
  pdfGenerated: "boolean",              // Whether PDF exists
  
  // Metadata
  userId: "string",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

### 7. Collection Metadata (`/users/{userId}/collections/{collectionId}`)
```javascript
{
  // Collection Identity
  id: "string",
  name: "string",                       // Collection name
  
  // Collection Statistics
  cardCount: "number",                  // Number of cards
  totalValue: "number",                 // Total collection value
  totalInvestment: "number",            // Total invested amount
  
  // Collection Settings
  isDefault: "boolean",                 // Default collection
  sortOrder: "number",                  // Display order
  color: "string",                      // Collection color theme
  icon: "string",                       // Collection icon
  
  // Metadata
  userId: "string",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  lastModified: "timestamp"
}
```

### 8. User Profile (`/users/{userId}/profile`)
```javascript
{
  // Authentication & Profile
  email: "string",
  displayName: "string",
  photoURL: "string",
  
  // Metadata
  lastLogin: "timestamp",              // Last login time
  createdAt: "timestamp",             // Account creation
  updatedAt: "timestamp"              // Last profile update
}
```

## Global Collections

### 1. Exchange Rates (`/global-data/exchange-rates`)
```javascript
{
  // Rate Information
  baseCurrency: "USD",                  // Base currency
  rates: {
    "AUD": 1.52,                       // Exchange rates
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 110.25
  },
  
  // Metadata
  lastUpdated: "timestamp",             // Last rate update
  source: "exchangerate-api",           // Rate source
  nextUpdate: "timestamp"               // Next scheduled update
}
```

### 2. PSA Results Cache (`/global-data/psa-results/{lookupId}`)
```javascript
{
  // Lookup Information
  certificationNumber: "string",       // PSA cert number
  lookupDate: "timestamp",              // When looked up
  
  // PSA Data
  cardName: "string",                   // Official card name
  setName: "string",                    // Official set name
  year: "number",                       // Release year
  grade: "string",                      // PSA grade
  variety: "string",                    // Card variety
  
  // Cache Information
  cacheExpiry: "timestamp",             // When cache expires
  hitCount: "number",                   // How many times accessed
  
  // Metadata
  createdAt: "timestamp",
  lastAccessed: "timestamp"
}
```

## Database Relationships

### 1. User-Centric Design
All user data is isolated within the user's document tree:
```
/users/{userId}/
├── cards/          (1:N relationship)
├── sold-items/     (1:N relationship)
├── invoices/       (1:N relationship)
├── listings/       (1:N relationship)
└── messages/       (1:N relationship)
```

### 2. Card-to-Listing Relationship
```javascript
// Card document contains marketplace status
card: {
  id: "card123",
  isListed: true,
  listingId: "listing456"
}

// Listing references original card
listing: {
  id: "listing456",
  cardId: "card123",
  card: { /* denormalized card data */ }
}
```

### 3. Message-to-Listing Relationship
```javascript
// Messages reference listings and participants
message: {
  conversationId: "user1_user2_listing456",
  listingId: "listing456",
  senderId: "user1",
  receiverId: "user2"
}
```

## Data Access Patterns

### 1. Collection Queries
```javascript
// Get all cards in a collection
const cardsQuery = query(
  collection(db, `users/${userId}/cards`),
  where('collection', '==', collectionName),
  orderBy('dateAdded', 'desc')
);

// Get cards by grade
const gradedCardsQuery = query(
  collection(db, `users/${userId}/cards`),
  where('gradingCompany', '==', 'PSA'),
  where('grade', '>=', '9')
);
```

### 2. Marketplace Queries
```javascript
// Get active listings
const listingsQuery = query(
  collectionGroup(db, 'marketplace-listings'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(24)
);

// Get user's conversations
const messagesQuery = query(
  collection(db, `users/${userId}/marketplace-messages`),
  where('participants', 'array-contains', userId),
  orderBy('lastMessageDate', 'desc')
);
```

### 3. Real-time Listeners
```javascript
// Listen to card changes
const unsubscribe = onSnapshot(
  collection(db, `users/${userId}/cards`),
  (snapshot) => {
    const cards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCards(cards);
  }
);
```

## Security Rules

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's subcollections
      match /{collection}/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Marketplace listings are publicly readable
    match /users/{userId}/marketplace-listings/{listingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.uid == resource.data.sellerId);
    }
    
    // Global data is read-only
    match /global-data/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

## Performance Optimizations

### 1. Denormalization
Critical data is denormalized for performance:
- Card data in marketplace listings
- User profile data in messages
- Collection statistics in collection metadata

### 2. Composite Indexes
```javascript
// Required Firestore indexes
{
  "collectionGroup": "marketplace-listings",
  "fieldPath": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 3. Pagination
Large datasets use cursor-based pagination:
```javascript
const nextQuery = query(
  collection(db, 'listings'),
  orderBy('createdAt', 'desc'),
  startAfter(lastDoc),
  limit(24)
);
```

This database design provides a scalable, secure, and performant foundation for the Pokemon Card Tracker application while maintaining data consistency and supporting real-time features.
