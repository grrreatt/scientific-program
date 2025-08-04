-- =====================================================
-- COMPLETE DATABASE RESET - SUPABASE AS SINGLE SOURCE OF TRUTH
-- =====================================================

-- Drop all tables if they exist
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS day_time_slots CASCADE;
DROP TABLE IF EXISTS day_halls CASCADE;
DROP TABLE IF EXISTS speakers CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS conference_days CASCADE;
DROP TABLE IF EXISTS session_types CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS halls_with_days CASCADE;
DROP VIEW IF EXISTS sessions_with_times CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Conference days table
CREATE TABLE conference_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages/Halls table
CREATE TABLE stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day-Halls relationship table
CREATE TABLE day_halls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES conference_days(id) ON DELETE CASCADE,
  hall_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  hall_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_id, hall_id)
);

-- Time slots for each day
CREATE TABLE day_time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES conference_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_order INTEGER NOT NULL DEFAULT 0,
  is_break BOOLEAN DEFAULT FALSE,
  break_title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Speakers table
CREATE TABLE speakers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  title VARCHAR(255),
  organization VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session types configuration
CREATE TABLE session_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  session_type VARCHAR(255) NOT NULL,
  day_id UUID NOT NULL REFERENCES conference_days(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES day_time_slots(id) ON DELETE CASCADE,
  topic TEXT,
  description TEXT,
  is_parallel_meal BOOLEAN DEFAULT FALSE,
  parallel_meal_type VARCHAR(255),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participants (speakers, moderators, etc.)
CREATE TABLE session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  role VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, speaker_id, role)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX idx_conference_days_date ON conference_days(date);
CREATE INDEX idx_stages_name ON stages(name);
CREATE INDEX idx_day_halls_day_id ON day_halls(day_id);
CREATE INDEX idx_day_halls_hall_id ON day_halls(hall_id);
CREATE INDEX idx_day_halls_order ON day_halls(hall_order);
CREATE INDEX idx_day_time_slots_day_id ON day_time_slots(day_id);
CREATE INDEX idx_day_time_slots_order ON day_time_slots(slot_order);
CREATE INDEX idx_speakers_name ON speakers(name);
CREATE INDEX idx_sessions_day_id ON sessions(day_id);
CREATE INDEX idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX idx_sessions_time_slot_id ON sessions(time_slot_id);
CREATE INDEX idx_sessions_session_type ON sessions(session_type);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_speaker_id ON session_participants(speaker_id);

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_conference_days_updated_at 
    BEFORE UPDATE ON conference_days 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stages_updated_at 
    BEFORE UPDATE ON stages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_speakers_updated_at 
    BEFORE UPDATE ON speakers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE VIEWS
-- =====================================================

-- View for halls with day information
CREATE VIEW halls_with_days AS
SELECT 
  dh.id,
  dh.day_id,
  dh.hall_id,
  dh.hall_order,
  cd.name as day_name,
  cd.date as day_date,
  s.name as hall_name,
  s.capacity as hall_capacity,
  dh.created_at
FROM day_halls dh
JOIN conference_days cd ON dh.day_id = cd.id
JOIN stages s ON dh.hall_id = s.id
ORDER BY cd.date, dh.hall_order;

-- View for sessions with time information
CREATE VIEW sessions_with_times AS
SELECT 
  s.*,
  cd.name as day_name,
  st.name as stage_name,
  dts.start_time,
  dts.end_time,
  dts.is_break,
  dts.break_title
FROM sessions s
JOIN conference_days cd ON s.day_id = cd.id
JOIN stages st ON s.stage_id = st.id
JOIN day_time_slots dts ON s.time_slot_id = dts.id
ORDER BY cd.date, dts.slot_order, st.name;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE conference_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE POLICIES
-- =====================================================

CREATE POLICY "Allow all operations on conference_days" ON conference_days
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on stages" ON stages
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on day_halls" ON day_halls
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on day_time_slots" ON day_time_slots
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on speakers" ON speakers
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on session_types" ON session_types
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on sessions" ON sessions
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on session_participants" ON session_participants
FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- INSERT ESSENTIAL SESSION TYPES ONLY
-- =====================================================

-- Insert only the essential session type configurations
INSERT INTO session_types (name, fields) VALUES
('lecture', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "speaker_id"], "optional": ["chairperson_id", "description", "is_parallel_meal"], "roles": ["speaker", "chairperson"]}'),
('panel', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "moderator_id", "panelist_ids"], "optional": ["description", "is_parallel_meal"], "roles": ["moderator", "panelist"]}'),
('symposium', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "moderator_id", "symposium_subtalks"], "optional": ["description"], "roles": ["moderator", "speaker"]}'),
('workshop', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "workshop_lead_ids"], "optional": ["assistant_ids", "capacity", "description"], "roles": ["workshop_lead", "assistant"]}'),
('oration', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "speaker_id"], "optional": ["introducer_id", "description"], "roles": ["speaker", "introducer"]}'),
('guest_lecture', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "speaker_id"], "optional": ["chairperson_id", "description"], "roles": ["speaker", "chairperson"]}'),
('discussion', '{"required": ["title", "topic", "day_id", "stage_id", "time_slot_id", "discussion_leader_id", "presenter_ids"], "optional": ["description"], "roles": ["discussion_leader", "presenter"]}'),
('break', '{"required": ["title", "day_id", "stage_id", "time_slot_id", "meal_type"], "optional": ["description"], "roles": []}'),
('other', '{"required": ["title", "day_id", "stage_id", "time_slot_id"], "optional": ["topic", "description", "custom_data"], "roles": []}');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the structure
SELECT 'Conference Days' as table_name, COUNT(*) as record_count FROM conference_days
UNION ALL
SELECT 'Stages/Halls', COUNT(*) FROM stages
UNION ALL
SELECT 'Day Halls', COUNT(*) FROM day_halls
UNION ALL
SELECT 'Time Slots', COUNT(*) FROM day_time_slots
UNION ALL
SELECT 'Speakers', COUNT(*) FROM speakers
UNION ALL
SELECT 'Session Types', COUNT(*) FROM session_types
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Session Participants', COUNT(*) FROM session_participants;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Database reset completed successfully!' as status;
SELECT 'Features included:' as features;
SELECT '- Day-specific halls (each day can have different halls)' as feature1;
SELECT '- Time slots per day with breaks' as feature2;
SELECT '- Multiple session types (lecture, panel, workshop, etc.)' as feature3;
SELECT '- Session participants with roles' as feature4;
SELECT '- Comprehensive views for easy querying' as feature5;
SELECT '- Row Level Security enabled' as feature6;
SELECT '- Supabase as single source of truth - no mock data' as feature7; 