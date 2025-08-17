-- Workshop sub-sessions (subtalks) with chairperson and experts
create table if not exists public.workshop_sub_sessions (
  id uuid primary key default gen_random_uuid(),
  workshop_session_id uuid not null references public.workshop_sessions(id) on delete cascade,
  title text not null,
  speaker_id uuid references public.speakers(id),
  chairperson_id uuid references public.speakers(id),
  expert_ids uuid[],
  start_time time not null,
  end_time time not null,
  topic text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.workshop_sub_sessions enable row level security;

-- Policies
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'workshop_sub_sessions' and policyname = 'Allow public read access on workshop_sub_sessions'
  ) then
    create policy "Allow public read access on workshop_sub_sessions" on public.workshop_sub_sessions for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'workshop_sub_sessions' and policyname = 'Allow authenticated users full access on workshop_sub_sessions'
  ) then
    create policy "Allow authenticated users full access on workshop_sub_sessions" on public.workshop_sub_sessions for all using (true);
  end if;
end $$;

-- Indexes
create index if not exists idx_workshop_sub_sessions_session_id on public.workshop_sub_sessions(workshop_session_id);
create index if not exists idx_workshop_sub_sessions_times on public.workshop_sub_sessions(workshop_session_id, start_time, end_time);


