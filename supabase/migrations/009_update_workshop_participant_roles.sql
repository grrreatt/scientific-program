-- Update workshop_session_participants table to support more roles
ALTER TABLE workshop_session_participants 
DROP CONSTRAINT IF EXISTS workshop_session_participants_role_check;

ALTER TABLE workshop_session_participants 
ADD CONSTRAINT workshop_session_participants_role_check 
CHECK (role IN ('lead', 'assistant', 'speaker', 'moderator', 'chairperson', 'panelist', 'expert'));

-- Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_workshop_session_participants_role ON workshop_session_participants(role);
