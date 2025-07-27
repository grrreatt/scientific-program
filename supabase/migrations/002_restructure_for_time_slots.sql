-- Migration to restructure for editable time slots per day
-- This creates a new structure where each day has its own time slots
-- and sessions reference these time slots instead of having their own times

-- Create time slots table for each day
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

-- Add time_slot_id to sessions table
ALTER TABLE sessions ADD COLUMN time_slot_id UUID REFERENCES day_time_slots(id) ON DELETE CASCADE;

-- Create index for time slot lookups
CREATE INDEX idx_sessions_time_slot_id ON sessions(time_slot_id);
CREATE INDEX idx_day_time_slots_day_id ON day_time_slots(day_id);
CREATE INDEX idx_day_time_slots_order ON day_time_slots(slot_order);

-- Insert default time slots for existing days (8:00 AM to 8:00 PM, every 30 minutes)
INSERT INTO day_time_slots (day_id, start_time, end_time, slot_order, is_break, break_title)
SELECT 
  cd.id,
  (TIME '08:00' + (INTERVAL '30 minutes' * generate_series(0, 23))),
  (TIME '08:30' + (INTERVAL '30 minutes' * generate_series(0, 23))),
  generate_series(0, 23),
  CASE 
    WHEN generate_series(0, 23) IN (8, 20) THEN TRUE  -- 12:00-12:30 and 18:00-18:30 are breaks
    ELSE FALSE
  END,
  CASE 
    WHEN generate_series(0, 23) = 8 THEN 'Lunch Break'
    WHEN generate_series(0, 23) = 20 THEN 'Dinner Break'
    ELSE NULL
  END
FROM conference_days cd;

-- Update existing sessions to use time slots (migrate existing data)
UPDATE sessions 
SET time_slot_id = (
  SELECT dts.id 
  FROM day_time_slots dts 
  WHERE dts.day_id = sessions.day_id 
    AND dts.start_time = sessions.start_time
  LIMIT 1
)
WHERE time_slot_id IS NULL;

-- Create a view for easier session queries with time slot info
CREATE VIEW sessions_with_times AS
SELECT 
  s.*,
  dts.start_time,
  dts.end_time,
  dts.is_break,
  dts.break_title,
  cd.name as day_name,
  st.name as stage_name
FROM sessions s
JOIN day_time_slots dts ON s.time_slot_id = dts.id
JOIN conference_days cd ON s.day_id = cd.id
JOIN stages st ON s.stage_id = st.id;

-- Add RLS policies for the new table
ALTER TABLE day_time_slots ENABLE ROW LEVEL SECURITY;

-- Allow all operations on time slots (for now - can be restricted later)
CREATE POLICY "Allow all operations on day_time_slots" ON day_time_slots
FOR ALL USING (true) WITH CHECK (true); 