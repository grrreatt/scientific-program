-- Migration to restructure halls to be day-specific
-- This allows each day to have its own set of halls

-- First, ensure all UUID columns are properly typed
-- This fixes any potential type mismatches in existing data
DO $$
BEGIN
  -- Ensure sessions.day_id is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'day_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN day_id TYPE UUID USING day_id::uuid;
  END IF;
  
  -- Ensure sessions.stage_id is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'stage_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN stage_id TYPE UUID USING stage_id::uuid;
  END IF;
  
  -- Ensure sessions.time_slot_id is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sessions' AND column_name = 'time_slot_id' 
    AND data_type != 'uuid'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN time_slot_id TYPE UUID USING time_slot_id::uuid;
  END IF;
END $$;

-- Create day_halls table to link halls to specific days
CREATE TABLE day_halls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  hall_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(day_id, hall_id)
);

-- Create indexes for performance
CREATE INDEX idx_day_halls_day_id ON day_halls(day_id);
CREATE INDEX idx_day_halls_hall_id ON day_halls(hall_id);
CREATE INDEX idx_day_halls_order ON day_halls(hall_order);

-- Insert existing hall relationships for all days
-- This assumes all existing halls should be available for all existing days
INSERT INTO day_halls (day_id, hall_id, hall_order)
SELECT 
  cd.id as day_id,
  st.id as hall_id,
  ROW_NUMBER() OVER (PARTITION BY cd.id ORDER BY st.name) - 1 as hall_order
FROM conference_days cd
CROSS JOIN stages st;

-- Create a view for easier hall queries with day info
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

-- Update the sessions_with_times view to include day-specific hall info
DROP VIEW IF EXISTS sessions_with_times;
CREATE VIEW sessions_with_times AS
SELECT 
  s.*,
  COALESCE(dts.start_time, s.start_time) as start_time,
  COALESCE(dts.end_time, s.end_time) as end_time,
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

-- Add RLS policies for the new table
ALTER TABLE day_halls ENABLE ROW LEVEL SECURITY;

-- Allow all operations on day_halls (for now - can be restricted later)
CREATE POLICY "Allow all operations on day_halls" ON day_halls
FOR ALL USING (true) WITH CHECK (true); 