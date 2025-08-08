# Marketplace Orders Database Schema

**Date**: 2025-01-07  
**Version**: 1.0  
**Purpose**: Database design for Phase 2 marketplace payment system

## Collection Structure

### `/marketplaceOrders/{orderId}`

```javascript
{
  // Order Identity
  id: "string",                          // Auto-generated order ID
  listingId: "string",                   // Reference to marketplace listing
  buyerId: "string",                     // User ID of buyer
  sellerId: "string",                    // User ID of seller
  
  // Payment Details
  amount: "number",                      // Total amount paid (AUD/USD)
  currency: "string",                    // Payment currency ("AUD", "USD")
  platformFee: "number",                 // Our fee amount (3.5% or 8%)
  platformFeePercentage: "number",       // Fee percentage applied
  sellerPayout: "number",                // Amount paid to seller
  postageAmount: "number",               // Shipping cost (if any)
  
  // Stripe Integration
  stripePaymentIntentId: "string",       // Stripe payment intent
  stripeTransferId: "string",            // Transfer to seller
  stripeConnectedAccountId: "string",    // Seller's connected account
  
  // Order Status
  status: "string",                      // "paid" | "preparing" | "shipped" | "delivered" | "disputed"
  
  // Card Details (Snapshot from listing)
  cardDetails: {
    name: "string",                      // Card name
    set: "string",                       // Pokemon set
    year: "number",                      // Release year
    grade: "string",                     // Card grade
    gradingCompany: "string",            // PSA, BGS, CGC
    certificationNumber: "string",       // Cert number
    imageUrl: "string",                  // Card image
    category: "string"                   // Card category
  },
  
  // Shipping Information
  shippingAddress: {
    name: "string",                      // Recipient name
    street: "string",                    // Street address
    city: "string",                      // City
    state: "string",                     // State/Province
    postalCode: "string",                // Postal code
    country: "string"                    // Country
  },
  
  shippingMethod: "string",              // Standard, Express, etc.
  trackingNumber: "string",              // Shipping tracking
  estimatedDelivery: "timestamp",        // Expected delivery
  shippingDeadline: "timestamp",         // Seller must ship by (paidAt + 2 days)
  
  // Timestamps
  createdAt: "timestamp",                // Order creation
  paidAt: "timestamp",                   // Payment completed
  shippedAt: "timestamp",                // Item shipped
  deliveredAt: "timestamp",              // Item delivered
  
  // Participant Information
  buyerName: "string",                   // Buyer display name
  buyerEmail: "string",                  // Buyer email
  sellerName: "string",                  // Seller display name  
  sellerEmail: "string",                 // Seller email
  
  // Communication
  lastMessageDate: "timestamp",          // Last order message
  messageCount: "number",                // Number of order messages
  
  // Metadata
  notes: "string",                       // Order notes
  internalNotes: "string",               // Admin notes
  refundAmount: "number",                // Refund amount (if any)
  refundReason: "string",                // Refund reason
  disputeReason: "string",               // Dispute reason (if any)
  
  // Analytics
  buyerDevice: "string",                 // Device type
  buyerLocation: "string",               // Buyer location
  conversionSource: "string"             // How buyer found listing
}
```

## Order Status Flow

```
paid → preparing → shipped → delivered
  ↓
disputed (can occur at any stage)
```

### Status Descriptions:
- **paid**: Payment successful, seller notified
- **preparing**: Seller preparing item for shipment (2-day deadline)
- **shipped**: Item shipped with tracking
- **delivered**: Buyer confirmed receipt
- **disputed**: Issue raised, requires resolution

## Security Rules

### `/marketplaceOrders/{orderId}`
```javascript
match /marketplaceOrders/{orderId} {
  // Buyers and sellers can read their own orders
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.buyerId || 
     request.auth.uid == resource.data.sellerId);
  
  // Only Cloud Functions can create orders
  allow create: if false;
  
  // Buyers and sellers can update specific fields
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.buyerId || 
     request.auth.uid == resource.data.sellerId) &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['status', 'trackingNumber', 'deliveredAt', 'notes']);
  
  // No deletion allowed
  allow delete: if false;
}
```

## Required Indexes

```javascript
// Order queries by buyer
{
  "collectionGroup": "marketplaceOrders",
  "fieldPath": [
    { "fieldPath": "buyerId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}

// Order queries by seller  
{
  "collectionGroup": "marketplaceOrders",
  "fieldPath": [
    { "fieldPath": "sellerId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}

// Orders by status
{
  "collectionGroup": "marketplaceOrders", 
  "fieldPath": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}

// Shipping deadline tracking
{
  "collectionGroup": "marketplaceOrders",
  "fieldPath": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "shippingDeadline", "order": "ASCENDING" }
  ]
}
```

## Fee Structure

### Platform Fees:
- **Established Sellers** (30+ days, 5+ sales): **3.5%**
- **New Sellers** (< 30 days or < 5 sales): **8%**

### Fee Calculation:
```javascript
const isEstablishedSeller = (sellerStats) => {
  const accountAge = Date.now() - sellerStats.createdAt;
  const daysSinceJoined = accountAge / (1000 * 60 * 60 * 24);
  
  return daysSinceJoined >= 30 && sellerStats.totalSales >= 5;
};

const platformFeePercentage = isEstablishedSeller(seller) ? 3.5 : 8;
const platformFee = (amount * platformFeePercentage) / 100;
const sellerPayout = amount - platformFee;
```

## Integration with Existing Collections

### Updates Required:

#### `/users/{userId}/marketplace-listings/{listingId}`
```javascript
// Add new fields:
{
  sellerId: "string",              // For quick seller identification
  instantBuyEnabled: "boolean",    // Seller preference
  lastSoldAt: "timestamp",         // When last sold
  totalSales: "number"             // Number of times sold
}
```

#### `/marketplaceProfiles/{userId}`  
```javascript
// Add new fields:
{
  stripeConnectedAccountId: "string",   // Stripe Connect account
  onboardingComplete: "boolean",        // Connect setup complete
  payoutsEnabled: "boolean",            // Can receive payouts
  totalSales: "number",                 // Total successful sales
  totalRevenue: "number",               // Total revenue earned
  averageShippingTime: "number",        // Days to ship
  shippingRating: "number"              // Shipping performance rating
}
```

