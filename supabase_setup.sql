-- Scientific Program Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Create stages (halls) table
CREATE TABLE IF NOT EXISTS stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'lecture',
    day_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    topic TEXT,
    description TEXT,
    data JSONB DEFAULT '{}',
    is_parallel_meal BOOLEAN DEFAULT FALSE,
    parallel_meal_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create days table (for future use)
CREATE TABLE IF NOT EXISTS days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default halls
INSERT INTO stages (name, capacity) VALUES
    ('Example Hall', 100),
    ('Hall A', 80),
    ('Hall B', 60)
ON CONFLICT (name) DO NOTHING;

-- 5. Insert default days
INSERT INTO days (name, date) VALUES
    ('Day 1', 'March 15, 2024'),
    ('Day 2', 'March 16, 2024'),
    ('Day 3', 'March 17, 2024')
ON CONFLICT (name) DO NOTHING;

-- 6. Insert a sample session
INSERT INTO sessions (title, session_type, day_id, stage_id, start_time, end_time, topic, description, data) VALUES
    ('Mock Session', 'lecture', 'day1', 'example-hall', '09:00', '10:00', 'Introduction to Mock Data', 'This is a mock session for testing purposes.', '{"speaker_name": "Dr. Mock Speaker", "moderator_name": null, "panelist_names": []}')
ON CONFLICT DO NOTHING;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_day_id ON sessions(day_id);
CREATE INDEX IF NOT EXISTS idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

-- 8. Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;

-- 9. Create policies for public read access
CREATE POLICY "Allow public read access to stages" ON stages FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to days" ON days FOR SELECT USING (true);

-- 10. Create policies for authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated users to manage stages" ON stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage sessions" ON sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage days" ON days FOR ALL USING (auth.role() = 'authenticated'); 