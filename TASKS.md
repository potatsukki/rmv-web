# RMV Customer Workspace Redesign

> Work is performed directly in the existing `main` working tree. No commit, push, or deployment is part of this redesign.

## Status legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Complete
- `[!]` Needs follow-up

## Phase 1 — Design contract and dark foundation

- [x] Append the workspace source of truth to `DESIGN.md`.
- [x] Create permanent authenticated dark-theme tokens and remove the customer-facing theme selector.
- [x] Preserve the legacy Appearance URL through a redirect.
- [x] Update theme-related regression coverage.

## Phase 2 — Shared workspace system

- [x] Refresh the authenticated sidebar and top bar while preserving the existing responsive mobile navigation.
- [x] Create consistent workspace page headers, panels, filters, lists, statuses, and state views.
- [x] Preserve global search, unread notifications, profile actions, role navigation, and accessibility behavior.

## Phase 3 — Customer experience

- [x] Redesign Dashboard with factual customer metrics and activity.
- [x] Redesign Notifications, Appointments, Projects, and Payments for customer workflows.
- [x] Apply shared workspace styling to existing customer detail, blueprint, payment, and account surfaces through the permanent workspace tokens and shared components.
- [x] Preserve non-customer operational workflows and API behavior.

## Phase 4 — Verification

- [x] Run TypeScript/build and available test suites.
- [-] Review desktop, tablet, and mobile layouts in the browser.
- [x] Verify keyboard interaction, loading/empty/error states, and dark-only rendering.
- [-] Record remaining issues and final results below.

## Validation log

- 2026-07-26: Scope confirmed. Existing worktree is intentionally dirty and will be preserved.
- 2026-07-26: `npm test` passed (8 files, 41 tests); `npm run test:contrast` passed (9 tests); `npm run build` passed.
- 2026-07-26: Signed-in customer dashboard and payments route verified in the local browser. Dashboard shows the new shell, factual zero-state metrics, real navigation, and no console errors.
- 2026-07-26: Browser contrast audit could not complete because its isolated Playwright session did not reach the required authenticated route within its login timeout. This does not affect the signed-in manual browser verification.
