# Design System Cleanup Log

**Date Started:** [Current Date]  
**Purpose:** Eliminate component library confusion and establish single source of truth in `src/design-system/`

## 📊 Current State Analysis

### Files Found That Need Action:
- `src/pages/ComponentLibrary/` (entire directory) - **DELETE**
- `src/pages/ComponentLibrary.js` - **DELETE**  
- `src/pages/ComponentLibrary.jsx` - **DELETE**
- `src/design-system/ComponentLibrary.js` - **DELETE**
- `src/components/ui/ModalButton.jsx` - **MIGRATE then DELETE**
- `src/components/ui/CustomDropdown.jsx` - **MIGRATE then DELETE**
- All other files in `src/components/ui/` - **DELETE** (unused)

### Dependencies Found:
- `ModalButton` is used by:
  - `src/design-system/components/SettingsModal.js` (line 7)
  - `src/design-system/components/CardDetailsModal.js` (line 4)
- `CustomDropdown` is used by:
  - `src/design-system/components/CardDetailsForm.js` (line 8)

### Route to Remove:
- `/component-library` route in `src/router.js` (lines 30, 238, 241)

---

## 🔄 Phase 1: Component Migration

### ModalButton Migration:
- [ ] Copy `src/components/ui/ModalButton.jsx` content
- [ ] Create `src/design-system/atoms/ModalButton.js`
- [ ] Convert from JSX to JS format
- [ ] Update import in `src/design-system/components/SettingsModal.js`
  - [ ] Change line 7: `import ModalButton from '../../components/ui/ModalButton';`
  - [ ] To: `import ModalButton from '../atoms/ModalButton';`
- [ ] Update import in `src/design-system/components/CardDetailsModal.js`
  - [ ] Change line 4: `import ModalButton from '../../components/ui/ModalButton';`
  - [ ] To: `import ModalButton from '../atoms/ModalButton';`
- [ ] Test ModalButton functionality

### CustomDropdown Migration:
- [ ] Copy `src/components/ui/CustomDropdown.jsx` content
- [ ] Create `src/design-system/molecules/CustomDropdown.js`
- [ ] Convert from JSX to JS format
- [ ] Update import in `src/design-system/components/CardDetailsForm.js`
  - [ ] Change line 8: `import CustomDropdown from '../../components/ui/CustomDropdown';`
  - [ ] To: `import CustomDropdown from '../molecules/CustomDropdown';`
- [ ] Test CustomDropdown functionality

---

## 🗑️ Phase 2: File Deletion

### ComponentLibrary Files:
- [ ] Delete `src/pages/ComponentLibrary/index.jsx`
- [ ] Delete `src/pages/ComponentLibrary/hooks/useComponentLibrary.js`
- [ ] Delete `src/pages/ComponentLibrary/hooks/useComponentNavigation.js`
- [ ] Delete `src/pages/ComponentLibrary/hooks/useColorCustomizer.js`
- [ ] Delete `src/pages/ComponentLibrary/components/` (entire directory)
- [ ] Delete `src/pages/ComponentLibrary/sections/` (entire directory)
- [ ] Delete `src/pages/ComponentLibrary/utils/` (entire directory)
- [ ] Delete `src/pages/ComponentLibrary/` (entire directory)
- [ ] Delete `src/pages/ComponentLibrary.js`
- [ ] Delete `src/pages/ComponentLibrary.jsx`
- [ ] Delete `src/design-system/ComponentLibrary.js`

### UI Components Directory:
- [ ] Delete `src/components/ui/ModalButton.jsx`
- [ ] Delete `src/components/ui/CustomDropdown.jsx`
- [ ] Delete `src/components/ui/breadcrumb.tsx`
- [ ] Delete `src/components/ui/button.tsx`
- [ ] Delete `src/components/ui/card.tsx`
- [ ] Delete `src/components/ui/checkbox.tsx`
- [ ] Delete `src/components/ui/dropdown-menu.tsx`
- [ ] Delete `src/components/ui/input.tsx`
- [ ] Delete `src/components/ui/label.tsx`
- [ ] Delete `src/components/ui/popover.tsx`
- [ ] Delete `src/components/ui/progress.tsx`
- [ ] Delete `src/components/ui/radio-group.tsx`
- [ ] Delete `src/components/ui/scroll-area.tsx`
- [ ] Delete `src/components/ui/select.tsx`
- [ ] Delete `src/components/ui/separator.tsx`
- [ ] Delete `src/components/ui/sheet.tsx`
- [ ] Delete `src/components/ui/switch.tsx`
- [ ] Delete `src/components/ui/tabs.tsx`
- [ ] Delete `src/components/ui/textarea.tsx`
- [ ] Delete `src/components/ui/toast.tsx`
- [ ] Delete `src/components/ui/toaster.tsx`
- [ ] Delete `src/components/ui/use-toast.ts`
- [ ] Delete `src/components/ui/` (entire directory)

### Router Updates:
- [ ] Remove line 30 in `src/router.js`: `const ComponentLibrary = lazy(() => import('./pages/ComponentLibrary'));`
- [ ] Remove lines 238-242 in `src/router.js`:
  ```
  {
    path: 'component-library',
    element: (
      <ComponentLibrary />
    ),
  },
  ```

---

## 🧪 Phase 3: Testing & Validation

### Functionality Tests:
- [ ] Test app starts without errors
- [ ] Test ModalButton in Settings modal
- [ ] Test ModalButton in Card Details modal  
- [ ] Test CustomDropdown in Card Details form
- [ ] Test navigation to removed component-library route returns 404
- [ ] Test no broken imports or missing dependencies
- [ ] Run `npm run build` to check for build errors

### Design System Validation:
- [ ] Verify only `src/design-system/` components are being used
- [ ] Confirm no remaining references to `src/components/ui/`
- [ ] Confirm no remaining references to ComponentLibrary files
- [ ] Verify Header component `isComponentLibrary` prop is no longer needed

---

## 📋 Final Cleanup

### Code Cleanup:
- [ ] Remove `isComponentLibrary` prop from Header component (lines 23, 121, 487 in `src/design-system/components/Header.js`)
- [ ] Remove any unused imports that were only used by ComponentLibrary
- [ ] Update any documentation that references the component library

### ESLint Fixes:
- [ ] Fix any new ESLint errors introduced by migration
- [ ] Remove any ESLint disable comments that are no longer needed

---

## ✅ Completion Checklist

- [ ] All ComponentLibrary files deleted
- [ ] All `src/components/ui/` files deleted  
- [ ] Essential components migrated to design system
- [ ] All imports updated to new locations
- [ ] App functionality tested and working
- [ ] No build errors
- [ ] Single source of truth established: `src/design-system/`

---

## 📝 Notes & Issues

*Add any issues encountered or important notes here*

---

**Status:** Not Started  
**Last Updated:** [Date]  
**Completed By:** [Name] 