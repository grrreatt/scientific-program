-- Seed demo data for Scientific Program (idempotent)
-- Run this in Supabase SQL editor after the schema migration

BEGIN;

-- 1) Days
WITH v(name, date) AS (
  VALUES
    ('Day 1', DATE '2025-12-07'),
    ('Day 2', DATE '2025-12-08'),
    ('Day 3', DATE '2025-12-09')
)
INSERT INTO conference_days (name, date)
SELECT v.name, v.date
FROM v
WHERE NOT EXISTS (
  SELECT 1 FROM conference_days d WHERE d.name = v.name
);

-- 2) Halls / Stages
WITH v(name, capacity) AS (
  VALUES
    ('Hall A', 300),
    ('Hall B', 200),
    ('Conference Room 1', 120),
    ('Stein Auditorium', 500)
)
INSERT INTO stages (name, capacity)
SELECT v.name, v.capacity
FROM v
WHERE NOT EXISTS (
  SELECT 1 FROM stages s WHERE s.name = v.name
);

-- 3) Speakers (sample)
WITH v(name, email, title, organization) AS (
  VALUES
    ('Dr Harsha Gaikwad', 'harsha@example.com', 'Consultant', 'City Hospital'),
    ('Dr Deepti Goswami', 'deepti@example.com', 'Professor', 'State Medical College'),
    ('Dr Sharda Patra',  'sharda@example.com', 'Senior Consultant', 'Metro Care'),
    ('Dr Urvashi Miglani','urvashi@example.com','Consultant','Metro Care'),
    ('Dr Bindiya Gupta', 'bindiya@example.com', 'Associate Professor', 'University Hospital')
)
INSERT INTO speakers (name, email, title, organization)
SELECT v.name, v.email, v.title, v.organization
FROM v
WHERE NOT EXISTS (
  SELECT 1 FROM speakers s WHERE s.email = v.email
);

-- 4) Ensure time slots for all days (08:00–20:30, every 30 min)
INSERT INTO day_time_slots (day_id, start_time, end_time, slot_order, is_break, break_title)
SELECT d.id,
       (TIME '08:00' + (g.i * INTERVAL '30 minutes'))::time AS start_time,
       (TIME '08:30' + (g.i * INTERVAL '30 minutes'))::time AS end_time,
       (g.i + 1) AS slot_order,
       FALSE,
       NULL
FROM conference_days d
CROSS JOIN LATERAL generate_series(0, 24) AS g(i)
ON CONFLICT (day_id, start_time) DO NOTHING;

-- 5) Map all halls to all days with a deterministic order
INSERT INTO day_halls (day_id, hall_id, hall_order)
SELECT cd.id, st.id,
       ROW_NUMBER() OVER (PARTITION BY cd.id ORDER BY st.name) - 1 AS hall_order
FROM conference_days cd
JOIN stages st ON st.name IN ('Hall A','Hall B','Conference Room 1','Stein Auditorium')
ON CONFLICT (day_id, hall_id) DO NOTHING;

-- 6) Opening Lecture in Hall A at 09:00
INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic)
SELECT 'Opening Lecture', 'lecture', d.id, ha.id, ts.id, 'Welcome & Overview'
FROM conference_days d
JOIN stages ha ON ha.name = 'Hall A'
JOIN day_time_slots ts ON ts.day_id = d.id AND ts.start_time = TIME '09:00'
WHERE d.name = 'Day 1'
  AND NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.title = 'Opening Lecture' AND s.day_id = d.id AND s.stage_id = ha.id
  );

-- Add a speaker to Opening Lecture
INSERT INTO session_participants (session_id, speaker_id, role)
SELECT s.id, sp.id, 'speaker'
FROM sessions s
JOIN conference_days d ON s.day_id = d.id AND d.name = 'Day 1'
JOIN stages ha ON s.stage_id = ha.id AND ha.name = 'Hall A'
JOIN speakers sp ON sp.email = 'harsha@example.com'
WHERE s.title = 'Opening Lecture'
  AND NOT EXISTS (
    SELECT 1 FROM session_participants p WHERE p.session_id = s.id AND p.speaker_id = sp.id AND p.role = 'speaker'
  );

-- 7) Session container in Hall B with two sub-talks (custom time 10:00–11:00)
INSERT INTO sessions (title, session_type, day_id, stage_id, topic, custom_start_time, custom_end_time)
SELECT 'Session I', 'session', d.id, hb.id, 'Controversies in Obstetrics', TIME '10:00', TIME '11:00'
FROM conference_days d
JOIN stages hb ON hb.name = 'Hall B'
WHERE d.name = 'Day 1'
  AND NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.title = 'Session I' AND s.day_id = d.id AND s.stage_id = hb.id
  );

-- Sub-talks under Session I
INSERT INTO sub_sessions (parent_session_id, title, speaker_id, start_time, end_time, topic, sub_session_type)
SELECT s.id, 'Management of Intraamniotic Infection', sp.id, TIME '10:00', TIME '10:12', 'Updates', 'lecture'
FROM sessions s
JOIN conference_days d ON s.day_id = d.id AND d.name = 'Day 1'
JOIN stages hb ON s.stage_id = hb.id AND hb.name = 'Hall B'
JOIN speakers sp ON sp.email = 'harsha@example.com'
WHERE s.title = 'Session I'
  AND NOT EXISTS (
    SELECT 1 FROM sub_sessions ss WHERE ss.parent_session_id = s.id AND ss.title = 'Management of Intraamniotic Infection'
  );

INSERT INTO sub_sessions (parent_session_id, title, speaker_id, start_time, end_time, topic, sub_session_type)
SELECT s.id, 'When to suspect pituitary or adrenal pathology', sp.id, TIME '10:12', TIME '10:25', 'Endocrine clues', 'lecture'
FROM sessions s
JOIN conference_days d ON s.day_id = d.id AND d.name = 'Day 1'
JOIN stages hb ON s.stage_id = hb.id AND hb.name = 'Hall B'
JOIN speakers sp ON sp.email = 'deepti@example.com'
WHERE s.title = 'Session I'
  AND NOT EXISTS (
    SELECT 1 FROM sub_sessions ss WHERE ss.parent_session_id = s.id AND ss.title = 'When to suspect pituitary or adrenal pathology'
  );

-- 8) Panel in Conference Room 1 at 11:00
INSERT INTO sessions (title, session_type, day_id, stage_id, time_slot_id, topic)
SELECT 'Pelvic Masses Demystified', 'panel', d.id, cr1.id, ts.id, 'Malignancy or Mimic?'
FROM conference_days d
JOIN stages cr1 ON cr1.name = 'Conference Room 1'
JOIN day_time_slots ts ON ts.day_id = d.id AND ts.start_time = TIME '11:00'
WHERE d.name = 'Day 1'
  AND NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.title = 'Pelvic Masses Demystified' AND s.day_id = d.id AND s.stage_id = cr1.id
  );

-- Panel participants
-- Moderator
INSERT INTO session_participants (session_id, speaker_id, role)
SELECT s.id, sp.id, 'moderator'
FROM sessions s
JOIN conference_days d ON s.day_id = d.id AND d.name = 'Day 1'
JOIN stages cr1 ON s.stage_id = cr1.id AND cr1.name = 'Conference Room 1'
JOIN speakers sp ON sp.email = 'sharda@example.com'
WHERE s.title = 'Pelvic Masses Demystified'
  AND NOT EXISTS (
    SELECT 1 FROM session_participants p WHERE p.session_id = s.id AND p.speaker_id = sp.id AND p.role = 'moderator'
  );

-- Panelist
INSERT INTO session_participants (session_id, speaker_id, role)
SELECT s.id, sp.id, 'panelist'
FROM sessions s
JOIN conference_days d ON s.day_id = d.id AND d.name = 'Day 1'
JOIN stages cr1 ON s.stage_id = cr1.id AND cr1.name = 'Conference Room 1'
JOIN speakers sp ON sp.email = 'bindiya@example.com'
WHERE s.title = 'Pelvic Masses Demystified'
  AND NOT EXISTS (
    SELECT 1 FROM session_participants p WHERE p.session_id = s.id AND p.speaker_id = sp.id AND p.role = 'panelist'
  );

COMMIT;

-- After running, you should see:
-- - Days 1–3
-- - Halls mapped to each day
-- - Time slots for each day (08:00 to 20:30)
-- - One lecture, one session with two sub-talks, one panel with moderator/panelist

