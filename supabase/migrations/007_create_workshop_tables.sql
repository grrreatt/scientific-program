-- Create workshops table (main workshop entity)
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  description TEXT,
  convenor_id UUID REFERENCES speakers(id),
  co_convenor_id UUID REFERENCES speakers(id),
  venue TEXT,
  day_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workshop_sessions table (individual sessions within a workshop)
CREATE TABLE workshop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workshop_session_participants table
CREATE TABLE workshop_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_session_id UUID REFERENCES workshop_sessions(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES speakers(id),
  role TEXT CHECK (role IN ('lead', 'assistant', 'speaker', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) for the new tables
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_session_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on workshops" ON workshops FOR SELECT USING (true);
CREATE POLICY "Allow public read access on workshop_sessions" ON workshop_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on workshop_session_participants" ON workshop_session_participants FOR SELECT USING (true);

-- Create policies for authenticated users (full access)
CREATE POLICY "Allow authenticated users full access on workshops" ON workshops FOR ALL USING (true);
CREATE POLICY "Allow authenticated users full access on workshop_sessions" ON workshop_sessions FOR ALL USING (true);
CREATE POLICY "Allow authenticated users full access on workshop_session_participants" ON workshop_session_participants FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_workshops_day_date ON workshops(day_date);
CREATE INDEX idx_workshop_sessions_workshop_id ON workshop_sessions(workshop_id);
CREATE INDEX idx_workshop_sessions_order ON workshop_sessions(workshop_id, session_order);
CREATE INDEX idx_workshop_session_participants_session_id ON workshop_session_participants(workshop_session_id);
CREATE INDEX idx_workshop_session_participants_speaker_id ON workshop_session_participants(speaker_id);
