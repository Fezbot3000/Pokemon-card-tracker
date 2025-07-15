# Modal Button Standardization Plan

## Current Issues Identified

### 1. Inconsistent Button Variants
- Some modals use `variant="secondary"` 
- Some modals use `variant="outline"`
- Some modals use `variant="primary"`
- No consistent mapping between semantic meaning and visual style

### 2. Inconsistent Layout Patterns
- Some use `justify-between` (left/right alignment)
- Some use `justify-end` (right alignment only)
- Some use `space-x-2`, others use `space-x-3`
- Some use custom flex layouts

### 3. Inconsistent Button Components
- Some use `Button` component directly
- Some use `ModalButton` component
- Different styling and behavior

### 4. Inconsistent Spacing and Sizing
- Different minimum widths
- Different padding and margins
- Different button heights

## Standardization Rules

### Button Variant Mapping
- **Cancel/Close buttons**: `variant="secondary"` → `outline` style
- **Primary actions**: `variant="primary"` → `default` (blue gradient)
- **Danger actions**: `variant="danger"` → `destructive` (red gradient)
- **Success actions**: `variant="success"` → `success` (green gradient)

### Layout Standardization
- **Two-button layout**: Use `justify-between` with left/right alignment
- **Single button**: Use `justify-end` (right alignment)
- **Three+ buttons**: Use `justify-between` with proper grouping
- **Consistent spacing**: Always use `space-x-3` between buttons

### Component Standardization
- **All modals must use `ModalButton` component**
- **Consistent minimum width**: `min-w-[80px]`
- **Consistent height**: Use default button height

## Files to Update

### High Priority (Core Modals)
1. `src/design-system/components/CardDetailsModal.js`
2. `src/components/Marketplace/ListingDetailModal.js`
3. `src/components/Marketplace/EditListingModal.js`
4. `src/components/Marketplace/ListCardModal.js`
5. `src/components/PurchaseInvoices/CreateInvoiceModal.js`
6. `src/components/SaleModal.js`
7. `src/components/Marketplace/MessageModal.js`
8. `src/components/MoveCardsModal.js`
9. `src/components/NewCollectionModal.js`
10. `src/components/PriceChartingModal.js`

### Medium Priority (Supporting Modals)
1. `src/design-system/molecules/ConfirmDialog.js`
2. `src/components/Marketplace/BuyerSelectionModal.js`
3. `src/design-system/components/CollectionSelector.js`
4. `src/components/CollectionSharing.js`

### Already Updated
1. `src/design-system/components/SettingsModal.js` ✅
2. `src/components/AddCardModal.js` ✅

## Implementation Steps

1. **Update ModalButton component** to ensure consistent styling
2. **Systematically update each modal** following the standardization rules
3. **Test each modal** to ensure functionality is preserved
4. **Run build** to verify no compilation errors
5. **Test UI** to ensure consistent appearance

## Success Criteria

- [ ] All modal buttons use `ModalButton` component
- [ ] Consistent button variants across all modals
- [ ] Consistent layout patterns (justify-between for two buttons)
- [ ] Consistent spacing (space-x-3)
- [ ] Consistent minimum width (80px)
- [ ] No visual inconsistencies in button styling
- [ ] All modals maintain their current functionality 