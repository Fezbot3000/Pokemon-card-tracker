# Architecture Remediation Plan

Date: 2025-08-08
Version: 1.0
Owner: Engineering

## Objectives & Success Criteria

- Consolidate state to a single source of truth for cards, eliminate duplicate listeners and scroll-reset cascades
- Decompose large modules for maintainability (notably `src/App.js`)
- Unify Firebase initialization to a single canonical module
- Establish a minimal, fast automated test suite (unit + critical integration)
- Align docs with current architecture; quarantine/remove legacy pieces
- Maintain or improve performance (90+ PSI) and SEO (100% PSI SEO) and keep security posture at least as strict as today

Success criteria (must meet all):
- No duplicate Firestore listeners for card state; scroll position remains stable across saves/mutations
- `src/App.js` size reduced and responsibilities split without regressions
- All Firebase consumers import from one canonical file; no config drift
- Tests: ≥60% overall, ≥80% on repositories/services and critical flows; CI green on PRs
- PSI performance ≥90, SEO = 100 on key pages (Home, Marketplace, Dashboard)

---

## Pre-Implementation Checklist

- Create a dedicated remediation branch and tag current main for rollback
- Enable feature flags for state migration (e.g., `REACT_APP_USE_CARDCONTEXT_SOURCE`)
- Record current baselines: PSI scores, bundle sizes (`npm run analyze`), and scroll behavior
- Ensure Firebase emulators available for local rule checks (manual)

---

## Workstreams

### 1) State Consolidation: Card state → CardContext (Single Source of Truth)

**Problem**
- `CardContext` and `useCardData` both subscribe to Firestore → double `setCards()` cascades and scroll resets (see `docs/architecture/STATE_MANAGEMENT_ANALYSIS.md`).

**Plan**
- Make `CardContext` the only state owner for cards/collections. Use the existing compatibility layer (`src/contexts/CardContextCompatibility.js`) as a migration bridge to minimize breaking changes. Replace `useCardData` consumers gradually with selector hooks that read from `CardContext`. Remove duplicate listeners once migration is complete.

**Steps**
1. Create selector hooks in `src/contexts/CardContext.js` exports:
   - `useCards()`, `useCollections()`, `useCardActions()` (add/update/delete)
2. Route existing consumers through `CardContextCompatibility` (bridge) behind a feature flag to preserve signatures while internally delegating to `CardContext`.
3. Migrate components incrementally from the bridge to direct selector hooks; remove `useCardData` listener side-effects.
4. Ensure repository listeners fire once (in provider) and update context state only.
5. Verify scroll stability on updates (`CardList`, details modals, move operations).

**Affected**
- `src/contexts/CardContext.js`
- Components currently using `useCardData` (see `docs/architecture/STATE_MANAGEMENT_ANALYSIS.md` mapping)
- `src/repositories/CardRepository.js`

**Dependencies**: None (internal refactor)

**Acceptance**
- Only one live Firestore subscription for cards per user session
- Save/update/delete no longer cause pagination/scroll resets

**Risk/Rollback**
- Low risk; keep `useCardData`/compatibility bridge behind a feature flag for one release, then remove.

---

### 2) Decompose `src/App.js`

**Problem**
- `src/App.js` is oversized and multi-responsibility, raising cognitive load and hindering testability.

**Plan**
- Extract into a small shell + feature views; keep router imports stable. Preserve the named exports expected by the router (`Dashboard`, `DashboardIndex`) or update the router in the same change.

**Steps**
1. Create `src/dashboard/`:
   - `DashboardShell.jsx` (was `Dashboard`): context glue, layout, bottom nav, outlet handling
   - `DashboardIndex.jsx` (was `DashboardIndex`): view composition, passes props from context
   - `views/` folder for `cards`, `sold-items`, `marketplace`, `settings` leaf views as focused components
2. Add `src/dashboard/index.js` that re-exports `{ Dashboard }` and `{ DashboardIndex }` from the new files to preserve router compatibility; alternatively, update `src/router.js` lazy imports in the same edit.
3. Remove dead code from `src/App.js` (retain only export proxies during migration, then delete).

**Affected**
- `src/App.js`
- `src/router.js`
- New files under `src/dashboard/`

**Dependencies**: State consolidation (workstream 1) recommended first

**Acceptance**
- `src/App.js` shrinks to near-zero or is removed; app behavior unchanged

**Risk/Rollback**
- Moderate; migrate incrementally by moving one view at a time and verifying routes.

---

### 3) Firebase Initialization Unification

**Problem**
- Multiple Firebase modules (`src/firebase.js`, `src/services/firebase.js`, `src/firebase-lazy.js`) risk configuration drift.

**Plan**
- Choose a single canonical module (recommended: `src/services/firebase.js`) to export `db`, `auth`, `storage`, `functions`, and providers. Ensure Firestore is initialized with the same persistence/cache settings currently configured (e.g., `initializeFirestore` with `CACHE_SIZE_UNLIMITED`). Keep a thin optional `-lazy` helper that re-exports from the canonical instance only.

**Steps**
1. Confirm `src/services/firebase.js` as canonical; ensure env sourcing via `getFirebaseConfig()` is correct.
2. Update the canonical module to use `initializeFirestore(app, { cache: { sizeBytes: CACHE_SIZE_UNLIMITED } })` (or equivalent) to preserve current offline/persistence behavior.
3. Replace all imports of `../firebase` and `../firebase-lazy` with `../services/firebase` (programmatic search).
4. Convert `firebase-lazy.js` to re-export from the canonical instance (no duplicate initializeApp calls).
5. Deprecate/remove `src/firebase.js` after consumers are migrated.

**Affected**
- `src/services/firebase.js`
- `src/firebase.js`
- `src/firebase-lazy.js`
- Any file importing Firebase services

**Dependencies**: None

**Acceptance**
- Only one initialization path; no duplicate apps in devtools; all consumers compile

**Risk/Rollback**
- Low; can restore previous imports if needed.

---

### 4) Testing Foundation (Unit + Integration)

**Problem**
- Minimal automated tests; guardrails needed. Test runner already exists (`craco test` with CRA/Jest); we need to add libraries and write tests.

**Plan**
- Add targeted unit tests for repositories/services and integration tests for critical UI flows (auth guard, cards list pagination, marketplace message send).

**Dependencies to add (dev)**
- `@testing-library/react` ^14
- `@testing-library/user-event` ^14
- `msw` ^2 (mock Firebase HTTPS functions and REST where needed)
- `jest-extended` ^4 (optional)
- `eslint-plugin-testing-library` ^6 and `eslint-plugin-jest-dom` ^5 (optional)

**Suggested commands**
```bash
npm i -D @testing-library/react @testing-library/user-event msw jest-extended eslint-plugin-testing-library eslint-plugin-jest-dom
```

**Steps**
1. Configure `setupTests.js` to include `jest-extended` and `msw` server.
2. Unit tests:
   - `src/repositories/CardRepository.test.js`: read/write paths, index fallback, timestamp conversion
   - `src/services/psaSearch.test.js`: cache behavior, function call path
3. Integration tests:
   - Auth guard (`ProtectedRoute`) redirect when unauthenticated
   - Card list pagination/scroll stability on update (mock repository with msw or test double)
   - Marketplace message send calls cloud function and updates UI state
4. Add `npm test` to CI (GitHub Actions) with JSDOM env.

**Acceptance**
- ≥60% overall, ≥80% on repositories/services and the above critical flows

---

### 5) Error Handling Policy Refinement

**Problem**
- `ErrorBoundary` auto-reload for chunk errors may mask recoverable states; a few code quality nits in fallback.

**Plan**
- Make reload opt-in (button) with guidance; log to monitoring service optionally (Sentry).

**Optional dependencies (prod)**
- `@sentry/react` ^7, `@sentry/tracing` ^7

**Steps**
1. Clean up fallback component and ensure type-safe checks.
2. Gate auto-reload behind a small countdown + cancel.
3. Optional: wire Sentry init in `src/index.js` for production builds only.

**Acceptance**
- No silent masking of errors; actionable UX and logs present

---

### 6) Performance & SEO Hygiene

**Plan**
- Keep route-based code splitting; add canonical tags via Helmet on dynamic pages; run bundle analysis periodically.

**Steps**
1. Add `<link rel="canonical" />` via `react-helmet-async` to dynamic routes (e.g., Marketplace listing, SharedCollection, PokemonSets).
2. Run `npm run analyze` after major refactors; review largest chunks and shared deps.
3. Validate lazy image hooks and ensure placeholders are lightweight; prefer WebP assets where possible.

**Acceptance**
- PSI Performance ≥90 and SEO = 100 on Home, Marketplace, Dashboard

---

### 7) Security Rules Tidy

**Plan**
- Keep least-privilege; reduce overlapping matchers in Storage rules for clarity; document listing paths actually used by the app.

**Steps**
1. Consolidate `images/` vs `users/{userId}/cards` matchers to the paths used in `CardRepository` and upload endpoints.
2. Add comments clarifying intended clients and operations.
3. Re-run Firebase emulator tests (manual) to validate rule coverage.

**Acceptance**
- Rules remain functionally equivalent but easier to reason about; no broadened access.

---

### 8) Documentation Alignment & Legacy Cleanup

**Plan**
- Remove references to secondary `components/ui` system if no longer present; mark legacy files for deletion; align routing docs with current files.

**Steps**
1. Update `docs/architecture/COMPONENT_HIERARCHY.md` and `docs/audits/COMPONENT_ARCHITECTURE_AUDIT.md` to reflect current single-system usage.
2. Mark `src/AppContent.js` (if present) as legacy; remove after verifying no imports.
3. Update `docs/architecture/ROUTING_STRUCTURE.md` once `App.js` is decomposed.

**Acceptance**
- Docs accurately reflect the live architecture; no stale guidance that creates confusion.

---

### 9) CI, Metrics & Developer UX

**Plan**
- Add a lightweight CI workflow that runs build and tests; track metrics per Development Rules.

**Steps**
1. Create GitHub Actions workflow:
   - Install, type-check (`npm run type-check`), lint (`npm run lint`), test (`npm test -- --watch=false`), build (`npm run build`).
2. Add `docs/maintenance/METRICS.md` updates process to log time, rework cycles, and gate adherence.

**Acceptance**
- CI must pass on PRs; METRICS updated per flow.

---

## Sequencing Plan

1) State Consolidation (Workstream 1)
2) Firebase Unification (Workstream 3)
3) `App.js` Decomposition (Workstream 2)
4) Testing Foundation (Workstream 4)
5) Error Handling Refinement (Workstream 5)
6) Performance & SEO Hygiene (Workstream 6)
7) Security Rules Tidy (Workstream 7)
8) Documentation Alignment (Workstream 8)
9) CI & Metrics (Workstream 9)

Rationale: reduce runtime bugs first (state), ensure config single-source (Firebase), then improve maintainability (App split), followed by guardrails (tests) and hygiene tasks.

---

## Dependency Changes (Proposed)

Dev Dependencies
- `@testing-library/react` ^14
- `@testing-library/user-event` ^14
- `msw` ^2
- `jest-extended` ^4 (optional)
- `eslint-plugin-testing-library` ^6 (optional)
- `eslint-plugin-jest-dom` ^5 (optional)

Prod (Optional)
- `@sentry/react` ^7
- `@sentry/tracing` ^7

No runtime framework changes required.

---

## Rollback Strategy

- Keep feature flags for state consolidation (`USE_CARDCONTEXT_SOURCE=true/false`) for one release window.
- Maintain branch with pre-decomposition `App.js` to rapidly revert.
- For Firebase unification, keep alias file (deprecated module re-exporting canonical services) for one release; remove after telemetry confirms no usage.

---

## Validation Checklist

- [ ] Only one card subscription active; updates preserve scroll
- [ ] App loads and navigates normally after `App.js` split
- [ ] All Firebase imports reference canonical module; no duplicate app instances
- [ ] Tests meet coverage targets and pass in CI
- [ ] PSI performance ≥90 and SEO = 100 on key pages
- [ ] Security rules clarified without widened access
- [ ] Docs reflect the new structure; legacy removed
- [ ] CI pipeline green on PRs

---

## Appendix: Suggested Commands (Do not run without approval)

Install dev testing deps
```bash
npm i -D @testing-library/react @testing-library/user-event msw jest-extended eslint-plugin-testing-library eslint-plugin-jest-dom
```

Bundle analysis
```bash
npm run analyze
```

Build & test
```bash
npm run type-check && npm run lint && npm test && npm run build
```

---

## Progress Log

- Created feature flags (`src/config/featureFlags.js`) and unified hook (`src/hooks/useCardsSource.js`) to toggle state source; `src/App.js` now uses the unified hook
- Added canonical Firebase module preserving persistence (`src/services/firebase-unified.js`) and updated `src/firebase-lazy.js` to reuse it
- Migrated low-risk consumers to unified Firebase:
  - `src/services/firestore/firestoreService.js` (db, auth)
  - `src/services/firestore/dbAdapter.js` (storage)
  - `src/services/sharingService.js`, `src/services/psaDataService.js` (db)
  - `src/components/CollectionSharing.js`, `src/components/SharedCollection.js`, `src/components/Marketplace/SellerReviewModal.js` (db)
- Router now lazy-loads dashboard from `src/dashboard` proxies; added proxy re-exports to enable safe decomposition
- Fixed a parsing error in `useCardData` (commented debug snippet) and added a minimal smoke test


