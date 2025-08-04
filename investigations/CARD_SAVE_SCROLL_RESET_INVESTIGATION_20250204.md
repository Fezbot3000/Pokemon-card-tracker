# Card Save Scroll Reset Investigation - February 4, 2025

**Issue**: When editing a card and clicking "Save", the page scrolls to the top, losing the user's scroll position.

**Priority**: HIGH - Major UX issue affecting card editing workflow  
**Status**: Root cause confirmed, solution ready for implementation  
**Date**: February 4, 2025

---

## 🔍 **Root Cause Analysis**

### **Confirmed: Multiple Firestore Listeners Issue**

This is the **second part** of the scroll position problem - already documented but unresolved. The issue occurs specifically during **card save operations**.

#### **The Problem Flow:**
```
1. User scrolls down and opens card modal ✅ (FIXED - modal scroll preservation working)
2. User edits card and clicks "Save" 
3. ❌ ISSUE: Page jumps to top during save process
4. User returns to top of page instead of original position
```

#### **Technical Root Cause:**
When a card is saved, **2 simultaneous Firestore listeners** trigger, causing multiple re-renders:

**File**: `src/hooks/useCardData.js` lines 87, 227
```javascript
// Listener 1: useCardData hook
setCards(firestoreCards);  // ← First setCards call

// Also manual refresh:
const freshCards = await repository.getAllCards();
setCards(freshCards);      // ← Second setCards call
```

**File**: `src/contexts/CardContext.js` lines 270, 309
```javascript
// Listener 2: CardContext 
setCards(filteredCards);   // ← Third setCards call (competing listener)
```

---

## 🎯 **Evidence from Codebase**

### **1. Multiple setCards Calls Confirmed**
Found **3 active setCards calls** during save operations:

1. **useCardData Firestore listener** (line 87)
2. **useCardData manual refresh** (line 227) 
3. **CardContext Firestore listener** (line 270/309)

### **2. Current Save Flow (PROBLEMATIC)**
```
User clicks "Save"
    ↓
CardDetails.handleSave() → onUpdateCard prop
    ↓  
useCardData.updateCard() → repository.updateCard()
    ↓
Firebase Firestore write
    ↓
🔥 2 LISTENERS FIRE SIMULTANEOUSLY:
    ├─ useCardData listener → setCards(firestoreCards)
    └─ CardContext listener → setCards(filteredCards)
    ↓
🔥 MANUAL REFRESH ADDS 3RD CALL:
    └─ useCardData → setCards(freshCards)
    ↓
💥 MULTIPLE RE-RENDERS CASCADE:
    ├─ CardList component re-renders
    ├─ Pagination state resets
    ├─ Page height changes (8000px → 1000px)
    └─ Browser resets scroll position to top
```

### **3. Components Affected**
- **Primary**: `App.js` uses `useCardData()` - main cards source
- **Secondary**: `CardContext` - global context but only used by CollectionSharing
- **Impact**: CardList receives new props → re-renders → loses scroll position

---

## 🛠 **Solution Strategy**

### **Option 1: Disable Competing Listener (Quick Fix)**
**Impact**: Low risk, immediate improvement
**Approach**: Temporarily disable CardContext listener to eliminate competition

### **Option 2: Optimize Save Flow (Medium Fix)**  
**Impact**: Medium risk, better performance
**Approach**: Remove manual refresh call, rely only on Firestore listeners

### **Option 3: Implement Scroll Preservation (Comprehensive Fix)**
**Impact**: Higher risk, complete solution  
**Approach**: Add scroll position preservation specifically around save operations

---

## 🎯 **Recommended Quick Fix**

Based on the investigation, **Option 1** is the safest immediate fix:

### **Disable CardContext Firestore Listener**
The CardContext listener is only used by CollectionSharing component, but the main app uses useCardData. By temporarily disabling the CardContext listener, we eliminate the competing setCards calls.

**Files to modify**:
- `src/contexts/CardContext.js` - Comment out or conditionally disable the Firestore listener
- Impact: CollectionSharing might need to be updated to use a different data source

### **Expected Result**:
- Save operations will trigger only 1-2 setCards calls instead of 3
- Reduced re-rendering should preserve scroll position
- Modal scroll preservation (already fixed) + save scroll preservation = complete solution

---

## 📊 **Before vs After**

### **Current State (Problematic)**
```
Save Card → 3 setCards() calls → Multiple re-renders → Scroll reset
```

### **After Fix (Expected)**
```  
Save Card → 1 setCards() call → Single re-render → Scroll preserved
```

---

## 🧪 **Testing Plan**

### **Test Scenario**
1. Scroll down on cards page to position Y
2. Open card modal 
3. Edit card (change price, condition, etc.)
4. Click "Save"
5. **Expected**: Stay at position Y
6. **Current**: Jumps to top (position 0)

### **Success Criteria**
- No scroll position reset on card save
- Card updates appear correctly in the list
- No visual glitches or performance issues
- CollectionSharing still works (if using CardContext)

---

**Next Steps**: Implement Option 1 (disable competing listener) for immediate scroll preservation during save operations.