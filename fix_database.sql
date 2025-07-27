-- ========================================
-- FIX DATABASE ACCESS ISSUES
-- ========================================

-- Drop existing policies that require authentication
DROP POLICY IF EXISTS "Allow authenticated users to manage stages" ON stages;
DROP POLICY IF EXISTS "Allow authenticated users to manage sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users to manage days" ON days;
DROP POLICY IF EXISTS "Allow authenticated users to manage people" ON people;
DROP POLICY IF EXISTS "Allow authenticated users to manage symposium_subtalks" ON symposium_subtalks;

-- Create new policies that allow public access
CREATE POLICY "Allow public insert to stages" ON stages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to stages" ON stages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete from stages" ON stages FOR DELETE USING (true);

CREATE POLICY "Allow public insert to sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete from sessions" ON sessions FOR DELETE USING (true);

CREATE POLICY "Allow public insert to days" ON days FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to days" ON days FOR UPDATE USING (true);
CREATE POLICY "Allow public delete from days" ON days FOR DELETE USING (true);

CREATE POLICY "Allow public insert to people" ON people FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to people" ON people FOR UPDATE USING (true);
CREATE POLICY "Allow public delete from people" ON people FOR DELETE USING (true);

CREATE POLICY "Allow public insert to symposium_subtalks" ON symposium_subtalks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to symposium_subtalks" ON symposium_subtalks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete from symposium_subtalks" ON symposium_subtalks FOR DELETE USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('stages', 'sessions', 'days', 'people', 'symposium_subtalks')
ORDER BY tablename, policyname; 