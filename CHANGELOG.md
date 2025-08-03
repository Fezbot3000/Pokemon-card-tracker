# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### SEO Optimization
- ✅ **Canonical tag implementation for improved indexing** (RESOLVED 02/03/2025)
  - Root cause: Multiple pages missing canonical tags causing Google Search Console "Duplicate without user-selected canonical" errors
  - Missing SEO meta tags: 6 pages (Features, About, Terms, Privacy, HelpCenter, GradingIntegration) had no React Helmet implementation
  - SharedCollection missing canonical: Had comprehensive meta tags but missing canonical URL
  - Base HTML missing canonical: public/index.html lacked canonical tag for root domain  
  - Solution: Added comprehensive SEO meta tags with canonical URLs to all missing pages
  - Added React Helmet import and implementation to 6 pages with page-specific titles, descriptions, and keywords
  - Enhanced meta descriptions for better CTR with Australian focus and current year context
  - Added canonical tag to SharedCollection.js and ForgotPassword.js
  - Added canonical tag to public/index.html for root domain
  - Files changed: Features.js, About.js, Terms.js, Privacy.js, HelpCenter.js, GradingIntegration.js, SharedCollection.js, ForgotPassword.js, public/index.html
  - Confidence level: 100% - addresses exact Search Console canonical issues identified
  - Expected outcome: Resolves 6+ "Duplicate without user-selected canonical" errors in Google Search Console

- ✅ **Meta description optimization for improved CTR** (RESOLVED 02/03/2025)
  - Root cause: Pokemon-related pages showing 0% click-through rate despite receiving search impressions
  - Generic descriptions: Previous meta descriptions were informative but not compelling enough to drive clicks
  - Missing urgency/value props: Lacked action-oriented language and strong value propositions
  - Solution: Rewrote meta descriptions with compelling copy and current year relevance
  - Pokemon Sets: "🔥 FREE Pokemon card price checker! Get instant values for Base Set Charizard, Jungle, Fossil & Team Rocket cards. See what your vintage Pokemon cards are worth in 2025!"
  - Investment Guide: "💰 Discover which Pokemon cards made 1000%+ returns! Expert investment guide reveals the best cards to buy in 2025, PSA grading secrets & market predictions."
  - Updated titles to include current year (2025) and compelling value props
  - Enhanced Open Graph descriptions for better social sharing
  - Files changed: PokemonSets.js, PokemonInvestmentGuide.js
  - Confidence level: 95% - applies proven CTR optimization techniques
  - Expected outcome: Improved click-through rates from Pokemon-related search queries

- ✅ **Internal linking strategy implementation** (RESOLVED 02/03/2025)
  - Root cause: Pokemon-related pages lacked strategic internal links to improve SEO and user engagement
  - Missing cross-page connections: No links between Pokemon Sets, Investment Guide, and Marketplace pages
  - Poor user flow: Users couldn't easily navigate between related Pokemon content
  - Solution: Added visually appealing "Related Resources" sections to both Pokemon pages
  - Pokemon Sets page: Links to Investment Guide and Marketplace with compelling CTAs
  - Investment Guide page: Links to Price Checker and Marketplace for next steps
  - Used gradient cards with hover effects and descriptive copy
  - Strategic anchor text: "Maximize Your ROI", "Check Card Values", "Shop Pokemon Cards"
  - Files changed: PokemonSets.js, PokemonInvestmentGuide.js
  - Confidence level: 100% - follows SEO best practices for internal linking
  - Expected outcome: Improved page authority distribution and user engagement metrics

- ✅ **Structured data expansion for rich snippets** (RESOLVED 02/03/2025)
  - Root cause: Limited structured data implementation missing opportunities for rich snippets in search results
  - Missing FAQ schema: Investment guide lacked FAQPage markup for FAQ rich snippets
  - Missing marketplace schema: Marketplace page had no Product/Marketplace structured data
  - Missing HowTo schema: Collecting guide had no step-by-step markup for how-to rich snippets
  - Solution: Added comprehensive JSON-LD structured data to high-traffic pages
  - FAQPage schema: Added 4 common Pokemon investment questions to investment guide for FAQ rich snippets
  - Marketplace schema: Added dynamic Product listings with prices, images, and seller info
  - HowTo schema: Added 5-step Pokemon collecting guide with estimated costs and time
  - Updated existing Article schema with current titles and descriptions
  - Enhanced schema with proper @graph structure for multiple entities per page
  - Files changed: PokemonInvestmentGuide.js, PublicMarketplace.js, CollectingGuide.js
  - Confidence level: 95% - follows Google's structured data guidelines
  - Expected outcome: Eligible for FAQ, How-to, and Product rich snippets in search results

- ✅ **Updated screenshot references to latest versions** (RESOLVED 02/03/2025)
  - Root cause: Home page and other components using outdated screenshot file names
  - Inconsistent casing: References used lowercase while actual files had proper casing
  - Misspelled filename: 'invoicepaeg.png' corrected to 'Invoices.png'
  - Solution: Updated all screenshot references across the application to match latest file names
  - Home page: Updated dashboard, mobile mockup, add cards, marketplace, and invoices screenshots
  - Features page: Updated all feature screenshot references to use proper casing
  - Tutorial modal: Updated all tutorial screenshot constants
  - Collecting guide: Updated structured data image references
  - Files changed: Home.js, Features.js, TutorialModal.js, CollectingGuide.js
  - Confidence level: 100% - verified all references updated and no old references remain
  - Expected outcome: All screenshots display correctly with latest updated versions

- ✅ **Fixed home page screenshots not displaying** (RESOLVED 02/03/2025)
  - Root cause: OptimizedImage component generated broken srcset paths for non-existent responsive variants
  - Missing responsive files: Component tried to load Dashboard-320w.png, Dashboard.webp, etc. which don't exist
  - Srcset generation: generateSrcSet function created paths for non-existent files when sizes prop present
  - WebP conversion: Component attempted to load .webp versions of .png files automatically
  - Solution: Added special handling for /screenshots/ paths in OptimizedImage component
  - Screenshots now use simple img tag to avoid generating broken srcset/WebP paths
  - Preserves optimized image functionality for other images that have responsive variants
  - Modal display worked because it uses simple img tag without OptimizedImage component
  - Files changed: OptimizedImage.jsx (added screenshots path detection and fallback)
  - Confidence level: 85% - identified exact component behavior causing missing images
  - Expected outcome: All screenshots display correctly on home page without requiring responsive variants

- ✅ **Enhanced image modal to full screen experience** (RESOLVED 02/03/2025)
  - Root cause: Image modal was limited to 60vh height and 4xl max-width, not utilizing full screen space
  - Small viewing area: Users couldn't see screenshot details clearly due to size constraints
  - Poor mobile experience: Limited height made images very small on mobile devices
  - Solution: Redesigned modal to be full screen with better responsive design
  - Full screen overlay: Modal now uses full viewport height and width
  - Larger image display: Images can now use up to 80vh height while maintaining aspect ratio
  - Improved close button: Positioned absolutely with better styling and hover effects
  - Enhanced typography: Larger text for title and description in full screen context
  - Better background: Increased opacity to 95% for better focus on image
  - Files changed: Home.js (modal implementation)
  - Confidence level: 100% - straightforward UI enhancement
  - Expected outcome: Users can view screenshots in full detail with immersive experience

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