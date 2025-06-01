# Database Schema Documentation

## Overview

The Pokemon Card Tracker app uses Firebase Firestore as its primary database. This document outlines the complete database schema, including all collections, document structures, relationships, and data validation rules.

## Database Architecture

### Database Provider: Firebase Firestore
- **Type**: NoSQL Document Database
- **Structure**: Collections → Documents → Fields
- **Real-time**: Live data synchronization
- **Offline Support**: Enabled for core collections
- **Security**: Firestore Security Rules

## Collections Overview

```
mycardtracker-c8479 (Firebase Project)
├── users/                    # User profiles and authentication data
├── psa-cards/               # PSA card database and pricing information
├── userPreferences/         # User settings and preferences
├── chats/                   # Marketplace chat conversations
├── marketplaceItems/        # Marketplace listings
├── marketplaceProfiles/     # Marketplace seller profiles
└── collections/             # User card collections (subcollection)
```

## Collection Schemas

### 1. Users Collection (`users/{userId}`)

**Purpose**: Stores user profile information, authentication data, and account settings.

**Document Structure**:
```javascript
{
  // Authentication fields
  "address": "1 ss 6 10 russland street silkwood",
  "authProvider": "google.com",
  "email": "fyeek576@gmail.com",
  "firstName": "Matthew",
  "lastName": "Sear",
  "displayName": "Mark Sear",
  "mobileNumber": "0474159019",
  "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocKDJJGYgs2wJNUJL...",
  
  // Account metadata
  "createdAt": Timestamp,
  "lastLogin": Timestamp,
  
  // Profile information
  "companyName": "Matusas Enterprises PTY LTD",
  
  // Collections management
  "collections": {
    "Default Collection": {
      "cards": [...], // Array of card objects
      "profile": {...}, // Collection-specific settings
      "purchasedInvoices": [...], // Purchase invoice records
      "sold-items": [...] // Sold items history
    }
  }
}
```

**Field Details**:
- **authProvider**: String - Authentication method used (google.com, apple.com)
- **email**: String - User's email address (unique identifier)
- **displayName**: String - User's display name for marketplace
- **photoURL**: String - Profile picture URL from auth provider
- **createdAt**: Timestamp - Account creation date
- **lastLogin**: Timestamp - Last successful authentication
- **collections**: Object - User's card collections (nested structure)

**Relationships**:
- Links to `userPreferences/{userId}` for app settings
- Links to `marketplaceProfiles/{userId}` for marketplace profile
- Links to `chats/{chatId}` via buyerId/sellerId fields

### 2. PSA Cards Collection (`psa-cards/{certNumber}`)

**Purpose**: Comprehensive database of PSA-graded Pokemon cards with pricing and specification data.

**Document Structure**:
```javascript
{
  // Card identification
  "certNumber": "03386930", // PSA certification number (document ID)
  "cardId": "223",
  "cardNumber": "9",
  "brand": "POKEMON JAPANESE CD PROMO",
  "cardName": "CHARIZARD",
  "category": "Pokemon",
  
  // Grading information
  "gradeDescription": "MINT 9",
  "labelType": "lighthouseLabel",
  "isHolyCert": false,
  "isPSADNA": false,
  "reverseBarcode": true,
  
  // Card specifications
  "cardType": "TCGT Cards",
  "categoryType": "Pokemon",
  "variety": "CD PROMO",
  "year": "1998",
  "subject": "CHARIZARD",
  "spec": "244479",
  "specNumber": "86440804F",
  
  // Population data
  "totalPopulation": 7709,
  "totalPopulationWithQualifier": 0,
  "populationHigher": 4646,
  
  // Timestamps
  "lastUpdated": Timestamp
}
```

**Field Details**:
- **certNumber**: String - PSA certification number (primary key)
- **cardId**: String - Internal card identifier
- **gradeDescription**: String - PSA grade (e.g., "MINT 9", "GEM MT 10")
- **labelType**: String - Type of PSA label (standard, lighthouse, etc.)
- **totalPopulation**: Number - Total PSA graded population for this card/grade
- **populationHigher**: Number - Population count for higher grades
- **year**: String - Card release year
- **variety**: String - Card variant or special edition type

**Usage**: Referenced by user cards for pricing and population data

### 3. User Preferences Collection (`userPreferences/{userId}`)

**Purpose**: Stores user application preferences and settings.

**Document Structure**:
```javascript
{
  // Currency preferences
  "currency": {
    "code": "AUD",
    "name": "Australian Dollar", 
    "symbol": "A$"
  },
  
  // Display preferences
  "theme": "dark", // "light" | "dark" | "auto"
  "compactView": false,
  
  // Notification settings
  "emailNotifications": true,
  "marketplaceNotifications": true,
  
  // Last updated
  "updatedAt": Timestamp
}
```

**Field Details**:
- **currency**: Object - User's preferred display currency
- **theme**: String - UI theme preference
- **emailNotifications**: Boolean - Email notification opt-in
- **updatedAt**: Timestamp - Last preference update

**Relationships**: Links to `users/{userId}` profile

### 4. Marketplace Items Collection (`marketplaceItems/{listingId}`)

**Purpose**: Stores marketplace listings created by users for buying/selling cards.

**Document Structure**:
```javascript
{
  // Listing identification
  "listingId": "1gGPjp5hcwLRtuTseeBa",
  
  // Card details (embedded from user's collection)
  "brand": "POKEMON JAPANESE SWORD & SHIELD VMAX CLIMAX",
  "cardName": "GALARIZAN VMAX", 
  "cardNumber": "223",
  "cardType": "TCG Cards",
  "category": "Pokemon",
  "certNumber": "78488989",
  "gradeDescription": "GEM MT 10",
  "labelType": "lighthouseLabel",
  "isHolyCert": false,
  "isPSADNA": false,
  "reverseBarcode": true,
  "spec": "0112264",
  "specNumber": "86100000N",
  "subject": "GALARIZAN VMAX",
  "totalPopulation": 6726,
  "totalPopulationWithQualifier": 0,
  "variety": "VMAX CLIMAX",
  "year": "2021",
  
  // Listing information
  "sellerId": "6sZLdZbvUCGpMqn5TelcTUe0u1",
  "price": 150.00, // In seller's currency
  "originalCurrency": "AUD",
  "description": "Perfect condition VMAX card",
  "status": "available", // "available" | "pending" | "sold"
  "condition": "PSA 10",
  
  // Collection info
  "collection": "Test collection",
  "collectionId": "test-collection",
  "collectionName": "Test collection",
  
  // Investment tracking
  "currentValueAUD": 0,
  "currentValueUSD": 0,
  
  // Timestamps
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

**Field Details**:
- **sellerId**: String - Reference to users collection
- **price**: Number - Listing price in original currency
- **originalCurrency**: String - Currency code for the price
- **status**: String - Listing status (available, pending, sold)
- **createdAt**: Timestamp - Listing creation date

**Relationships**:
- Links to `users/{sellerId}` for seller information
- Links to `chats/{chatId}` for buyer-seller communication
- References `psa-cards/{certNumber}` for card data

### 5. Chats Collection (`chats/{chatId}`)

**Purpose**: Manages marketplace conversations between buyers and sellers.

**Document Structure**:
```javascript
{
  // Participants
  "buyerId": "6sZLdZbvUCGpMqn5TelcTUe0u1",
  "sellerId": "FHfvDoYZtsyc50LNSFbPloZJkXf1",
  "buyerName": "SergiT",
  "sellerName": "CardHans",
  
  // Card information
  "cardId": "1gGPjp5hcwLRtuTseeBa",
  "cardName": "Import storage gyarados environmental collection",
  "cardImage": "https://images.pokemontcg.io/...",
  
  // Chat metadata
  "isGeneralChat": false,
  "lastMessage": "Hi, is this available?",
  "lastUpdated": Timestamp,
  "createdAt": Timestamp,
  
  // Participants array for queries
  "participants": [
    "6sZLdZbvUCGpMqn5TelcTUe0u1",
    "FHfvDoYZtsyc50LNSFbPloZJkXf1"
  ]
}
```

**Field Details**:
- **buyerId/sellerId**: String - User IDs of conversation participants
- **cardId**: String - Reference to marketplace listing
- **participants**: Array - User IDs for efficient querying
- **lastMessage**: String - Preview of most recent message
- **isGeneralChat**: Boolean - Whether this is a general inquiry

**Subcollection**: `messages/{messageId}`
```javascript
{
  "senderId": "6sZLdZbvUCGpMqn5TelcTUe0u1",
  "senderName": "SergiT", 
  "message": "Hi, is this available?",
  "timestamp": Timestamp,
  "type": "user" // "user" | "system"
}
```

**Relationships**:
- Links to `users/{buyerId}` and `users/{sellerId}`
- Links to `marketplaceItems/{cardId}`

### 6. Marketplace Profiles Collection (`marketplaceProfiles/{userId}`)

**Purpose**: Extended marketplace-specific profile information for sellers.

**Document Structure**:
```javascript
{
  // Display preferences  
  "allowFilers": true,
  "autoReplyMessage": "",
  "bio": "",
  "displayName": "MyCardTracker",
  "location": "Brisbane",
  "preferredPaymentMethods": ["takeCards"],
  "responseTime": "within-24hr",
  "showFairings": true,
  
  // Timestamps
  "endOfDate": Timestamp,
  "userId": "6sZLdZbvUCGpMqn5TelcTUe0u1"
}
```

**Field Details**:
- **displayName**: String - Marketplace display name
- **bio**: String - Seller biography
- **location**: String - Seller location
- **preferredPaymentMethods**: Array - Accepted payment types
- **responseTime**: String - Expected response time
- **allowFilers**: Boolean - Whether to allow filtered searches

**Relationships**: Links to `users/{userId}` for base profile

## Data Relationships

### User → Collections → Cards Flow
```
users/{userId}
└── collections: {
    "Default Collection": {
        cards: [...],           // User's card inventory
        "sold-items": [...],    // Historical sales
        purchasedInvoices: [...] // Purchase records
    }
}
```

### Marketplace Flow
```
users/{sellerId} → marketplaceItems/{listingId} → chats/{chatId} → messages/{messageId}
                ↓
        marketplaceProfiles/{sellerId}
```

### Card Data References
```
users/{userId}/collections/cards[].certNumber → psa-cards/{certNumber}
marketplaceItems/{listingId}.certNumber → psa-cards/{certNumber}
```

## Indexes and Queries

### Firestore Composite Indexes

**Marketplace Queries**:
```javascript
// Query available listings by category and grade
{
  collection: "marketplaceItems",
  fields: [
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "category", order: "ASCENDING" }, 
    { fieldPath: "gradeDescription", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}

// Query user's marketplace listings
{
  collection: "marketplaceItems", 
  fields: [
    { fieldPath: "sellerId", order: "ASCENDING" },
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "updatedAt", order: "DESCENDING" }
  ]
}
```

**Chat Queries**:
```javascript
// Query user's conversations
{
  collection: "chats",
  fields: [
    { fieldPath: "participants", order: "ASCENDING" },
    { fieldPath: "lastUpdated", order: "DESCENDING" }
  ]
}
```

**PSA Card Lookups**:
```javascript
// Single document queries by certNumber (automatic)
// No composite index needed for simple lookups
```

## Data Validation Rules

### Field Constraints

**User Documents**:
- `email`: Must be valid email format, required
- `authProvider`: Must be in approved list
- `createdAt`: Must be valid timestamp
- `collections`: Object with string keys

**PSA Cards**:
- `certNumber`: String, required, unique
- `totalPopulation`: Number, non-negative
- `gradeDescription`: String, required
- `year`: String, 4-digit format

**Marketplace Items**:
- `price`: Number, positive value
- `status`: Must be "available", "pending", or "sold"
- `sellerId`: Must reference existing user
- `originalCurrency`: Must be valid currency code

**Currency Objects**:
- `code`: String, 3-character ISO code
- `symbol`: String, currency symbol
- `name`: String, full currency name

## Security Model

### Firestore Security Rules Structure

**User Data Access**:
```javascript
// Users can only access their own profile
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// User preferences are private to the user
match /userPreferences/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Marketplace Data Access**:
```javascript
// Anyone can read marketplace listings
match /marketplaceItems/{listingId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    request.auth.uid == resource.data.sellerId;
}

// Chat participants can access their conversations
match /chats/{chatId} {
  allow read, write: if request.auth != null && 
    request.auth.uid in resource.data.participants;
}
```

**PSA Data Access**:
```javascript
// PSA card data is read-only for all authenticated users
match /psa-cards/{certNumber} {
  allow read: if request.auth != null;
  allow write: if false; // Only admin/functions can write
}
```

## Data Migration and Versioning

### Schema Evolution

**Currency Migration** (`scripts/migrateCurrencySchema.js`):
- Migrated user currency preferences from simple string to object format
- Added currency conversion capabilities
- Maintained backward compatibility

**Collection Structure Updates**:
- Added marketplace collections and profiles
- Introduced chat system for marketplace
- Enhanced card data with population statistics

### Data Consistency

**Referential Integrity**:
- PSA card references validated against psa-cards collection
- User references in marketplace/chats verified
- Orphaned data cleanup via Cloud Functions

**Data Normalization**:
- Card data duplicated in marketplace listings for performance
- User display names cached in chats for efficiency
- Currency information embedded in user preferences

## Performance Considerations

### Query Optimization

**Pagination**:
- Marketplace listings use cursor-based pagination
- Chat messages paginated by timestamp
- Large collections split into batches

**Real-time Listeners**:
- Limited to active UI components
- Automatic cleanup on component unmount
- Selective field listening where possible

**Offline Support**:
- Critical collections cached locally
- Conflict resolution for concurrent edits
- Progressive sync on connection restore

### Storage Optimization

**Data Size Management**:
- Large text fields (descriptions) have character limits
- Image URLs stored as references, not embedded data
- Historical data archived after 2 years

**Collection Design**:
- User collections nested to reduce document reads
- Chat messages in subcollections for scalability
- PSA data normalized to avoid duplication

## Backup and Recovery

### Data Protection

**Automated Backups**:
- Daily Firestore exports to Cloud Storage
- Point-in-time recovery available
- Cross-region replication enabled

**Data Retention**:
- User profiles: Indefinite (until account deletion)
- Chat messages: 2 years
- Marketplace listings: 1 year after sale/removal
- PSA data: Permanent reference data

### Recovery Procedures

**User Data Recovery**:
1. Locate user backup by email/uid
2. Restore collections and preferences
3. Verify marketplace listing integrity
4. Restore chat conversation history

**System-wide Recovery**:
1. Import from latest backup
2. Verify all indexes rebuild correctly
3. Test security rules functionality
4. Validate all real-time listeners

## Development and Testing

### Local Development

**Firestore Emulator**:
```bash
firebase emulators:start --only firestore
```

**Test Data Seeding**:
- Sample user profiles
- Mock PSA card database
- Test marketplace listings
- Sample chat conversations

### Data Validation Testing

**Schema Validation**:
- Required field testing
- Data type validation
- Relationship integrity checks
- Security rule verification

**Performance Testing**:
- Query response time monitoring
- Concurrent user simulation
- Real-time listener performance
- Offline/online sync testing

## Monitoring and Analytics

### Database Metrics

**Performance Monitoring**:
- Query execution times
- Read/write operation counts
- Index usage statistics
- Error rate tracking

**Usage Analytics**:
- Most queried collections
- Peak usage patterns
- Geographic distribution
- Feature adoption rates

### Alerting

**Critical Alerts**:
- High error rates
- Slow query performance
- Security rule violations
- Unusual data patterns

**Operational Alerts**:
- Storage quota approaching
- High concurrent user counts
- Failed backup operations
- Index maintenance required

This schema provides a robust foundation for the Pokemon Card Tracker application, supporting complex user interactions while maintaining data integrity and performance at scale.
