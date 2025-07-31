# Dynamic Currency Implementation Plan for Marketplace

## Executive Summary

The Pokemon Card Tracker application has a robust currency conversion and formatting system via `UserPreferencesContext`, but it's not being utilized across all marketplace and listing pages. This plan outlines the comprehensive implementation of dynamic currency formatting and conversion across all user-facing price displays.

## Current State Analysis

### ✅ **Existing Infrastructure**
- **UserPreferencesContext**: Complete currency conversion system with live exchange rates
- **Available Functions**:
  - `formatAmountForDisplay(originalAmount, originalCurrencyCode)` - Converts and formats
  - `convertToUserCurrency(originalAmount, originalCurrencyCode)` - Converts only
  - `formatPreferredCurrency(amountInUserPref)` - Formats already converted amounts
- **Currency Support**: USD, EUR, GBP, AUD, CAD, JPY with live exchange rates
- **Already Implemented**: Dashboard, CardList, StatisticsSummary, SaleModal, PriceChartingModal

### ❌ **Components Missing Dynamic Currency**

#### **High Priority - User-Facing Price Displays**
1. **Marketplace.js** - Main marketplace listing grid
2. **SellerProfileModal.js** - Seller profile with listings
3. **ListingDetailModal.js** - Individual listing details
4. **MarketplaceMessages.js** - Chat/messaging with price context
5. **PublicMarketplace.js** - Public marketplace view

#### **Medium Priority - Admin/Management**
6. **EditListingModal.js** - Edit listing form (partially implemented)
7. **MarketplaceSelling.js** - Seller's own listings view (partially implemented)
8. **BuyerSelectionModal.js** - Buyer selection with price context

## Implementation Strategy

### **Phase 1: Core Marketplace Components**

#### **1.1 Marketplace.js**
- **Current Issue**: Uses `formatCurrencyCustom(listing.listingPrice, listing.currency || 'AUD')`
- **Required Change**: Replace with `formatAmountForDisplay(listing.listingPrice, listing.currency || 'AUD')`
- **Impact**: All marketplace grid price displays will show in user's preferred currency
- **Data Requirements**: Ensure `listing.currency` field contains original currency code

#### **1.2 SellerProfileModal.js**
- **Current Issue**: Uses custom `formatCurrencyCustom` function
- **Required Change**: Replace with `formatAmountForDisplay(price, currency)`
- **Impact**: Seller profile listings will show in user's preferred currency
- **Additional**: Remove custom `formatCurrencyCustom` function

#### **1.3 ListingDetailModal.js**
- **Current Issue**: No currency formatting system detected
- **Required Change**: Add `useUserPreferences` hook and `formatAmountForDisplay`
- **Impact**: Individual listing details will show in user's preferred currency
- **Price Locations**: Main price display, any comparative pricing

### **Phase 2: Supporting Components**

#### **2.1 MarketplaceMessages.js**
- **Analysis Required**: Check if price context is displayed in messages
- **Implementation**: Add currency formatting if prices are shown

#### **2.2 PublicMarketplace.js**
- **Analysis Required**: Determine if this component exists and displays prices
- **Implementation**: Apply same pattern as Marketplace.js

#### **2.3 BuyerSelectionModal.js**
- **Analysis Required**: Check if prices are displayed in buyer selection
- **Implementation**: Add currency formatting for any price displays

### **Phase 3: Data Layer Considerations**

#### **3.1 Database Schema Validation**
- **Verify**: All listings have `currency` field with proper currency codes
- **Default**: Ensure fallback to 'AUD' for legacy data
- **Migration**: Consider data migration if currency fields are missing

#### **3.2 Listing Creation/Editing**
- **ListCardModal.js**: Already has `useUserPreferences` - verify proper currency storage
- **EditListingModal.js**: Already has `useUserPreferences` - verify proper currency storage
- **Ensure**: New listings store currency in user's preferred currency or with proper conversion

### **Phase 4: Edge Cases and Error Handling**

#### **4.1 Currency Conversion Failures**
- **Fallback**: Display original currency if conversion fails
- **Error Handling**: Graceful degradation when exchange rates unavailable
- **User Feedback**: Clear indication when displaying fallback currency

#### **4.2 Legacy Data**
- **Missing Currency**: Default to 'AUD' for listings without currency field
- **Invalid Currency**: Validate currency codes and fallback to 'AUD'
- **Zero/Null Prices**: Handle edge cases gracefully

## Technical Implementation Details

### **Standard Implementation Pattern**

```javascript
// 1. Import the hook
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

// 2. Use the hook in component
const { formatAmountForDisplay } = useUserPreferences();

// 3. Replace price displays
// OLD: {listing.listingPrice} {listing.currency}
// NEW: {formatAmountForDisplay(listing.listingPrice, listing.currency || 'AUD')}
```

### **Data Flow Requirements**

```javascript
// Listing object should contain:
{
  listingPrice: 23423,           // Numeric price value
  currency: 'AUD',               // Original currency code
  // ... other fields
}

// Result after formatAmountForDisplay:
// If user prefers USD: "$15,815.54"
// If user prefers EUR: "€14,386.23"
// If user prefers AUD: "A$23,423.00"
```

## Testing Strategy

### **Unit Tests**
- Test currency conversion accuracy
- Test fallback behavior for missing/invalid currency
- Test edge cases (zero, negative, very large numbers)

### **Integration Tests**
- Test user preference changes reflect immediately
- Test exchange rate updates propagate correctly
- Test offline behavior (cached rates)

### **User Acceptance Testing**
- Verify all price displays respect user currency preference
- Test currency switching updates all displays
- Verify consistency across all marketplace pages

## Rollout Plan

### **Week 1: Phase 1 Implementation**
- Day 1-2: Marketplace.js implementation and testing
- Day 3-4: SellerProfileModal.js implementation and testing
- Day 5: ListingDetailModal.js implementation and testing

### **Week 2: Phase 2 & 3**
- Day 1-2: Supporting components analysis and implementation
- Day 3-4: Data layer validation and migration planning
- Day 5: Integration testing

### **Week 3: Phase 4 & Deployment**
- Day 1-2: Edge case handling and error scenarios
- Day 3-4: Comprehensive testing and bug fixes
- Day 5: Production deployment and monitoring

## Success Metrics

### **Functional Requirements**
- ✅ All marketplace prices display in user's preferred currency
- ✅ Currency changes reflect immediately across all components
- ✅ Proper fallback behavior for edge cases
- ✅ Consistent formatting across all price displays

### **Performance Requirements**
- ✅ No noticeable performance impact from currency conversion
- ✅ Exchange rate updates don't cause UI flickering
- ✅ Proper caching of conversion calculations

### **User Experience Requirements**
- ✅ Seamless currency switching experience
- ✅ Clear indication of currency being displayed
- ✅ Consistent currency symbols and formatting

## Risk Mitigation

### **High Risk: Data Inconsistency**
- **Risk**: Listings without proper currency data
- **Mitigation**: Robust fallback to 'AUD' and data validation

### **Medium Risk: Exchange Rate Failures**
- **Risk**: Live exchange rates unavailable
- **Mitigation**: Cached rates and graceful degradation

### **Low Risk: Performance Impact**
- **Risk**: Currency conversion causing slowdowns
- **Mitigation**: Memoization and efficient conversion algorithms

## Post-Implementation Monitoring

### **Metrics to Track**
- Currency conversion accuracy
- Exchange rate API success rates
- User currency preference distribution
- Performance impact on page load times

### **Error Monitoring**
- Currency conversion failures
- Invalid currency code handling
- Exchange rate fetch failures
- User preference save/load errors

## Conclusion

This implementation will provide a seamless, user-centric currency experience across all marketplace components, leveraging the existing robust currency infrastructure while ensuring consistency and reliability.
