Scientific Program — System Orchestrator (single source of truth)

Single-line summary: Next.js app with client-side Supabase writes/reads, realtime sync, and an export API; core data: days, halls, time slots, sessions, sub-sessions, participants, and people.

Component → endpoint → DB mapping

- Edit Sessions UI (`src/app/(admin)/edit-sessions/page.tsx`)
  - Reads: `conference_days`, `stages`, `halls_with_days` (view), `day_time_slots`, `sessions` (+ joined via `supabaseUtils.getSessionQuery()`), `speakers`
  - Writes: `conference_days`, `stages`, `day_halls`, `day_time_slots`, `sessions`, `session_participants`, `sub_sessions`
  - Realtime: subscribes to `sessions`, `sub_sessions`, `session_participants`, `stages`, `conference_days`, `day_time_slots`, `day_halls` via `src/lib/supabase/realtime.ts`

- Session Form (`src/components/session-form.tsx`)
  - Provides desktop-focused create/edit form; inlined person add supported (optimistic); subtalks authoring.
  - Delegates save to Edit Sessions page `handleSubmitSession`.

- Participants (People Master) (`src/app/(admin)/participants/page.tsx`)
  - Reads: `speakers`
  - Writes: `speakers` (CSV bulk insert/delete), duplicate-handling, export CSV

- Public Program (`src/app/public-program/page.tsx`)
  - Reads: `sessions` (via consistent query), transformations from `supabaseUtils`

- Export API (`src/app/api/export/route.ts`)
  - Reads: `sessions_with_times` view, `speakers`
  - Emits: Excel workbook by day

Supabase schema (tables/views)

- Tables: `conference_days`, `stages`, `day_halls`, `day_time_slots`, `sessions`, `session_participants`, `speakers`, `sub_sessions`, `session_types`
- Views: `sessions_with_times`, `halls_with_days`, `sessions_with_sub_sessions` (migrations), `sub_sessions_with_people` (SQL helper)

Data flow map (UI → state → API → Supabase → DB rows → export)

1) Edit Sessions UI → local state (day/hall/slot/session selections) → direct Supabase client calls → rows in `sessions`, `session_participants`, `sub_sessions` (+ helpers) → realtime updates reflect across app → Export API reads `sessions_with_times` and flattens to Excel.
2) People Master → reads/writes `speakers` with client-side dedupe; inline-add from Session Form inserts into `speakers` when needed.

Tyre/engine/suspension/doors/seats mapping

- Tyres (UI hit areas & layout): `src/components/session-form.tsx`, `src/app/(admin)/edit-sessions/page.tsx` timeline table, `ui/*`
- Engine (Save flow & DB writes): `handleSubmitSession` in `src/app/(admin)/edit-sessions/page.tsx` (sessions, participants, subtalks), People CSV upload
- Suspension (state & reactivity): local React state, `realtimeService` subscriptions
- Doors (routes & navigation): `src/app/(admin)/*`, `src/app/public-*`, API routes under `src/app/api/*`
- Seats (forms & UX): `SessionForm`, combobox/time-picker components, accessibility affordances

Health checks

- Build: `npm run build`
- Lint: `npm run lint`
- Orchestrator (quick): `npm run orchestrator:status`
- Orchestrator (targeted): `npm run orchestrator:check -- <component>` (components: engine|tyres|suspension|doors|seats|people)
- Save smoke test (server-side, uses service role): `npm run smoke:save`
- SQL spot checks (run in Supabase SQL editor):
  - `select count(*) from sessions;`
  - `select * from sessions_with_times limit 3;`
  - `select * from halls_with_days limit 3;`

Environment and keys

- Env template: `env.example` (local dev values). No production keys committed. Export API optionally uses `SUPABASE_SERVICE_ROLE_KEY` for server-side export; do not commit real secrets.

Workshop/edit-workshop references (for safe removal plan)

- Routes/components to audit/remove or migrate:
  - `src/app/(admin)/workshops/index/`
  - `src/app/(admin)/workshops/[id]/`
  - `src/app/public-workshops/page.tsx`
  - Link: `src/app/(admin)/dashboard/page.tsx` references `/admin/edit-workshops`
  - Session metadata mentions: `SESSION_TYPES` notes on workshop roles; code paths handle `workshop_lead` role in participants

Initial FIX STEPS backbone (living, auto-updated):

1) Establish orchestrator and repo map (this doc + `repo_map.json`).
2) Prioritize Engine: instrument `handleSubmitSession` path for payload and response logs; add save smoke test.
3) People Master polish: search performance, inline add durable, dedupe via email, strong typing.
4) Remove edit-workshop cruft safely; keep `session_type = 'workshop'` data compatibility.
5) Final migration and export view hardening.

Diagnostics artifacts

- All orchestrator logs and targeted diagnostics are saved under `artifacts/`.
- Smoke artifacts: save JSON output and export `.xlsx` saved under `artifacts/` when running `npm run smoke:*`.

Note: This document is maintained by `tools/system_orchestrator.ts` and will be updated alongside code changes.


