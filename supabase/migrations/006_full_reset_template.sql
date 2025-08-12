-- WARNING: Destructive reset template. Review before running in production.

-- Drop in dependency order (RLS policies will be dropped with tables)
DROP TABLE IF EXISTS sub_sessions CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS day_time_slots CASCADE;
DROP TABLE IF EXISTS day_halls CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS conference_days CASCADE;
DROP TABLE IF EXISTS session_types CASCADE;
DROP TABLE IF EXISTS speakers CASCADE;

-- Recreate core tables
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  organization TEXT,
  bio TEXT,
  role_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE conference_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE day_halls (
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  hall_order INTEGER DEFAULT 0
);

CREATE TABLE day_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_order INTEGER DEFAULT 0,
  is_break BOOLEAN DEFAULT FALSE,
  break_title TEXT
);

CREATE TABLE sessions (
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

CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sub_sessions (
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

-- Indexes
CREATE INDEX idx_speakers_lower_name ON speakers ((lower(name)));
CREATE INDEX idx_speakers_lower_email ON speakers ((lower(email)));
CREATE INDEX idx_sessions_day_id ON sessions(day_id);
CREATE INDEX idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX idx_sessions_time_slot_id ON sessions(time_slot_id);
CREATE INDEX idx_day_time_slots_day_id ON day_time_slots(day_id);
CREATE INDEX idx_day_time_slots_order ON day_time_slots(slot_order);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_role ON session_participants(role);
CREATE INDEX idx_sub_sessions_parent_id ON sub_sessions(parent_session_id);
CREATE INDEX idx_sub_sessions_speaker_id ON sub_sessions(speaker_id);


