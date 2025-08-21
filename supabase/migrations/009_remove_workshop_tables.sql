-- Remove workshop-related tables
-- This migration removes all workshop functionality from the database

-- Drop workshop sub-sessions table first (due to foreign key constraints)
DROP TABLE IF EXISTS public.workshop_sub_sessions CASCADE;

-- Drop workshop session participants table
DROP TABLE IF EXISTS public.workshop_session_participants CASCADE;

-- Drop workshop sessions table
DROP TABLE IF EXISTS public.workshop_sessions CASCADE;

-- Drop workshops table
DROP TABLE IF EXISTS public.workshops CASCADE;

-- Remove any workshop-related indexes that might exist
DROP INDEX IF EXISTS idx_workshops_day_date;
DROP INDEX IF EXISTS idx_workshop_sessions_workshop_id;
DROP INDEX IF EXISTS idx_workshop_sessions_order;
DROP INDEX IF EXISTS idx_workshop_session_participants_session_id;
DROP INDEX IF EXISTS idx_workshop_session_participants_speaker_id;
DROP INDEX IF EXISTS idx_workshop_sub_sessions_session_id;
DROP INDEX IF EXISTS idx_workshop_sub_sessions_times;