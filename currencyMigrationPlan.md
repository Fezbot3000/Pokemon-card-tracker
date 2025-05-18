# Currency System Migration Plan

## 1. Objective

To update the Firestore database schema for the `cards` and `sold_cards` collections to support dynamic currency handling. This involves storing monetary values in their original transaction currency and amount, allowing for conversion and display in the user's preferred currency.

## 2. Collections Affected

- `cards`
- `sold_cards`

## 3. Schema Changes

### 3.1. New Fields to Add

**For `cards` collection (for each document):**

- `originalInvestmentCurrency` (String): The ISO 4217 currency code of the original investment (e.g., "AUD", "USD", "JPY").
- `originalInvestmentAmount` (Number): The numeric value of the original investment in `originalInvestmentCurrency`.
- `originalCurrentValueCurrency` (String): The ISO 4217 currency code for the card's current value assessment.
- `originalCurrentValueAmount` (Number): The numeric value of the card's current value in `originalCurrentValueCurrency`.

**For `sold_cards` collection (for each document):**

- `originalPurchaseCurrency` (String): The ISO 4217 currency code of the original purchase price.
- `originalPurchaseAmount` (Number): The numeric value of the original purchase in `originalPurchaseCurrency`.
- `originalSaleCurrency` (String): The ISO 4217 currency code of the sale price.
- `originalSaleAmount` (Number): The numeric value of the sale in `originalSaleCurrency`.

### 3.2. Legacy Fields to Deprecate / Phase Out

These fields will no longer be the primary source of truth. Their values will be migrated to the new fields. After successful migration and UI updates, these can be removed in a subsequent cleanup task.

**For `cards` collection:**

- `investmentAUD`
- `currentValueAUD`
- `finalProfitAUD` (Profit will now be calculated dynamically)

**For `sold_cards` collection:**

- `purchasePriceAUD`
- `salePriceAUD`
- `profitAUD` (Profit will now be calculated dynamically)

## 4. Migration Logic for Existing Data

### 4.1. General Assumption

For most existing records, monetary values currently stored in fields like `investmentAUD`, `currentValueAUD`, `purchasePriceAUD`, and `salePriceAUD` are assumed to be in **AUD**.

### 4.2. Migration Steps for `cards` Collection

For each document in the `cards` collection:

1.  **Check for Prior Migration:** If `originalInvestmentCurrency` already exists, skip this document (idempotency).
2.  **Investment Data:**
    *   If `investmentAUD` exists and is a non-null number:
        *   Set `originalInvestmentCurrency` to "AUD".
        *   Set `originalInvestmentAmount` to the value of `investmentAUD`.
    *   Else if existing USD fields (e.g., `costUSD`, `investmentUSD`) are present and `investmentAUD` is 0, null, or undefined:
        *   Set `originalInvestmentCurrency` to "USD".
        *   Set `originalInvestmentAmount` to the value of the primary USD investment field.
    *   Else (no clear AUD or USD investment data):
        *   Set `originalInvestmentCurrency` to "AUD" (default or user's current preference if accessible).
        *   Set `originalInvestmentAmount` to 0.
        *   Log a warning for manual review for this card.
3.  **Current Value Data:**
    *   If `currentValueAUD` exists and is a non-null number:
        *   Set `originalCurrentValueCurrency` to "AUD".
        *   Set `originalCurrentValueAmount` to the value of `currentValueAUD`.
    *   Else if existing USD fields (e.g., `valueUSD`, `currentValueUSD`) are present and `currentValueAUD` is 0, null, or undefined:
        *   Set `originalCurrentValueCurrency` to "USD".
        *   Set `originalCurrentValueAmount` to the value of the primary USD value field.
    *   Else (no clear AUD or USD value data):
        *   Set `originalCurrentValueCurrency` to "AUD" (default or user's current preference if accessible).
        *   Set `originalCurrentValueAmount` to 0.
        *   Log a warning for manual review.

### 4.3. Migration Steps for `sold_cards` Collection

For each document in the `sold_cards` collection:

1.  **Check for Prior Migration:** If `originalPurchaseCurrency` already exists, skip this document.
2.  **Purchase Data:**
    *   If `purchasePriceAUD` exists and is a non-null number:
        *   Set `originalPurchaseCurrency` to "AUD".
        *   Set `originalPurchaseAmount` to the value of `purchasePriceAUD`.
    *   Else if existing USD fields (e.g., `costUSD`, `purchasePriceUSD`) are present and `purchasePriceAUD` is 0, null, or undefined:
        *   Set `originalPurchaseCurrency` to "USD".
        *   Set `originalPurchaseAmount` to the value of the primary USD purchase field.
    *   Else:
        *   Set `originalPurchaseCurrency` to "AUD".
        *   Set `originalPurchaseAmount` to 0.
        *   Log a warning.
3.  **Sale Data:**
    *   If `salePriceAUD` exists and is a non-null number:
        *   Set `originalSaleCurrency` to "AUD".
        *   Set `originalSaleAmount` to the value of `salePriceAUD`.
    *   Else if existing USD fields (e.g., `priceUSD`, `salePriceUSD`) are present and `salePriceAUD` is 0, null, or undefined:
        *   Set `originalSaleCurrency` to "USD".
        *   Set `originalSaleAmount` to the value of the primary USD sale field.
    *   Else:
        *   Set `originalSaleCurrency` to "AUD".
        *   Set `originalSaleAmount` to 0.
        *   Log a warning.

## 5. Migration Script Considerations

- The script should be runnable as a Node.js script or a Firebase Function.
- It needs appropriate Firebase Admin SDK setup to interact with Firestore.
- Batch writes should be used for efficiency if migrating a large number of documents.
- Comprehensive logging of actions, skipped documents, and any errors or data inconsistencies encountered is crucial.
- Dry run capability is highly recommended before performing live data changes.

## 6. Post-Migration

- Update UI components to read from and write to the new currency fields.
- Update any backend logic (Firebase Functions, security rules) that relied on the old fields.
- After thorough verification, schedule a cleanup task to remove the deprecated fields from Firestore documents.
