# Pokemon Card Tracker - Complete Technical Documentation

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Features](#core-features)
6. [Database Design](#database-design)
7. [Authentication & Security](#authentication--security)
8. [API Integration](#api-integration)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Development Workflow](#development-workflow)

---

## Platform Overview

The Pokemon Card Tracker is a comprehensive React-based web application designed for Pokemon card collectors to manage their collections, track investments, and participate in a marketplace. The platform serves as a complete ecosystem for Pokemon card enthusiasts with features ranging from basic collection management to advanced investment analytics.

### Core Value Propositions
- **Collection Management**: Organize and track Pokemon card collections with detailed metadata
- **Investment Tracking**: Monitor purchase prices, current values, and profit/loss calculations
- **Marketplace Integration**: Buy and sell cards through an integrated marketplace
- **PSA Integration**: Lookup and validate PSA graded cards automatically
- **Multi-Currency Support**: Track investments in multiple currencies with live exchange rates
- **Real-time Synchronization**: Cloud-based storage with offline capabilities

### Target Audience
- Pokemon card collectors and investors
- PSA graded card enthusiasts
- Trading card marketplace participants
- Investment-focused collectors tracking portfolio performance

---

## Architecture

### High-Level Architecture
The application follows a modern React-based Single Page Application (SPA) architecture with Firebase as the backend-as-a-service provider.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend (React)│    │ Backend (Firebase)│    │ External APIs   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Components    │    │ • Authentication│    │ • PSA Database  │
│ • Hooks         │    │ • Firestore     │    │ • SendGrid      │
│ • Context       │    │ • Storage       │    │ • Exchange Rate │
│ • Router        │    │ • Cloud Functions│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend Architecture
- **React 18**: Modern functional components with hooks
- **React Router v7**: Client-side routing with nested routes
- **Context API**: Global state management for auth, preferences, themes
- **Custom Design System**: Reusable UI components with Tailwind CSS
- **Real-time Updates**: Firestore listeners for live data synchronization

### Backend Architecture
- **Firebase Firestore**: NoSQL database with real-time capabilities
- **Firebase Authentication**: User management and security
- **Firebase Storage**: Image storage for card photos
- **Cloud Functions**: Server-side logic for complex operations
- **Firebase Hosting**: Static site hosting with CDN

---

## Technology Stack

### Frontend Technologies
```json
{
  "runtime": "React 18.2.0",
  "routing": "React Router DOM 7.5.1",
  "styling": "Tailwind CSS + Custom CSS",
  "state": "React Context API",
  "http": "Firebase SDK",
  "charts": "Chart.js 4.4.8",
  "pdf": "@react-pdf/renderer 4.3.0",
  "maps": "React Leaflet 4.2.1",
  "seo": "React Helmet Async 2.0.5"
}
```

### Backend Technologies
```json
{
  "database": "Firebase Firestore",
  "auth": "Firebase Authentication",
  "storage": "Firebase Storage",
  "functions": "Firebase Cloud Functions",
  "hosting": "Firebase Hosting"
}
```

### Development Tools
```json
{
  "bundler": "Create React App + CRACO",
  "linting": "ESLint",
  "testing": "Jest + React Testing Library",
  "deployment": "Firebase CLI",
  "version_control": "Git + GitHub"
}
```

---

## Project Structure

```
pokemon-card-tracker/
├── public/                     # Static assets
│   ├── index.html             # Main HTML template
│   ├── manifest.json          # PWA manifest
│   ├── robots.txt             # SEO robots file
│   └── sitemap.xml            # SEO sitemap
├── src/
│   ├── components/            # React components (87 files)
│   │   ├── Marketplace/       # Marketplace-specific components
│   │   ├── SoldItems/         # Sold items management
│   │   ├── PurchaseInvoices/  # Invoice generation
│   │   └── ...               # Other feature components
│   ├── design-system/         # Reusable UI components (60 files)
│   │   ├── components/        # Base UI components
│   │   ├── providers/         # Context providers
│   │   └── hooks/            # Design system hooks
│   ├── contexts/              # React Context providers (9 files)
│   │   ├── AuthContext.js     # Authentication state
│   │   ├── UserPreferencesContext.js # User settings
│   │   └── TutorialContext.js    # Tutorial state
│   ├── hooks/                 # Custom React hooks (9 files)
│   │   ├── useCardData.js     # Card data management
│   │   ├── useCardModals.js   # Modal state management
│   │   └── useCardSelection.js # Card selection logic
│   ├── services/              # External service integrations (15 files)
│   │   ├── firebase/          # Firebase configuration
│   │   ├── firestore/         # Firestore database layer
│   │   └── api/              # External API integrations
│   ├── utils/                 # Utility functions (28 files)
│   │   ├── logger.js          # Logging utility
│   │   ├── settingsManager.js # Settings management
│   │   └── collectionManager.js # Collection operations
│   ├── styles/                # Global styles (6 files)
│   ├── App.js                 # Main application component
│   ├── router.js              # Route configuration
│   └── index.js               # Application entry point
├── functions/                 # Firebase Cloud Functions
│   ├── index.js               # Main functions file (70KB)
│   ├── src/                   # Function source code
│   └── package.json           # Functions dependencies
├── firebase.json              # Firebase configuration
├── firestore.rules            # Database security rules
├── storage.rules              # Storage security rules
└── package.json               # Project dependencies
```

---

## Core Features

### 1. Collection Management
**Components**: `CardList.js`, `AddCardModal.js`, `CardDetails.js`
**Purpose**: Organize and manage Pokemon card collections

**Key Functionality**:
- Create, rename, and delete collections
- Add cards with comprehensive metadata (name, set, year, grade, etc.)
- Upload and manage card images
- Search and filter cards within collections
- Sort by various criteria (name, value, grade, date added)
- Bulk operations (move, delete, list for sale)

**Technical Implementation**:
- Uses Firestore subcollections: `/users/{userId}/cards/{cardId}`
- Real-time listeners for live updates
- Image storage in Firebase Storage
- Optimistic UI updates for better UX

### 2. Investment Tracking
**Components**: `StatisticsSummary.js`, `ProfitChangeModal.js`
**Purpose**: Track financial performance of card investments

**Key Functionality**:
- Record original purchase prices and current values
- Multi-currency support (AUD, USD, EUR, etc.)
- Profit/loss calculations with percentage changes
- Investment analytics and trends
- Currency conversion with live exchange rates

**Technical Implementation**:
- Exchange rate API integration via Cloud Functions
- Automatic currency conversion calculations
- Historical profit tracking
- Real-time value updates

### 3. Marketplace System
**Components**: `Marketplace/` directory (multiple components)
**Purpose**: Buy and sell Pokemon cards within the platform

**Key Functionality**:
- List cards for sale from collections
- Browse available listings with filters
- Real-time messaging between buyers and sellers
- Seller profiles with ratings and reviews
- Transaction management and completion tracking

**Technical Implementation**:
- Firestore collections for listings and messages
- Real-time chat using Firestore listeners
- Image optimization and lazy loading
- Pagination for performance
- Report and moderation system

### 4. PSA Integration
**Components**: `PSALookupButton.js`, `CardDetailsForm.js`
**Purpose**: Integrate with PSA (Professional Sports Authenticator) database

**Key Functionality**:
- Lookup PSA graded cards by certification number
- Auto-populate card details from PSA database
- Generate direct links to PSA auction prices
- Validate PSA certification numbers

**Technical Implementation**:
- Cloud Functions for PSA API integration
- Caching of PSA lookup results
- Error handling for invalid certifications
- Integration with card creation workflow

### 5. Invoice Management
**Components**: `PurchaseInvoices/` directory
**Purpose**: Generate and manage purchase invoices for card transactions

**Key Functionality**:
- Create invoices for card purchases
- PDF generation with detailed line items
- Batch invoice generation
- Invoice history and tracking

**Technical Implementation**:
- PDF generation using `@react-pdf/renderer`
- Cloud Functions for server-side PDF creation
- Firebase Storage for invoice file storage
- Batch processing for multiple invoices

---

## Database Design

### Firestore Collections Structure

```
/users/{userId}
├── profile/                   # User profile data
├── collections/               # Collection metadata
├── cards/{cardId}            # Individual cards
├── sold-items/{soldItemId}   # Sold card records
├── purchase-invoices/{invoiceId} # Purchase invoices
├── marketplace-listings/{listingId} # Active listings
├── marketplace-messages/{messageId} # Chat messages
└── marketplace-profiles/     # Marketplace profile data
```

### Card Document Schema
```javascript
{
  id: "string",                    // Unique card identifier
  name: "string",                  // Card name
  set: "string",                   // Pokemon set name
  year: "number",                  // Release year
  category: "string",              // Card category (pokemon, etc.)
  grade: "string",                 // Card grade (if graded)
  gradingCompany: "string",        // PSA, BGS, etc.
  certificationNumber: "string",   // Grading cert number
  slabSerial: "string",           // Unique slab identifier
  collection: "string",           // Collection name
  
  // Financial data
  originalInvestmentAmount: "number",
  originalInvestmentCurrency: "string",
  originalCurrentValueAmount: "number", 
  originalCurrentValueCurrency: "string",
  
  // Legacy fields (maintained for compatibility)
  investmentAUD: "number",
  currentValueAUD: "number",
  investmentUSD: "number",
  currentValueUSD: "number",
  
  // Metadata
  imageUrl: "string",             // Firebase Storage URL
  dateAdded: "timestamp",
  lastModified: "timestamp",
  userId: "string"                // Owner reference
}
```

### Marketplace Listing Schema
```javascript
{
  id: "string",
  cardId: "string",               // Reference to card
  sellerId: "string",             // User ID of seller
  price: "number",
  currency: "string",
  location: "string",
  description: "string",
  status: "string",               // active, sold, removed
  views: "number",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  
  // Card details (denormalized for performance)
  card: {
    name: "string",
    set: "string",
    grade: "string",
    imageUrl: "string"
  }
}
```

---

## Authentication & Security

### Firebase Authentication
The platform uses Firebase Authentication for user management with multiple sign-in methods:

**Supported Authentication Methods:**
- Email/Password authentication
- Google OAuth 2.0 (with iOS PWA optimizations)
- Apple Sign-In (iOS devices)

### iOS PWA Authentication Implementation

**Challenge**: iOS Progressive Web Apps (PWAs) block popup-based authentication, causing Google Sign-In to fail when the app is saved to the home screen.

**Solution**: Implemented intelligent authentication flow detection:

```javascript
// AuthContext.js - iOS-optimized Google Sign-In
const signInWithGoogle = async () => {
  try {
    setError(null);
    
    // iOS detection - use redirect for all iOS (both PWA and Safari browser)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // Also check for Safari on iOS which often blocks popups
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    
    if (isIOS || (isIOS && isSafari)) {
      // Always use redirect on iOS to avoid popup blocking in Safari and PWA
      await signInWithRedirect(auth, googleProvider);
      return null; // Redirect flow
    } else {
      // Use popup for non-iOS devices
      const result = await signInWithPopup(auth, googleProvider);
      // Handle successful popup authentication...
      return result.user;
    }
  } catch (err) {
    // If popup is blocked, fall back to redirect
    if (err.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr) {
        // Handle redirect error...
      }
    }
    // Handle other errors...
  }
};
```

**Key Features:**
- **Automatic Detection**: Detects iOS devices and Safari browsers
- **Fallback Mechanism**: If popup is blocked, automatically retries with redirect
- **PWA Compatibility**: Works seamlessly in both browser and home screen PWA modes
- **Cross-Platform**: Maintains popup experience for desktop browsers

**PWA Manifest Configuration:**
```html
<!-- Apple PWA Meta Tags for proper iOS integration -->
<meta name="apple-mobile-web-app-title" content="MyCardTracker">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### Security Rules

**Firestore Rules** (`firestore.rules`):
```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  
  // Cards subcollection
  match /cards/{cardId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  
  // Marketplace listings (public read, owner write)
  match /marketplace-listings/{listingId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && 
      (request.auth.uid == resource.data.sellerId || 
       request.auth.uid == request.resource.data.sellerId);
  }
}
```

**Storage Rules** (`storage.rules`):
```javascript
// Users can only access their own images
match /users/{userId}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Data Privacy
- User data isolation by user ID
- Image access restricted to owners
- Marketplace data has controlled visibility
- No cross-user data access

---

## API Integration

### External APIs

**1. ExchangeRate-API**
- **Purpose**: Live currency conversion rates
- **Endpoint**: `https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD`
- **Implementation**: Cloud Function proxy to avoid CORS
- **Caching**: Rates cached for 1 hour
- **Fallback**: Static rates if API unavailable

**2. PSA Database Integration**
- **Purpose**: Lookup PSA graded card information
- **Implementation**: Direct links to PSA auction prices
- **URL Format**: `https://www.psacard.com/auctionprices/tcg-cards/{year}-{game}/{card-name}/`
- **Data Source**: User-provided certification numbers

**3. eBay Integration**
- **Purpose**: Price comparison and market research
- **Implementation**: Direct links to eBay sold listings
- **URL Format**: Dynamically generated based on card details
- **Use Case**: Price validation and market analysis

### Cloud Functions

**Key Functions** (`functions/index.js`):

1. **`updateExchangeRates`**: Fetches live currency rates
2. **`generateInvoiceBatch`**: Creates PDF invoices in bulk
3. **`psaLookup`**: PSA card data retrieval
4. **`marketplaceNotifications`**: Real-time messaging notifications

**3. Cloud Functions**
- **Purpose**: Server-side processing and API integrations
- **Functions**: 
  1. **`psaLookup`**: PSA API integration for card data
  2. **`emailService`**: SendGrid email notifications

---

## Deployment & Infrastructure

### Hosting Configuration
- **Platform**: Firebase Hosting
- **Domain**: mycardtracker.com.au
- **CDN**: Global Firebase CDN
- **SSL**: Automatic HTTPS certificates
- **Caching**: Static asset caching (1 year)

### Build Process
```bash
# Development
npm start                    # Local development server

# Production Build
npm run build:prod          # Optimized production build
npm run deploy              # Deploy to Firebase

# Functions Deployment
npm run deploy:functions    # Deploy only Cloud Functions
npm run deploy:hosting      # Deploy only static assets
```

### Environment Configuration
```javascript
// .env file structure
REACT_APP_FIREBASE_API_KEY=xxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxx
REACT_APP_FIREBASE_PROJECT_ID=xxx
REACT_APP_FIREBASE_STORAGE_BUCKET=xxx
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxx
REACT_APP_FIREBASE_APP_ID=xxx
REACT_APP_EXCHANGE_RATE_API_KEY=xxx
REACT_APP_FIREBASE_CLIENT_ID=xxx
REACT_APP_PSA_API_TOKEN=xxx
```

### Performance Optimizations
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP format with fallbacks
- **Bundle Optimization**: Tree shaking and minification
- **Caching Strategy**: Aggressive static asset caching
- **Database Optimization**: Firestore indexes and query optimization

---

## Development Workflow

### Getting Started
1. **Clone Repository**: `git clone [repository-url]`
2. **Install Dependencies**: `npm install`
3. **Configure Environment**: Copy `.env.example` to `.env` and fill values
4. **Start Development**: `npm start`
5. **Initialize Firebase**: `firebase init` (if needed)

### Code Organization Principles
- **Component-Based**: Modular React components
- **Hook-Based**: Custom hooks for reusable logic
- **Context-Driven**: Global state via React Context
- **Service Layer**: Abstracted external service calls
- **Utility Functions**: Pure functions for common operations

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Critical user flow validation
- **Manual Testing**: Cross-browser and device testing

### Deployment Pipeline
1. **Development**: Local testing and feature development
2. **Staging**: Firebase preview channels for testing
3. **Production**: Automated deployment via GitHub Actions
4. **Monitoring**: Firebase Analytics and error tracking

---

This documentation provides a comprehensive overview of the Pokemon Card Tracker platform. For specific implementation details, refer to the individual component files and service modules within the codebase.

## Performance Optimization
