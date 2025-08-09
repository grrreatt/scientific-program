-- Migration to add session hierarchy and features from Word files analysis
-- This adds sub-sessions, session numbering, and improved session management

-- Add session numbering to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_number INTEGER;

-- Add session status for tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add custom time fields to sessions (for individual session times)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_start_time TIME;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_end_time TIME;

-- Create sub_sessions table for parent-child session relationships
CREATE TABLE IF NOT EXISTS sub_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  speaker_id UUID REFERENCES speakers(id),
  start_time TIME,
  end_time TIME,
  topic TEXT,
  sub_session_type TEXT DEFAULT 'lecture', -- 'lecture', 'discussion'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sub_sessions
CREATE INDEX IF NOT EXISTS idx_sub_sessions_parent_id ON sub_sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_sub_sessions_speaker_id ON sub_sessions(speaker_id);

-- Add RLS policies for sub_sessions
ALTER TABLE sub_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations on sub_sessions (for now - can be restricted later)
CREATE POLICY "Allow all operations on sub_sessions" ON sub_sessions
FOR ALL USING (true) WITH CHECK (true);

-- Create a function to auto-number sessions per day
CREATE OR REPLACE FUNCTION update_session_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session numbers for the affected day
  UPDATE sessions 
  SET session_number = subquery.new_number
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY day_id ORDER BY created_at) as new_number
    FROM sessions 
    WHERE day_id = COALESCE(NEW.day_id, OLD.day_id)
  ) subquery
  WHERE sessions.id = subquery.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update session numbers
DROP TRIGGER IF EXISTS trigger_update_session_numbers ON sessions;
CREATE TRIGGER trigger_update_session_numbers
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_numbers();

-- Update existing sessions with session numbers
UPDATE sessions 
SET session_number = subquery.new_number
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY day_id ORDER BY created_at) as new_number
  FROM sessions
) subquery
WHERE sessions.id = subquery.id;

-- Create a view for sessions with sub-sessions
CREATE VIEW sessions_with_sub_sessions AS
SELECT 
  s.*,
  ss.id as sub_session_id,
  ss.title as sub_session_title,
  ss.speaker_id as sub_session_speaker_id,
  ss.start_time as sub_session_start_time,
  ss.end_time as sub_session_end_time,
  ss.topic as sub_session_topic,
  ss.sub_session_type,
  sp.name as sub_session_speaker_name,
  sp.title as sub_session_speaker_title,
  sp.organization as sub_session_speaker_organization
FROM sessions s
LEFT JOIN sub_sessions ss ON s.id = ss.parent_session_id
LEFT JOIN speakers sp ON ss.speaker_id = sp.id
ORDER BY s.day_id, s.session_number, ss.start_time;

-- Update the sessions_with_times view to include new fields
DROP VIEW IF EXISTS sessions_with_times;
CREATE VIEW sessions_with_times AS
SELECT 
  s.*,
  COALESCE(s.custom_start_time, dts.start_time) as start_time,
  COALESCE(s.custom_end_time, dts.end_time) as end_time,
  COALESCE(dts.is_break, FALSE) as is_break,
  dts.break_title,
  cd.name as day_name,
  cd.date as day_date,
  st.name as stage_name,
  dh.hall_order,
  -- Add session number display
  CASE 
    WHEN s.session_number IS NOT NULL THEN 'Session ' || 
      CASE 
        WHEN s.session_number = 1 THEN 'I'
        WHEN s.session_number = 2 THEN 'II'
        WHEN s.session_number = 3 THEN 'III'
        WHEN s.session_number = 4 THEN 'IV'
        WHEN s.session_number = 5 THEN 'V'
        WHEN s.session_number = 6 THEN 'VI'
        WHEN s.session_number = 7 THEN 'VII'
        WHEN s.session_number = 8 THEN 'VIII'
        WHEN s.session_number = 9 THEN 'IX'
        WHEN s.session_number = 10 THEN 'X'
        ELSE s.session_number::text
      END
    ELSE s.title
  END as session_display_name
FROM sessions s
LEFT JOIN day_time_slots dts ON s.time_slot_id = dts.id
LEFT JOIN conference_days cd ON s.day_id = cd.id
LEFT JOIN stages st ON s.stage_id = st.id
LEFT JOIN day_halls dh ON (s.day_id = dh.day_id AND s.stage_id = dh.hall_id)
ORDER BY cd.date, COALESCE(dts.slot_order, 0), COALESCE(dh.hall_order, 0), s.session_number;

-- Create a function to format time in 12-hour format
CREATE OR REPLACE FUNCTION format_time_12h(time_value TIME)
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(time_value, 'HH12:MI AM');
END;
$$ LANGUAGE plpgsql;

-- Ensure participant roles list exists (for documentation/reference)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'participant_roles' AND c.relkind = 'r'
  ) THEN
    CREATE TABLE participant_roles (
      role TEXT PRIMARY KEY
    );
    INSERT INTO participant_roles(role) VALUES
      ('speaker'), ('moderator'), ('chairperson'), ('panelist'), ('expert'),
      ('workshop_lead'), ('assistant'), ('discussion_leader'), ('presenter');
  END IF;
END $$;

-- Unique index on speakers email (case-insensitive) to support clean upserts from master CSV
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_speakers_email_unique' AND c.relkind = 'i'
  ) THEN
    CREATE UNIQUE INDEX idx_speakers_email_unique ON speakers((lower(email)));
  END IF;
END $$;

-- Create a function to parse 12-hour time format
CREATE OR REPLACE FUNCTION parse_time_12h(time_text TEXT)
RETURNS TIME AS $$
BEGIN
  -- Handle various 12-hour formats
  RETURN CASE 
    WHEN time_text ~ '^([0-9]|1[0-2]):[0-5][0-9]\s*(AM|PM|am|pm)$' THEN
      TO_TIMESTAMP(time_text, 'HH12:MI AM')::TIME
    WHEN time_text ~ '^([0-9]|1[0-2])\.[0-5][0-9]\s*(AM|PM|am|pm)$' THEN
      TO_TIMESTAMP(REPLACE(time_text, '.', ':'), 'HH12:MI AM')::TIME
    ELSE
      time_text::TIME
  END;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
