-- Scientific Program Database Setup - COMPLETE CLEAN VERSION
-- Run this in your Supabase SQL Editor

-- ========================================
-- STEP 1: CLEAN UP - DROP ALL EXISTING TABLES
-- ========================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS days CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- STEP 2: CREATE FRESH TABLES
-- ========================================

-- 1. Create days table
CREATE TABLE days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create stages (halls) table
CREATE TABLE stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create people table (for speakers, moderators, etc.)
CREATE TABLE people (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    title TEXT,
    organization TEXT,
    email TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create sessions table with ALL form fields
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic session info
    title TEXT NOT NULL,
    topic TEXT,
    description TEXT,
    session_type TEXT NOT NULL DEFAULT 'lecture',
    
    -- Time and location
    day_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    
    -- People involved (stored as JSON for flexibility)
    people_data JSONB DEFAULT '{}',
    
    -- Workshop specific
    capacity INTEGER,
    
    -- Meal/break specific
    is_parallel_meal BOOLEAN DEFAULT FALSE,
    parallel_meal_type TEXT,
    meal_type TEXT,
    
    -- Custom data for other session types
    custom_data JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: INSERT INITIAL DATA
-- ========================================

-- Insert default days
INSERT INTO days (name, date) VALUES
    ('Day 1', 'March 15, 2024'),
    ('Day 2', 'March 16, 2024'),
    ('Day 3', 'March 17, 2024');

-- Insert default people
INSERT INTO people (name, title, organization) VALUES
    ('Dr. Sarah Johnson', 'Professor', 'Medical University'),
    ('Dr. Michael Chen', 'Associate Professor', 'Research Institute'),
    ('Dr. Emily Rodriguez', 'Senior Researcher', 'Clinical Center'),
    ('Prof. David Thompson', 'Director', 'Academic Hospital'),
    ('Dr. Lisa Wang', 'Principal Investigator', 'Biotech Lab'),
    ('Dr. James Wilson', 'Clinical Director', 'Medical Center'),
    ('Prof. Maria Garcia', 'Department Head', 'University Hospital'),
    ('Dr. Robert Brown', 'Research Fellow', 'Institute of Medicine');

-- Insert default halls
INSERT INTO stages (name, capacity) VALUES
    ('Example Hall', 100),
    ('Hall A', 80),
    ('Hall B', 60),
    ('Main Hall', 150),
    ('Seminar Room A', 50),
    ('Seminar Room B', 50),
    ('Workshop Room', 30);

-- Insert sample sessions with complete data structure
INSERT INTO sessions (
    title, 
    topic, 
    description, 
    session_type, 
    day_id, 
    stage_id, 
    start_time, 
    end_time, 
    people_data,
    capacity,
    is_parallel_meal,
    meal_type
) VALUES
    (
        'Mock Session',
        'Introduction to Mock Data',
        'This is a mock session for testing purposes.',
        'lecture',
        'day1',
        'example-hall',
        '09:00',
        '10:00',
        '{
            "speaker_id": "speaker1",
            "speaker_name": "Dr. Sarah Johnson",
            "chairperson_id": "speaker2",
            "chairperson_name": "Dr. Michael Chen"
        }',
        NULL,
        FALSE,
        NULL
    ),
    (
        'Panel Discussion: AI in Healthcare',
        'Artificial Intelligence Applications',
        'A comprehensive discussion on AI applications in modern healthcare.',
        'panel',
        'day1',
        'hall-a',
        '14:00',
        '15:30',
        '{
            "moderator_id": "speaker2",
            "moderator_name": "Dr. Michael Chen",
            "panelist_ids": ["speaker3", "speaker4", "speaker5"],
            "panelist_names": ["Dr. Emily Rodriguez", "Prof. David Thompson", "Dr. Lisa Wang"]
        }',
        NULL,
        FALSE,
        NULL
    ),
    (
        'Workshop: Advanced Techniques',
        'Hands-on Learning Session',
        'Interactive workshop on advanced medical techniques.',
        'workshop',
        'day2',
        'hall-b',
        '10:00',
        '12:00',
        '{
            "workshop_lead_ids": ["speaker3", "speaker4"],
            "workshop_lead_names": ["Dr. Emily Rodriguez", "Prof. David Thompson"],
            "assistant_ids": ["speaker5"],
            "assistant_names": ["Dr. Lisa Wang"]
        }',
        25,
        FALSE,
        NULL
    ),
    (
        'Lunch Break',
        'Networking Lunch',
        'Time for networking and refreshments.',
        'break',
        'day1',
        'main-hall',
        '12:00',
        '13:30',
        '{}',
        NULL,
        FALSE,
        'lunch'
    );

-- ========================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_sessions_day_id ON sessions(day_id);
CREATE INDEX idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_session_type ON sessions(session_type);
CREATE INDEX idx_people_name ON people(name);

-- ========================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: CREATE SECURITY POLICIES
-- ========================================

-- Public read access
CREATE POLICY "Allow public read access to stages" ON stages FOR SELECT USING (true);
CREATE POLICY "Allow public read access to sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to days" ON days FOR SELECT USING (true);
CREATE POLICY "Allow public read access to people" ON people FOR SELECT USING (true);

-- Authenticated user management
CREATE POLICY "Allow authenticated users to manage stages" ON stages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage sessions" ON sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage days" ON days FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage people" ON people FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- STEP 7: CREATE AUTO-UPDATE TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 8: VERIFICATION QUERY
-- ========================================

-- This will show you what was created
SELECT 
    'Tables created successfully!' as status,
    (SELECT COUNT(*) FROM days) as days_count,
    (SELECT COUNT(*) FROM stages) as stages_count,
    (SELECT COUNT(*) FROM people) as people_count,
    (SELECT COUNT(*) FROM sessions) as sessions_count; 