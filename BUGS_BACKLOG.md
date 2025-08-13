Monk Mode Backlog (auto-generated seed)

- [E-001] Save flow: verify payload shape and persistence — FIXED
  - severity: high
  - repro: Add a session via `Edit Sessions` → Save. Observe network responses and DB rows.
  - files: `src/app/(admin)/edit-sessions/page.tsx`, `src/components/session-form.tsx`, `src/lib/supabase/client.ts`
  - fix: centralized person resolution `ensurePersonByNameOrId`, chunked participant inserts, added smoke tests for session + sub-sessions
  - commits: fix(engine) 326dc0c3, test(smoke) 1d56740e
  - tests: unit + component pass; smoke save passes against test DB

- [U-002] Subtalk row clickability/inputs overlap on small widths
  - severity: medium
  - repro: Add multiple subtalks; shrink width; try editing times and titles
  - files: `src/components/session-form.tsx`
  - fix: ensure focus states/z-index and width constraints
  - ETA: 2h
  - tests: component layout snapshot and keyboard navigation

- [P-003] People inline add: optimistic temp ids leak
  - severity: medium
  - repro: Enter a new name in a participant field → save → ensure person is created and used; no `temp:` left in DB
  - files: `src/components/session-form.tsx`, `src/app/(admin)/edit-sessions/page.tsx`
  - fix: guard and resolve names to ids consistently; assert post-save
  - ETA: 2-3h
  - tests: unit for ensurePerson; e2e saving with new person

- [S-004] Day selection regression after save
  - severity: low
  - repro: Switch day; add session; ensure selected day persists
  - files: `src/app/(admin)/edit-sessions/page.tsx`
  - fix: ensure `selectDay(prevSelectedDay)` runs reliably and not overridden by load
  - ETA: 1h
  - tests: component test toggling day and saving

- [E-005] Export: ensure `sessions_with_times` always has custom times fallback
  - severity: medium
  - repro: Create sessions with only custom times; export; verify times populated
  - files: `supabase/migrations/004_*`, `src/app/api/export/route.ts`
  - fix: confirm view fallback; add guard in transform
  - ETA: 1h
  - tests: unit for util; e2e hitting export


