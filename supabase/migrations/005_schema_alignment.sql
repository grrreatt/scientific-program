-- Schema alignment migration (idempotent-ish) - creates indexes and ensures role_type exists
-- NOTE: Final destructive reset script will be prepared separately.

-- Speakers: ensure role_type column for People Master
ALTER TABLE speakers ADD COLUMN IF NOT EXISTS role_type TEXT;
CREATE INDEX IF NOT EXISTS idx_speakers_lower_name ON speakers ((lower(name)));
CREATE INDEX IF NOT EXISTS idx_speakers_lower_email ON speakers ((lower(email)));

-- Sessions: ensure time slot fields and status/number exist
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_start_time TIME;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_end_time TIME;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_number INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Sub sessions table (if not yet present)
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

-- Session participants indexing
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_role ON session_participants(role);

-- Day time slots indexing safeguard
CREATE INDEX IF NOT EXISTS idx_day_time_slots_day_id ON day_time_slots(day_id);
CREATE INDEX IF NOT EXISTS idx_day_time_slots_order ON day_time_slots(slot_order);


