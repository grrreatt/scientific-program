-- Run this in Supabase SQL editor (safe to re-run)

-- 1) Add per-subtalk role columns
ALTER TABLE sub_sessions
  ADD COLUMN IF NOT EXISTS chairperson_id UUID REFERENCES speakers(id),
  ADD COLUMN IF NOT EXISTS expert_ids UUID[];

-- 2) Optional helper view
CREATE OR REPLACE VIEW sub_sessions_with_people AS
SELECT
  ss.*,
  sp_speaker.name      AS speaker_name,
  sp_chair.name        AS chairperson_name,
  COALESCE(ARRAY_AGG(sp_exp.name) FILTER (WHERE sp_exp.id IS NOT NULL), ARRAY[]::text[]) AS expert_names
FROM sub_sessions ss
LEFT JOIN speakers sp_speaker ON ss.speaker_id = sp_speaker.id
LEFT JOIN speakers sp_chair   ON ss.chairperson_id = sp_chair.id
LEFT JOIN LATERAL (
  SELECT s.*
  FROM speakers s
  WHERE ss.expert_ids IS NOT NULL AND s.id = ANY (ss.expert_ids)
) sp_exp ON TRUE
GROUP BY ss.id, sp_speaker.name, sp_chair.name;

-- 3) Permissive policy (only if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sub_sessions'
      AND policyname = 'Allow all operations on sub_sessions'
  ) THEN
    CREATE POLICY "Allow all operations on sub_sessions" ON sub_sessions
    FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


