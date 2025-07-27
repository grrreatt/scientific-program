-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conference days
CREATE TABLE conference_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages/Halls
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Speakers
CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  organization TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX idx_sessions_day_id ON sessions(day_id);
CREATE INDEX idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_speaker_id ON session_participants(speaker_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sessions table
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default session types
INSERT INTO session_types (name, fields) VALUES
('lecture', '{"required": ["title", "topic", "speaker_id", "start_time", "end_time"], "optional": ["chairperson_id", "description", "is_parallel_meal"], "roles": ["speaker", "chairperson"]}'),
('panel', '{"required": ["title", "topic", "moderator_id", "panelist_ids", "start_time", "end_time"], "optional": ["description", "is_parallel_meal"], "roles": ["moderator", "panelist"]}'),
('symposium', '{"required": ["title", "topic", "moderator_id", "symposium_subtalks", "start_time", "end_time"], "optional": ["description"], "roles": ["moderator", "speaker"]}'),
('workshop', '{"required": ["title", "topic", "workshop_lead_ids", "start_time", "end_time"], "optional": ["assistant_ids", "capacity", "description"], "roles": ["workshop_lead", "assistant"]}'),
('oration', '{"required": ["title", "topic", "speaker_id", "start_time", "end_time"], "optional": ["introducer_id", "description"], "roles": ["speaker", "introducer"]}'),
('guest_lecture', '{"required": ["title", "topic", "speaker_id", "start_time", "end_time"], "optional": ["chairperson_id", "description"], "roles": ["speaker", "chairperson"]}'),
('discussion', '{"required": ["title", "topic", "discussion_leader_id", "presenter_ids", "start_time", "end_time"], "optional": ["description"], "roles": ["discussion_leader", "presenter"]}'),
('break', '{"required": ["title", "meal_type", "start_time", "end_time"], "optional": ["description"], "roles": []}'),
('other', '{"required": ["title", "start_time", "end_time"], "optional": ["topic", "description", "custom_data"], "roles": []}');

-- Insert sample data
INSERT INTO conference_days (name, date) VALUES
('Day 1', '2024-03-15'),
('Day 2', '2024-03-16'),
('Day 3', '2024-03-17');

INSERT INTO stages (name, capacity) VALUES
('Main Hall', 200),
('Seminar Room A', 50),
('Seminar Room B', 50),
('Workshop Room', 30);

INSERT INTO speakers (name, email, title, organization) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@university.edu', 'Professor', 'University of Medical Sciences'),
('Dr. Michael Chen', 'michael.chen@research.org', 'Research Director', 'National Research Institute'),
('Dr. Emily Rodriguez', 'emily.rodriguez@hospital.com', 'Chief Medical Officer', 'City General Hospital'),
('Prof. David Thompson', 'david.thompson@college.edu', 'Dean', 'Medical College'),
('Dr. Lisa Wang', 'lisa.wang@clinic.org', 'Senior Physician', 'Specialty Clinic'); 