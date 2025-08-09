## Project Structure and Handover

This document gives a compact, end‑to‑end map of the app so a new session can resume work immediately.

### Tech Stack
- **Framework**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Postgres, RLS, Realtime)
- **Data storage**: Postgres tables and views in Supabase (cloud)
- **Auth/Client**: Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Environment
- Add `.env.local` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public anon key starting with `pk_...`, NOT a service role key)
- Optional: `SUPABASE_URL`, `SUPABASE_ANON_KEY` also supported by `src/lib/supabase/client.ts`

### Run
- `npm install`
- `npm run dev`
- Ensure Supabase schema is applied (see Migrations). Data lives in Supabase cloud; changing machines will not lose data.

---

## Data Model (Supabase)

Core tables (existing):
- `conference_days(id, name, date)`
- `stages(id, name, capacity)`
- `speakers(id, name, email, title, organization)` with unique index on `lower(email)`
- `day_time_slots(id, day_id, start_time, end_time, slot_order, is_break, break_title)`
- `day_halls(day_id, hall_id, hall_order)` — maps halls per day
- `sessions(id, title, session_type, day_id, stage_id, time_slot_id, topic, description, is_parallel_meal, parallel_meal_type, custom_start_time, custom_end_time, session_number, status)`
- `session_participants(id, session_id, speaker_id, role)` — roles are free‑text
- `sub_sessions(id, parent_session_id, title, speaker_id, start_time, end_time, topic, sub_session_type)` — for “Session” container sub‑talks

Views (existing/used):
- `halls_with_days` — day/hall associations and display order
- `sessions_with_times` — resolves displayed start/end via `COALESCE(custom_*, day_time_slots.*)` and includes day/hall labels
- `sessions_with_sub_sessions` — convenience join for container sessions

Roles used across the app:
- `speaker`, `moderator`, `chairperson`, `panelist`, `expert`, `workshop_lead`, `assistant`, `presenter`, `introducer`, `discussion_leader`, `orator`

Session types (generic sessions flow):
- `session` (container with optional `sub_sessions`)
- `lecture`, `panel`, `symposium`, `oration`, `guest_lecture`, `discussion`, `break`, `other`
- Note: **`workshop` is handled separately** (see Routes) but still stored in `sessions.session_type = 'workshop'`.

Data conventions:
- Times saved in Postgres `TIME` (24h). UI shows 12h via `TimePicker` and utils.
- Participants are normalized in `session_participants` with a `role` string; display is derived (compact in admin, expanded in public).
- Session numbering per day is maintained via trigger (if applied) and used for Roman numeral “Session I, II, …”.

---

## Frontend Routes

Admin
- `src/app/(admin)/edit-sessions/page.tsx` — Main editor grid
  - Header: Add Day, Add Hall, Global Block
  - Grid: Day × Halls with time slots
  - Click cell → Add/Edit Session modal using `SessionForm`
  - “Global Block” creates a break spanning all halls for a selected day/time range
- `src/app/(admin)/workshops/index/page.tsx` — Workshop list (separate from sessions)
- `src/app/(admin)/workshops/[id]/page.tsx` — Add/Edit Workshop (title, topic, day, hall, custom times, Leads, Assistants)
- `src/app/(admin)/participants/page.tsx` — Participants utility page (existing)
- `src/app/(admin)/dashboard/page.tsx`, `src/app/(admin)/sessions/page.tsx` — informational/legacy

Public
- `src/app/public-program/page.tsx` — Public program view synced with sessions
- `src/app/public-workshops/page.tsx` — Public workshop list with Leads/Assistants

API
- `src/app/api/export/route.ts` — CSV export (sessions, sub‑sessions, participants)
- `src/app/api/download-template/route.ts` — template download (existing)

Key components
- `src/components/session-form.tsx` — Compact session form (no workshop option)
- `src/components/ui/time-picker.tsx` — 12h UI, saves 24h

Utilities
- `src/lib/utils.ts` — time formatters, query helpers, transformers
- `src/lib/constants.ts` — session type metadata (workshop removed from generic form)
- `src/lib/supabase/*` — client and realtime helpers

---

## Behaviors

Sessions (admin grid)
- Time column removed from grid headers; each session has its own `custom_start_time`/`custom_end_time` (pre‑filled from selected slot on add)
- Participant selection: small “Add” dropdown with search; supports roles including `panelist` and `expert`
- “Session” container can have sub‑talks (`lecture`/`discussion`) with auto‑suggested start times based on previous end
- Hover controls show small Edit/Delete icons in blocks; spacing tightened

Global Blocks
- Added beside Add Day/Add Hall; creates `day_time_slots.is_break = true` rows that span all halls for a day and time range (e.g., Registration, Lunch)

Workshops (separate flow)
- Admin list and dedicated editor; saved to `sessions` with `session_type = 'workshop'`
- Leads/Assistants saved in `session_participants` with roles `workshop_lead` and `assistant`
- Public page lists workshops with times and team

Export
- CSV includes main sessions and sub‑sessions, participants, and role labels for email workflows

---

## Known Fixes/Decisions
- Realtime error due to using service_role key on client → use public anon key
- Removed invalid references to `s.start_time` (moved to `day_time_slots` / `custom_*`)
- RLS policy creation uses drop+create (no `IF NOT EXISTS`)
- Seed script rewritten to avoid invalid CTE alias scoping
- Avoid empty UUID inserts by falling back to preselected hall/slot

---

## Pending/Next
- Speaker CSV import: endpoint + UI to upsert `speakers` by case‑insensitive email
- Email confirmation CLI reading from a `person_schedule` view (to be finalized) or from export
- Tighten role validation (optional `CHECK(role IN (...))`), only if we want strictness
- Add admin navigation links to Workshops and a public nav link to `public-workshops`

---

## Quick How‑To for New Contributors
1) Set `.env.local` with Supabase public keys; run `npm run dev`
2) Ensure migrations are applied on the target Supabase project (see `/supabase/migrations`)
3) Edit sessions via `/edit-sessions`; workshops via `/admin/workshops` and `/workshops/[id]`
4) Public program at `/public-program`; public workshops at `/public-workshops`
5) Export CSV at `/api/export`


