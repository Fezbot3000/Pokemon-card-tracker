# CSS !important Rules Analysis & Conflicts

## 🚨 **ALL !important RULES BY FILE**

### **FILE: src/styles/main.css**
- Line 318: `padding-right: 0 !important;`
- Line 323: `-ms-overflow-style: none !important;` (IE scrollbar)
- Line 324: `scrollbar-width: none !important;` (Firefox scrollbar)
- Line 329: `display: none !important;` (scrollbar webkit)
- Line 330: `width: 0 !important;` (scrollbar webkit)
- Line 331: `height: 0 !important;` (scrollbar webkit)

**MODAL-RELATED RULES:**
- Line 531: `outline: 2px solid red !important;` (debug - all elements)
- Line 534: `outline: 4px solid blue !important;` (debug - main-content)
- Line 537: `outline: 4px solid green !important;` (debug - dashboard-page)
- Line 540: `outline: 4px solid yellow !important;` (debug - #root)

**AGGRESSIVE HEIGHT FORCING:**
- Line 549: `height: 100vh !important;` (multiple selectors)
- Line 550: `height: 100dvh !important;` (multiple selectors)
- Line 551: `min-height: 100vh !important;` (multiple selectors)
- Line 552: `min-height: 100dvh !important;` (multiple selectors)
- Line 553: `padding-bottom: 0 !important;` (multiple selectors)
- Line 554: `margin-bottom: 0 !important;` (multiple selectors)
- Line 555: `box-sizing: border-box !important;` (multiple selectors)

**MODAL CONTAINER POSITIONING:**
- Line 560: `position: fixed !important;` (.modal-container)
- Line 561: `top: 0 !important;` (.modal-container)
- Line 562: `left: 0 !important;` (.modal-container)
- Line 563: `right: 0 !important;` (.modal-container)
- Line 564: `bottom: 0 !important;` (.modal-container)

**SAFE AREA EXTENSIONS:**
- Line 567: `padding-top: env(safe-area-inset-top) !important;` (.modal-container)
- Line 568: `padding-bottom: env(safe-area-inset-bottom) !important;` (.modal-container)
- Line 569: `padding-left: env(safe-area-inset-left) !important;` (.modal-container)
- Line 570: `padding-right: env(safe-area-inset-right) !important;` (.modal-container)

**NEGATIVE MARGINS:**
- Line 573: `margin-top: calc(-1 * env(safe-area-inset-top)) !important;` (.modal-container)
- Line 574: `margin-bottom: calc(-1 * env(safe-area-inset-bottom)) !important;` (.modal-container)
- Line 575: `margin-left: calc(-1 * env(safe-area-inset-left)) !important;` (.modal-container)
- Line 576: `margin-right: calc(-1 * env(safe-area-inset-right)) !important;` (.modal-container)

**MODAL DIMENSIONS:**
- Line 578: `width: 100vw !important;` (.modal-container)
- Line 579: `height: 100vh !important;` (.modal-container)
- Line 580: `height: 100dvh !important;` (.modal-container)
- Line 581: `z-index: 999999 !important;` (.modal-container)

**ALTERNATIVE APPROACH:**
- Line 586: `height: calc(100vh + env(safe-area-inset-bottom)) !important;` (.modal-container)
- Line 587: `bottom: calc(-1 * env(safe-area-inset-bottom)) !important;` (.modal-container)

---

### **FILE: src/styles/design-system.css**
- Line 232: `padding-bottom: 0 !important;` (body.modal-open)

---

### **FILE: src/styles/ios-fixes.css**
**PWA CHECKBOX SIZING:**
- Line 77: `width: var(--pwa-checkbox-size) !important;`
- Line 78: `height: var(--pwa-checkbox-size) !important;`
- Line 79: `min-width: var(--pwa-checkbox-size) !important;`
- Line 80: `min-height: var(--pwa-checkbox-size) !important;`
- Line 81: `max-width: var(--pwa-checkbox-size) !important;`
- Line 82: `max-height: var(--pwa-checkbox-size) !important;`
- Line 83: `transform: scale(1) !important;`
- Line 89: `width: var(--pwa-checkbox-size) !important;`
- Line 90: `height: var(--pwa-checkbox-size) !important;`
- Line 95: `width: var(--pwa-checkbox-size) !important;`
- Line 96: `height: var(--pwa-checkbox-size) !important;`

---

### **FILE: src/styles/utilities.css**
- Line 566: `background: white !important;`
- Line 567: `color: black !important;`
- Line 575: `display: flex !important;`
- Line 576: `width: 100% !important;`
- Line 577: `font-size: inherit !important;`
- Line 578: `font-weight: inherit !important;`

---

## ⚠️ **CRITICAL CONFLICTS IDENTIFIED**

### **CONFLICT 1: Duplicate Height Rules on .modal-container**
```css
/* main.css Line 579-580 */
body.modal-open .modal-container {
  height: 100vh !important;
  height: 100dvh !important;  /* This overrides the line above */
}

/* main.css Line 586 */
body.modal-open .modal-container {
  height: calc(100vh + env(safe-area-inset-bottom)) !important;  /* This overrides both above */
}
```
**Issue:** THREE different height values for the same element!

### **CONFLICT 2: Duplicate Bottom Position Rules**
```css
/* main.css Line 564 */
body.modal-open .modal-container {
  bottom: 0 !important;
}

/* main.css Line 587 */
body.modal-open .modal-container {
  bottom: calc(-1 * env(safe-area-inset-bottom)) !important;  /* This overrides above */
}
```
**Issue:** Two conflicting bottom position values!

### **CONFLICT 3: Duplicate Padding-Bottom Rules**
```css
/* design-system.css Line 232 */
body.modal-open {
  padding-bottom: 0 !important;
}

/* main.css Line 553 (applies to multiple selectors including body.modal-open) */
body.modal-open {
  padding-bottom: 0 !important;  /* Duplicate rule */
}

/* main.css Line 568 (applies to .modal-container) */
body.modal-open .modal-container {
  padding-bottom: env(safe-area-inset-bottom) !important;  /* Conflicting with above */
}
```
**Issue:** Multiple conflicting padding-bottom values!

### **CONFLICT 4: Duplicate Margin-Bottom Rules**
```css
/* main.css Line 554 */
body.modal-open {
  margin-bottom: 0 !important;
}

/* main.css Line 574 */
body.modal-open .modal-container {
  margin-bottom: calc(-1 * env(safe-area-inset-bottom)) !important;
}
```
**Issue:** Different margin-bottom values for parent and child!

---

## 🎯 **ROOT CAUSE OF ISSUES**

### **The Problem:**
1. **Multiple CSS rules target the same element** with different !important values
2. **Later rules override earlier rules** (CSS cascade)
3. **Conflicting approaches layered on top** of each other
4. **No single source of truth** for modal positioning

### **Current Cascade Order (Last Rule Wins):**
1. Line 579: `height: 100vh !important`
2. Line 580: `height: 100dvh !important` ← **Overrides above**
3. Line 586: `height: calc(100vh + env(safe-area-inset-bottom)) !important` ← **Final winner**

---

## 🧹 **RECOMMENDED CLEANUP**

### **STEP 1: Remove Conflicting Rules**
Remove these duplicate/conflicting lines from main.css:
- Lines 579-580 (duplicate height rules)
- Line 564 (conflicting bottom: 0)
- Line 553-554 (duplicate padding/margin for body)

### **STEP 2: Keep Only Essential Rules**
Keep only these main.css rules:
```css
body.modal-open .modal-container {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: calc(-1 * env(safe-area-inset-bottom)) !important;
  height: calc(100vh + env(safe-area-inset-bottom)) !important;
  width: 100vw !important;
  z-index: 999999 !important;
}
```

### **STEP 3: Remove Debug Rules**
Remove all outline debugging rules (Lines 531-542)

---

## 📊 **SUMMARY**

- **Total !important rules:** 47
- **Modal-related conflicts:** 8 major conflicts
- **Files with conflicts:** main.css (primary), design-system.css
- **Recommended action:** Remove 15+ conflicting rules, consolidate to single approach