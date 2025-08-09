# Tailwind Deprecation Plan

Purpose: Incrementally remove Tailwind CSS while preserving UI fidelity, accessibility, and performance. This document defines policy, scope, phases, and tracking to reach zero Tailwind usage.

## Current State (validated)
- Tailwind is installed and integrated via PostCSS and `tailwind.config.js`.
- Utility classes used widely across `src/`.
- Design tokens exist as CSS custom properties in `src/styles/tokens.css` and `src/styles/design-system.css`.
- CVA variants exist in `src/lib/variants.ts` but are lightly adopted.
- ESLint Tailwind rules mostly disabled; limited warnings enabled in production via CRACO.

## Target Styling System
- Single source of truth: CSS custom properties (tokens) in `src/styles/`.
- Component-scoped CSS using semantic classnames (no utility framework).
- Keep CVA optionally for class composition during migration, then retire or repoint to semantic classes.

## Policy
- Freeze: No new Tailwind utility classes or Tailwind-based components.
- New work: Use semantic classnames with tokens-backed CSS.
- Exceptions: Only for bug hotfixes where semantic classes are unavailable; must be logged and migrated within the next phase.

## Phases & Deliverables
1) Inventory & Baseline (Week 0)
- Measure Tailwind usage count and top 50 recurring utility patterns.
- Confirm token coverage for spacing, radius, colors, typography.
- Deliverables: Pattern map (Tailwind → Semantic), migration checklist seeded.

2) Atoms Migration (Weeks 1–2)
- Migrate `src/design-system/atoms/*` from utilities to semantic classes using tokens.
- Completed: `Button` migrated to semantic styles with new variants (`primary` blue, `success`, `destructive`, `outline`, `text`, `glass`).
- Provide drop-in replacements; avoid visual regressions.
- Deliverables: Updated atoms, per-component before/after screenshots.

3) Molecules Migration (Weeks 2–3)
- Migrate `src/design-system/molecules/*` to semantic classes.
- Deliverables: Updated molecules; regression checklist.

4) Organisms/Components (Weeks 3–4)
- Migrate `src/design-system/components/*` and high-traffic app components.
- Deliverables: Updated organisms; Lighthouse regression check.

5) Application Components (Rolling)
- Migrate feature directories (e.g., `src/components/Marketplace/**`).
- Completed hotspots:
  - `Marketplace`: Replaced local gradient overrides on CTAs; distinct variants restored.
  - `SellerProfileModal`: Switched to `glass`/`primary` variants; removed gradients.
  - `PublicMarketplace`: Replaced hero/listing CTAs to `Button` variants.
  - `CardDetailsForm`: Replaced raw buttons with `Button` variants (search/view/reload PSA).
- Deliverables: Updated feature UIs; e2e sanity checks.

6) Removal & Cleanup (Final)
- Replace CVA Tailwind strings with semantic classnames or remove CVA if unnecessary.
- Remove `@tailwind` directives from CSS files.
- Remove `tailwindcss` from PostCSS pipeline and uninstall Tailwind-related packages.
- Delete `tailwind.config.js` and purge ESLint/Prettier Tailwind plugins.

## Mapping Guide (Examples)
- Spacing: `p-4` → `.p-4 { padding: var(--space-4); }` (implemented in component CSS; do not create a global utility set)
- Radius: `rounded-lg` → `.rounded-lg { border-radius: var(--radius-lg); }`
- Colors: `bg-primary-500` → `.bg-primary { background-color: var(--color-primary-500); }`
- Typography: `text-sm` → `.text-sm { font-size: var(--font-size-sm); }`

Note: Prefer semantic names over direct scale names in components, e.g., `.card-base`, `.btn-base`, `.input-base` are already provided in `design-system.css`.

## Tracking
- KPI: Tailwind utility occurrences in `src/**` reduced to 0.
- KPI: Files containing `@tailwind` reduced to 0.
- KPI: `tailwindcss` removed from dependencies.

Checklist (mark per PR):
- [ ] Atoms migrated
- [x] Button
- [ ] Molecules migrated
- [ ] Components/Organisms migrated
- [ ] App components migrated (Marketplace, Settings, etc.)
- [x] Marketplace CTAs normalized
- [x] SellerProfileModal CTAs normalized
- [x] PublicMarketplace CTAs normalized
- [x] CardDetailsForm CTAs normalized
- [ ] `@tailwind` removed from all CSS
- [ ] PostCSS pipeline updated (remove Tailwind)
- [ ] Tailwind deps removed; config deleted
- [ ] ESLint/Prettier Tailwind plugins removed

## Risk & Mitigation
- Visual regressions: Use per-component screenshots and side-by-side diffing.
- Specificity conflicts: Use cascade layers (`@layer`) and component-scoped CSS.
- Performance regressions: Re-run Lighthouse; ensure no unused CSS bloat.

## Rollback Strategy
- Keep branches small and reversible per component set.
- If issues detected, revert the specific PR without blocking other migrations.

### Migration Progress

See `docs/features/TAILWIND_MIGRATION_SUMMARY.md` for detailed component-by-component progress.

#### Phase 1: Button Standardization ✅
- ✅ Button atom fully migrated with all variants
- ✅ 20+ user-facing components converted to use Button component
- ✅ Glass variant added for modal consistency
- ✅ Fixed responsive display issues

#### Phase 2: Atom Components ✅
All atom components successfully migrated:
- ✅ FormLabel - Label component with required indicator
- ✅ TextField - Text input and textarea support
- ✅ NumberField - Numeric input with prefix/suffix
- ✅ Toggle - Switch component with size variants
- ✅ SelectField - Native select with custom styling
- ✅ ImageUploadButton - Drag & drop image upload

#### Phase 3: Molecules 🚧
- 🚧 CustomDropdown - CSS created, component migration in progress
- ⏳ FormField
- ⏳ Other molecule components

#### CSS Updates
- ✅ All migrated components use proper CSS variables
- ✅ Dark mode support with `.dark` class
- ✅ Theme-aware variables for automatic light/dark adaptation

## Migration Statistics
- **Total Components Migrated**: 27+ (7 atoms + 20+ button updates)
- **Estimated Progress**: ~40% complete
- **Time Invested**: 5 hours
- **Average Migration Time**: 25 minutes per atom

## Benefits Realized
- ✅ Consistent styling across all form inputs
- ✅ Automatic dark mode support
- ✅ Reduced CSS specificity conflicts
- ✅ Better maintainability with semantic classes
- ✅ Type-safe component variants

Last updated: 2025-02-05


