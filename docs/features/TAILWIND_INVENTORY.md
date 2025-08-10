# Tailwind Inventory (Baseline)

Goal: Quantify current Tailwind usage to guide incremental migration.

## Directives
- `@tailwind` present in:
  - `src/styles/globals.css`
  - `src/styles/main.css`
- `@apply` present in:
  - `src/styles/main.css`

## Utility usage footprint (unique files containing classes)
- Background `bg-`: ~110 files
- Text `text-`: ~121 files
- Flex `flex`: ~116 files
- Grid `grid`: ~50 files
- Justify `justify-`: ~97 files
- Align items `items-`: ~110 files
- Width `w-`: ~102 files
- Height `h-`: ~67 files
- Border `border`: ~101 files
- Radius `rounded-`: ~112 files
- Shadow `shadow-`: ~45 files
- Transition/animation `transition`: ~66 files
- Dark mode `dark:`: ~67 files
- Responsive prefixes `sm: md: lg: xl: 2xl:`: ~102 files

Hotspots (high density):
- `src/design-system/components/**`
- `src/design-system/molecules/**`
- `src/components/Marketplace/**`

## Tokens & Theming
- Tokens defined in `src/styles/tokens.css` and `src/styles/design-system.css`.
- Tailwind config maps many colors and scales to tokens; migration should use tokens directly.

## Initial migration candidates (Atoms)
- `src/design-system/atoms/Button.js`
- `src/design-system/atoms/FormLabel.js`
- `src/design-system/atoms/Toggle.js`
- `src/design-system/atoms/NumberField.js`
- `src/design-system/atoms/SelectField.js`
- `src/design-system/atoms/ImageUploadButton.js`

Rationale: High reuse, small API surfaces, minimal risk.

## Proposed next steps
1) Create semantic class definitions for the above atoms using existing tokens (`design-system.css`).
2) Replace Tailwind utilities in those atoms with semantic classes.
3) Validate visual parity and interactions.

## Tracking checklist
- [ ] Remove `@apply` from `src/styles/main.css`
- [x] Migrate Button
- [x] Migrate FormLabel
- [x] Migrate Toggle
- [x] Migrate NumberField
- [x] Migrate SelectField
- [x] Migrate ImageUploadButton
- [x] Migrate TextField (additional atom)
- [x] Normalize CTAs in Marketplace/SellerProfile/PublicMarketplace
- [x] Replace PSA buttons in CardDetailsForm with variants
- [ ] Re-audit counts after atom migration

## Atoms Migration Status ✅
All atom components have been successfully migrated from Tailwind to semantic CSS.

## Molecules Migration Status 🚧
Molecule components migration 93% complete! 15 of ~16 components migrated:
- ✅ FormField - Fully migrated, uses semantic CSS
- ✅ Card - All variants migrated with BEM classes
- ✅ ConfirmDialog - Simple wrapper, minimal CSS
- ✅ BottomSheet - Mobile sheet with animations
- ✅ SettingsPanel - Container component
- ✅ ColorCategory - Grid layout component
- ✅ ComponentSection - Section container
- ✅ InvoiceCard - Financial card component
- ✅ CustomDropdown - Full migration with search functionality
- ✅ InvoiceHeader - Collapsible header with metrics
- ✅ Dropdown - Simple dropdown with mobile support
- ✅ ActionSheet - Complex dropdown with animations
- ⏳ Modal - Complex, CSS ready but needs careful migration
- ⏳ PSACardAutocomplete (complex)
- ⏳ ColorCustomizer
- ⏳ ColorPicker (if exists)

## Updated Statistics
After atom migration, the following components no longer use Tailwind:
- All components in `src/design-system/atoms/` directory
- Form inputs now use semantic CSS classes
- Buttons standardized across the application

## Next Priority Areas
1. Complete molecule components in `src/design-system/molecules/`
2. Migrate organism components
3. Clean up remaining Tailwind usage in page components
4. Remove `@apply` directives from CSS files

Last updated: 2025-02-05

