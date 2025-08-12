Monk Mode Ops

- Orchestrator:
  - Quick status: `node tools/system_orchestrator.ts status`
  - Targeted check: `node tools/system_orchestrator.ts run-check engine`

- Docs:
  - System summary: `SYSTEM_MASTER.md`
  - Repo map: `repo_map.json`

- CI Note:
  - Do not run destructive SQL in production. Use test/dev env only.

## Scientific Program – Deep Context for Assistant Collaboration

This document gives another AI assistant a complete, implementation-level briefing of the system so far. It covers architecture, data model, UI flows, realtime sync, validation rules, known constraints, and how to extend safely.

### Product Goals (Current Scope)
- **Admin program editor** with time slots on Y-axis and halls on X-axis, plus modal to add/edit sessions.
- **Session form simplification** with a special “Session” flow (subtalks + optional discussion) and relaxed validation.
- **Public program view** visually bright, read-only, aligned with the grid model.
- **Realtime synchronization** across admin and public views via Supabase Realtime, with a status blip.
- **CSV export** endpoint for whole program across participants.
- **People management (current)** via CSV upload on dashboard; typeahead on participant pickers uses `speakers` table.

### Tech Stack
- Next.js 14 (App Router) with React + TypeScript
- Tailwind CSS for styling
- Supabase (PostgreSQL) for data + Realtime
- Row Level Security (RLS) enabled

### Key Files and Directories
- `src/app/(admin)/edit-sessions/page.tsx`: Main admin editor (days/halls/time slots grid, session modal, global block management, day/hall CRUD).
- `src/components/session-form.tsx`: Central form component for creating/editing sessions. Implements special “Session” flow.
- `src/components/ui/time-picker.tsx`: Time picker with `disabled` support and clean visuals.
- `src/components/ui/realtime-status.tsx`: Realtime connection blip.
- `src/lib/supabase/client.ts`: Supabase client.
- `src/lib/supabase/realtime.ts`: Realtime subscription manager.
- `src/lib/utils.ts`: Utility helpers (time formatting, duration calc, transformers for Supabase rows).
- `src/types/index.ts`: Canonical TypeScript types (deduplicated and refactored).
- `src/app/public-program/page.tsx`: Public-facing program view.
- `src/app/api/export/route.ts`: CSV export of all sessions/participants/sub-sessions.
- `supabase/migrations/*.sql`: Database schema migrations.
- `supabase/seed_demo.sql`: Seed data script.
- `vercel.json`: Build config for Vercel.

### Database Model (Simplified)
- `conference_days (id, name, date)`
- `stages (id, name, capacity)` – a.k.a. halls.
- `day_halls (day_id, hall_id, hall_order)` – which halls are active per day and their order (shown as columns).
- `day_time_slots (id, day_id, start_time, end_time, slot_order, is_break, break_title)` – the Y-axis rows.
- `sessions (id, day_id, stage_id, time_slot_id, session_type, title, topic, custom_start_time, custom_end_time, is_parallel_meal, parallel_meal_type, created_at, ... )`
- `session_participants (id, session_id, speaker_id, role)` – roles include `speaker`, `chairperson`, `moderator`, `panelist`, `expert`, etc.
- `speakers (id, name, email, organization, title)` – master list used across pickers (typeahead subsumed into select sorting).
- `sub_sessions (id, session_id, title, topic, start_time, end_time, sub_session_type, speaker_id)` – for “Session” container subtalks + optional discussion.
- Views: historically `sessions_with_times` / `halls_with_days` used in some flows.

RLS is enabled. Admin UI assumes privileged access via anon key in dev; lock down appropriately in production via Policies.

### Realtime Sync
- Realtime subscriptions cover `sessions`, `sub_sessions`, `session_participants`, `day_halls`, and related tables to reflect changes instantly in admin/public views.
- Status indicator: `src/components/ui/realtime-status.tsx` shows green/connecting/red blip.

### Admin Editor – Core UX (`src/app/(admin)/edit-sessions/page.tsx`)
- Header shows app title + controls (Add Day, Add Hall, Global Block) + Realtime blip.
- Day navigation bar (sticky) shows available days; selection controls the grid.
  - Day selection is persisted in `localStorage` and restored on load.
  - Day “Edit” inline quick prompts update `name` and `date`.
- Grid layout:
  - Columns = halls for selected day, pulled from `halls_with_days` or `day_halls` join.
  - Rows = `day_time_slots` for the selected day; default slots created if absent.
  - Session cards appear in the appropriate cell by `stage_id` + `time_slot_id`.
  - Actions: edit and delete buttons on hover for session blocks.
  - Global block row spans all halls and has its own delete control.

Hall layout constraints implemented:
- Fixed hall column width (~`w-64`).
- First hall is centered on load and when days/halls change (smooth scrolling).
- Horizontal overflow supported for 1–10+ halls; no layout jumps on add/remove.

Day/date fixes:
- New Day creation uses local `YYYY-MM-DD` formatting (not `toISOString`) to avoid timezone shift bugs.
- Day selection persists across saves/reloads and after session add/edit (prevents snapping back to Day 1).

### Session Modal + Form
Entry points:
- “+ Add Session” in an empty grid cell launches modal, pre-filling `day_id`, `stage_id`, `time_slot_id` context.
- Edit button on a session opens modal with data populated.

Form component: `src/components/session-form.tsx`
- Validation: across all session types, only `Start Time` and `End Time` are strictly required. Everything else is optional.
- Global de-clutter: description fields removed; UI spacing tightened.
- “Break/Meal (Only)” removed from session types (handled as Global Block via `day_time_slots.is_break`).
- Participants section uses compact UI with add/remove; typeahead is handled by filtering the select options (no separate search box). The master list is `speakers`.

Special “Session” flow (container type):
- Provides three actions: Add Subtalk, Add Chairperson, Add Discussion.
- Subtalks:
  - First subtalk’s start is locked to session start; subsequent subtalks can be chained (we compute suggested next-start from previous end).
  - Topic, Speaker are optional; only times are required.
- Discussion block:
  - Optional one-per-session; defaults to end at the session end. Start is last lecture end (or session start if none).
- Coverage indicator: shows covered minutes vs session total.
- Inline remove controls for subtalks and discussion.

Delete controls in modal:
- While editing an existing session, a red “Delete Session” button is shown in the modal footer and wired to Supabase delete.

### Public Program (`src/app/public-program/page.tsx`)
- Read-only view reflecting the same grid model as admin.
- Bright header and compact, high-contrast table styling.
- Realtime blip shown.

### CSV Export (`src/app/api/export/route.ts`)
- Endpoint: `GET /api/export`
- Produces CSV containing rows for:
  - Session participants (with role) for each session row.
  - Sub-sessions (subtalks) as additional rows; title includes `"Session – Subtalk Title"`.
- Columns: Session Name, Session Type, Day, Stage, Start Time, End Time, Duration, Topic, Person Name, Role, Organization, Email.

### Constants, Types, Utilities
- `src/lib/constants.ts`: session types and minimal config. We use it for labels/colors/fields.
- `src/types/index.ts`: single source of truth for TS interfaces (deduplicated). Includes `Session`, `Day`, `Hall`, `DayTimeSlot`, etc.
- `src/lib/utils.ts`: time formatters (`formatTime`, `formatTimeRange`, `formatTime12h`, `calculateDuration`), Supabase transformation helpers, and small utilities (e.g., `getNextStartTime`).

### Environment
- `.env.local` must define:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Next.js loads these on dev/build. Ensure Vercel project vars match.

### Deployment
- Vercel: Next.js project with `vercel.json` specifying install, build, and output.
- Build warnings around deprecated npm packages are expected; they don’t block deployment.

### Known Decisions & Constraints
- People management UI: dedicated `/people` was removed earlier; current flow is CSV upload on dashboard and select-from-master in forms.
- Only time is required across all blocks; UI supports saving partially filled blocks.
- Global Blocks (breaks/meals) live in `day_time_slots` with `is_break` and optional `break_title`.

### Recent Fixes (Important)
- Session validation relaxed (only Start/End time required) for all types.
- Removed description fields; removed preview clutter.
- Date creation uses local date string to avoid offset bug.
- Persist selected day in `localStorage`; restore after save/refresh.
- Hall layout: fixed width columns, first hall centered with smooth scroll.
- Delete session button added to edit modal.

### How To Extend Safely
- When adding new session types, update `SESSION_TYPES` in `src/lib/constants.ts` and map new optional fields in `SessionForm` using `optionalFields` rendering.
- To add roles: update roles in `src/types/index.ts`, ensure `session_participants` accepts them, and extend UI participant dropdowns.
- For new export formats (e.g., Excel), add an API route under `src/app/api/export/*` and use a library like `xlsx`. Ensure types are guarded when arrays may be null.
- Realtime: add channel subscriptions in `src/lib/supabase/realtime.ts` for new tables.

### QA Checklist
- Add/Edit a session on Day 2 or later: ensure day selection does not reset to Day 1.
- Create New Day with date “YYYY-MM-DD”: confirm exact date stored (no -1 day offset).
- Add 1, 3, 10 halls for a day: verify fixed-size columns and smooth horizontal scrolling; first hall centered.
- “Session” container: add multiple subtalks; first start locked to session start; optional discussion snaps to session end; only time required.
- CSV export includes sessions, session participants, and sub-sessions as individual rows.

### Open TODOs / Nice-to-haves
- People management page (CRUD) could be reintroduced and harmonized with CSV upload flow.
- Replace select elements with fully accessible Combobox across all participant pickers.
- Add visual duration label under time pickers for subtalks and discussion when edited.
- Add keyboard shortcuts (e.g., quickly add subtalk, jump between time fields).

This document reflects the repository as currently pushed to `main` and should be used as the canonical context for further AI-driven development.


