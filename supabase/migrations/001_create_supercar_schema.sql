-- Supercar Schema Migration (consolidated) - REVIEW BEFORE APPLYING
-- 1) Backup guidance:
--    - Export CSV backups of speakers, sessions, session_participants, sub_sessions, day_time_slots, day_halls, conference_days, stages
--    - CREATE SCHEMA backup_YYYYMMDD; then CREATE TABLE AS SELECT * INTO backup_YYYYMMDD.table FROM public.table;
-- 2) Destructive drops are included but should be executed only after validation in a non-production env.

BEGIN;

-- Views first
DROP VIEW IF EXISTS sessions_with_times;
DROP VIEW IF EXISTS halls_with_days;
DROP VIEW IF EXISTS sessions_with_sub_sessions;

-- Core tables (idempotent-ish guards omitted for clarity; ensure pre-validated)
-- Keep speakers
CREATE TABLE IF NOT EXISTS speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  organization TEXT,
  bio TEXT,
  role_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_speakers_email_unique ON speakers((lower(email)));
CREATE INDEX IF NOT EXISTS idx_speakers_lower_name ON speakers((lower(name)));
CREATE INDEX IF NOT EXISTS idx_speakers_lower_email ON speakers((lower(email)));

-- Days
CREATE TABLE IF NOT EXISTS conference_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Halls
CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day-Hall mapping
CREATE TABLE IF NOT EXISTS day_halls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  hall_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_id, hall_id)
);
CREATE INDEX IF NOT EXISTS idx_day_halls_day_id ON day_halls(day_id);
CREATE INDEX IF NOT EXISTS idx_day_halls_hall_id ON day_halls(hall_id);
CREATE INDEX IF NOT EXISTS idx_day_halls_order ON day_halls(hall_order);

-- Time slots
CREATE TABLE IF NOT EXISTS day_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_order INTEGER DEFAULT 0,
  is_break BOOLEAN DEFAULT FALSE,
  break_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_day_time_slots_day_id ON day_time_slots(day_id);
CREATE INDEX IF NOT EXISTS idx_day_time_slots_order ON day_time_slots(slot_order);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  session_type TEXT NOT NULL,
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES day_time_slots(id) ON DELETE SET NULL,
  start_time TIME,
  end_time TIME,
  custom_start_time TIME,
  custom_end_time TIME,
  topic TEXT,
  description TEXT,
  is_parallel_meal BOOLEAN DEFAULT FALSE,
  parallel_meal_type TEXT,
  session_number INTEGER,
  status TEXT DEFAULT 'active',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_day_id ON sessions(day_id);
CREATE INDEX IF NOT EXISTS idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX IF NOT EXISTS idx_sessions_time_slot_id ON sessions(time_slot_id);

-- Participants
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_role ON session_participants(role);

-- Sub-sessions
CREATE TABLE IF NOT EXISTS sub_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  speaker_id UUID REFERENCES speakers(id),
  chairperson_id UUID REFERENCES speakers(id),
  expert_ids UUID[],
  start_time TIME,
  end_time TIME,
  topic TEXT,
  sub_session_type TEXT DEFAULT 'lecture',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_sessions_parent_id ON sub_sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_sub_sessions_speaker_id ON sub_sessions(speaker_id);

-- Views
CREATE OR REPLACE VIEW halls_with_days AS
SELECT 
  dh.id as day_hall_id,
  dh.day_id,
  dh.hall_id,
  dh.hall_order,
  cd.name as day_name,
  cd.date as day_date,
  st.name as hall_name,
  st.capacity as hall_capacity
FROM day_halls dh
JOIN conference_days cd ON dh.day_id = cd.id
JOIN stages st ON dh.hall_id = st.id
ORDER BY cd.date, dh.hall_order;

CREATE OR REPLACE VIEW sessions_with_times AS
SELECT 
  s.*,
  COALESCE(s.custom_start_time, dts.start_time) as start_time,
  COALESCE(s.custom_end_time, dts.end_time) as end_time,
  COALESCE(dts.is_break, FALSE) as is_break,
  dts.break_title,
  cd.name as day_name,
  cd.date as day_date,
  st.name as stage_name,
  dh.hall_order
FROM sessions s
LEFT JOIN day_time_slots dts ON s.time_slot_id = dts.id
LEFT JOIN conference_days cd ON s.day_id = cd.id
LEFT JOIN stages st ON s.stage_id = st.id
LEFT JOIN day_halls dh ON (s.day_id = dh.day_id AND s.stage_id = dh.hall_id)
ORDER BY cd.date, COALESCE(dts.slot_order, 0), COALESCE(dh.hall_order, 0);

COMMIT;


