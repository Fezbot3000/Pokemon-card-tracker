# Reviews Database Schema

## Overview
This document outlines the database schema for the marketplace reviews system, including Firestore collections, rules, and indexes.

## Collections

### 1. Reviews Collection (`reviews`)

**Purpose:** Store all marketplace transaction reviews

**Document Structure:**
```javascript
{
  id: "review_123", // Auto-generated
  reviewerId: "uid_reviewer", // User ID of the reviewer
  revieweeId: "uid_reviewee", // User ID being reviewed
  transactionId: "listing_123", // Marketplace listing ID
  transactionType: "marketplace_sale", // Type of transaction
  rating: 5, // 1-5 stars
  comment: "Great buyer, prompt payment", // Optional comment
  reviewerRole: "seller", // "seller" or "buyer"
  createdAt: timestamp, // Server timestamp
  updatedAt: timestamp // Server timestamp
}
```

### 2. User Profile Updates (`users` collection)

**Additional Fields:**
```javascript
{
  // Existing user fields...
  marketplaceProfile: {
    // Existing marketplace fields...
    ratingSummary: {
      averageRating: 4.8, // Overall average
      totalReviews: 52, // Total number of reviews
      asSellerRating: 4.9, // Average when acting as seller
      asSellerReviews: 30, // Number of reviews as seller
      asBuyerRating: 4.7, // Average when acting as buyer
      asBuyerReviews: 22, // Number of reviews as buyer
      lastUpdated: timestamp // Last calculation time
    }
  }
}
```

### 3. Notifications Collection (`notifications`)

**Document Structure:**
```javascript
{
  id: "notif_123", // Auto-generated
  userId: "uid_recipient", // Recipient user ID
  type: "marketplace_review", // Notification type
  priority: "high", // "high", "normal", "low"
  title: "Review your purchase",
  message: "Review your purchase from @CardMaster",
  actionUrl: "/review/transaction/456",
  actionLabel: "Review Now",
  relatedId: "listing_123", // Related entity ID
  read: false, // Read status
  createdAt: timestamp, // Server timestamp
  expiresAt: timestamp // Auto-cleanup timestamp
}
```

## Firestore Rules

Add to `firestore.rules`:

```javascript
// Reviews collection rules
match /reviews/{reviewId} {
  // Allow authenticated users to read reviews
  allow read: if request.auth != null;
  
  // Allow creating a review if:
  // 1. User is authenticated
  // 2. User is the reviewer (reviewerId matches auth uid)
  // 3. User hasn't already reviewed this transaction
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.reviewerId
    && !exists(/databases/$(database)/documents/reviews/$(request.auth.uid + '_' + request.resource.data.transactionId));
  
  // Reviews cannot be updated or deleted once created
  allow update: if false;
  allow delete: if false;
}

// Notifications collection rules
match /notifications/{notificationId} {
  // Users can only read their own notifications
  allow read: if request.auth != null 
    && request.auth.uid == resource.data.userId;
  
  // Only the system should create notifications (via Cloud Functions)
  // For now, allow authenticated users to create for testing
  allow create: if request.auth != null;
  
  // Users can update their own notifications (mark as read)
  allow update: if request.auth != null 
    && request.auth.uid == resource.data.userId
    && request.resource.data.keys().hasAll(['read'])
    && request.resource.data.keys().size() == 1;
  
  // Users can delete their own notifications
  allow delete: if request.auth != null 
    && request.auth.uid == resource.data.userId;
}

// Update user rules for rating summary
match /users/{userId} {
  // Existing rules...
  
  // Allow updating marketplaceProfile.ratingSummary
  // This should ideally be done via Cloud Function
  allow update: if request.auth != null 
    && (request.auth.uid == userId 
        || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['marketplaceProfile.ratingSummary']));
}
```

## Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "revieweeId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "revieweeId", "order": "ASCENDING" },
        { "fieldPath": "reviewerRole", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "transactionId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reviewerId", "order": "ASCENDING" },
        { "fieldPath": "transactionId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "read", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Migration Steps

1. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy Firestore Indexes**
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Initialize Existing Users**
   - No migration needed for existing users
   - Rating summaries will be created as reviews are submitted

## Security Considerations

1. **Review Integrity**
   - Reviews cannot be edited or deleted once created
   - One review per user per transaction
   - Only transaction participants can review

2. **Rating Calculation**
   - Consider moving to Cloud Function for tamper-proof calculations
   - Implement rate limiting for review submissions

3. **Data Validation**
   - Validate rating is between 1-5
   - Limit comment length (500 characters)
   - Sanitize all text inputs

## Future Enhancements

1. **Cloud Functions**
   - Automated rating calculation on review submission
   - Notification creation on review events
   - Scheduled cleanup of old notifications

2. **Review Verification**
   - Verify transaction actually occurred
   - Check seller/buyer relationship

3. **Reporting System**
   - Flag inappropriate reviews
   - Admin moderation interface




