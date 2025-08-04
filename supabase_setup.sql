-- =====================================================
-- SUPABASE SETUP FOR CONFERENCE PROGRAM
-- =====================================================
-- This script sets up the database structure for the conference program
-- No mock data is included - all data must be added through the application
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS symposium_subtalks CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS stages CASCADE;
DROP TABLE IF EXISTS days CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Days table
CREATE TABLE days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stages/Halls table
CREATE TABLE stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People table (speakers, moderators, etc.)
CREATE TABLE people (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    title VARCHAR(255),
    organization VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(500),
    description TEXT,
    session_type VARCHAR(100) NOT NULL,
    day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    people_data JSONB DEFAULT '{}',
    capacity INTEGER,
    is_parallel_meal BOOLEAN DEFAULT FALSE,
    meal_type VARCHAR(100),
    symposium_data JSONB DEFAULT '{}',
    custom_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Symposium subtalks table
CREATE TABLE symposium_subtalks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    speaker_name VARCHAR(255),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(500),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX idx_days_date ON days(date);
CREATE INDEX idx_stages_name ON stages(name);
CREATE INDEX idx_people_name ON people(name);
CREATE INDEX idx_sessions_day_id ON sessions(day_id);
CREATE INDEX idx_sessions_stage_id ON sessions(stage_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_session_type ON sessions(session_type);
CREATE INDEX idx_people_name ON people(name);
CREATE INDEX idx_symposium_subtalks_session_id ON symposium_subtalks(session_id);
CREATE INDEX idx_symposium_subtalks_order ON symposium_subtalks(order_index);

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
CREATE TRIGGER update_stages_updated_at BEFORE UPDATE ON stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate session data based on session type
CREATE OR REPLACE FUNCTION validate_session_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that start_time is before end_time
    IF NEW.start_time >= NEW.end_time THEN
        RAISE EXCEPTION 'Start time must be before end time';
    END IF;
    
    -- Validate session type
    IF NEW.session_type NOT IN ('lecture', 'panel', 'workshop', 'symposium', 'oration', 'guest_lecture', 'discussion', 'break', 'other') THEN
        RAISE EXCEPTION 'Invalid session type: %', NEW.session_type;
    END IF;
    
    -- Validate meal type if is_parallel_meal is true
    IF NEW.is_parallel_meal = TRUE AND NEW.meal_type IS NULL THEN
        RAISE EXCEPTION 'Meal type is required when is_parallel_meal is true';
    END IF;
    
    -- Validate meal type values
    IF NEW.meal_type IS NOT NULL AND NEW.meal_type NOT IN ('breakfast', 'lunch', 'dinner', 'coffee_break') THEN
        RAISE EXCEPTION 'Invalid meal type: %', NEW.meal_type;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for session validation
CREATE TRIGGER validate_session_data_trigger BEFORE INSERT OR UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION validate_session_data();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE symposium_subtalks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE POLICIES
-- =====================================================

CREATE POLICY "Allow all operations on days" ON days
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on stages" ON stages
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on people" ON people
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on sessions" ON sessions
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on symposium_subtalks" ON symposium_subtalks
FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the structure
SELECT 'Days' as table_name, COUNT(*) as record_count FROM days
UNION ALL
SELECT 'Stages', COUNT(*) FROM stages
UNION ALL
SELECT 'People', COUNT(*) FROM people
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'Symposium Subtalks', COUNT(*) FROM symposium_subtalks;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Supabase setup completed successfully!' as status;
SELECT 'Features included:' as features;
SELECT '- Days management' as feature1;
SELECT '- Stages/Halls management' as feature2;
SELECT '- People/Speakers management' as feature3;
SELECT '- Sessions with multiple types' as feature4;
SELECT '- Symposium subtalks support' as feature5;
SELECT '- Data validation triggers' as feature6;
SELECT '- Row Level Security enabled' as feature7;
SELECT '- Clean database with no mock data - all data must be added through the application' as feature8; 