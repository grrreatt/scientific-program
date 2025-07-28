-- =====================================================
-- COMPLETE DATABASE RESET FOR SCIENTIFIC CONFERENCE SCHEDULER
-- =====================================================
-- This script completely resets the database and creates a fresh structure
-- with day-specific halls, time slots, and all modern features

-- =====================================================
-- STEP 1: DROP ALL EXISTING OBJECTS
-- =====================================================

-- Drop all views first
DROP VIEW IF EXISTS sessions_with_times CASCADE;
DROP VIEW IF EXISTS halls_with_days CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS day_halls CASCADE;
DROP TABLE IF EXISTS day_time_slots CASCADE;
DROP TABLE IF EXISTS speakers CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS session_types CASCADE;
DROP TABLE IF EXISTS conference_days CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =====================================================
-- STEP 2: CREATE FRESH DATABASE STRUCTURE
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Conference days
CREATE TABLE conference_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages/Halls (global hall definitions)
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day-specific halls (links halls to specific days)
CREATE TABLE day_halls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  hall_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_id, hall_id)
);

-- Time slots for each day
CREATE TABLE day_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_order INTEGER NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  break_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_id, start_time)
);

-- Speakers
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  organization TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session types with dynamic fields
CREATE TABLE session_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  session_type TEXT NOT NULL,
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES day_time_slots(id) ON DELETE CASCADE,
  topic TEXT,
  description TEXT,
  is_parallel_meal BOOLEAN DEFAULT FALSE,
  parallel_meal_type TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participants (speakers, moderators, panelists)
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
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
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View for day-specific halls with all information
CREATE VIEW halls_with_days AS
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

-- Comprehensive sessions view with all related data
CREATE VIEW sessions_with_times AS
SELECT 
  s.*,
  dts.start_time,
  dts.end_time,
  dts.is_break,
  dts.break_title,
  dts.slot_order,
  cd.name as day_name,
  cd.date as day_date,
  st.name as stage_name,
  dh.hall_order
FROM sessions s
LEFT JOIN day_time_slots dts ON s.time_slot_id = dts.id
LEFT JOIN conference_days cd ON s.day_id = cd.id
LEFT JOIN stages st ON s.stage_id = st.id
LEFT JOIN day_halls dh ON (s.day_id = dh.day_id AND s.stage_id = dh.hall_id)
ORDER BY cd.date, dts.slot_order, dh.hall_order;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE conference_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for now - can be restricted later)
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
-- INSERT MOCK DATA
-- =====================================================

-- Insert session types
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

-- Insert conference days
INSERT INTO conference_days (name, date) VALUES
('Day 1', '2024-12-03'),
('Day 2', '2024-12-04'),
('Day 3', '2024-12-05');

-- Insert stages/halls
INSERT INTO stages (name, capacity) VALUES
('Main Hall', 200),
('Seminar Room A', 50),
('Seminar Room B', 50),
('Workshop Room', 30),
('Auditorium', 150),
('Conference Room 1', 40),
('Conference Room 2', 40);

-- Insert speakers
INSERT INTO speakers (name, email, title, organization, bio) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@university.edu', 'Professor of Cardiology', 'University of Medical Sciences', 'Leading researcher in cardiovascular diseases with over 20 years of experience.'),
('Dr. Michael Chen', 'michael.chen@research.org', 'Research Director', 'National Research Institute', 'Expert in molecular biology and genetic research.'),
('Dr. Emily Rodriguez', 'emily.rodriguez@hospital.com', 'Chief Medical Officer', 'City General Hospital', 'Specialist in emergency medicine and trauma care.'),
('Prof. David Thompson', 'david.thompson@college.edu', 'Dean of Medicine', 'Medical College', 'Distinguished professor with expertise in medical education.'),
('Dr. Lisa Wang', 'lisa.wang@clinic.org', 'Senior Physician', 'Specialty Clinic', 'Expert in internal medicine and patient care.'),
('Dr. James Wilson', 'james.wilson@research.edu', 'Associate Professor', 'Research University', 'Leading expert in neurology and brain research.'),
('Dr. Maria Garcia', 'maria.garcia@hospital.org', 'Cardiologist', 'Heart Institute', 'Specialist in interventional cardiology.'),
('Prof. Robert Brown', 'robert.brown@university.edu', 'Professor Emeritus', 'Medical University', 'Retired professor with vast experience in medical research.');

-- Insert day-specific halls (each day gets different halls)
-- Day 1: All halls
INSERT INTO day_halls (day_id, hall_id, hall_order) 
SELECT 
  (SELECT id FROM conference_days WHERE name = 'Day 1'),
  id,
  ROW_NUMBER() OVER (ORDER BY name) - 1
FROM stages;

-- Day 2: Only first 4 halls
INSERT INTO day_halls (day_id, hall_id, hall_order) 
SELECT 
  (SELECT id FROM conference_days WHERE name = 'Day 2'),
  id,
  ROW_NUMBER() OVER (ORDER BY name) - 1
FROM stages 
WHERE name IN ('Main Hall', 'Seminar Room A', 'Seminar Room B', 'Workshop Room');

-- Day 3: Only first 3 halls
INSERT INTO day_halls (day_id, hall_id, hall_order) 
SELECT 
  (SELECT id FROM conference_days WHERE name = 'Day 3'),
  id,
  ROW_NUMBER() OVER (ORDER BY name) - 1
FROM stages 
WHERE name IN ('Main Hall', 'Seminar Room A', 'Seminar Room B');

-- Insert time slots for each day (8:00 AM to 8:00 PM, every 30 minutes)
INSERT INTO day_time_slots (day_id, start_time, end_time, slot_order, is_break, break_title)
SELECT 
  cd.id,
  (TIME '08:00' + (INTERVAL '30 minutes' * slot_num)),
  (TIME '08:30' + (INTERVAL '30 minutes' * slot_num)),
  slot_num,
  CASE 
    WHEN slot_num IN (8, 20) THEN TRUE  -- 12:00-12:30 and 18:00-18:30 are breaks
    ELSE FALSE
  END,
  CASE 
    WHEN slot_num = 8 THEN 'Lunch Break'
    WHEN slot_num = 20 THEN 'Dinner Break'
    ELSE NULL
  END
FROM conference_days cd
CROSS JOIN generate_series(0, 23) AS slot_num;

-- Insert sample sessions
-- Day 1 Sessions
INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic, description) VALUES
('Opening Ceremony', 'oration', 
 (SELECT id FROM conference_days WHERE name = 'Day 1'),
 (SELECT id FROM stages WHERE name = 'Main Hall'),
 (SELECT id FROM day_time_slots WHERE day_id = (SELECT id FROM conference_days WHERE name = 'Day 1') AND slot_order = 0),
 'Conference Opening', 'Welcome address and conference overview');

INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic, description) VALUES
('Cardiovascular Advances', 'lecture',
 (SELECT id FROM conference_days WHERE name = 'Day 1'),
 (SELECT id FROM stages WHERE name = 'Seminar Room A'),
 (SELECT id FROM day_time_slots WHERE day_id = (SELECT id FROM conference_days WHERE name = 'Day 1') AND slot_order = 2),
 'Recent Advances in Cardiology', 'Latest developments in cardiovascular treatment');

INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic, description) VALUES
('Research Panel Discussion', 'panel',
 (SELECT id FROM conference_days WHERE name = 'Day 1'),
 (SELECT id FROM stages WHERE name = 'Auditorium'),
 (SELECT id FROM day_time_slots WHERE day_id = (SELECT id FROM conference_days WHERE name = 'Day 1') AND slot_order = 4),
 'Future of Medical Research', 'Panel discussion on emerging trends');

-- Day 2 Sessions
INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic, description) VALUES
('Neurology Workshop', 'workshop',
 (SELECT id FROM conference_days WHERE name = 'Day 2'),
 (SELECT id FROM stages WHERE name = 'Workshop Room'),
 (SELECT id FROM day_time_slots WHERE day_id = (SELECT id FROM conference_days WHERE name = 'Day 2') AND slot_order = 2),
 'Brain Mapping Techniques', 'Hands-on workshop on neurological imaging');

INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic, description) VALUES
('Emergency Medicine Symposium', 'symposium',
 (SELECT id FROM conference_days WHERE name = 'Day 2'),
 (SELECT id FROM stages WHERE name = 'Main Hall'),
 (SELECT id FROM day_time_slots WHERE day_id = (SELECT id FROM conference_days WHERE name = 'Day 2') AND slot_order = 6),
 'Emergency Care Protocols', 'Comprehensive symposium on emergency procedures');

-- Day 3 Sessions
INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic, description) VALUES
('Closing Keynote', 'oration',
 (SELECT id FROM conference_days WHERE name = 'Day 3'),
 (SELECT id FROM stages WHERE name = 'Main Hall'),
 (SELECT id FROM day_time_slots WHERE day_id = (SELECT id FROM conference_days WHERE name = 'Day 3') AND slot_order = 20),
 'Future of Healthcare', 'Closing address on healthcare innovation');

-- Insert session participants
INSERT INTO session_participants (session_id, speaker_id, role) VALUES
-- Opening Ceremony
((SELECT id FROM sessions WHERE title = 'Opening Ceremony'), 
 (SELECT id FROM speakers WHERE name = 'Prof. David Thompson'), 'speaker'),

-- Cardiovascular Advances
((SELECT id FROM sessions WHERE title = 'Cardiovascular Advances'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Sarah Johnson'), 'speaker'),
((SELECT id FROM sessions WHERE title = 'Cardiovascular Advances'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Maria Garcia'), 'chairperson'),

-- Research Panel Discussion
((SELECT id FROM sessions WHERE title = 'Research Panel Discussion'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Michael Chen'), 'moderator'),
((SELECT id FROM sessions WHERE title = 'Research Panel Discussion'), 
 (SELECT id FROM speakers WHERE name = 'Dr. James Wilson'), 'panelist'),
((SELECT id FROM sessions WHERE title = 'Research Panel Discussion'), 
 (SELECT id FROM speakers WHERE name = 'Prof. Robert Brown'), 'panelist'),

-- Neurology Workshop
((SELECT id FROM sessions WHERE title = 'Neurology Workshop'), 
 (SELECT id FROM speakers WHERE name = 'Dr. James Wilson'), 'workshop_lead'),
((SELECT id FROM sessions WHERE title = 'Neurology Workshop'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Lisa Wang'), 'assistant'),

-- Emergency Medicine Symposium
((SELECT id FROM sessions WHERE title = 'Emergency Medicine Symposium'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Emily Rodriguez'), 'moderator'),
((SELECT id FROM sessions WHERE title = 'Emergency Medicine Symposium'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Sarah Johnson'), 'speaker'),

-- Closing Keynote
((SELECT id FROM sessions WHERE title = 'Closing Keynote'), 
 (SELECT id FROM speakers WHERE name = 'Prof. David Thompson'), 'speaker'),
((SELECT id FROM sessions WHERE title = 'Closing Keynote'), 
 (SELECT id FROM speakers WHERE name = 'Dr. Michael Chen'), 'introducer');

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

-- Show day-specific halls
SELECT 
  cd.name as day_name,
  cd.date,
  st.name as hall_name,
  dh.hall_order
FROM day_halls dh
JOIN conference_days cd ON dh.day_id = cd.id
JOIN stages st ON dh.hall_id = st.id
ORDER BY cd.date, dh.hall_order;

-- Show sessions with all details
SELECT 
  s.title,
  s.session_type,
  cd.name as day_name,
  st.name as hall_name,
  dts.start_time,
  dts.end_time,
  sp.name as speaker_name,
  sp.role
FROM sessions s
JOIN conference_days cd ON s.day_id = cd.id
JOIN stages st ON s.stage_id = st.id
JOIN day_time_slots dts ON s.time_slot_id = dts.id
LEFT JOIN session_participants spp ON s.id = spp.session_id
LEFT JOIN speakers sp ON spp.speaker_id = sp.id
ORDER BY cd.date, dts.slot_order, st.name;

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
SELECT '- Mock data for testing' as feature7; 