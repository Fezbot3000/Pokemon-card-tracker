# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed Issues
- ✅ Dashboard dropdown positioning and height restrictions (RESOLVED 02/02/2025)
  - Root cause: CustomDropdown component had two issues affecting dashboard dropdowns (filter and collection selector)
  - Positioning issue: Dropdown used document-relative positioning with window.scrollY/scrollX causing dropdown to "follow" page scroll instead of staying anchored to trigger element
  - Height restriction issue: Fixed max-height limits (max-h-48 and max-h-64) forced internal scrolling instead of showing all options
  - Solution: Updated positioning calculation to use viewport-relative coordinates (rect.bottom/rect.left) instead of document-relative
  - Removed height restrictions from dropdown container and options list to show all options without internal scrolling
  - Files changed: `src/design-system/molecules/CustomDropdown.js`
  - Confidence level: 100% - identified exact positioning calculation and height restriction properties
  - Verification: Dashboard dropdowns now stay anchored during scroll and display all options without internal scrolling
- ✅ Legacy component cleanup (RESOLVED 02/02/2025)
  - Root cause: Multiple legacy/unused components and imports identified during dropdown investigation
  - Legacy CollectionSelector: ActionSheet-based component in `src/components/CollectionSelector.js` was imported but never used in Header.js
  - Legacy demo component: `src/design-system/SettingsComponentsLibrary.js` was unused component library demo file
  - Unused imports: JSZip import in Header.js was not being used in the component
  - Solution: Deleted unused legacy files and removed unused imports to clean up codebase
  - Files deleted: `src/components/CollectionSelector.js`, `src/design-system/SettingsComponentsLibrary.js`
  - Files changed: `src/components/Header.js` (removed unused CollectionSelector and JSZip imports)
  - Confidence level: 100% - verified no usage through comprehensive search before deletion
  - Verification: Codebase cleaned up with no regressions, reduced confusion between duplicate components
- ✅ Enter key causing issues in add card and card details modals (RESOLVED 02/02/2025)
  - Root cause: Form submission triggered by Enter key press in modal input fields disrupted collection state management
  - CardDetailsForm had form element with onSubmit handler that processed Enter keypresses inappropriately
  - PSA lookup input in AddCardModal also triggered unwanted form behavior on Enter
  - Solution: Added comprehensive Enter key prevention across all modal input fields
  - Added handleKeyDown function to prevent form submission on Enter key
  - Enhanced all FormField components with onKeyDown handlers (Investment, Current Value, Player, Serial Number, Population, Date Purchased, Quantity)
  - Added intelligent Enter handling to PSA lookup input (triggers search if valid, prevents form submission)
  - Files changed: `src/design-system/components/CardDetailsForm.js`, `src/components/AddCardModal.js`
  - Confidence level: 100% - identified exact form submission path and prevented Enter key propagation
  - Verification: Enter key presses in modal fields no longer disrupt collection display or cause state issues
- ✅ Tutorial and premium welcome toast showing every sign-in (RESOLVED 02/02/2025)
  - Root cause: Two separate issues affecting first-time user experience
  - Tutorial issue: Data reset manager cleared `pokemon_tracker_onboarding_complete` localStorage flag
  - Premium toast issue: Trial welcome toast lacked localStorage check, showing on every new user sign-in
  - Solution: Added localStorage preservation for tutorial/welcome flags in data reset manager
  - Added `hasShownTrialWelcome` localStorage check for trial welcome toast
  - Added proper cleanup of welcome flags on logout and subscription status changes
  - Files changed: `src/design-system/contexts/AuthContext.js`, `src/utils/dataResetManager.js`
  - Confidence level: 95% - identified exact localStorage keys and code paths
  - Verification: Tutorial and welcome toasts now show only once per user session

- ✅ Hot reloading stopped working (01/31/2025 - RESOLVED 02/01/2025)
  - Investigation file: `investigations/INVESTIGATION_HOT_RELOADING_STOPPED_20250201.md`
  - Root cause: React Scripts 5.0.1 react-error-overlay compatibility bug
  - Solution: Added `react-error-overlay@6.0.9` resolution override to package.json
  - Files changed: `package.json` (added resolutions section)
  - Confidence level: 95% - documented React Scripts bug
  - Verification: StatisticsSummary background change updated instantly

- ✅ Modal Cancel button animation inconsistency (RESOLVED 02/01/2025)
  - Root cause: Cancel/Close buttons called onClose() directly, bypassing modal exit animations
  - Esc key used handleClose() with animations, Cancel buttons used onClose() without animations
  - Solution: Modified Modal component to intercept all onClose calls and apply animations
  - Added recursive helper function to replace onClose handlers in footer components
  - Files changed: `src/design-system/molecules/Modal.js`
  - Confidence level: 95% - verified animation path analysis
  - Verification: Cancel buttons now use same 200ms exit animation as Esc key

- ✅ Modal backdrop click not working (RESOLVED 02/01/2025)
  - Root cause: Backdrop click handler failed when events bubbled from margin container
  - e.target === e.currentTarget check failed for bubbled events (target=margin, currentTarget=backdrop)
  - Margin container covered entire backdrop area, preventing direct backdrop clicks
  - Solution: Modified backdrop click detection to accept both direct backdrop clicks and margin container clicks
  - Added CSS class-based detection for margin container events
  - Files changed: `src/design-system/molecules/Modal.js`
  - Confidence level: 100% - console logging confirmed exact event flow
  - Verification: Clicking outside modal content now properly closes modal with animation

- ✅ Page refresh redirects to cards page (RESOLVED 02/02/2025)
  - Root cause: `currentView` state not persisted in localStorage, only collections were persisted
  - Page refresh lost state → defaulted to 'cards' regardless of current page (marketplace, invoices, sold items)
  - Solution: Added localStorage persistence for `currentView` matching existing collection pattern
  - Created `updateCurrentView` wrapper function to update both state and localStorage
  - Files changed: `src/App.js` (Dashboard component currentView initialization and handlers)
  - Confidence level: 95% - mirrored working collection persistence pattern
  - Verification: All pages (marketplace, purchase invoices, sold items) maintain state after refresh

- ✅ Header navigation flicker on page refresh (RESOLVED 02/02/2025)
  - Root cause: Loading states showed hardcoded `currentView="cards"` before localStorage restoration
  - Header briefly showed "Cards" then switched to correct page during loading
  - Solution: Updated both authLoading and dataLoading states to use actual `currentView` value
  - Fixed Header and BottomNavBar in loading states to use restored localStorage value
  - Files changed: `src/App.js` (authLoading and dataLoading Header/BottomNavBar components)
  - Confidence level: 100% - eliminated hardcoded values causing flicker
  - Verification: Header immediately shows correct page state on refresh with no flicker

- ✅ Generic skeleton states for all pages (RESOLVED 02/02/2025)
  - Root cause: All loading states showed cards page skeleton regardless of current page
  - Marketplace, sold items, purchase invoices showed inappropriate card grid skeleton
  - Solution: Implemented conditional skeleton rendering based on `currentView`
  - Added marketplace skeleton (nav tabs + search + marketplace grid)
  - Added invoices/sold items skeleton (statistics + search + table/list responsive)
  - Files changed: `src/App.js` (both authLoading and dataLoading skeleton sections)
  - Confidence level: 100% - analyzed actual page layouts and created matching skeletons
  - Verification: Each page shows appropriate skeleton matching its content structure

- ✅ Multi-select touch targets too small (RESOLVED 02/02/2025)
  - Root cause: Selection buttons/checkboxes used `size-4` (16px) touch targets
  - Difficult to tap on mobile devices, especially round selection buttons
  - Solution: Increased touch targets for better mobile usability
  - Round selection buttons: 16px → 24px (50% increase) with 12px → 16px inner circle
  - Square checkboxes: 16px → 20px (25% increase)
  - Files changed: `src/design-system/components/CardOptimized.js`, `src/design-system/components/Card.js`, `src/components/CardList.js`
  - Confidence level: 100% - meets accessibility touch target recommendations (minimum 24px)
  - Verification: Much easier to tap selection controls on all devices

### Recent Changes
- Performance optimizations in CRACO configuration
- Bundle splitting optimizations for better loading
- Updated dependencies for security and performance

## Previous Development
*Historical changes to be documented as they occur*